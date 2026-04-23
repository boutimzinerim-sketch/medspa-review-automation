'use client';

import { useEffect, useState } from 'react';
import { Play, Upload, Video } from 'lucide-react';
import type { Testimonial } from '@/lib/dashboard-mocks';

interface VideoTestimonialCarouselProps {
  testimonials: Testimonial[];
}

export function VideoTestimonialCarousel({ testimonials }: VideoTestimonialCarouselProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || testimonials.length <= 1) return;
    const interval = setInterval(() => setActive((i) => (i + 1) % testimonials.length), 6000);
    return () => clearInterval(interval);
  }, [paused, testimonials.length]);

  if (testimonials.length === 0) {
    return (
      <div className="glass-card p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.06] flex items-center justify-center mb-3">
          <Upload size={18} className="text-white/40" />
        </div>
        <p className="text-[13px] font-bold text-white mb-1">No video reviews yet</p>
        <p className="text-[11px] text-white/40 mb-4">Upload your first video testimonial</p>
        <button className="text-[11px] font-semibold text-white px-4 py-2 rounded-lg bg-gradient-to-r from-[#D4713A] to-[#1A6BFF] shadow-[0_4px_16px_rgba(212,113,58,0.3)]">
          Upload video
        </button>
      </div>
    );
  }

  const current = testimonials[active];

  return (
    <div
      className="glass-card p-6 h-full flex flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-[#D4713A]/15 flex items-center justify-center">
          <Video size={14} className="text-[#D4713A]" />
        </div>
        <div>
          <h3 className="text-[12px] font-bold text-white">Video Testimonials</h3>
          <p className="text-[10px] text-white/40">Real customer feedback</p>
        </div>
      </div>

      <div key={current.id} className="flex-1 animate-in flex flex-col">
        {/* Thumbnail */}
        <div
          className="relative rounded-2xl aspect-video mb-4 overflow-hidden border border-white/[0.08] group cursor-pointer"
          style={{ background: current.thumbnail }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <button className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
              <Play size={22} className="text-[#0f1117] ml-1" fill="#0f1117" />
            </div>
          </button>
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-[12px] font-bold text-white drop-shadow">{current.name}</p>
            <p className="text-[10px] text-white/80 uppercase tracking-wider drop-shadow">{current.service}</p>
          </div>
        </div>

        <p className="text-[12px] text-white/70 italic leading-relaxed">"{current.quote}"</p>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-4 pt-4 border-t border-white/[0.06]">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === active ? 'w-8 bg-[#D4713A]' : 'w-1.5 bg-white/15 hover:bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
