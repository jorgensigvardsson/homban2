import { isTaskReleased, type TaskScheduleEntry } from './taskSchedule';

export type Floor = 'upper' | 'middle' | 'lower' | 'separate';
export type RoomType = 'bedroom' | 'hall' | 'bathroom' | 'kitchen' | 'living-room' | 'laundry' | 'storage' | 'office' | 'terrace';
export type Mode = 'daily' | 'weekend' | 'guests' | 'declutter';
export type TaskCategory = 'visible' | 'hygiene' | 'floor' | 'odor' | 'laundry' | 'declutter';
export type MemberRole = 'adult' | 'child';
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

export interface SeasonalTaskVariant {
  durationMinutes?: number;
  steps?: string[];
  doneDefinition?: string[];
}

export interface Freshness {
  visible: number;
  hygiene: number;
  floor: number;
  odor: number;
}

export interface Room {
  id: string;
  name: string;
  floor: Floor;
  type: RoomType;
  visibilityWeight: number;
  freshness: Freshness;
  isPrivate: boolean;
}

export interface HouseholdMember {
  id: string;
  name: string;
  role: MemberRole;
  birthYear?: number;
  /** Children participate by choice; this is never an age-based task gate. */
  willingToHelp: boolean;
  preferredRoomIds: string[];
}

export interface Task {
  id: string;
  roomId: string;
  title: string;
  category: TaskCategory;
  durationMinutes: number;
  effort: 1 | 2 | 3;
  tools: string[];
  products?: string[];
  steps: string[];
  doneDefinition: string[];
  modes: Mode[];
  /** Makes a task useful for a child who chooses to help, without forcing it. */
  childFriendly: boolean;
  safetyWarnings?: string[];
  /** How much uninterrupted time one participant needs before this card makes sense. */
  minimumSessionMinutes?: number;
  /** Participant bounds let a solo pass use a different shape than a team pass. */
  minimumParticipants?: number;
  maximumParticipants?: number;
  /** Deep cards are preferred over small resets during long sessions. */
  depth?: 'quick' | 'standard' | 'deep';
  /** Smaller cards replaced by this card when the deeper version is eligible. */
  supersedesTaskIds?: string[];
  /** Atomic activities shown inside a larger card, including recent completion state. */
  includedTaskIds?: string[];
  /** Product judgement for unusually important tasks within the same depth. */
  priorityBoost?: number;
  /** Minimum time before the same activity should normally be suggested again. */
  cooldownHours?: number;
  /** Variants sharing a group count as the same recently completed activity. */
  repeatGroup?: string;
  /** Long-cycle work is selected by the weekly recommender, not normal sessions. */
  recommendationOnly?: boolean;
  recurrenceDays?: number;
  recommendationPriority?: number;
  recommendationReason?: string;
  /** Related micro tasks can share one card while retaining separate history. */
  bundleKey?: string;
  bundleLabel?: string;
  /** Recurring tasks can opt into the single prominent weekly slot. */
  weeklyRecommendation?: boolean;
  /** First-run bootstrap leaves this activity due immediately instead of staggering it. */
  firstUseDueImmediately?: boolean;
  /** Months when weather-dependent work is suitable, using 1 for January. */
  activeMonths?: number[];
  /** Seasonal wording and duration, applied before planning and display. */
  seasonalVariants?: Partial<Record<Season, SeasonalTaskVariant>>;
}

export interface Assignment {
  id: string;
  taskId: string;
  memberId: string;
}

export interface TaskSelectionInput {
  mode: Mode;
  availableMinutes: number;
  participantIds: string[];
  rooms: Room[];
  tasks: Task[];
  members: HouseholdMember[];
  completionHistory?: TaskCompletion[];
  now?: Date;
  /** Optional focus area; omitted means the whole home. */
  roomIds?: string[];
  /** First-run release dates prevent every unknown recurring task appearing at once. */
  initialSchedule?: TaskScheduleEntry[];
}

