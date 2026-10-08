import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VAULT E2EE | Private Real-Time Chat',
  description: 'Zero-knowledge end-to-end encrypted real-time chat powered by Web Crypto API and Socket.IO.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
