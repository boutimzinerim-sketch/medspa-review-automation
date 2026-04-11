import type { PMSIntegration, PMSAppointment, PMSTokenResponse } from './types';

const API_BASE = 'https://acuityscheduling.com/api/v1';

export const acuityIntegration: PMSIntegration = {
  getAuthUrl(clinicId: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.ACUITY_CLIENT_ID!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/pms/acuity/callback`,
      state: clinicId,
      scope: 'api-v1',
    });
    return `https://acuityscheduling.com/oauth2/authorize?${params}`;
  },

  async getAccessToken(_clinicId: string, code: string): Promise<PMSTokenResponse> {
    const res = await fetch('https://acuityscheduling.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.ACUITY_CLIENT_ID!,
        client_secret: process.env.ACUITY_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/pms/acuity/callback`,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Acuity auth failed: ${err}`);
    }

    return res.json();
  },

  async getAppointments(accessToken: string, _clinicId: string, daysBack = 30): Promise<PMSAppointment[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const params = new URLSearchParams({
      minDate: startDate.toISOString().split('T')[0],
      maxDate: new Date().toISOString().split('T')[0],
      max: '200',
    });

    const res = await fetch(`${API_BASE}/appointments?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Acuity appointments fetch failed: ${err}`);
    }

    const appointments = await res.json();

    return (appointments ?? [])
      .filter((apt: Record<string, string>) => apt.email)
      .map((apt: Record<string, string>) => ({
        id: String(apt.id),
        patientName: `${apt.firstName} ${apt.lastName}`.trim(),
        patientEmail: apt.email,
        serviceType: apt.type ?? 'Service',
        appointmentDate: new Date(apt.datetime),
      }));
  },

  async refreshToken(refreshToken: string) {
    const res = await fetch('https://acuityscheduling.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.ACUITY_CLIENT_ID!,
        client_secret: process.env.ACUITY_CLIENT_SECRET!,
      }),
    });

    if (!res.ok) throw new Error('Acuity token refresh failed');
    return res.json();
  },
};
