import { useEffect, useState } from 'react';

/**
 * Whole seconds remaining until the given ISO timestamp, ticking down once a
 * second and stopping at zero.
 */
export function useCountdown(deadlineIso: string): number {
  const deadline = new Date(deadlineIso).getTime();
  const [remaining, setRemaining] = useState(() => secondsUntil(deadline));

  useEffect(() => {
    setRemaining(secondsUntil(deadline));
    if (secondsUntil(deadline) <= 0) return;

    const timer = window.setInterval(() => {
      const next = secondsUntil(deadline);
      setRemaining(next);
      if (next <= 0) window.clearInterval(timer);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [deadline]);

  return remaining;
}

function secondsUntil(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}