export interface TaskPlan {
  assignments: Assignment[];
  unassignedTaskIds: string[];
  totalMinutes: number;
}

const categoryWeight: Record<Mode, Record<TaskCategory, number>> = {
  daily: { visible: 1.15, hygiene: 1.3, floor: 1, odor: 1.1, laundry: 1, declutter: 0.5 },
  weekend: { visible: 1, hygiene: 1.15, floor: 1.1, odor: 1, laundry: 1, declutter: 0.8 },
  // Guests notice the entrance, usable shared surfaces and the bathroom first.
  // Odour work is still useful, but must not crowd out the whole pass.
  guests: { visible: 2.2, hygiene: 1.8, floor: 1.2, odor: 0.5, laundry: 0, declutter: 0.1 },
  declutter: { visible: 0.4, hygiene: 0.2, floor: 0.2, odor: 0.2, laundry: 0.4, declutter: 2.5 },
};

export const householdRooms: Room[] = [
  { id: 'upstairs-hall', name: 'Övre hall & linneskåp', floor: 'upper', type: 'hall', visibilityWeight: 0.7, freshness: { visible: 0.6, hygiene: 0.8, floor: 0.6, odor: 0.8 }, isPrivate: false },
  { id: 'bedroom-1', name: 'Master bedroom', floor: 'upper', type: 'bedroom', visibilityWeight: 0.4, freshness: { visible: 0.5, hygiene: 0.8, floor: 0.6, odor: 0.8 }, isPrivate: true },
  { id: 'upstairs-bathroom', name: 'Badrum uppe', floor: 'upper', type: 'bathroom', visibilityWeight: 1, freshness: { visible: 0.7, hygiene: 0.6, floor: 0.7, odor: 0.7 }, isPrivate: false },
  { id: 'middle-hall', name: 'Hall', floor: 'middle', type: 'hall', visibilityWeight: 1.4, freshness: { visible: 0.4, hygiene: 0.8, floor: 0.5, odor: 0.8 }, isPrivate: false },
  { id: 'kitchen', name: 'Kök', floor: 'middle', type: 'kitchen', visibilityWeight: 1.6, freshness: { visible: 0.5, hygiene: 0.6, floor: 0.7, odor: 0.7 }, isPrivate: false },
  { id: 'living-room', name: 'Vardagsrum', floor: 'middle', type: 'living-room', visibilityWeight: 1.5, freshness: { visible: 0.5, hygiene: 0.8, floor: 0.6, odor: 0.8 }, isPrivate: false },
  { id: 'terrace', name: 'Altan', floor: 'middle', type: 'terrace', visibilityWeight: 0.8, freshness: { visible: 0.6, hygiene: 0.8, floor: 0.7, odor: 0.8 }, isPrivate: false },
  { id: 'basement-lounge', name: 'Gillestuga / tv-rum', floor: 'lower', type: 'living-room', visibilityWeight: 0.8, freshness: { visible: 0.6, hygiene: 0.8, floor: 0.7, odor: 0.8 }, isPrivate: false },
  { id: 'downstairs-bathroom', name: 'Badrum nere', floor: 'lower', type: 'bathroom', visibilityWeight: 0.9, freshness: { visible: 0.7, hygiene: 0.6, floor: 0.7, odor: 0.7 }, isPrivate: false },
  { id: 'laundry-room', name: 'Tvättstuga', floor: 'lower', type: 'laundry', visibilityWeight: 0.7, freshness: { visible: 0.5, hygiene: 0.7, floor: 0.6, odor: 0.6 }, isPrivate: false },
  { id: 'basement-hall', name: 'Källarhall & stora garderoben', floor: 'lower', type: 'storage', visibilityWeight: 0.5, freshness: { visible: 0.4, hygiene: 0.8, floor: 0.6, odor: 0.8 }, isPrivate: false },
  { id: 'cinema-office', name: 'Biorum / kontor', floor: 'separate', type: 'office', visibilityWeight: 1.1, freshness: { visible: 0.3, hygiene: 0.8, floor: 0.5, odor: 0.8 }, isPrivate: false },
];

