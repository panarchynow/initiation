import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Montelibero Initiation | Participant',
};

export default function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 