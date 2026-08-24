export interface TaskCompletion {
  taskId: string;
  completedAt: string;
}

const STORAGE_KEY = 'ring-pa.task-history.v1';
// Annual and half-year maintenance must still remember last year's completion.
const HISTORY_RETENTION_DAYS = 730;

export function loadTaskHistory(): TaskCompletion[] {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return pruneTaskHistory(parsed.filter(isTaskCompletion));
  } catch {
    return [];
  }
}

export function addTaskCompletion(history: TaskCompletion[], taskId: string, now = new Date()): TaskCompletion[] {
  return pruneTaskHistory([...history, { taskId, completedAt: now.toISOString() }], now);
}

export function saveTaskHistory(history: TaskCompletion[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // A private or full browser store must not prevent a cleaning session.
  }
}

export function isTaskOnCooldown(taskId: string, cooldownHours: number, history: TaskCompletion[], now = new Date()): boolean {
  if (cooldownHours <= 0) return false;
  const latest = history
    .filter((completion) => completion.taskId === taskId)
    .reduce((latestTime, completion) => Math.max(latestTime, Date.parse(completion.completedAt)), 0);
  return latest > 0 && now.getTime() - latest < cooldownHours * 60 * 60 * 1000;
}

export function latestTaskCompletion(taskId: string, history: TaskCompletion[]): TaskCompletion | undefined {
  return history
    .filter((completion) => completion.taskId === taskId)
    .slice()
    .sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt))[0];
}

function pruneTaskHistory(history: TaskCompletion[], now = new Date()): TaskCompletion[] {
  const oldestAllowed = now.getTime() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return history.filter((completion) => Date.parse(completion.completedAt) >= oldestAllowed);
}

function isTaskCompletion(value: unknown): value is TaskCompletion {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TaskCompletion>;
  return typeof candidate.taskId === 'string'
    && typeof candidate.completedAt === 'string'
    && Number.isFinite(Date.parse(candidate.completedAt));
}
