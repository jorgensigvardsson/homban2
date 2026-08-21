import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-ink-muted">That route does not exist yet.</p>
      <Link to="/" className="mt-6 inline-block text-brand hover:underline">
        Back to start
      </Link>
    </section>
  );
}
