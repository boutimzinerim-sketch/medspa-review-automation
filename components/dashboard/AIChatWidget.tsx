'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, MessageCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS: Array<{ id: string; label: string }> = [
  { id: 'pending-reviews', label: 'You have pending reviews' },
  { id: 'compare-week-vs-month', label: 'Compare this week vs last month' },
  { id: 'top-services', label: 'Show me top-rated services' },
];

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  async function sendMessage(opts: { message?: string; suggestionId?: string; label?: string }) {
    if (streaming) return;
    const display = opts.message ?? opts.label ?? '';
    if (!display.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: display }, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts.suggestionId ? { suggestionId: opts.suggestionId } : { message: opts.message }),
      });
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant') {
            next[next.length - 1] = { ...last, content: last.content + chunk };
          }
          return next;
        });
      }
    } catch (err) {
      console.error('[chat] error:', err);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: 'Sorry — something went wrong.' };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#D4713A] to-[#1A6BFF] flex items-center justify-center shadow-[0_8px_32px_rgba(212,113,58,0.5)] animate-pulse-glow hover:scale-105 transition-transform"
          aria-label="Open AI assistant"
        >
          <MessageCircle size={22} className="text-white" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#34d399] border-2 border-[#0f1117]" />
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-[min(400px,calc(100vw-32px))] h-[min(560px,calc(100vh-100px))] glass-card-strong flex flex-col overflow-hidden animate-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D4713A] to-[#1A6BFF] flex items-center justify-center">
                <Sparkles size={15} className="text-white" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-white">ReviewFlow AI</p>
                <p className="text-[10px] text-white/50">Online • Ready to help</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white p-1">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4713A]/20 to-[#1A6BFF]/20 items-center justify-center mb-3">
                  <Sparkles size={20} className="text-white" />
                </div>
                <p className="text-[13px] font-semibold text-white mb-1">Ask me about your reviews</p>
                <p className="text-[11px] text-white/50 leading-relaxed max-w-[260px] mx-auto">
                  I know your latest stats. Try a suggestion below or ask me anything.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={[
                    'max-w-[82%] px-3.5 py-2.5 text-[12.5px] leading-relaxed rounded-2xl',
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-[#D4713A] to-[#E09060] text-white rounded-br-md shadow-[0_4px_16px_rgba(212,113,58,0.3)]'
                      : 'bg-white/[0.06] border border-white/[0.08] text-white/90 rounded-bl-md',
                  ].join(' ')}
                >
                  {m.content || (streaming && i === messages.length - 1 ? <span className="animate-blink">▍</span> : null)}
                </div>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          {messages.length === 0 && (
            <div className="px-5 pb-3 space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => sendMessage({ suggestionId: s.id, label: s.label })}
                  disabled={streaming}
                  className="w-full text-left text-[11.5px] text-white/80 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-[#D4713A]/30 transition-all"
                >
                  <span className="text-[#D4713A] mr-1.5">→</span>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-5 py-4 border-t border-white/[0.08]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage({ message: input });
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                disabled={streaming}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[12.5px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4713A]/40 transition-colors"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4713A] to-[#1A6BFF] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-transform"
              >
                <Send size={15} className="text-white" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
