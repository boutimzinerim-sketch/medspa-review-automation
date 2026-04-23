-- ============================================================================
-- Épidou — Initial consolidated schema
-- ============================================================================
-- Bundles V1 (ReviewFlow) core model + Loi 25 / CASL compliance + Épidou
-- additions (PMS abstraction for Jane, SMS channel, Stripe billing, review
-- routing fork, webhook logs). Single migration because V1's live US DB was
-- never managed via migrations — reconstructed from lib/types.ts.
--
-- Apply via Supabase SQL Editor against the ca-central-1 project.
-- Safe to run once on an empty project (create_reviews_table migration
-- should be dropped first if present).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Idempotent cleanup — drops any prior partial state so this file is safe to
-- re-run. Tables cascade → drops dependent FKs, policies, indexes, triggers.
-- ----------------------------------------------------------------------------
drop table if exists public.integrations cascade;
drop table if exists public.webhook_logs cascade;
drop table if exists public.unsubscribes cascade;
drop table if exists public.message_sends cascade;
drop table if exists public.reviews cascade;
drop table if exists public.review_requests cascade;
drop table if exists public.appointments cascade;
drop table if exists public.automation_rules cascade;
drop table if exists public.patients cascade;
drop table if exists public.clinics cascade;

drop function if exists public.clinic_belongs_to_caller(uuid) cascade;
drop function if exists public.set_updated_at() cascade;

drop type if exists locale cascade;
drop type if exists consent_source cascade;
drop type if exists subscription_status cascade;
drop type if exists appointment_status cascade;
drop type if exists message_status cascade;
drop type if exists message_channel cascade;
drop type if exists pms_type cascade;
drop type if exists integration_provider cascade;
drop type if exists sentiment cascade;
drop type if exists response_status cascade;
drop type if exists review_source cascade;
drop type if exists service_type cascade;

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type service_type as enum (
  'Botox', 'Filler', 'Laser Hair Removal', 'Microneedling', 'Chemical Peel',
  'PRP', 'Hydrafacial', 'Sculptra', 'Kybella', 'Coolsculpting', 'Other'
);

create type review_source as enum ('google', 'yelp', 'trustpilot');

create type response_status as enum ('pending', 'clicked', 'reviewed', 'no_response');

create type sentiment as enum ('positive', 'neutral', 'negative');

create type integration_provider as enum ('google_sheets', 'gmail', 'google_business');

-- New enums for Épidou
create type pms_type as enum ('jane', 'mindbody', 'acuity', 'vagaro');

create type message_channel as enum ('sms', 'email');

create type message_status as enum ('queued', 'sent', 'delivered', 'failed', 'bounced');

create type appointment_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');

create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

create type consent_source as enum ('appointment', 'manual_import', 'dashboard_entry');

create type locale as enum ('fr-CA', 'en-CA');

