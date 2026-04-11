'use client';

import { useState } from 'react';
import { MessageSquare, Copy, Check, Sparkles, Star, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { NegativeReview } from '@/lib/dashboard-aggregator';

interface AIReplySuggestionCardProps {
  review: NegativeReview | null;
}

export function AIReplySuggestionCard({ review }: AIReplySuggestionCardProps) {
  const [reply, setReply] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generateReply() {
    if (!review || generating) return;
    setGenerating(true);
    setReply('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId: 'reply-to-review', reviewText: review.text }),
      });
      if (!res.body) throw new Error('No response');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setReply((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      console.error('[reply gen]', err);
      setReply('Sorry, something went wrong generating the reply.');
    } finally {
      setGenerating(false);
    }
  }

  function copyReply() {
    if (!reply) return;
    navigator.clipboard.writeText(reply);
    setCopied(true);
    toast.success('Copied to clipboard', {
      style: {
        background: 'rgba(22,25,34,0.95)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
      },
    });
    setTimeout(() => setCopied(false), 2000);
  }

  if (!review) {
    return (
      <div className="glass-card p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#34d399]/15 flex items-center justify-center mb-3">
          <Sparkles size={18} className="text-[#34d399]" />
        </div>
        <p className="text-[13px] font-bold text-white mb-1">All clear!</p>
        <p className="text-[11px] text-white/40 max-w-[260px]">No negative reviews need a response right now. Keep up the great work.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#f87171]/15 flex items-center justify-center">
            <AlertCircle size={14} className="text-[#f87171]" />
          </div>
          <div>
            <h3 className="text-[12px] font-bold text-white">Smart Reply</h3>
            <p className="text-[10px] text-white/40">AI-drafted response</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#34d399]/10 border border-[#34d399]/20">
          <span className="text-[9px] font-bold text-[#34d399]">+23% rating lift</span>
        </div>
      </div>

      {/* Original review */}
      <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-white">{review.author}</span>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={9} className={i < review.rating ? 'text-[#fbbf24]' : 'text-white/15'} fill={i < review.rating ? '#fbbf24' : 'transparent'} />
            ))}
          </div>
        </div>
        <p className="text-[11px] text-white/60 leading-relaxed line-clamp-3 italic">"{review.text}"</p>
        <p className="text-[9px] text-white/30 mt-1.5">{review.service} · {new Date(review.postedAt).toLocaleDateString()}</p>
      </div>

      {/* Reply box */}
      <div className="flex-1 rounded-xl bg-gradient-to-br from-[#FF5500]/[0.06] to-[#1A6BFF]/[0.06] border border-white/[0.08] p-3 mb-3 min-h-[80px]">
        {reply ? (
          <p className="text-[11.5px] text-white/85 leading-relaxed">{reply}{generating && <span className="animate-blink">▍</span>}</p>
        ) : generating ? (
          <p className="text-[11px] text-white/40 italic"><span className="animate-blink">▍</span> Drafting a reply with Claude...</p>
        ) : (
          <p className="text-[11px] text-white/40 italic">Click "Generate" and Claude will draft a warm, professional reply you can edit.</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={generateReply}
          disabled={generating}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-white px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#1A6BFF] shadow-[0_4px_16px_rgba(255,85,0,0.3)] hover:shadow-[0_8px_24px_rgba(255,85,0,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={13} />
          {generating ? 'Generating...' : reply ? 'Regenerate' : 'Generate Reply'}
        </button>
        {reply && (
          <button
            onClick={copyReply}
            className="inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-white px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-colors"
          >
            {copied ? <Check size={13} className="text-[#34d399]" /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}
