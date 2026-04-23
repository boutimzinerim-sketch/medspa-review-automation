'use client';

import React, { useEffect, useRef, ReactNode } from 'react';

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className = '' }: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const handler = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--x', `${e.clientX - rect.left}px`);
      el.style.setProperty('--y', `${e.clientY - rect.top}px`);
    };
    el.addEventListener('pointermove', handler);
    return () => el.removeEventListener('pointermove', handler);
  }, []);

  return (
    <div
      ref={cardRef}
      className={`spotlight-card glass-card relative overflow-hidden ${className}`}
    >
      <div className="spotlight-glow pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
