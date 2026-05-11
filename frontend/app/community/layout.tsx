'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