-- ----------------------------------------------------------------------------
-- Helper: updated_at auto-touch trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- CLINICS — tenant root
-- ============================================================================
create table clinics (
  id uuid primary key default uuid_generate_v4(),
  -- V1 uses NextAuth CredentialsProvider with email as the user id (mock auth).
  -- When real auth lands (Supabase Auth or OAuth), migrate to uuid referencing auth.users(id).
  user_id text not null,

  -- Identity
  name text not null,
  email text not null,
  phone text not null,
  timezone text not null default 'America/Toronto',

  -- CASL-required physical address (shown in every outbound message footer)
  address_line1 text,
  address_line2 text,
  city text,
  province text default 'QC',
  postal_code text,
  country text not null default 'CA',

  -- Branding / external profiles
  google_place_id text,
  current_rating numeric(3,2),
  total_reviews integer not null default 0,
  logo_url text,
  sender_name text, -- shown as "From" on SMS/email instead of "Épidou"
  default_locale locale not null default 'fr-CA',

  -- PMS integration (pluggable across Jane / Mindbody / Acuity / Vagaro)
  pms_type pms_type,
  pms_location_id text,
  pms_credentials_encrypted bytea, -- encrypted via lib/encryption.ts
  pms_connected_at timestamptz,
  pms_last_sync_at timestamptz,

  -- Review routing fork (Épidou core logic)
  internal_feedback_threshold integer not null default 3
    check (internal_feedback_threshold between 1 and 5),
  internal_feedback_recipient_email text,
  google_review_url text,

  -- Stripe billing
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status subscription_status,
  subscription_current_period_end timestamptz,
  setup_fee_paid_at timestamptz,

  -- Compliance (Loi 25 / CASL)
  casl_attested_at timestamptz,
  casl_attestor_name text,
  loi25_data_residency_confirmed boolean not null default true, -- always CA via ca-central-1

  -- Operational
  test_mode boolean not null default false, -- dry-run sends go to owner's phone only
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clinics_user_id_idx on clinics(user_id);
create index clinics_stripe_customer_idx on clinics(stripe_customer_id);
create index clinics_subscription_status_idx on clinics(subscription_status)
  where subscription_status is not null;

create trigger clinics_set_updated_at
  before update on clinics
  for each row execute function public.set_updated_at();

comment on table clinics is 'Tenant root. Every other business table FK''s to clinic_id.';
comment on column clinics.pms_credentials_encrypted is 'Opaque bytes from lib/encryption.ts; shape varies by pms_type.';
comment on column clinics.test_mode is 'When true, all outbound messages route to owner phone/email instead of patients. For onboarding demos.';

-- ============================================================================
-- PATIENTS
-- ============================================================================
create table patients (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,

  -- Identity
  name text not null,
  email text,
  phone text,
  locale locale not null default 'fr-CA',

  -- Last visit context
  last_service service_type,
  appointment_date timestamptz,

  -- Review tracking (V1 semantics)
  reviewed boolean not null default false,
  review_link text,
  review_text text,
  response_sent_at timestamptz,

  -- CASL consent (every patient contacted must have a traceable consent source)
  consent_source consent_source not null,
  consent_logged_at timestamptz not null default now(),
  consent_expires_at timestamptz, -- appointment-based consent = 2 years

  -- Flags
  is_archived boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- At least one contact channel required
  check (email is not null or phone is not null)
);

create index patients_clinic_id_idx on patients(clinic_id);
create index patients_email_idx on patients(lower(email)) where email is not null;
create index patients_phone_idx on patients(phone) where phone is not null;
create index patients_appointment_date_idx on patients(clinic_id, appointment_date desc);

create trigger patients_set_updated_at
  before update on patients
  for each row execute function public.set_updated_at();

-- ============================================================================
-- AUTOMATION_RULES — per-service review request sequences
-- ============================================================================
create table automation_rules (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,

  name text not null,
  service_type service_type not null,

  -- Timing
  days_after_appointment integer not null default 2
    check (days_after_appointment between 0 and 30),

  -- Channel + templates (Épidou adds SMS to V1's email-only)
  channel message_channel not null default 'sms',
  email_subject text,
  email_template text,
  sms_template text, -- 160 char guidance; enforced at send time not DB
  tone text, -- brand voice hint for AI drafting (e.g. "warm, concise, French-Canadian")

  -- Reminders
  is_active boolean not null default true,
  enable_reminders boolean not null default false,
  reminder_days_1 integer check (reminder_days_1 between 1 and 30),
  reminder_days_2 integer check (reminder_days_2 between 1 and 60),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Channel-template consistency
  check (
    (channel = 'email' and email_template is not null)
    or (channel = 'sms' and sms_template is not null)
  )
);

create index automation_rules_clinic_id_idx on automation_rules(clinic_id);
create index automation_rules_active_idx on automation_rules(clinic_id, service_type)
  where is_active = true;

create trigger automation_rules_set_updated_at
  before update on automation_rules
  for each row execute function public.set_updated_at();

-- ============================================================================
-- APPOINTMENTS — explicit PMS-synced appointment records
-- ============================================================================
-- V1 implicitly tracked appointments on the patients table. Épidou splits
-- them out so a patient can have many appointments and we can trigger review
-- requests per-appointment (not per-patient).
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,

  -- PMS reference
  pms_type pms_type not null,
  pms_appointment_id text not null,

  -- Schedule
  service service_type,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status appointment_status not null default 'scheduled',

  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,

  -- Review request dispatch guard
  review_request_enqueued boolean not null default false,
  review_request_enqueued_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (pms_type, pms_appointment_id)
);

create index appointments_clinic_patient_idx on appointments(clinic_id, patient_id);
create index appointments_starts_at_idx on appointments(starts_at desc);
create index appointments_completed_pending_review_idx
  on appointments(completed_at)
  where status = 'completed' and review_request_enqueued = false;

create trigger appointments_set_updated_at
  before update on appointments
  for each row execute function public.set_updated_at();

comment on table appointments is 'One row per PMS-synced appointment. Review-request cron reads this to decide what to enqueue.';

-- ============================================================================
-- REVIEW_REQUESTS — outbound attempts to solicit a review
-- ============================================================================
create table review_requests (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  automation_rule_id uuid references automation_rules(id) on delete set null,

  channel message_channel not null,
  sent_at timestamptz not null default now(),
  response_status response_status not null default 'pending',

  review_link_sent text,
  first_reminder_sent boolean not null default false,
  first_reminder_sent_at timestamptz,
  second_reminder_sent boolean not null default false,
  second_reminder_sent_at timestamptz,

  -- Star-routing result captured when patient clicks the magic link
  star_rating_captured integer check (star_rating_captured between 1 and 5),
  routed_to text check (routed_to in ('google_external', 'internal_feedback')),
  routed_at timestamptz,

  -- Internal feedback capture (1–3 star path)
  internal_feedback_text text,
  internal_feedback_submitted_at timestamptz,

  created_at timestamptz not null default now()
);

create index review_requests_clinic_idx on review_requests(clinic_id, sent_at desc);
create index review_requests_patient_idx on review_requests(patient_id);
create index review_requests_pending_idx on review_requests(clinic_id)
  where response_status = 'pending';

-- ============================================================================
-- REVIEWS — synced inbound reviews from external platforms
-- ============================================================================
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,

  source review_source not null,
  source_review_id text, -- external platform's ID, for dedup
  author_name text,
  rating integer not null check (rating between 1 and 5),
  review_text text,

  service_mentioned text,
  results_mentioned text,
  sentiment sentiment,

  posted_at timestamptz not null,
  synced_at timestamptz not null default now(),

  unique (source, source_review_id)
);

