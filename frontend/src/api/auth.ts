/**
 * Sign-in bindings.
 *
 * The session token lives in an HttpOnly cookie, so JavaScript never sees it.
 * That means there is nothing to store in localStorage and nothing to attach to
 * requests by hand: the browser sends the cookie automatically. Whether we are
 * signed in is answered by the server through `/auth/me`.
 */
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from './client';

/** A role carried in the session token. Extend alongside the Go Role type. */
export type Role = 'admin';

/** The signed-in user. */
export interface Identity {
  email: string;
  role: Role;
}

/** What the server tells us after accepting a code request. */
export interface CodeRequested {
  email: string;
  expiresAt: string;
  resendAfterSeconds: number;
  codeLength: number;
  /** True while codes are printed to the server log instead of mailed. */
  deliveredToStdout: boolean;
}

/** The cache key for the current session. */
export const sessionKey = ['session'] as const;

/**
 * The current session, or null when signed out.
 *
 * A 401 is the normal answer for a visitor without a cookie, so it is mapped to
 * null instead of an error state. Every other failure stays an error.
 */
export const sessionQuery = () =>
  queryOptions({
    queryKey: sessionKey,
    queryFn: async ({ signal }): Promise<Identity | null> => {
      try {
        return await apiFetch<Identity>('/auth/me', { signal });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    // The cookie outlives a reload, so this is worth keeping warm.
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

/** Reads the current session. `data === null` means signed out. */
export function useSession() {
  return useQuery(sessionQuery());
}

/** Asks the backend to mail (or, in development, print) a sign-in code. */
export function useRequestCode() {
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch<CodeRequested>('/auth/request-code', { method: 'POST', body: { email } }),
  });
}

/** Redeems a code. On success the session cookie is set by the response. */
export function useVerifyCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { email: string; code: string }) =>
      apiFetch<Identity>('/auth/verify-code', { method: 'POST', body: input }),
    onSuccess: (identity) => {
      // Seed the session cache so the guard lets us through without a
      // round trip.
      queryClient.setQueryData(sessionKey, identity);
    },
  });
}

/** Clears the session cookie and drops every cached query. */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
    onSettled: async () => {
      // Even if the request failed, treat the user as signed out locally and
      // throw away data belonging to the old session.
      queryClient.clear();
      queryClient.setQueryData(sessionKey, null);
    },
  });
}
