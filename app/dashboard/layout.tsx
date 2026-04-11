import { requireUser, getClinicForUser } from '@/lib/auth';
import { Sidebar } from '@/components/ui/Sidebar';
import { TopNav } from '@/components/ui/TopNav';
import { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const clinic = await getClinicForUser(user.id);

  return (
    <div className="relative flex min-h-screen text-white">
      {/* Page-level radial glow + grid pattern background */}
      <div className="fixed inset-0 -z-10 bg-glow-radial">
        <div className="absolute inset-0 bg-grid-faint" />
      </div>

      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-[260px] pb-20 md:pb-0">
        <TopNav clinicName={clinic?.name} userEmail={user.email} />
        <main className="flex-1 px-4 py-8 sm:px-6 md:px-8 max-w-[1400px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
