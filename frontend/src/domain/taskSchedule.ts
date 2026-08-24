import type { Task } from './taskEngine';
import type { TaskCompletion } from './taskHistory';

export interface TaskScheduleEntry {
  taskId: string;
  firstDueAt: string;
}

interface StoredTaskSchedule {
  version: 1;
  initializedAt: string;
  entries: TaskScheduleEntry[];
}

const STORAGE_KEY = 'ring-pa.task-schedule.v1';

export function loadOrCreateTaskSchedule(tasks: Task[], history: TaskCompletion[], now = new Date()): TaskScheduleEntry[] {
  const stored = loadStoredSchedule();
  const initializedAt = stored ? new Date(stored.initializedAt) : now;
  const releaseBase = stored ? now : initializedAt;
  const existingById = new Map((stored?.entries ?? []).map((entry) => [entry.taskId, entry]));
  const deepTasks = tasks
    .filter((task) => task.depth === 'deep' && !task.recommendationOnly)
    .slice()
    .sort((left, right) => (right.priorityBoost ?? 1) - (left.priorityBoost ?? 1) || left.id.localeCompare(right.id));
  const deepIndexById = new Map(deepTasks.map((task, index) => [task.id, index]));

  const entries = tasks.flatMap((task) => {
    const existing = existingById.get(task.id);
    if (existing) return [existing];
    if (!isInitiallyScheduled(task)) return [];
    const hasHistory = history.some((completion) => completion.taskId === task.id);
    const firstDueAt = hasHistory
      ? releaseBase
      : initialDueDate(task, releaseBase, deepIndexById.get(task.id));
    return [{ taskId: task.id, firstDueAt: firstDueAt.toISOString() }];
  });

  saveStoredSchedule({ version: 1, initializedAt: initializedAt.toISOString(), entries });
  return entries;
}

export function isTaskReleased(taskId: string, schedule: TaskScheduleEntry[], history: TaskCompletion[], now = new Date()): boolean {
  if (history.some((completion) => completion.taskId === taskId)) return true;
  const entry = schedule.find((candidate) => candidate.taskId === taskId);
  return !entry || Date.parse(entry.firstDueAt) <= now.getTime();
}

export function nextScheduledRelease(schedule: TaskScheduleEntry[], history: TaskCompletion[], now = new Date()): TaskScheduleEntry | undefined {
  const completedIds = new Set(history.map((completion) => completion.taskId));
  return schedule
    .filter((entry) => !completedIds.has(entry.taskId) && Date.parse(entry.firstDueAt) > now.getTime())
    .slice()
    .sort((left, right) => Date.parse(left.firstDueAt) - Date.parse(right.firstDueAt))[0];
}

function isInitiallyScheduled(task: Task): boolean {
  return Boolean(task.firstUseDueImmediately || task.recurrenceDays || (task.depth === 'deep' && !task.recommendationOnly));
}

function initialDueDate(task: Task, initializedAt: Date, deepIndex?: number): Date {
  if (task.firstUseDueImmediately) return startOfDay(initializedAt);
  if (deepIndex !== undefined) return addDays(startOfDay(initializedAt), deepIndex * 7);

  const recurrenceDays = task.recurrenceDays ?? 42;
  const horizon = recurrenceDays >= 365 ? 365 : recurrenceDays >= 180 ? recurrenceDays : Math.min(recurrenceDays, 42);
  const offsetDays = stableHash(task.id) % Math.max(1, horizon) + 1;
  return moveIntoActiveSeason(addDays(startOfDay(initializedAt), offsetDays), task.activeMonths);
}

function moveIntoActiveSeason(date: Date, activeMonths?: number[]): Date {
  if (!activeMonths || activeMonths.length === 0) return date;
  const result = new Date(date);
  for (let days = 0; days < 370; days += 1) {
    if (activeMonths.includes(result.getMonth() + 1)) return result;
    result.setDate(result.getDate() + 1);
  }
  return result;
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return Math.abs(hash);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function loadStoredSchedule(): StoredTaskSchedule | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    if (!isStoredSchedule(value)) return undefined;
    return value;
  } catch {
    return undefined;
  }
}

function saveStoredSchedule(schedule: StoredTaskSchedule): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
  } catch {
    // A private or full browser store must not prevent task planning.
  }
}

function isStoredSchedule(value: unknown): value is StoredTaskSchedule {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredTaskSchedule>;
  return candidate.version === 1
    && typeof candidate.initializedAt === 'string'
    && Number.isFinite(Date.parse(candidate.initializedAt))
    && Array.isArray(candidate.entries)
    && candidate.entries.every((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const scheduleEntry = entry as Partial<TaskScheduleEntry>;
      return typeof scheduleEntry.taskId === 'string'
        && typeof scheduleEntry.firstDueAt === 'string'
        && Number.isFinite(Date.parse(scheduleEntry.firstDueAt));
    });
}
