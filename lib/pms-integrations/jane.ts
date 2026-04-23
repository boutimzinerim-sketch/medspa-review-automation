import type { PMSIntegration, PMSAppointment, PMSTokenResponse } from './types';

// ============================================================================
// Jane App PMS integration
// ============================================================================
// Jane App (jane.app) is a Canadian clinic management platform widely used by
// Quebec médispa clinics. V0 of this module assumes webhook-based ingestion
// (preferred path — see app/api/webhooks/jane/[clinicId]/route.ts), with OAuth
// polling as a fallback that can be wired up once Jane developer credentials
// are available.
//
// Current status: defensive stub. Real Jane API integration will replace
// throwing stubs once credentials + docs are in hand. The webhook path in
// /api/webhooks/jane handles the primary ingestion flow without requiring
// any of the OAuth-based methods below.
// ============================================================================

const JANE_OAUTH_BASE = 'https://auth.jane.app';

export const janeIntegration: PMSIntegration = {
  getAuthUrl(clinicId: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.JANE_CLIENT_ID ?? '',
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/pms/jane/callback`,
      state: clinicId,
      scope: 'appointments:read patients:read',
    });
    return `${JANE_OAUTH_BASE}/oauth/authorize?${params}`;
  },

  async getAccessToken(_clinicId: string, code: string): Promise<PMSTokenResponse> {
    if (!process.env.JANE_CLIENT_ID || !process.env.JANE_CLIENT_SECRET) {
      throw new Error('Jane OAuth not configured yet — use webhook ingestion instead (/api/webhooks/jane/[clinicId]).');
    }

    const res = await fetch(`${JANE_OAUTH_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.JANE_CLIENT_ID,
        client_secret: process.env.JANE_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/pms/jane/callback`,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Jane auth failed: ${err}`);
    }

    return res.json();
  },

  async getAppointments(_accessToken: string, _clinicId: string, _daysBack = 30): Promise<PMSAppointment[]> {
    throw new Error(
      'Jane polling not implemented. Use webhook ingestion at /api/webhooks/jane/[clinicId] ' +
        'until real Jane API credentials + docs are available.',
    );
  },
};
