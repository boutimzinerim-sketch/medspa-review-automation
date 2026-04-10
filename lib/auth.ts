import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { Clinic } from './types';

// ============================================================
// Mock auth — any email signs in, no password required
// Swap for real Google OAuth / Supabase Auth before prod
// ============================================================

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Dev Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'test@medspa.com' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        if (!email) return null;

        // Auto-create clinic on first login
        try {
          await ensureClinic(email, email);
        } catch (err) {
          console.error('[auth] ensureClinic error:', err);
        }

        return {
          id: email,
          email,
          name: 'Med Spa User',
          image: null,
        };
      },
    }),
  ],

  pages: { signIn: '/', error: '/?error=auth' },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) token.userId = user.id;

      // Attach clinicId to token (fetch once, then cached in JWT)
      if (!token.clinicId && token.userId) {
        const clinic = await getClinicForUser(token.userId as string);
        if (clinic) token.clinicId = clinic.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as typeof session.user & { id: string; clinicId?: string };
        u.id = token.userId as string;
        u.clinicId = token.clinicId as string | undefined;
      }
      return session;
    },
  },
};

// ============================================================
// Helpers — same signatures used by all API routes
// ============================================================

export async function getUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const u = session.user as typeof session.user & { id?: string; clinicId?: string };
  return u.id ? { id: u.id, email: session.user.email ?? '', clinicId: u.clinicId } : null;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/');
  return user;
}

export async function getClinicForUser(userId: string): Promise<Clinic | null> {
  const { data, error } = await db
    .from('clinics')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data as Clinic;
}

export async function ensureClinic(userId: string, email: string): Promise<Clinic> {
  const existing = await getClinicForUser(userId);
  if (existing) return existing;

  const { data, error } = await db
    .from('clinics')
    .insert({ user_id: userId, name: 'My Med Spa', email })
    .select()
    .single();

  if (error) throw new Error(`Failed to create clinic: ${error.message}`);
  return data as Clinic;
}
