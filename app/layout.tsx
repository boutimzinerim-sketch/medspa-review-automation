import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ReviewFlow — Med Spa Review Automation',
  description:
    'Turn every treatment into a 5-star review. AI-powered review automation for med spas & aesthetics clinics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-[#0f1117] text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