create index reviews_clinic_posted_idx on reviews(clinic_id, posted_at desc);
create index reviews_source_idx on reviews(source);

-- ============================================================================
-- MESSAGE_SENDS — every SMS/email attempt, for observability + retries
-- ============================================================================
create table message_sends (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  review_request_id uuid references review_requests(id) on delete set null,

  channel message_channel not null,
  to_address text not null, -- phone or email

  -- Provider linkage
  provider_message_id text, -- Twilio SID or Resend ID
  status message_status not null default 'queued',

  -- Template snapshot (so future template edits don't rewrite history)
  body text not null,
  subject text, -- email only

  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  error_code text,
  error_message text,

  -- Cost tracking (optional, for per-clinic billing insight)
  cost_usd numeric(10, 6),

  -- Compliance context
  blocklist_checked_at timestamptz,
  consent_verified boolean not null default false,
  test_mode boolean not null default false,

  created_at timestamptz not null default now()
);

create index message_sends_clinic_idx on message_sends(clinic_id, created_at desc);
create index message_sends_failed_idx on message_sends(clinic_id)
  where status = 'failed';
create index message_sends_provider_id_idx on message_sends(provider_message_id)
  where provider_message_id is not null;

comment on table message_sends is 'One row per outbound send attempt. Dashboard retry button reads failed_ rows.';

-- ============================================================================
-- UNSUBSCRIBES — CASL cross-clinic blocklist
-- ============================================================================
-- Every send MUST check this table first. Unsubscribing from one clinic
-- unsubscribes from THAT clinic's sends only (per CASL — opt-out is
-- sender-specific), but we keep the per-clinic scope in the unique constraint.
create table unsubscribes (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,

  email text,
  phone text,

  unsubscribed_at timestamptz not null default now(),
  reason text,
  source text check (source in ('sms_stop', 'email_link', 'manual', 'bounce')),

  -- At least one identifier
  check (email is not null or phone is not null),
  -- Per-clinic uniqueness
  unique (clinic_id, email),
  unique (clinic_id, phone)
);

