export interface PMSAppointment {
  id: string;
  patientName: string;
  patientEmail: string;
  serviceType: string;
  appointmentDate: Date;
}

export interface PMSTokenResponse {
  access_token: string;
  refresh_token?: string;
}

export interface PMSIntegration {
  getAccessToken(clinicId: string, code: string): Promise<PMSTokenResponse>;
  getAppointments(accessToken: string, pmsClinicId: string, daysBack?: number): Promise<PMSAppointment[]>;
  getAuthUrl(clinicId: string): string;
  refreshToken?(refreshToken: string): Promise<{ access_token: string }>;
}
