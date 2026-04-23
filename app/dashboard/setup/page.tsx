'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getSupportedPMS } from '@/lib/pms-integrations/manager';
import { ChevronRight, Upload, CheckCircle, AlertCircle, Link2 } from 'lucide-react';

const pmsOptions = [
  { id: 'mindbody', name: 'Mindbody', desc: 'Sync appointments, clients, and services', color: '#D4713A' },
  { id: 'vagaro', name: 'Vagaro', desc: 'Import bookings and client contact info', color: '#1A6BFF' },
  { id: 'acuity', name: 'Acuity Scheduling', desc: 'Pull scheduled appointments automatically', color: '#8b5cf6' },
];

export default function SetupPage() {
  const router = useRouter();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleConnect(pmsType: string) {
    setConnecting(pmsType);
    setError('');

    try {
      const res = await fetch(`/api/pms/${pmsType}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId: 'demo-clinic' }), // Replace with real clinic ID from session
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setConnecting(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[#9CA3AF]">
        <span>ReviewFlow</span><ChevronRight size={12} /><span className="text-[#6B7280]">Setup</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="font-display text-[32px] text-[#1A1A1A] tracking-[-0.02em]">Connect your PMS</h1>
        <p className="text-[14px] text-[#9CA3AF] mt-2 max-w-md">
          Link your practice management system to automatically sync appointments and send review requests at the right time.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200/60 text-red-700 text-[13px]">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* PMS options */}
      <div className="space-y-3">
        {pmsOptions.map(({ id, name, desc, color }) => (
          <Card key={id} hoverable padding="none">
            <button
              onClick={() => handleConnect(id)}
              disabled={connecting === id}
              className="w-full flex items-center gap-5 p-6 text-left disabled:opacity-60"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}10` }}>
                <Link2 size={22} style={{ color }} />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-[#1A1A1A]">{name}</p>
                <p className="text-[12px] text-[#9CA3AF] mt-0.5">{desc}</p>
              </div>
              <div className="shrink-0">
                {connecting === id ? (
                  <div className="w-5 h-5 border-2 border-[#D4713A] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ChevronRight size={18} className="text-[#C4C4C4]" />
                )}
              </div>
            </button>
          </Card>
        ))}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-black/[0.06]" />
        <span className="text-[11px] text-[#C4C4C4] uppercase tracking-[0.1em]">or</span>
        <div className="flex-1 border-t border-black/[0.06]" />
      </div>

      {/* Manual import */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-[#F5F0EA] flex items-center justify-center shrink-0">
            <Upload size={22} className="text-[#6B7280]" />
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-[#1A1A1A]">Import manually</p>
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">Upload a CSV file or add patients one by one</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/patients')}>
            Import CSV
          </Button>
        </div>
      </Card>

      {/* Security note */}
      <div className="text-center py-4">
        <p className="text-[11px] text-[#C4C4C4]">
          Your credentials are encrypted with AES-256. ReviewFlow never stores passwords.
        </p>
      </div>
    </div>
  );
}
