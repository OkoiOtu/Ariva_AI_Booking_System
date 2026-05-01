import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import AppShell from '@/components/AppShell';
import { CurrencyProvider } from '@/lib/currencyContext';

export const metadata: Metadata = {
  title: 'Ariva Admin — Platform Console',
  description: 'Ariva platform administration dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CurrencyProvider>
            <AppShell>{children}</AppShell>
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
