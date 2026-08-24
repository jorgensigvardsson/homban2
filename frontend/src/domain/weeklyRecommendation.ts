import type { Task } from './taskEngine';
import type { TaskCompletion } from './taskHistory';
import { taskIsInSeason } from './seasonality';
import { isTaskReleased, type TaskScheduleEntry } from './taskSchedule';

export interface WeeklyRecommendation {
  task: Task;
  status: 'new' | 'due';
  daysSinceCompletion?: number;
  overdueDays?: number;
}

interface RecommendationCandidate extends WeeklyRecommendation {
  score: number;
}

/** Selects one overdue long-cycle task. Never-completed tasks enter by priority. */
export function getWeeklyRecommendation(tasks: Task[], history: TaskCompletion[], now = new Date(), schedule: TaskScheduleEntry[] = []): WeeklyRecommendation | undefined {
  return getWeeklyRecommendations(tasks, history, now, schedule)[0];
}

export function getWeeklyRecommendations(tasks: Task[], history: TaskCompletion[], now = new Date(), schedule: TaskScheduleEntry[] = []): WeeklyRecommendation[] {
  const candidates = tasks
    .filter((task) => task.recurrenceDays && (task.recommendationOnly || task.weeklyRecommendation) && taskIsInSeason(task, now) && isTaskReleased(task.id, schedule, history, now))
    .flatMap<RecommendationCandidate>((task) => {
      const latestCompletion = history
        .filter((completion) => {
          if (completion.taskId === task.id) return true;
          if (!task.repeatGroup) return false;
          return tasks.find((candidate) => candidate.id === completion.taskId)?.repeatGroup === task.repeatGroup;
        })
        .reduce((latest, completion) => Math.max(latest, Date.parse(completion.completedAt)), 0);
      if (!latestCompletion) {
        return [{ task, status: 'new' as const, score: 2 + (task.recommendationPriority ?? 0) / 100 }];
      }
      const daysSinceCompletion = (now.getTime() - latestCompletion) / (24 * 60 * 60 * 1000);
      const dueRatio = daysSinceCompletion / task.recurrenceDays!;
      if (dueRatio < 1) return [];
      return [{ task, status: 'due' as const, daysSinceCompletion: Math.floor(daysSinceCompletion), overdueDays: Math.floor(daysSinceCompletion - task.recurrenceDays!), score: dueRatio + (task.recommendationPriority ?? 0) / 100 }];
    })
    .sort((left, right) => right.score - left.score || left.task.id.localeCompare(right.task.id));

  return candidates.map(({ task, status, daysSinceCompletion, overdueDays }) => ({ task, status, daysSinceCompletion, overdueDays }));
}

export function recurrenceLabel(days: number): string {
  if (days >= 365) return 'ungefär en gång per år';
  if (days >= 180) return 'ungefär varje halvår';
  if (days >= 90) return 'ungefär varje kvartal';
  if (days >= 28) return 'ungefär en gång i månaden';
  if (days >= 14) return 'ungefär varannan vecka';
  return 'ungefär en gång i veckan';
}
