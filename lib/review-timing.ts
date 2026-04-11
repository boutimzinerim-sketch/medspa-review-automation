// Days to wait after appointment before sending review request
// Based on when results are typically visible for each service

export const SERVICE_TIMING: Record<string, number> = {
  'Botox': 14,
  'Dysport': 14,
  'Xeomin': 14,
  'Filler': 7,
  'Juvederm': 7,
  'Restylane': 7,
  'Radiesse': 7,
  'Laser Hair Removal': 21,
  'Laser Genesis': 14,
  'Laser Resurfacing': 30,
  'Chemical Peel': 14,
  'Microneedling': 28,
  'Microneedling RF': 28,
  'HydraFacial': 3,
  'Facial': 1,
  'Consultation': 0, // Don't send for consultations
  'default': 7,
};

export function getReviewRequestDate(appointmentDate: Date, serviceType: string): Date | null {
  const days = SERVICE_TIMING[serviceType] ?? SERVICE_TIMING['default'];
  if (days === 0) return null; // Skip consultations

  const requestDate = new Date(appointmentDate);
  requestDate.setDate(requestDate.getDate() + days);
  return requestDate;
}

export function getServiceTimingLabel(serviceType: string): string {
  const days = SERVICE_TIMING[serviceType] ?? SERVICE_TIMING['default'];
  if (days === 0) return 'No review request';
  if (days === 1) return '1 day after';
  return `${days} days after`;
}
