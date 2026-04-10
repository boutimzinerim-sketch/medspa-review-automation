import { createClient } from '@supabase/supabase-js';
import type { Clinic, Patient, AutomationRule, ReviewRequest } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const isConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

// Client-side Supabase client (uses anon key, respects RLS)
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Server-side admin client (bypasses RLS — server use only)
export const supabaseAdmin = isConfigured
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
  : null;

// ============================================================
// Clinic helpers
// ============================================================

export async function getClinic(userId: string): Promise<Clinic | null> {
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from('clinics')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('[supabase] getClinic error:', error.message);
    return null;
  }
  return data as Clinic;
}

export async function createClinic(data: Partial<Clinic>): Promise<Clinic | null> {
  if (!supabaseAdmin) return null;

  const { data: clinic, error } = await supabaseAdmin
    .from('clinics')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('[supabase] createClinic error:', error.message);
    return null;
  }
  return clinic as Clinic;
}

// ============================================================
// Patient helpers
// ============================================================

export async function getPatients(
  clinicId: string,
  page = 1,
  limit = 20
): Promise<{ patients: Patient[]; total: number }> {
  if (!supabaseAdmin) return { patients: [], total: 0 };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabaseAdmin
    .from('patients')
    .select('*', { count: 'exact' })
    .eq('clinic_id', clinicId)
    .order('appointment_date', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[supabase] getPatients error:', error.message);
    return { patients: [], total: 0 };
  }

  return { patients: (data as Patient[]) ?? [], total: count ?? 0 };
}

export async function createPatient(data: Partial<Patient>): Promise<Patient | null> {
  if (!supabaseAdmin) return null;

  const { data: patient, error } = await supabaseAdmin
    .from('patients')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('[supabase] createPatient error:', error.message);
    return null;
  }
  return patient as Patient;
}

// ============================================================
// Automation helpers
// ============================================================

export async function getAutomationRules(clinicId: string): Promise<AutomationRule[]> {
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from('automation_rules')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[supabase] getAutomationRules error:', error.message);
    return [];
  }
  return (data as AutomationRule[]) ?? [];
}

// ============================================================
// Automation helpers (continued)
// ============================================================

export async function createAutomationRule(
  data: Partial<AutomationRule>
): Promise<AutomationRule | null> {
  if (!supabaseAdmin) return null;

  const { data: rule, error } = await supabaseAdmin
    .from('automation_rules')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('[supabase] createAutomationRule error:', error.message);
    return null;
  }
  return rule as AutomationRule;
}

// ============================================================
// Review Request helpers
// ============================================================

export async function getReviewRequests(
  clinicId: string
): Promise<ReviewRequest[]> {
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from('review_requests')
    .select('*, patients(*)')
    .eq('patients.clinic_id', clinicId)
    .order('sent_at', { ascending: false });

  if (error) {
    console.error('[supabase] getReviewRequests error:', error.message);
    return [];
  }
  return (data as ReviewRequest[]) ?? [];
}

// ============================================================
// In-memory mock store (used when Supabase is not configured)
// ============================================================

const mockPatients = new Map<string, Patient[]>();
const mockRules = new Map<string, AutomationRule[]>();

export function getMockPatients(clinicId: string, page = 1, limit = 20) {
  const all = mockPatients.get(clinicId) ?? [];
  const start = (page - 1) * limit;
  return { patients: all.slice(start, start + limit), total: all.length };
}

export function addMockPatient(clinicId: string, data: Partial<Patient>): Patient {
  const patient: Patient = {
    id: crypto.randomUUID(),
    clinic_id: clinicId,
    name: data.name ?? '',
    email: data.email ?? '',
    phone: data.phone ?? '',
    last_service: data.last_service ?? 'Other',
    appointment_date: data.appointment_date ? new Date(data.appointment_date) : new Date(),
    reviewed: false,
    created_at: new Date(),
    updated_at: new Date(),
  };
  const list = mockPatients.get(clinicId) ?? [];
  list.unshift(patient);
  mockPatients.set(clinicId, list);
  return patient;
}

export function deleteMockPatient(clinicId: string, patientId: string): boolean {
  const list = mockPatients.get(clinicId) ?? [];
  const idx = list.findIndex((p) => p.id === patientId);
  if (idx === -1) return false;
  list.splice(idx, 1);
  return true;
}

export function getMockAutomationRules(clinicId: string): AutomationRule[] {
  return mockRules.get(clinicId) ?? [];
}

export function addMockAutomationRule(clinicId: string, data: Partial<AutomationRule>): AutomationRule {
  const rule: AutomationRule = {
    id: crypto.randomUUID(),
    clinic_id: clinicId,
    name: data.name ?? '',
    service_type: data.service_type ?? 'Other',
    days_after_appointment: data.days_after_appointment ?? 14,
    email_subject: data.email_subject ?? '',
    email_template: data.email_template ?? '',
    is_active: true,
    enable_reminders: false,
    created_at: new Date(),
  };
  const list = mockRules.get(clinicId) ?? [];
  list.unshift(rule);
  mockRules.set(clinicId, list);
  return rule;
}
