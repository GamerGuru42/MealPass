import type { Metadata, Viewport } from 'next';
import './globals.css';
import { APP_NAME, APP_DESCRIPTOR, APP_ATTRIBUTION, UNIVERSITY_NAME } from '@/lib/constants';
import { OfflineBanner } from '@/components/shared/offline-banner';

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${UNIVERSITY_NAME}`,
    template: `%s | ${APP_NAME} — ${UNIVERSITY_NAME}`,
  },
  description: `${APP_DESCRIPTOR} for ${UNIVERSITY_NAME}. ${APP_ATTRIBUTION}`,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#1e3a5f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
      </head>
      <body className="font-sans antialiased min-h-screen bg-slate-50 flex flex-col text-slate-900 selection:bg-brand-500 selection:text-white">
        <OfflineBanner />
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration note:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
