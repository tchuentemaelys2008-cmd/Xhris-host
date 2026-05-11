import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Providers } from '@/components/providers';
import { Toaster } from 'react-hot-toast';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'XHRIS Host — Bot & Cloud Hosting Platform', template: '%s | XHRIS Host' },
  description: 'Deploy WhatsApp bots, manage cloud servers, and grow your SaaS with XHRIS Host. The all-in-one platform for developers.',
  keywords: ['whatsapp bot', 'cloud hosting', 'bot deploy', 'vps panel', 'saas platform'],
  authors: [{ name: 'XHRIS Host Team' }],
  creator: 'XHRIS Host',
  openGraph: {
    type: 'website',
    locale: 'fr_CM',
    url: 'https://xhris.host',
    title: 'XHRIS Host — Bot & Cloud Hosting Platform',
    description: 'Deploy WhatsApp bots and manage cloud servers with ease.',
    siteName: 'XHRIS Host',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', title: 'XHRIS Host', description: 'Deploy WhatsApp bots and cloud servers.' },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/apple-icon.png' },
};

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#0A0A0F' }],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function RootLayout({ children, params: { locale } }: RootLayoutProps) {
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans bg-[#0A0A0F] text-white min-h-screen`}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1A1A24',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                },
                success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
