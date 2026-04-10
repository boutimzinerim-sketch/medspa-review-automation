import { Card } from '@/components/ui/Card';
import { BarChart2 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-white/40 text-sm mt-1">Deep dive into your review performance</p>
      </div>

      <Card>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <BarChart2 size={24} className="text-white/30" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Analytics coming in Phase 3</h3>
          <p className="text-white/40 text-sm max-w-xs">
            Full analytics with charts, response rates, and AI insights will be available once automations are live.
          </p>
        </div>
      </Card>
    </div>
  );
}
