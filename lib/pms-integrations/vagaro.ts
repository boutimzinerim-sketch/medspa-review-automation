import type { PMSIntegration, PMSAppointment, PMSTokenResponse } from './types';

const API_BASE = 'https://api.vagaro.com/api/v1';

export const vagaroIntegration: PMSIntegration = {
  getAuthUrl(clinicId: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.VAGARO_CLIENT_ID!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/pms/vagaro/callback`,
      state: clinicId,
    });
    return `https://api.vagaro.com/oauth/authorize?${params}`;
  },

  async getAccessToken(_clinicId: string, code: string): Promise<PMSTokenResponse> {
    const res = await fetch('https://api.vagaro.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.VAGARO_CLIENT_ID!,
        client_secret: process.env.VAGARO_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/pms/vagaro/callback`,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Vagaro auth failed: ${err}`);
    }

    return res.json();
  },

  async getAppointments(accessToken: string, businessId: string, daysBack = 30): Promise<PMSAppointment[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const params = new URLSearchParams({
      businessId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    });

    const res = await fetch(`${API_BASE}/appointments?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Vagaro appointments fetch failed: ${err}`);
    }

    const data = await res.json();

    return (data.appointments ?? [])
      .filter((apt: Record<string, string>) => apt.clientEmail)
      .map((apt: Record<string, string>) => ({
        id: apt.appointmentId,
        patientName: apt.clientName,
        patientEmail: apt.clientEmail,
        serviceType: apt.serviceName ?? 'Service',
        appointmentDate: new Date(apt.appointmentDate),
      }));
  },

  async refreshToken(refreshToken: string) {
    const res = await fetch('https://api.vagaro.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.VAGARO_CLIENT_ID!,
        client_secret: process.env.VAGARO_CLIENT_SECRET!,
      }),
    });

    if (!res.ok) throw new Error('Vagaro token refresh failed');
    return res.json();
  },
};
