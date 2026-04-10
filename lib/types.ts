// ============================================================
// ReviewFlow — Core TypeScript Types
// Single source of truth for all data shapes across the app
// ============================================================

export type ServiceType =
  | 'Botox'
  | 'Filler'
  | 'Laser Hair Removal'
  | 'Microneedling'
  | 'Chemical Peel'
  | 'PRP'
  | 'Hydrafacial'
  | 'Sculptra'
  | 'Kybella'
  | 'Coolsculpting'
  | 'Other';

export type ReviewSource = 'google' | 'yelp' | 'trustpilot';

export type ResponseStatus = 'pending' | 'clicked' | 'reviewed' | 'no_response';

export type Sentiment = 'positive' | 'neutral' | 'negative';

export type IntegrationProvider = 'google_sheets' | 'gmail' | 'google_business';

// ============================================================
// Core Entities
// ============================================================

export interface Clinic {
  id: string;
  name: string;
  email: string;
  phone: string;
  timezone: string;
  google_place_id: string;
  current_rating: number;
  total_reviews: number;
  created_at: Date;
  user_id: string; // links to NextAuth user
}

export interface Patient {
  id: string;
  clinic_id: string;
  name: string;
  email: string;
  phone: string;
  last_service: ServiceType;
  appointment_date: Date;
  reviewed: boolean;
  review_link?: string;
  review_text?: string;
  response_sent_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AutomationRule {
  id: string;
  clinic_id: string;
  name: string;
  service_type: ServiceType;
  days_after_appointment: number;
  email_subject: string;
  email_template: string;
  is_active: boolean;
  enable_reminders: boolean;
  reminder_days_1?: number;
  reminder_days_2?: number;
  created_at: Date;
}

export interface ReviewRequest {
  id: string;
  patient_id: string;
  automation_rule_id: string;
  sent_at: Date;
  response_status: ResponseStatus;
  review_link_sent?: string;
  first_reminder_sent: boolean;
  second_reminder_sent: boolean;
  created_at: Date;
  // Joined
  patient?: Patient;
}

export interface Review {
  id: string;
  clinic_id: string;
  source: ReviewSource;
  author_name: string;
  rating: number; // 1–5
  text: string;
  service_mentioned?: string;
  results_mentioned?: string;
  sentiment: Sentiment;
  posted_at: Date;
  synced_at: Date;
}

export interface Integration {
  id: string;
  clinic_id: string;
  provider: IntegrationProvider;
  access_token: string; // encrypted at rest
  refresh_token?: string;
  is_active: boolean;
  connected_at: Date;
}

// ============================================================
// API Response Types
// ============================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  error: string;
  code?: string;
}

// ============================================================
// Dashboard / Analytics Types
// ============================================================

export interface DashboardStats {
  total_reviews: number;
  average_rating: number;
  response_rate: number; // percentage 0–100
  month_over_month_growth: number; // percentage, can be negative
}

export interface ReviewChartDataPoint {
  date: string;
  reviews: number;
  response_rate: number;
}

export interface ServiceBreakdown {
  service: ServiceType;
  count: number;
  percentage: number;
}
