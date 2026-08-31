import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { AuthProvider } from '@/components/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'WhatsApp CRM',
  description: 'Production-ready WhatsApp CRM Plugin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
