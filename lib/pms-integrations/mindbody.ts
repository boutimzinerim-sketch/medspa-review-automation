import type { PMSIntegration, PMSAppointment, PMSTokenResponse } from './types';

const API_BASE = 'https://api.mindbodyonline.com/public/v6';
const TOKEN_URL = 'https://api.mindbodyonline.com/public/v6/usertoken/issue';

export const mindbodyIntegration: PMSIntegration = {
  getAuthUrl(clinicId: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.MINDBODY_CLIENT_ID!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/pms/mindbody/callback`,
      state: clinicId,
      subscriberId: clinicId,
    });
    return `https://signin.mindbodyonline.com/connect/authorize?${params}`;
  },

  async getAccessToken(_clinicId: string, code: string): Promise<PMSTokenResponse> {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': process.env.MINDBODY_CLIENT_ID!,
      },
      body: JSON.stringify({
        Username: code,
        Password: process.env.MINDBODY_CLIENT_SECRET!,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Mindbody auth failed: ${err}`);
    }

    const data = await res.json();
    return { access_token: data.AccessToken };
  },

  async getAppointments(accessToken: string, siteId: string, daysBack = 30): Promise<PMSAppointment[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const params = new URLSearchParams({
      StartDate: startDate.toISOString().split('T')[0],
      EndDate: new Date().toISOString().split('T')[0],
    });

    const res = await fetch(`${API_BASE}/appointment/appointments?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': process.env.MINDBODY_CLIENT_ID!,
        Authorization: `Bearer ${accessToken}`,
        SiteId: siteId,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Mindbody appointments fetch failed: ${err}`);
    }

    const data = await res.json();

    return (data.Appointments ?? [])
      .filter((apt: Record<string, unknown>) => {
        const client = apt.Client as Record<string, string> | undefined;
        return client?.Email;
      })
      .map((apt: Record<string, unknown>) => {
        const client = apt.Client as Record<string, string>;
        const sessionType = apt.SessionType as Record<string, string> | undefined;
        return {
          id: String(apt.Id),
          patientName: `${client.FirstName} ${client.LastName}`.trim(),
          patientEmail: client.Email,
          serviceType: sessionType?.Name ?? 'Service',
          appointmentDate: new Date(apt.StartDateTime as string),
        };
      });
  },
};
