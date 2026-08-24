import type { Season, Task } from './taskEngine';

export function seasonFor(date = new Date()): Season {
  const month = date.getMonth() + 1;
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

export function taskForDate(task: Task, date = new Date()): Task {
  const variant = task.seasonalVariants?.[seasonFor(date)];
  if (!variant) return task;
  return {
    ...task,
    durationMinutes: variant.durationMinutes ?? task.durationMinutes,
    steps: variant.steps ?? task.steps,
    doneDefinition: variant.doneDefinition ?? task.doneDefinition,
  };
}

export function taskIsInSeason(task: Task, date = new Date()): boolean {
  return !task.activeMonths || task.activeMonths.includes(date.getMonth() + 1);
}