create index unsubscribes_clinic_idx on unsubscribes(clinic_id);
create index unsubscribes_email_idx on unsubscribes(lower(email)) where email is not null;
create index unsubscribes_phone_idx on unsubscribes(phone) where phone is not null;

comment on table unsubscribes is 'CASL blocklist. Must be checked before every outbound send.';

-- ============================================================================
-- WEBHOOK_LOGS — raw PMS webhook payloads for debugging
-- ============================================================================
create table webhook_logs (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid references clinics(id) on delete set null,

  source pms_type not null,
  event_type text,
  payload jsonb not null,
  headers jsonb,

  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  status text not null default 'received' check (status in ('received', 'processed', 'error', 'ignored'))
);

create index webhook_logs_clinic_idx on webhook_logs(clinic_id, received_at desc);
create index webhook_logs_unprocessed_idx on webhook_logs(received_at)
  where status = 'received';
create index webhook_logs_payload_gin on webhook_logs using gin (payload);

-- ============================================================================
-- INTEGRATIONS — third-party OAuth connections (Gmail, Google Business, etc.)
-- Separate from PMS which lives on clinics.pms_*
-- ============================================================================
create table integrations (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  provider integration_provider not null,

  access_token_encrypted bytea not null,
  refresh_token_encrypted bytea,
  expires_at timestamptz,

  is_active boolean not null default true,
  connected_at timestamptz not null default now(),

  unique (clinic_id, provider)
);

create index integrations_clinic_idx on integrations(clinic_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Pattern: clinic-scoped tables only accessible to the clinic owner (matching
-- auth.uid() = clinics.user_id via the clinic_id FK chain).
-- The service_role key bypasses RLS — used by server-side code (cron, webhooks).
-- ============================================================================

alter table clinics enable row level security;
alter table patients enable row level security;
alter table automation_rules enable row level security;
alter table appointments enable row level security;
alter table review_requests enable row level security;
alter table reviews enable row level security;
alter table message_sends enable row level security;
alter table unsubscribes enable row level security;
alter table webhook_logs enable row level security;
alter table integrations enable row level security;

-- Clinics — owner reads/writes their own row.
-- Policies check BOTH email-in-JWT (V1 mock auth) AND auth.uid()::text (future real auth).
create policy clinics_owner_select on clinics
  for select using (
    user_id = coalesce(auth.jwt() ->> 'email', auth.uid()::text)
  );
create policy clinics_owner_update on clinics
  for update using (
    user_id = coalesce(auth.jwt() ->> 'email', auth.uid()::text)
  );

-- Helper predicate for clinic_id-scoped tables
create or replace function public.clinic_belongs_to_caller(cid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from clinics
    where id = cid
      and user_id = coalesce(auth.jwt() ->> 'email', auth.uid()::text)
  );
$$;

-- Apply clinic-scope RLS to every business table
do $$
declare t text;
begin
  foreach t in array array[
    'patients', 'automation_rules', 'appointments', 'review_requests',
    'reviews', 'message_sends', 'unsubscribes', 'webhook_logs', 'integrations'
  ]
  loop
    execute format(
      'create policy %I_owner_all on %I for all using (public.clinic_belongs_to_caller(clinic_id)) with check (public.clinic_belongs_to_caller(clinic_id))',
      t, t
    );
  end loop;
end $$;

-- ============================================================================
-- Grants
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.clinic_belongs_to_caller(uuid) to authenticated;

-- ============================================================================
-- NextAuth tables
-- ============================================================================
-- V1 uses next-auth v4. Run the official NextAuth Supabase adapter SQL
-- AFTER this migration, from:
-- https://authjs.dev/reference/adapter/supabase
-- It creates the `next_auth` schema with users/accounts/sessions tables.
-- We reference auth.users.id via clinics.user_id (soft FK, no hard constraint).
-- ============================================================================
