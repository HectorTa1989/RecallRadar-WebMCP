import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'RecallRadar · Quality lineage intelligence',
  description: 'Trace a failed component to every affected unit, stage exact containment, and keep every decision auditable.',
  openGraph: {
    title: 'RecallRadar · Quality lineage intelligence',
    description: 'From failed lot to exact, reversible action.',
    type: 'website',
    images: [{ url: '/og.png', width: 1736, height: 907, alt: 'RecallRadar lineage map from failed lot to reversible action' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RecallRadar · Quality lineage intelligence',
    description: 'From failed lot to exact, reversible action.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body></html>;
}
