import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { coinsApi } from './api';

export const BALANCE_KEY = ['coins-balance'] as const;

/**
 * Single source of truth for the user's coin balance.
 * All pages must use this hook — never read from session.user.coins (stale after login).
 */
export function useCoinsBalance() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const { data, isLoading, refetch } = useQuery({
    queryKey: BALANCE_KEY,
    queryFn: () => coinsApi.getBalance(),
    enabled: !!user,
    staleTime: 0,           // always refetch on invalidate
    refetchInterval: 20000, // auto-refresh every 20s
  });

  const balance: number = (data as any)?.data?.coins ?? 0;

  return { balance, isLoading, refetch };
}

/**
 * Call this after any mutation that changes the balance.
 * Refetches all active instances immediately.
 */
export function useInvalidateBalance() {
  const qc = useQueryClient();
  return () => qc.refetchQueries({ queryKey: BALANCE_KEY, type: 'all' });
}