export const householdMembers: HouseholdMember[] = [
  { id: 'malin', name: 'Malin', role: 'adult', willingToHelp: true, preferredRoomIds: [] },
  { id: 'jorgen', name: 'Jörgen', role: 'adult', willingToHelp: true, preferredRoomIds: [] },
  { id: 'alice', name: 'Alice', role: 'child', birthYear: 2010, willingToHelp: true, preferredRoomIds: [] },
  { id: 'annie', name: 'Annie', role: 'child', birthYear: 2013, willingToHelp: true, preferredRoomIds: [] },
  { id: 'ella', name: 'Ella', role: 'child', birthYear: 2016, willingToHelp: true, preferredRoomIds: [] },
];

export function buildPlan(input: TaskSelectionInput): TaskPlan {
  const now = input.now ?? new Date();
  const month = now.getMonth() + 1;
  const members = input.participantIds
    .map((id) => input.members.find((member) => member.id === id))
    .filter((member): member is HouseholdMember => member !== undefined && (member.role === 'adult' || member.willingToHelp));
  const roomById = new Map(input.rooms.map((room) => [room.id, room]));
  const participantCount = members.length;
  const candidates = input.tasks.filter((task) => {
    if (!task.modes.includes(input.mode) || !roomById.has(task.roomId)) return false;
    if (input.roomIds && !input.roomIds.includes(task.roomId)) return false;
    if (task.activeMonths && !task.activeMonths.includes(month)) return false;
    if (input.initialSchedule && !isTaskReleased(task.id, input.initialSchedule, input.completionHistory ?? [], now)) return false;
    if (task.recommendationOnly) return false;
    if (task.durationMinutes > input.availableMinutes) return false;
    if (task.minimumSessionMinutes && input.availableMinutes < task.minimumSessionMinutes) return false;
    if (task.minimumParticipants && participantCount < task.minimumParticipants) return false;
    if (task.maximumParticipants && participantCount > task.maximumParticipants) return false;
    if (isCoolingDown(task, input.tasks, input.completionHistory ?? [], now)) return false;
    // A solo guest pass is deliberately one coherent sweep, not a queue of
    // tiny cards intended for parallel delegation.
    if (input.mode === 'guests' && participantCount === 1) return task.maximumParticipants === 1;
    return true;
  });
  const supersededTaskIds = new Set(candidates.flatMap((task) => [...(task.supersedesTaskIds ?? []), ...(task.includedTaskIds ?? [])]));
  const eligibleTasks = candidates
    .filter((task) => !supersededTaskIds.has(task.id))
    .sort((left, right) => selectionScore(right, input, roomById.get(right.roomId)!) - selectionScore(left, input, roomById.get(left.roomId)!));
  const assignments: Assignment[] = [];
  const minutesByMember = new Map(members.map((member) => [member.id, 0]));
  const assignedTaskIds = new Set<string>();
  let odorTaskAssigned = false;

  for (const task of eligibleTasks) {
    // One source-removal action per plan is enough. This prevents airing,
    // rubbish and the general odour check from becoming three versions of the
    // same recommendation while other visible or hygienic work is skipped.
    if (task.category === 'odor' && odorTaskAssigned) continue;
    const member = members
      .filter((candidate) => candidate.role === 'adult' || task.childFriendly)
      .filter((candidate) => (minutesByMember.get(candidate.id) ?? 0) + task.durationMinutes <= input.availableMinutes)
      .slice()
      .sort((left, right) => memberScore(right, task, minutesByMember, roomById) - memberScore(left, task, minutesByMember, roomById))[0];
    if (!member) continue;
    const currentMinutes = minutesByMember.get(member.id) ?? 0;
    assignments.push({ id: `${member.id}-${task.id}`, taskId: task.id, memberId: member.id });
    minutesByMember.set(member.id, currentMinutes + task.durationMinutes);
    assignedTaskIds.add(task.id);
    if (task.category === 'odor') odorTaskAssigned = true;
  }

  return {
    assignments,
    unassignedTaskIds: eligibleTasks.filter((task) => !assignedTaskIds.has(task.id)).map((task) => task.id),
    totalMinutes: assignments.reduce((total, assignment) => total + input.tasks.find((task) => task.id === assignment.taskId)!.durationMinutes, 0),
  };
}

