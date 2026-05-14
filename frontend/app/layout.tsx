import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Providers } from '@/components/providers';
import FooterWrapper from '@/components/FooterWrapper';
import { Toaster } from 'react-hot-toast';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'XHRIS Host — Hébergement Bot WhatsApp & Serveurs Cloud', template: '%s | XHRIS Host' },
  description: 'Déployez vos bots WhatsApp, gérez vos serveurs cloud et développez votre SaaS avec XHRIS Host. La plateforme tout-en-un pour développeurs africains.',
  keywords: [
    'whatsapp bot', 'hébergement bot', 'cloud hosting', 'bot deploy', 'vps panel', 'saas platform',
    'bot whatsapp cameroun', 'hébergement whatsapp', 'marketplace bot', 'terminal vps', 'xhris host',
    'bot hosting africa', 'serveur cloud', 'wave payment', 'orange money', 'mtn momo',
  ],
  authors: [{ name: 'XHRIS Host', url: 'https://xhrisfolio.vercel.app' }],
  creator: 'XHRIS Host',
  publisher: 'XHRIS Host',
  metadataBase: new URL('https://xhrishost.site'),
  alternates: { canonical: 'https://xhrishost.site' },
  openGraph: {
    type: 'website',
    locale: 'fr_CM',
    url: 'https://xhrishost.site',
    title: 'XHRIS Host — Hébergement Bot WhatsApp & Serveurs Cloud',
    description: 'Déployez vos bots WhatsApp et gérez vos serveurs cloud en quelques clics. 10 coins offerts à l\'inscription.',
    siteName: 'XHRIS Host',
    images: [{ url: 'https://xhrishost.site/og-image.png', width: 1200, height: 630, alt: 'XHRIS Host Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XHRIS Host — Bot WhatsApp & Cloud',
    description: 'Déployez vos bots WhatsApp et serveurs cloud. Plateforme SaaS tout-en-un.',
    images: ['https://xhrishost.site/og-image.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/icon-192.png' },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || '' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'XHRIS Host',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
            <FooterWrapper />
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
