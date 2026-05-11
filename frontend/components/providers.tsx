'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, useEffect } from 'react';

interface ProvidersProps {
  children: React.ReactNode;
}

function SessionSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    const accessToken = (session?.user as any)?.accessToken;
    if (accessToken) {
      localStorage.setItem('auth_token', accessToken);
    }
  }, [session, status]);

  return null;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SessionSync />
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
