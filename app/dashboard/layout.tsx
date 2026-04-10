import { requireUser, getClinicForUser } from '@/lib/auth';
import { Sidebar } from '@/components/ui/Sidebar';
import { TopNav } from '@/components/ui/TopNav';
import { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const clinic = await getClinicForUser(user.id);

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-60">
        <TopNav clinicName={clinic?.name} userEmail={user.email} />
        <main className="flex-1 p-8 max-w-screen-xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
