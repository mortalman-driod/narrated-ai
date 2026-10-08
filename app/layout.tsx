import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Narrated AI — Viral Storyboard & Diffusion Prompt Architect',
  description: 'AI-automated narrative engine generating timestamped scripts paired with diffusion prompts across runtimes from 30s to 2 hours.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-slate-100 antialiased selection:bg-accent-cyan/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
