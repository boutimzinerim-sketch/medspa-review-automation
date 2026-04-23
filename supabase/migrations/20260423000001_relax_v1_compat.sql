-- ============================================================================
-- V1-compat relaxations
-- ============================================================================
-- The initial schema had stricter constraints than V1's code expects.
-- This migration softens them so V1 can run unchanged against the new DB.
-- Tighten these back when the Épidou onboarding flow is built.
-- ============================================================================

-- clinics.phone: V1's ensureClinic inserts only {user_id, name, email}
alter table clinics alter column phone drop not null;

-- automation_rules.channel: V1 is email-only today; SMS arrives later
alter table automation_rules alter column channel set default 'email';

-- Loosen channel/template coupling — require at least one template, either one
alter table automation_rules drop constraint automation_rules_check;
alter table automation_rules add constraint automation_rules_template_check
  check (email_template is not null or sms_template is not null);

-- patients.consent_source: default so V1 seed + auto-creation flows work.
-- 'appointment' matches the primary Épidou consent path (Jane webhooks).
alter table patients alter column consent_source set default 'appointment';
