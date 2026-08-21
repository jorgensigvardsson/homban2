import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '../api/auth';

/**
 * Route guard: renders the nested routes only for a signed-in visitor, and
 * otherwise sends them to the login page, remembering where they were going.
 */
export function RequireSession() {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) {
    return (
      <div className="flex min-h-full items-center justify-center text-ink-muted" aria-busy="true">
        Loading...
      </div>
    );
  }

  if (session.isError) {
    // The API is unreachable; saying so beats bouncing to a login page that
    // cannot work either.
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-lg font-semibold">Cannot reach the server</h1>
        <p className="mt-2 text-ink-muted">Check that the backend is running, then reload.</p>
      </div>
    );
  }

  if (!session.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
