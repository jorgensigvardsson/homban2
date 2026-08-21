/**
 * Health endpoint bindings.
 *
 * Each API resource gets a module like this one: the response types, a
 * queryOptions factory (so the same key/fetcher can be reused for prefetching
 * or invalidation), and a thin hook.
 */
import { queryOptions, useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface Health {
  status: string;
  version: string;
  env: string;
  time: string;
}

export const healthQuery = () =>
  queryOptions({
    queryKey: ['health'] as const,
    queryFn: ({ signal }) => apiFetch<Health>('/health', { signal }),
    // The backend restarts often in development; keep this cheap and fresh.
    staleTime: 10_000,
  });

export function useHealth() {
  return useQuery(healthQuery());
}
