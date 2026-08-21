import { useHealth } from '../api/health';
import { ApiError } from '../api/client';

/**
 * Placeholder start page. Its only job right now is to prove the whole chain
 * works: browser -> HTTPS proxy -> Vite -> React -> /api/v1/health -> Go.
 */
export function HomePage() {
  const health = useHealth();

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Homban</h1>
      <p className="mt-2 text-ink-muted">
        The skeleton is running. Replace this page once we know what the app does.
      </p>

      <div className="mt-8 rounded-lg border border-line bg-surface-raised p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">Backend</h2>
          <button
            type="button"
            onClick={() => void health.refetch()}
            disabled={health.isFetching}
            className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-muted hover:text-ink disabled:opacity-50"
          >
            {health.isFetching ? 'Checking...' : 'Check again'}
          </button>
        </div>

        <div className="mt-4">
          {health.isPending && <p className="text-ink-muted">Contacting the API...</p>}

          {health.isError && (
            <p className="text-red-600 dark:text-red-400">
              {health.error instanceof ApiError
                ? `${health.error.message} (${health.error.code})`
                : 'Unexpected error.'}
            </p>
          )}

          {health.data && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              <Field label="Status" value={health.data.status} />
              <Field label="Version" value={health.data.version} />
              <Field label="Environment" value={health.data.env} />
              <Field label="Server time" value={new Date(health.data.time).toLocaleTimeString()} />
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </>
  );
}
