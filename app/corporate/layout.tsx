import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Montelibero Initiation | Corporate',
};

export default function CorporateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 