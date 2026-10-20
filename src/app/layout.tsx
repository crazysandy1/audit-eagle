
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuditProvider } from '@/contexts/AuditContext'; // Import AuditProvider

export const metadata: Metadata = {
  title: 'AuditEagle',
  description: 'Scan and rate websites for design and technology.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuditProvider> {/* Wrap children with AuditProvider */}
          {children}
          <Toaster />
        </AuditProvider>
      </body>
    </html>
  );
}
