import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Manage integrations and clinic configuration</p>
      </div>

      {/* Integrations */}
      <Card>
        <CardHeader
          title="Integrations"
          description="Connect external services to enable full automation"
        />
        <div className="space-y-3">
          {[
            {
              name: 'Google Sheets',
              desc: 'Sync patient data from a spreadsheet',
              connected: false,
            },
            {
              name: 'Gmail',
              desc: 'Send review request emails from your inbox',
              connected: false,
            },
            {
              name: 'Google Business Profile',
              desc: 'Sync your public review rating',
              connected: false,
            },
          ].map(({ name, desc, connected }) => (
            <div
              key={name}
              className="flex items-center justify-between p-4 rounded-xl bg-white/4 border border-white/8"
            >
              <div>
                <p className="text-sm font-medium text-white">{name}</p>
                <p className="text-xs text-white/40 mt-0.5">{desc}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={connected ? 'active' : 'inactive'}>
                  {connected ? 'Connected' : 'Not Connected'}
                </Badge>
                <Button variant="outline" size="sm" disabled>
                  Connect
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/30 mt-4">Integration setup available in Phase 2.</p>
      </Card>

      {/* Clinic info placeholder */}
      <Card>
        <CardHeader
          title="Clinic Profile"
          description="Update your clinic name, timezone, and Google Place ID"
        />
        <div className="text-sm text-white/40 py-6 text-center">
          Clinic profile editing coming in Phase 2.
        </div>
      </Card>
    </div>
  );
}
