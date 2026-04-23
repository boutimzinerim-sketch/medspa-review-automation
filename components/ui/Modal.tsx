'use client';

import { ReactNode, useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps { isOpen: boolean; onClose: () => void; title?: string; description?: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; footer?: ReactNode; }

const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

export function Modal({ isOpen, onClose, title, description, children, size = 'md', footer }: ModalProps) {
  const [visible, setVisible] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) { setVisible(true); requestAnimationFrame(() => setShow(true)); }
    else { setShow(false); const t = setTimeout(() => setVisible(false), 250); return () => clearTimeout(t); }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-250 ${show ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={[
        'relative w-full rounded-2xl overflow-hidden glass-card-strong',
        'shadow-[0_24px_80px_rgba(0,0,0,0.12)]',
        'transition-all duration-250 ease-out',
        show ? 'scale-100 translate-y-0' : 'scale-[0.96] translate-y-3',
        sizeClasses[size],
      ].join(' ')} role="dialog" aria-modal="true">
        {(title || description) && (
          <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
            <div>
              {title && <h2 className="text-[18px] font-bold text-white tracking-[-0.02em]">{title}</h2>}
              {description && <p className="text-[13px] text-white/40 mt-1">{description}</p>}
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all duration-150 -mr-1">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">{footer}</div>}
      </div>
    </div>
  );
}
