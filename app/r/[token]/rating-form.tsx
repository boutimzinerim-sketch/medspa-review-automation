'use client';

import { useState } from 'react';

type Step = 'pick' | 'submitting' | 'feedback' | 'feedback-sending' | 'done-google' | 'done-internal' | 'error';

export function RatingForm({ token }: { token: string }) {
  const [step, setStep] = useState<Step>('pick');
  const [hovered, setHovered] = useState(0);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submitRating(stars: number) {
    setRating(stars);
    setStep('submitting');
    setError(null);
    try {
      const res = await fetch(`/r/${token}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rating: stars }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Submission failed');

      if (data.route === 'google_external' && data.url) {
        setStep('done-google');
        setTimeout(() => {
          window.location.href = data.url;
        }, 900);
      } else if (data.route === 'internal_feedback') {
        setStep('feedback');
      } else {
        throw new Error('Unknown routing response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setStep('error');
    }
  }

  async function submitFeedback() {
    setStep('feedback-sending');
    setError(null);
    try {
      const res = await fetch(`/r/${token}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ feedback: feedback.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Submission failed');
      setStep('done-internal');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setStep('error');
    }
  }

  if (step === 'done-google') {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-[15px] text-white/80">
        Merci&nbsp;! Redirection vers Google…
      </div>
    );
  }

  if (step === 'done-internal') {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-[15px] text-white/80">
        Merci pour vos commentaires. L'équipe va les examiner.
      </div>
    );
  }

  if (step === 'feedback' || step === 'feedback-sending') {
    const sending = step === 'feedback-sending';
    return (
      <div>
        <p className="text-[14px] leading-relaxed text-white/60">
          Que pouvons-nous améliorer&nbsp;? Votre message va directement à l'équipe de la clinique.
        </p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={sending}
          rows={5}
          placeholder="Dites-nous ce qui s'est mal passé…"
          className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[15px] leading-relaxed text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none disabled:opacity-60"
        />
        <button
          onClick={submitFeedback}
          disabled={sending || feedback.trim().length === 0}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-[14px] font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? 'Envoi…' : 'Envoyer mes commentaires'}
        </button>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-[14px] text-red-200">
          {error ?? 'Une erreur est survenue.'}
        </div>
        <button
          onClick={() => {
            setStep('pick');
            setRating(0);
            setError(null);
          }}
          className="mt-4 text-[14px] text-white/60 underline underline-offset-4 hover:text-white"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const submitting = step === 'submitting';
  const active = hovered || rating;
  return (
    <div>
      <div className="flex items-center gap-2" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={submitting}
            onMouseEnter={() => setHovered(n)}
            onClick={() => submitRating(n)}
            aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
            className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60 sm:h-16 sm:w-16"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 transition"
              fill={n <= active ? '#D4713A' : 'none'}
              stroke={n <= active ? '#D4713A' : 'rgba(255,255,255,0.35)'}
              strokeWidth={1.5}
              strokeLinejoin="round"
            >
              <path d="M12 2.5l2.9 6.2 6.6.6-5 4.6 1.5 6.6L12 17l-5.9 3.5 1.5-6.6-5-4.6 6.6-.6L12 2.5z" />
            </svg>
          </button>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-white/40">
        {submitting ? 'Envoi…' : 'Appuyez sur une étoile pour continuer.'}
      </p>
    </div>
  );
}