function score(task: Task, mode: Mode, room: Room): number {
  const freshness = task.category === 'visible' || task.category === 'laundry' || task.category === 'declutter' ? room.freshness.visible : task.category === 'hygiene' ? room.freshness.hygiene : task.category === 'floor' ? room.freshness.floor : room.freshness.odor;
  const need = 1 - freshness;
  return room.visibilityWeight * categoryWeight[mode][task.category] * (1 + need) / task.durationMinutes;
}

function selectionScore(task: Task, input: TaskSelectionInput, room: Room): number {
  const depthBoost = task.depth === 'deep' && input.availableMinutes >= 45 ? 30 : 1;
  const kickstartIds = [task.id, ...(task.includedTaskIds ?? [])];
  const hasUnfinishedKickstart = kickstartIds.some((taskId) => {
    const candidate = input.tasks.find((item) => item.id === taskId);
    return candidate?.firstUseDueImmediately && !(input.completionHistory ?? []).some((completion) => completion.taskId === taskId);
  });
  const kickstartBoost = hasUnfinishedKickstart ? 16 : 1;
  return score(task, input.mode, room) * depthBoost * kickstartBoost * (task.priorityBoost ?? 1);
}

function isCoolingDown(task: Task, tasks: Task[], history: TaskCompletion[], now: Date): boolean {
  return history.some((completion) => {
    const completedTask = tasks.find((candidate) => candidate.id === completion.taskId);
    const isSameActivity = completion.taskId === task.id
      || Boolean(task.repeatGroup && completedTask?.repeatGroup === task.repeatGroup)
      || Boolean(completedTask?.supersedesTaskIds?.includes(task.id));
    if (!isSameActivity) return false;
    const cooldownHours = completedTask ? cooldownFor(completedTask) : cooldownFor(task);
    const completedAt = Date.parse(completion.completedAt);
    return Number.isFinite(completedAt) && now.getTime() - completedAt < cooldownHours * 60 * 60 * 1000;
  });
}

export function cooldownFor(task: Task): number {
  if (task.cooldownHours !== undefined) return task.cooldownHours;
  if (task.recurrenceDays !== undefined) return task.recurrenceDays * 24;
  if (task.depth === 'deep') return 7 * 24;
  if (task.depth === 'quick') return 6;
  if (task.category === 'hygiene' || task.category === 'floor') return 36;
  if (task.category === 'odor') return 6;
  if (task.category === 'laundry') return 12;
  return 18;
}

function memberScore(member: HouseholdMember, task: Task, minutesByMember: Map<string, number>, rooms: Map<string, Room>): number {
  const room = rooms.get(task.roomId);
  const privateRoomBonus = room?.isPrivate && member.preferredRoomIds.includes(task.roomId) ? 10 : 0;
  const adultBonus = member.role === 'adult' && !room?.isPrivate ? 2 : 0;
  const childBonus = member.role === 'child' && task.childFriendly && room?.isPrivate ? 5 : 0;
  // Minutes are the primary balancing signal: once someone has a card, an
  // idle participant should normally receive the next suitable one. Bonuses
  // only break close ties for private rooms and adult-only household work.
  return privateRoomBonus + adultBonus + childBonus - (minutesByMember.get(member.id) ?? 0);
}
import type { TaskCompletion } from './taskHistory';
