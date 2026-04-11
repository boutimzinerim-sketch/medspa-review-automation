import { mindbodyIntegration } from './mindbody';
import { vagaroIntegration } from './vagaro';
import { acuityIntegration } from './acuity';
import type { PMSIntegration } from './types';

const integrations: Record<string, PMSIntegration> = {
  mindbody: mindbodyIntegration,
  vagaro: vagaroIntegration,
  acuity: acuityIntegration,
};

export function getPMSIntegration(pmsType: string): PMSIntegration {
  const integration = integrations[pmsType.toLowerCase()];
  if (!integration) throw new Error(`Unknown PMS type: ${pmsType}`);
  return integration;
}

export function getSupportedPMS(): { id: string; name: string; description: string }[] {
  return [
    { id: 'mindbody', name: 'Mindbody', description: 'Sync appointments, client data, and services' },
    { id: 'vagaro', name: 'Vagaro', description: 'Import bookings and client contact info' },
    { id: 'acuity', name: 'Acuity Scheduling', description: 'Pull scheduled appointments automatically' },
  ];
}
