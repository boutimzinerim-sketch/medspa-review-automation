'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Star, Calendar, ArrowUpRight, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export function QuickActionRow() {
  const [scheduleOpen, setScheduleOpen] = useState(false);

  function sendReminder() {
    toast.success('Review reminder queued for 12 patients', {
      icon: '✉️',
      style: {
        background: 'rgba(22,25,34,0.95)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
      },
    });
  }

  const actions = [
    {
      id: 'reminder',
      label: 'Send Review Reminder',
      desc: 'Email patients who haven\'t responded',
      icon: Mail,
      color: '#FF5500',
      onClick: sendReminder,
    },
    {
      id: 'top-reviews',
      label: 'View Top Reviews',
      desc: 'See your highest-rated feedback',
      icon: Star,
      color: '#1A6BFF',
      href: '/dashboard/reviews',
    },
    {
      id: 'follow-up',
      label: 'Schedule Follow-up',
      desc: 'Plan a check-in with a patient',
      icon: Calendar,
      color: '#34d399',
      onClick: () => setScheduleOpen(true),
    },
  ] as const;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {actions.map((a) => {
          const Inner = (
            <div className="glass-card p-5 group hover:bg-white/[0.06] transition-all duration-300 cursor-pointer h-full flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                style={{
                  background: `${a.color}1a`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 24px ${a.color}25`,
                }}
              >
                <a.icon size={20} style={{ color: a.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-white group-hover:text-white">{a.label}</p>
                <p className="text-[11px] text-white/50 mt-0.5 truncate">{a.desc}</p>
              </div>
              <ArrowUpRight size={15} className="text-white/30 group-hover:text-[#FF5500] transition-colors shrink-0" />
            </div>
          );

          if ('href' in a) {
            return (
              <Link key={a.id} href={a.href}>
                {Inner}
              </Link>
            );
          }
          return (
            <button key={a.id} onClick={a.onClick} className="text-left">
              {Inner}
            </button>
          );
        })}
      </div>

      {/* Schedule modal */}
      {scheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setScheduleOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative glass-card-strong p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setScheduleOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#34d399]/15 flex items-center justify-center">
                <Calendar size={18} className="text-[#34d399]" />
              </div>
              <div>
                <h3 className="font-display text-[22px] text-white leading-none">Schedule Follow-up</h3>
                <p className="text-[11px] text-white/50 mt-1">Plan a personalized touchpoint</p>
              </div>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Patient name or email"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#34d399]/40"
              />
              <input
                type="date"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#34d399]/40"
              />
              <textarea
                rows={3}
                placeholder="Note (optional)"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#34d399]/40 resize-none"
              />
              <button
                onClick={() => {
                  setScheduleOpen(false);
                  toast.success('Follow-up scheduled', {
                    icon: <Check size={16} className="text-[#34d399]" />,
                    style: {
                      background: 'rgba(22,25,34,0.95)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(12px)',
                    },
                  });
                }}
                className="w-full bg-gradient-to-r from-[#34d399] to-[#1A6BFF] text-white font-semibold py-3 rounded-xl shadow-[0_8px_24px_rgba(52,211,153,0.3)] hover:shadow-[0_8px_32px_rgba(52,211,153,0.45)] transition-shadow"
              >
                Add to schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
