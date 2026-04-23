'use client';

import { Heart } from 'lucide-react';
import type { WordCloudEntry } from '@/lib/dashboard-mocks';

interface SentimentAnalyzerProps {
  score: number;
  words: WordCloudEntry[];
}

function scoreColor(score: number): string {
  if (score >= 9) return '#34d399';
  if (score >= 7) return '#1A6BFF';
  if (score >= 5) return '#fbbf24';
  return '#f87171';
}

function scoreLabel(score: number): string {
  if (score >= 9) return 'Excellent';
  if (score >= 7) return 'Strong';
  if (score >= 5) return 'Mixed';
  return 'Needs work';
}

export function SentimentAnalyzer({ score, words }: SentimentAnalyzerProps) {
  const color = scoreColor(score);
  const label = scoreLabel(score);

  // Sort by count descending then map count to font size 11..28
  const maxCount = Math.max(...words.map((w) => w.count), 1);
  const fallbackWords: WordCloudEntry[] = [
    { word: 'professional', count: 8 },
    { word: 'results', count: 7 },
    { word: 'amazing', count: 6 },
    { word: 'friendly', count: 6 },
    { word: 'natural', count: 5 },
    { word: 'gentle', count: 5 },
    { word: 'clean', count: 4 },
    { word: 'caring', count: 4 },
    { word: 'recommend', count: 4 },
    { word: 'happy', count: 3 },
  ];
  const list = words.length > 0 ? words : fallbackWords;
  const cappedMax = Math.max(...list.map((w) => w.count), 1);

  return (
    <div className="card-orange p-6 h-full flex flex-col relative overflow-hidden">
      <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }} />

      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
            <Heart size={14} style={{ color }} fill={color} />
          </div>
          <div>
            <h3 className="text-[12px] font-bold text-[#1A1A1A]">Sentiment</h3>
            <p className="text-[10px] text-[#1A1A1A]/50">From review text</p>
          </div>
        </div>
      </div>

      <div className="relative text-center mb-5">
        <div className="font-display text-[52px] tabular-nums leading-none tracking-[-0.02em]" style={{ color }}>
          {score.toFixed(1)}
        </div>
        <p className="text-[10px] uppercase tracking-[0.15em] mt-1" style={{ color }}>{label}</p>
      </div>

      <div className="relative flex-1 flex items-center justify-center">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
          {list.map(({ word, count }) => {
            const ratio = count / cappedMax;
            const fontSize = 11 + ratio * 15;
            const opacity = 0.4 + ratio * 0.55;
            return (
              <span
                key={word}
                className="font-semibold text-[#1A1A1A] inline-block hover:scale-110 transition-transform cursor-default"
                style={{ fontSize: `${fontSize}px`, opacity, lineHeight: 1.1 }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-[#1A1A1A]/40 mt-4 text-center italic">
        Customers love mentioning these words
      </p>
    </div>
  );
}
