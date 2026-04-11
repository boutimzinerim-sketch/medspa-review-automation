'use client';

import { useState } from 'react';
import { Smartphone, Star } from 'lucide-react';

interface MobilePreviewCardProps {
  clinicName: string;
  averageRating: number;
  totalReviews: number;
}

export function MobilePreviewCard({ clinicName, averageRating, totalReviews }: MobilePreviewCardProps) {
  const [source, setSource] = useState<'google' | 'yelp'>('google');
  const stars = Math.round(averageRating);

  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#1A6BFF]/15 flex items-center justify-center">
            <Smartphone size={14} className="text-[#1A6BFF]" />
          </div>
          <div>
            <h3 className="text-[12px] font-bold text-white">Customer View</h3>
            <p className="text-[10px] text-white/40">As patients see you</p>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <button
            onClick={() => setSource('google')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
              source === 'google' ? 'bg-white text-[#0f1117]' : 'text-white/40 hover:text-white/70'
            }`}
          >
            Google
          </button>
          <button
            onClick={() => setSource('yelp')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
              source === 'yelp' ? 'bg-white text-[#0f1117]' : 'text-white/40 hover:text-white/70'
            }`}
          >
            Yelp
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center py-2">
        {/* Phone frame */}
        <div className="relative w-[200px] aspect-[9/16] rounded-[28px] border-4 border-white/[0.12] bg-[#0a0c12] shadow-2xl overflow-hidden">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-[#0a0c12] rounded-b-xl z-10" />

          {source === 'google' ? (
            <div className="h-full w-full bg-white p-3 pt-6">
              <div className="text-[7px] text-[#5f6368] mb-1">{clinicName.toLowerCase().replace(/\s/g, '')}.com</div>
              <div className="text-[10px] font-semibold text-[#1a0dab] leading-tight mb-0.5">{clinicName}</div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-bold text-[#fb8c00]">{averageRating.toFixed(1)}</span>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={6} className={i < stars ? 'text-[#fb8c00]' : 'text-[#dadce0]'} fill={i < stars ? '#fb8c00' : '#dadce0'} />
                  ))}
                </div>
                <span className="text-[7px] text-[#5f6368]">({totalReviews})</span>
                <span className="text-[7px] text-[#5f6368]">· Med Spa</span>
              </div>
              <p className="text-[7px] text-[#3c4043] leading-snug">
                Premier med spa offering Botox, fillers, microneedling, and Hydrafacial. Five-star results.
              </p>
              <div className="mt-2 flex gap-1">
                <button className="text-[6px] font-medium text-white bg-[#1a73e8] px-1.5 py-0.5 rounded">Directions</button>
                <button className="text-[6px] font-medium text-[#1a73e8] border border-[#1a73e8] px-1.5 py-0.5 rounded">Website</button>
              </div>
              <div className="mt-2 pt-2 border-t border-[#dadce0]">
                <p className="text-[6px] text-[#5f6368] mb-1">REVIEWS</p>
                <p className="text-[6px] text-[#3c4043] italic">"Absolutely amazing experience..."</p>
              </div>
            </div>
          ) : (
            <div className="h-full w-full bg-white p-3 pt-6">
              <div className="flex items-start gap-1.5 mb-1">
                <div className="w-6 h-6 rounded bg-[#d32323] flex items-center justify-center text-white text-[8px] font-black">Y</div>
                <div className="flex-1">
                  <div className="text-[8px] font-bold text-[#0073bb] leading-tight">{clinicName}</div>
                  <div className="flex items-center gap-1">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 ${i < stars ? 'bg-[#d32323]' : 'bg-[#e6e6e6]'}`} />
                      ))}
                    </div>
                    <span className="text-[7px] text-[#666]">{totalReviews} reviews</span>
                  </div>
                </div>
              </div>
              <p className="text-[7px] text-[#333] leading-snug mb-1">$$ · Medical Spas, Skin Care</p>
              <div className="bg-[#f5f5f5] p-1.5 rounded text-[6px] text-[#666] italic">
                "Hands down the best med spa I've ever been to. The staff is so knowledgeable..."
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1">
                <button className="text-[6px] font-bold text-white bg-[#d32323] py-1 rounded">Write a Review</button>
                <button className="text-[6px] font-bold text-[#0073bb] border border-[#0073bb] py-1 rounded">Save</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-white/35 text-center italic mt-2">
        This is how potential patients see you.
      </p>
    </div>
  );
}
