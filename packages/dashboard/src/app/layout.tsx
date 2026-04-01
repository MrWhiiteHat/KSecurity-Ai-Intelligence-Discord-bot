import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Threat Detector | Admin Dashboard',
  description: 'Community Threat Intelligence Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-dark-900">
        {children}
      </body>
    </html>
  );
}
