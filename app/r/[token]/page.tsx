import { notFound, redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { RatingForm } from './rating-form';

// Public magic-link landing. Patient clicks from email/SMS, rates 1-5 stars.
// 4-5 routes to clinic.google_review_url. 1-3 routes to an internal feedback form.
export const dynamic = 'force-dynamic';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type ReviewRequestRow = {
  id: string;
  clinic_id: string;
  star_rating_captured: number | null;
  routed_to: 'google_external' | 'internal_feedback' | null;
  internal_feedback_submitted_at: string | null;
};

type ClinicRow = {
  name: string;
  google_review_url: string | null;
  logo_url: string | null;
};

type PatientRow = {
  name: string | null;
};

export default async function ReviewLandingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: reviewRequest } = await db
    .from('review_requests')
    .select('id, clinic_id, patient_id, star_rating_captured, routed_to, internal_feedback_submitted_at')
    .eq('id', token)
    .maybeSingle();

  if (!reviewRequest) notFound();
  const rr = reviewRequest as ReviewRequestRow & { patient_id: string | null };

  const [{ data: clinic }, { data: patient }] = await Promise.all([
    db.from('clinics').select('name, google_review_url, logo_url').eq('id', rr.clinic_id).maybeSingle(),
    rr.patient_id
      ? db.from('patients').select('name').eq('id', rr.patient_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!clinic) notFound();
  const c = clinic as ClinicRow;
  const p = (patient as PatientRow | null) ?? { name: null };

  // Already rated 4-5 — send them to Google
  if (rr.routed_to === 'google_external' && c.google_review_url) {
    redirect(c.google_review_url);
  }

  // Already submitted internal feedback — show thank-you
  if (rr.routed_to === 'internal_feedback' && rr.internal_feedback_submitted_at) {
    return (
      <Shell>
        <ClinicHeader name={c.name} />
        <h1 className="mt-8 text-2xl font-medium tracking-tight text-white">Merci pour votre retour.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-white/60">
          L'équipe de {c.name} a bien reçu vos commentaires et les examine.
        </p>
      </Shell>
    );
  }

  const firstName = p.name?.trim().split(/\s+/)[0] ?? '';
  const greeting = firstName ? `Bonjour ${firstName}` : 'Bonjour';

  return (
    <Shell>
      <ClinicHeader name={c.name} />
      <p className="mt-12 text-[13px] uppercase tracking-[0.12em] text-white/40">{greeting}</p>
      <h1 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-tight text-white sm:text-[36px]">
        Comment s'est passée votre visite à <span className="text-[#FF8A3C]">{c.name}</span>&nbsp;?
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-white/60">
        Votre retour aide l'équipe à s'améliorer.
      </p>
      <div className="mt-10">
        <RatingForm token={token} />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#000] px-6 py-16">
      <div className="w-full max-w-[440px]">{children}</div>
    </main>
  );
}

function ClinicHeader({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#FF5500]" />
      <span className="text-[13px] font-semibold uppercase tracking-[0.16em] text-white/85">
        {name}
      </span>
    </div>
  );
}
