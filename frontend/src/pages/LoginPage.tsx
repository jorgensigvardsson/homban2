import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError } from '../api/client';
import { type CodeRequested, useRequestCode, useSession, useVerifyCode } from '../api/auth';
import { useCountdown } from '../hooks/useCountdown';

/**
 * Passwordless sign-in, in two steps: enter an email address, then enter the
 * code that was sent to it.
 */
export function LoginPage() {
  const session = useSession();
  const location = useLocation();

  // Where to go after signing in: back where the user was headed, or home.
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [pending, setPending] = useState<CodeRequested | null>(null);

  // Already signed in: skip the form entirely.
  if (session.data) return <Navigate to={from} replace />;

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to Homban</h1>

      {pending === null ? (
        <EmailStep
          email={email}
          onEmailChange={setEmail}
          onSent={setPending}
        />
      ) : (
        <CodeStep
          request={pending}
          redirectTo={from}
          onStartOver={() => setPending(null)}
          onResent={setPending}
        />
      )}
    </main>
  );
}

function EmailStep({
  email,
  onEmailChange,
  onSent,
}: {
  email: string;
  onEmailChange: (value: string) => void;
  onSent: (result: CodeRequested) => void;
}) {
  const requestCode = useRequestCode();

  return (
    <>
      <p className="mt-2 text-ink-muted">
        Enter your email address and we will send you a one-time sign-in code.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          requestCode.mutate(email.trim(), { onSuccess: onSent });
        }}
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-black outline-none focus:border-brand"
          />
        </div>

        <ErrorNote error={requestCode.error} />

        <button
          type="submit"
          disabled={requestCode.isPending || email.trim() === ''}
          className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {requestCode.isPending ? 'Sending...' : 'Send code'}
        </button>
      </form>
    </>
  );
}

function CodeStep({
  request,
  redirectTo,
  onStartOver,
  onResent,
}: {
  request: CodeRequested;
  redirectTo: string;
  onStartOver: () => void;
  onResent: (result: CodeRequested) => void;
}) {
  const navigate = useNavigate();
  const verifyCode = useVerifyCode();
  const requestCode = useRequestCode();
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const expiresIn = useCountdown(request.expiresAt);
  // Pin the resend deadline to when this code was issued. Computing it inline
  // would move it forward on every render, and the countdown would never run
  // down.
  const resendAt = useMemo(
    () => new Date(Date.now() + request.resendAfterSeconds * 1000).toISOString(),
    [request],
  );
  const resendIn = useCountdown(resendAt);
  const expired = expiresIn <= 0;

  // A fresh code means a fresh input.
  useEffect(() => {
    setCode('');
    inputRef.current?.focus();
  }, [request.expiresAt]);

  return (
    <>
      <p className="mt-2 text-ink-muted">
        We sent a {request.codeLength}-digit code to{' '}
        <span className="font-medium text-ink">{request.email}</span>.
      </p>

      {request.deliveredToStdout && (
        <p className="mt-4 rounded-md border border-line bg-surface-raised p-3 text-sm text-ink-muted">
          <span className="font-medium text-ink">Development mode:</span> no mail was
          sent. The code is printed in the terminal running <code>npm run dev</code>,
          in the <code>[backend]</code> output.
        </p>
      )}

      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          verifyCode.mutate(
            { email: request.email, code },
            { onSuccess: () => void navigate(redirectTo, { replace: true }) },
          );
        }}
      >
        <div>
          <label htmlFor="code" className="block text-sm font-medium">
            Sign-in code
          </label>
          <input
            id="code"
            ref={inputRef}
            type="text"
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern={`\\d{${request.codeLength}}`}
            maxLength={request.codeLength}
            value={code}
            // Keep digits only, so a pasted code with stray spaces still works.
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-center font-mono text-2xl tracking-[0.4em] text-black outline-none focus:border-brand"
          />
          <p className="mt-2 text-sm text-ink-muted" aria-live="polite">
            {expired ? 'This code has expired. Request a new one.' : `Expires in ${formatSeconds(expiresIn)}.`}
          </p>
        </div>

        <ErrorNote error={verifyCode.error ?? requestCode.error} />

        <button
          type="submit"
          disabled={verifyCode.isPending || code.length !== request.codeLength || expired}
          className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {verifyCode.isPending ? 'Checking...' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <button type="button" onClick={onStartOver} className="text-ink-muted hover:text-ink">
          Use a different address
        </button>
        <button
          type="button"
          disabled={resendIn > 0 || requestCode.isPending}
          onClick={() => requestCode.mutate(request.email, { onSuccess: onResent })}
          className="text-brand hover:underline disabled:text-ink-muted disabled:no-underline"
        >
          {resendIn > 0 ? `Resend in ${formatSeconds(resendIn)}` : 'Resend code'}
        </button>
      </div>
    </>
  );
}

/** Renders an API failure, if any, in a way screen readers announce. */
function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const message =
    error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
  return (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
