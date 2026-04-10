import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SERVICES = ['Botox', 'Filler', 'Laser Hair Removal', 'Microneedling'] as const;

const FIRST_NAMES = [
  'Sarah', 'Emily', 'Jessica', 'Ashley', 'Lauren', 'Amanda', 'Megan',
  'Rachel', 'Nicole', 'Stephanie', 'Jennifer', 'Michelle', 'Olivia',
  'Sophia', 'Isabella', 'Emma', 'Ava', 'Madison', 'Chloe', 'Abigail',
];

const LAST_NAMES = [
  'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore',
  'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin',
  'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez',
];

const REVIEW_TEMPLATES = {
  Botox: [
    'My forehead lines have completely disappeared! Dr. was amazing.',
    'Best Botox experience ever. Natural-looking results, no downtime.',
    'The staff made me feel so comfortable. Results are incredible!',
    'Subtle but effective. Exactly what I wanted. Highly recommend!',
    'Third time here for Botox and I won\'t go anywhere else.',
  ],
  Filler: [
    'My lips look so natural and plump! Love the results.',
    'Cheek filler gave me the contour I\'ve always wanted. 10/10!',
    'Absolutely gorgeous results. The injector was so skilled.',
    'Jaw filler changed my whole profile. Worth every penny.',
    'No bruising, no swelling. Just beautiful, natural volume.',
  ],
  'Laser Hair Removal': [
    'After 3 sessions, hair growth is down 80%. Life changing!',
    'Painless and effective. Wish I\'d done this years ago.',
    'The laser tech was so thorough and professional. Great results.',
    'Smooth skin with minimal discomfort. Booking my next session!',
    'Finally free from shaving. This place is the best.',
  ],
  Microneedling: [
    'My skin texture has completely transformed. Pores are tiny now!',
    'Acne scars are fading fast after just 2 sessions. Amazing.',
    'The glow after microneedling is unreal. My skin has never looked better.',
    'Collagen boost is real — my skin looks 10 years younger.',
    'Professional, clean, and the results speak for themselves.',
  ],
};

function randomDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  d.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
  return d;
}

function randomRating(): number {
  const weights = [0, 0, 0, 0.05, 0.25, 0.70]; // skew toward 5
  const r = Math.random();
  let cumulative = 0;
  for (let i = 1; i <= 5; i++) {
    cumulative += weights[i];
    if (r <= cumulative) return i;
  }
  return 5;
}

export async function seedClinicData(clinicId: string): Promise<{ patients: number; rules: number; reviews: number }> {
  // Check if clinic already has data
  const { count } = await supabaseAdmin
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId);

  if (count && count > 0) {
    return { patients: 0, rules: 0, reviews: 0 };
  }

  // ---- Seed 20 patients ----
  const patients = Array.from({ length: 20 }, (_, i) => ({
    clinic_id: clinicId,
    name: `${FIRST_NAMES[i]} ${LAST_NAMES[i]}`,
    email: `${FIRST_NAMES[i].toLowerCase()}.${LAST_NAMES[i].toLowerCase()}@email.com`,
    phone: `(555) ${String(100 + i).padStart(3, '0')}-${String(1000 + i * 37).slice(-4)}`,
    last_service: SERVICES[i % SERVICES.length],
    appointment_date: randomDate(30).toISOString().split('T')[0],
    reviewed: i < 12, // 60% reviewed
  }));

  const { data: insertedPatients, error: pErr } = await supabaseAdmin
    .from('patients')
    .insert(patients)
    .select('id');

  if (pErr) {
    console.error('[seed] patients error:', pErr.message);
    return { patients: 0, rules: 0, reviews: 0 };
  }

  // ---- Seed 5 automation rules ----
  const rules = [
    {
      clinic_id: clinicId,
      name: 'Botox 14-Day Follow Up',
      service_type: 'Botox',
      days_after_appointment: 14,
      email_subject: '{{patient_name}}, how are your Botox results?',
      email_body: 'Hi {{patient_name}},\n\nIt\'s been 2 weeks since your Botox treatment — your results should be fully settled by now! We\'d love to hear about your experience.\n\nWould you take 30 seconds to leave us a review?\n\nThank you!\n{{clinic_name}}',
      is_active: true,
    },
    {
      clinic_id: clinicId,
      name: 'Filler 7-Day Check In',
      service_type: 'Filler',
      days_after_appointment: 7,
      email_subject: 'Your filler results are looking beautiful, {{patient_name}}!',
      email_body: 'Hi {{patient_name}},\n\nYour filler enhancements should have fully settled by now. We hope you\'re loving your new look!\n\nIf you have a moment, we\'d appreciate a quick review.\n\nBest,\n{{clinic_name}}',
      is_active: true,
    },
    {
      clinic_id: clinicId,
      name: 'Laser 21-Day Review',
      service_type: 'Laser Hair Removal',
      days_after_appointment: 21,
      email_subject: 'Smooth skin update — how\'s it going, {{patient_name}}?',
      email_body: 'Hi {{patient_name}},\n\nIt\'s been 3 weeks since your laser hair removal session. We\'d love to hear how things are going!\n\nYour feedback helps others find the right treatment.\n\nThank you!\n{{clinic_name}}',
      is_active: true,
    },
    {
      clinic_id: clinicId,
      name: 'Microneedling 10-Day Glow',
      service_type: 'Microneedling',
      days_after_appointment: 10,
      email_subject: 'Glowing yet, {{patient_name}}? 🌟',
      email_body: 'Hi {{patient_name}},\n\nYour post-microneedling glow should be in full effect! We\'d love to hear about your experience and results.\n\nA quick review would mean the world to us.\n\nWarmly,\n{{clinic_name}}',
      is_active: true,
    },
    {
      clinic_id: clinicId,
      name: 'General 30-Day Reminder',
      service_type: 'Botox',
      days_after_appointment: 30,
      email_subject: 'We\'d love your feedback, {{patient_name}}',
      email_body: 'Hi {{patient_name}},\n\nIt\'s been a month since your last visit. If you haven\'t had a chance yet, we\'d really appreciate a quick review of your experience.\n\nThank you for choosing us!\n{{clinic_name}}',
      is_active: false,
    },
  ];

  const { error: rErr } = await supabaseAdmin.from('automation_rules').insert(rules);
  if (rErr) console.error('[seed] rules error:', rErr.message);

  // ---- Seed 40 reviews ----
  const reviews = Array.from({ length: 40 }, (_, i) => {
    const service = SERVICES[i % SERVICES.length];
    const templates = REVIEW_TEMPLATES[service];
    const rating = randomRating();
    return {
      clinic_id: clinicId,
      source: 'google',
      author_name: `${FIRST_NAMES[i % 20]} ${LAST_NAMES[(i + 5) % 20][0]}.`,
      rating,
      text: templates[i % templates.length],
      service_mentioned: service,
      sentiment: rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative',
      posted_at: randomDate(60).toISOString(),
    };
  });

  const { error: revErr } = await supabaseAdmin.from('reviews').insert(reviews);
  if (revErr) console.error('[seed] reviews error:', revErr.message);

  return {
    patients: insertedPatients?.length ?? 0,
    rules: rules.length,
    reviews: reviews.length,
  };
}
