import { NavLink, Outlet } from 'react-router';
import { useLogout, useSession } from '../api/auth';

const links = [
  { to: '/', label: 'Översikt' },
  { to: '/rooms', label: 'Rum för rum' },
  { to: '/equipment', label: 'Städutrustning' },
];

/** App chrome: header, navigation, the signed-in user, and the routed page. */
export function Layout() {
  const session = useSession();
  const logout = useLogout();

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-line bg-surface-raised">
        <div className="mx-auto flex max-w-4xl items-center gap-6 px-6 py-4">
          <span className="font-semibold tracking-tight">Ring På</span>
          <nav className="flex gap-4 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  isActive ? 'text-brand font-medium' : 'text-ink-muted hover:text-ink'
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {session.data && (
            <div className="ml-auto flex items-center gap-3 text-sm">
              <span className="text-ink-muted">
                {session.data.email}
                <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs uppercase tracking-wide">
                  {session.data.role}
                </span>
              </span>
              <button
                type="button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="rounded-md border border-line px-2.5 py-1 text-ink-muted hover:text-ink disabled:opacity-50"
              >
                Logga ut
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
