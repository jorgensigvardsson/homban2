import type { Task } from './taskEngine';
import type { TaskCompletion } from './taskHistory';
import { seasonFor } from './seasonality';
import { isTaskReleased, nextScheduledRelease, type TaskScheduleEntry } from './taskSchedule';
import { getWeeklyRecommendations } from './weeklyRecommendation';

export interface WeeklyOverview {
  pace: 'calm' | 'steady' | 'busy';
  title: string;
  description: string;
  completedCount: number;
  completedMinutes: number;
  plannedMinutes: number;
  suggestions: Task[];
  deepCleanTask?: Task;
  deepCleanMessage: string;
  seasonNote: string;
  rotationNote: string;
}

const DEEP_CLEAN_INTERVAL_DAYS = 10;

export function getWeeklyOverview(tasks: Task[], history: TaskCompletion[], now = new Date(), schedule: TaskScheduleEntry[] = []): WeeklyOverview {
  const startOfWeek = mondayAtMidnight(now).getTime();
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const completedThisWeek = history.filter((completion) => {
    const completedAt = Date.parse(completion.completedAt);
    return completedAt >= startOfWeek && completedAt <= now.getTime() && taskById.has(completion.taskId);
  });
  const completedMinutes = completedThisWeek.reduce((total, completion) => total + (taskById.get(completion.taskId)?.durationMinutes ?? 0), 0);

  const recommendations = getWeeklyRecommendations(tasks, history, now, schedule);
  const primaryRecommendation = recommendations[0]?.task;
  const deepTasks = tasks.filter((task) => task.depth === 'deep' && !task.recommendationOnly);
  const releasedDeepTasks = deepTasks.filter((task) => isTaskReleased(task.id, schedule, history, now));
  const latestDeepCompletion = latestCompletionFor(deepTasks, tasks, history);
  const daysSinceDeepClean = latestDeepCompletion
    ? (now.getTime() - latestDeepCompletion) / (24 * 60 * 60 * 1000)
    : Number.POSITIVE_INFINITY;
  const deepCleanDue = daysSinceDeepClean >= DEEP_CLEAN_INTERVAL_DAYS;
  const deepCleanTask = deepCleanDue ? oldestDeepTask(releasedDeepTasks, history) : undefined;

  const suggestions = uniqueTasks([
    primaryRecommendation,
    primaryRecommendation && deepCleanTask && primaryRecommendation.roomId === deepCleanTask.roomId && primaryRecommendation.durationMinutes >= 40 ? undefined : deepCleanTask,
    ...recommendations.slice(1).filter((recommendation) => recommendation.status === 'due').slice(0, 1).map((recommendation) => recommendation.task),
  ]).slice(0, 3);
  const kickstartTasks = tasks.filter((task) => task.firstUseDueImmediately && isTaskReleased(task.id, schedule, history, now) && !history.some((completion) => completion.taskId === task.id));
  const kickstartMinutes = kickstartTasks.reduce((total, task) => total + task.durationMinutes, 0);
  const plannedMinutes = suggestions.reduce((total, task) => total + task.durationMinutes, 0) + kickstartMinutes;
  const weeklyDemand = completedMinutes + plannedMinutes;
  const pace = weeklyDemand > 100 ? 'busy' : weeklyDemand > 50 ? 'steady' : 'calm';

  const copy = {
    calm: {
      title: 'Lugnare städvecka',
      description: 'Småpassen ser ut att räcka långt. Det finns utrymme att vila eller ta en enda sak som legat efter.',
    },
    steady: {
      title: 'Lagom mycket den här veckan',
      description: 'Några småpass och ett planerat fokus bör hålla hemmet i fas utan en städmaraton.',
    },
    busy: {
      title: 'Den här veckan kräver lite mer',
      description: 'Boka gärna ett sammanhållet pass tidigt i veckan och låt småpassen ta resten.',
    },
  }[pace];

  return {
    pace,
    title: copy.title,
    description: copy.description,
    completedCount: completedThisWeek.length,
    completedMinutes,
    plannedMinutes,
    suggestions,
    deepCleanTask,
    deepCleanMessage: deepCleanTask
      ? `Snart behöver ni planera in: ${deepCleanTask.title.toLowerCase()}.`
      : deepCleanDue
        ? 'Nästa större område ligger redan utplacerat i startrotationen.'
        : 'En större städning är redan gjord nyligen, så den här veckan kan hållas lättare.',
    seasonNote: seasonNote(now),
    rotationNote: rotationNote(schedule, history, kickstartTasks.length, now),
  };
}

function rotationNote(schedule: TaskScheduleEntry[], history: TaskCompletion[], kickstartCount: number, now: Date): string {
  const nextRelease = nextScheduledRelease(schedule, history, now);
  const kickstart = kickstartCount > 0 ? `${kickstartCount} textilbyten är redo idag. ` : '';
  if (!nextRelease) return `${kickstart}Startrotationen är igång och inga okända uppgifter ligger i kö.`;
  const dueDate = new Date(nextRelease.firstDueAt);
  const daysUntil = Math.max(1, Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  return `${kickstart}Nästa nya aktivitet släpps ${daysUntil === 1 ? 'imorgon' : `om ${daysUntil} dagar`}.`;
}

function mondayAtMidnight(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function latestCompletionFor(tasks: Task[], allTasks: Task[], history: TaskCompletion[]): number {
  const ids = new Set(tasks.map((task) => task.id));
  const groups = new Set(tasks.flatMap((task) => task.repeatGroup ? [task.repeatGroup] : []));
  const taskById = new Map(allTasks.map((task) => [task.id, task]));
  return history.reduce((latest, completion) => {
    const completedTask = taskById.get(completion.taskId);
    const belongsToGroup = completedTask?.repeatGroup && groups.has(completedTask.repeatGroup);
    return ids.has(completion.taskId) || belongsToGroup ? Math.max(latest, Date.parse(completion.completedAt)) : latest;
  }, 0);
}

function oldestDeepTask(tasks: Task[], history: TaskCompletion[]): Task | undefined {
  const latestById = new Map<string, number>();
  for (const completion of history) {
    latestById.set(completion.taskId, Math.max(latestById.get(completion.taskId) ?? 0, Date.parse(completion.completedAt)));
  }
  return tasks.slice().sort((left, right) => {
    const ageDifference = (latestById.get(left.id) ?? 0) - (latestById.get(right.id) ?? 0);
    if (ageDifference !== 0) return ageDifference;
    return (right.priorityBoost ?? 1) - (left.priorityBoost ?? 1);
  })[0];
}

function uniqueTasks(tasks: Array<Task | undefined>): Task[] {
  const seen = new Set<string>();
  return tasks.flatMap((task) => {
    if (!task || seen.has(task.id)) return [];
    seen.add(task.id);
    return [task];
  });
}

function seasonNote(now: Date): string {
  const season = seasonFor(now);
  if (season === 'winter') return 'Vinterläge: fönsterputs väntar till mildare månader och vädringen hålls kort och intensiv.';
  if (season === 'summer') return 'Sommarläge: vädringen får ta längre tid och fönsterputs kan läggas i rotationen.';
  if (season === 'spring') return 'Vårläge: fönsterputs är tillbaka i rotationen och vädringen kan förlängas när vädret tillåter.';
  return 'Höstläge: passa på med fönstren före kylan och vädra lagom länge efter vädret.';
}
