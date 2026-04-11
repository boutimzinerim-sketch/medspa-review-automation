'use client';

import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
        <AlertTriangle size={28} className="text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Something went wrong</h2>
      <p className="text-[#9CA3AF] text-sm mb-6 max-w-md">We ran into an unexpected error. This has been logged.</p>
      <Button onClick={reset} variant="outline" size="sm">Try again</Button>
    </div>
  );
}
