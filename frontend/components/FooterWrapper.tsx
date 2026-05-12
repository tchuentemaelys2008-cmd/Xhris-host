'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

const HIDDEN_PATHS = ['/dashboard', '/auth', '/admin', '/developer'];

export default function FooterWrapper() {
  const pathname = usePathname();
  const hide = HIDDEN_PATHS.some((p) => pathname.startsWith(p));
  if (hide) return null;
  return <Footer />;
}
