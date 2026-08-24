import patioChecklistJson from '../../../storstadning_altan.json';
import bedroomChecklistJson from '../../../storstadning_sovrum.json';
import basementHallChecklistJson from '../../../storstadning_kallarhall.json';
import downstairsBathroomChecklistJson from '../../../storstadning_badrum_nere.json';
import recreationRoomChecklistJson from '../../../storstadning_gillestuga.json';
import upstairsHallChecklistJson from '../../../storstadning_hall_uppe.json';
import kitchenChecklistJson from '../../../storstadning_kok.json';
import officeCinemaChecklistJson from '../../../storstadning_kontor_biorum.json';
import laundryRoomChecklistJson from '../../../storstadning_tvattstuga.json';
import upstairsBathroomChecklistJson from '../../../storstadning_badrum_uppe.json';
import livingRoomChecklistJson from '../../../storstadning_vardagsrum.json';

export type ChecklistCondition =
  | 'always'
  | 'if_accessible'
  | 'if_accessible_without_dismantling'
  | 'if_allowed'
  | 'if_applicable'
  | 'if_ash_removed'
  | 'if_available'
  | 'if_closed'
  | 'if_cleaned_damp'
  | 'if_disconnected'
  | 'if_due'
  | 'if_due_and_material_allows'
  | 'if_drawers_are_removable'
  | 'if_floor_drain_present'
  | 'if_found'
  | 'if_glass'
  | 'if_glass_present'
  | 'if_helpful'
  | 'if_in_scope'
  | 'if_issue_found'
  | 'if_interior_cleaning_is_in_scope'
  | 'if_interior_cleaning_was_done'
  | 'if_long_term_storage'
  | 'if_manual_cleaning'
  | 'if_moved'
  | 'if_needed'
  | 'if_not_already_cleaned'
  | 'if_possible'
  | 'if_present'
  | 'if_present_and_due'
  | 'if_present_and_supported'
  | 'if_recently_used'
  | 'if_removable'
  | 'if_removed'
  | 'if_recommended'
  | 'if_required'
  | 'if_rug_can_be_moved'
  | 'if_safe'
  | 'if_safely_accessible'
  | 'if_safely_movable'
  | 'if_safely_possible'
  | 'if_smoke_alarm'
  | 'if_step_stool'
  | 'if_stored_on_patio'
  | 'if_stored_in_room'
  | 'if_supported'
  | 'if_supported_by_window'
  | 'if_textiles_stored'
  | 'if_user_accessible'
  | 'if_user_serviceable'
  | 'if_vent_position_was_marked'
  | 'if_ventilation_component'
  | 'if_wallpaper_is_washable'
  | 'if_washed'
  | 'if_wet_cleaned'
  | 'if_wheeled'
  | 'if_wood'
  | 'when_deep_cleaning_litter_box';

export type ChecklistSafety =
  | 'chemicals'
  | 'chemicals_and_fire'
  | 'data_and_electricity'
  | 'electricity'
  | 'electricity_and_height'
  | 'electricity_and_heat'
  | 'electricity_and_pet_food'
  | 'electricity_and_plumbing'
  | 'electronics'
  | 'electronics_and_height'
  | 'fall'
  | 'fire'
  | 'fire_and_electricity'
  | 'fire_and_plumbing'
  | 'food'
  | 'glass'
  | 'glass_and_pinch'
  | 'height'
  | 'height_and_roof'
  | 'heat'
  | 'heat_and_electricity'
  | 'hygiene'
  | 'material'
  | 'mechanical'
  | 'mechanical_and_electricity'
  | 'moisture'
  | 'optics'
  | 'pests'
  | 'pet_food'
  | 'pinch'
  | 'pinch_and_electricity'
  | 'pinch_and_heat'
  | 'plumbing'
  | 'sharp_tool'
  | 'sharp_tools'
  | 'slip'
  | 'slip_and_chemicals'
  | 'temperature'
  | 'water_and_electricity';

export interface RoomChecklistTask {
  id: string;
  title: string;
  details?: string;
  status: string;
  condition: ChecklistCondition;
  safety?: string;
  category?: string;
  /** Condensed rows retain the original tasks for history sync and full detail. */
  sourceTaskIds?: string[];
  includedTasks?: RoomChecklistTask[];
}

export interface RoomChecklistSection {
  id: string;
  order: number;
  title: string;
  tasks: RoomChecklistTask[];
}

export interface RoomChecklistDefinition {
  schemaVersion: string;
  language: string;
  listId: string;
  title: string;
  roomType: string;
  description: string;
  estimatedActiveMinutes?: number;
  definitionOfDone: string;
  scopeNotes: string[];
  sections: RoomChecklistSection[];
}

export interface ChecklistHistoryLink {
  taskId: string;
  requirementIds: string[];
}

export const patioChecklist = patioChecklistJson as RoomChecklistDefinition;
export const bedroomChecklist = bedroomChecklistJson as RoomChecklistDefinition;
export const basementHallChecklist = basementHallChecklistJson as RoomChecklistDefinition;
export const livingRoomChecklist = livingRoomChecklistJson as RoomChecklistDefinition;
export const upstairsBathroomChecklist = upstairsBathroomChecklistJson as RoomChecklistDefinition;
export const downstairsBathroomChecklist = downstairsBathroomChecklistJson as RoomChecklistDefinition;
export const kitchenChecklist = kitchenChecklistJson as RoomChecklistDefinition;
export const officeCinemaChecklist = officeCinemaChecklistJson as RoomChecklistDefinition;
export const laundryRoomChecklist = laundryRoomChecklistJson as RoomChecklistDefinition;
export const recreationRoomChecklist = recreationRoomChecklistJson as RoomChecklistDefinition;
export const upstairsHallChecklist = upstairsHallChecklistJson as RoomChecklistDefinition;

const roomChecklists: Record<string, RoomChecklistDefinition> = {
  'bedroom-1': bedroomChecklist,
  'living-room': livingRoomChecklist,
  kitchen: kitchenChecklist,
  terrace: patioChecklist,
  'upstairs-bathroom': upstairsBathroomChecklist,
  'downstairs-bathroom': downstairsBathroomChecklist,
  'basement-lounge': recreationRoomChecklist,
  'laundry-room': laundryRoomChecklist,
  'cinema-office': officeCinemaChecklist,
  'upstairs-hall': upstairsHallChecklist,
  'basement-hall': basementHallChecklist,
};

export function roomChecklistForRoom(roomId: string): RoomChecklistDefinition | undefined {
  return roomChecklists[roomId];
}

/**
 * A room checklist is more detailed than the planner's cards. Once all of a
 * card's concrete requirements have been handled, the card is recorded in the
 * shared task history and will no longer be suggested too soon.
 */
export const bedroomChecklistHistoryLinks: ChecklistHistoryLink[] = [
  {
    taskId: 'upstairs-bedroom-reset',
    requirementIds: ['bedroom-01-001', 'bedroom-01-002', 'bedroom-01-003', 'bedroom-13-004'],
  },
  {
    taskId: 'bedroom-floor',
    requirementIds: ['bedroom-01-002', 'bedroom-12-004', 'bedroom-12-006'],
  },
  {
    taskId: 'micro-bed-linen',
    requirementIds: ['bedroom-09-001', 'bedroom-13-004'],
  },
  {
    taskId: 'micro-pillowcases',
    requirementIds: ['bedroom-09-001', 'bedroom-13-004'],
  },
  {
    taskId: 'micro-headboard',
    requirementIds: ['bedroom-08-002'],
  },
  {
    taskId: 'micro-bedside-lamp',
    requirementIds: ['bedroom-08-004'],
  },
  {
    taskId: 'micro-under-bed-edge',
    requirementIds: ['bedroom-12-004'],
  },
  {
    taskId: 'care-mattresses',
    requirementIds: [
      'bedroom-09-001',
      'bedroom-09-004',
      'bedroom-09-006',
      'bedroom-09-007',
      'bedroom-09-009',
      'bedroom-13-004',
    ],
  },
];

const livingRoomChecklistHistoryLinks: ChecklistHistoryLink[] = [
  { taskId: 'deep-living-room', requirementIds: taskIdsForChecklist(livingRoomChecklist) },
  { taskId: 'living-room-floor', requirementIds: ['living-room-16-001', 'living-room-16-002', 'living-room-16-004', 'living-room-16-007'] },
  { taskId: 'micro-sofa-throws', requirementIds: ['living-room-11-009', 'living-room-11-014'] },
  { taskId: 'micro-cushion-covers', requirementIds: ['living-room-11-009', 'living-room-11-014'] },
  { taskId: 'micro-window-sills', requirementIds: ['living-room-06-009'] },
  { taskId: 'micro-blinds', requirementIds: ['living-room-06-013'] },
  { taskId: 'micro-lampshades', requirementIds: ['living-room-03-003', 'living-room-03-004'] },
  { taskId: 'micro-picture-frames', requirementIds: ['living-room-04-004', 'living-room-04-005'] },
  { taskId: 'micro-remotes', requirementIds: ['living-room-13-007'] },
  { taskId: 'micro-plant-leaves', requirementIds: ['living-room-07-001', 'living-room-07-002'] },
  { taskId: 'micro-sofa-crumbs', requirementIds: ['living-room-11-003', 'living-room-11-004'] },
  { taskId: 'micro-under-cushions', requirementIds: ['living-room-11-005', 'living-room-11-006'] },
  { taskId: 'micro-table-legs', requirementIds: ['living-room-08-003', 'living-room-08-005'] },
  { taskId: 'care-under-furniture', requirementIds: ['living-room-10-010', 'living-room-11-011', 'living-room-12-008'] },
  { taskId: 'care-high-dusting', requirementIds: ['living-room-02-001', 'living-room-02-002', 'living-room-02-003', 'living-room-02-004'] },
  { taskId: 'care-windows', requirementIds: ['living-room-06-003', 'living-room-06-004', 'living-room-06-007', 'living-room-06-008', 'living-room-06-009'] },
  { taskId: 'care-walls-ceilings', requirementIds: ['living-room-02-001', 'living-room-04-001', 'living-room-04-002', 'living-room-04-003'] },
];

const upstairsBathroomChecklistHistoryLinks: ChecklistHistoryLink[] = [
  { taskId: 'deep-upstairs-bathroom', requirementIds: taskIdsForChecklist(upstairsBathroomChecklist) },
  { taskId: 'care-bathroom-deep-clean', requirementIds: taskIdsForChecklist(upstairsBathroomChecklist) },
  { taskId: 'upstairs-bathroom-reset', requirementIds: ['upstairs-bathroom-05-002', 'upstairs-bathroom-06-001', 'upstairs-bathroom-08-001', 'upstairs-bathroom-08-002', 'upstairs-bathroom-15-002', 'upstairs-bathroom-15-003'] },
  { taskId: 'micro-upstairs-hand-towel', requirementIds: ['upstairs-bathroom-13-001', 'upstairs-bathroom-15-002'] },
  { taskId: 'micro-shower-towels', requirementIds: ['upstairs-bathroom-13-001', 'upstairs-bathroom-15-002'] },
  { taskId: 'micro-bath-mats', requirementIds: ['upstairs-bathroom-13-002'] },
  { taskId: 'micro-bathroom-mirror', requirementIds: ['upstairs-bathroom-05-002', 'upstairs-bathroom-05-003'] },
  { taskId: 'micro-toothbrush-holder', requirementIds: ['upstairs-bathroom-13-004'] },
  { taskId: 'micro-soap-dispenser', requirementIds: ['upstairs-bathroom-13-003'] },
  { taskId: 'micro-toilet-hinges', requirementIds: ['upstairs-bathroom-08-005', 'upstairs-bathroom-08-006', 'upstairs-bathroom-08-007', 'upstairs-bathroom-08-008'] },
  { taskId: 'micro-behind-toilet', requirementIds: ['upstairs-bathroom-08-009'] },
  { taskId: 'micro-shower-hair', requirementIds: ['upstairs-bathroom-11-007', 'upstairs-bathroom-11-008', 'upstairs-bathroom-11-009', 'upstairs-bathroom-11-010'] },
  { taskId: 'micro-shower-track', requirementIds: ['upstairs-bathroom-10-007', 'upstairs-bathroom-10-008'] },
  { taskId: 'micro-tile-splashes', requirementIds: ['upstairs-bathroom-11-002', 'upstairs-bathroom-11-003', 'upstairs-bathroom-11-012'] },
  { taskId: 'micro-bathroom-vent', requirementIds: ['upstairs-bathroom-03-002'] },
  { taskId: 'micro-bathroom-fronts', requirementIds: ['upstairs-bathroom-07-004'] },
  { taskId: 'micro-laundry-hamper', requirementIds: ['upstairs-bathroom-13-006'] },
  { taskId: 'care-bathroom-drains', requirementIds: ['upstairs-bathroom-06-008', 'upstairs-bathroom-06-009', 'upstairs-bathroom-06-010', 'upstairs-bathroom-06-011', 'upstairs-bathroom-11-007', 'upstairs-bathroom-11-008', 'upstairs-bathroom-11-009', 'upstairs-bathroom-11-010', 'upstairs-bathroom-11-011'] },
  { taskId: 'care-bathroom-limescale', requirementIds: ['upstairs-bathroom-06-005', 'upstairs-bathroom-10-002', 'upstairs-bathroom-11-003'] },
];

const downstairsBathroomChecklistHistoryLinks: ChecklistHistoryLink[] = [
  { taskId: 'deep-downstairs-bathroom', requirementIds: taskIdsForChecklist(downstairsBathroomChecklist) },
  { taskId: 'care-bathroom-deep-clean', requirementIds: taskIdsForChecklist(downstairsBathroomChecklist) },
  { taskId: 'downstairs-bathroom-reset', requirementIds: ['downstairs-bathroom-05-001', 'downstairs-bathroom-06-001', 'downstairs-bathroom-09-001', 'downstairs-bathroom-09-002', 'downstairs-bathroom-17-002', 'downstairs-bathroom-17-003'] },
  { taskId: 'micro-downstairs-hand-towel', requirementIds: ['downstairs-bathroom-15-005', 'downstairs-bathroom-17-002'] },
  { taskId: 'micro-downstairs-bathroom-mirror', requirementIds: ['downstairs-bathroom-05-001', 'downstairs-bathroom-05-002', 'downstairs-bathroom-05-006'] },
  { taskId: 'micro-downstairs-soap-dispenser', requirementIds: ['downstairs-bathroom-15-007'] },
  { taskId: 'micro-downstairs-toilet-hinges', requirementIds: ['downstairs-bathroom-09-004', 'downstairs-bathroom-09-005', 'downstairs-bathroom-09-006'] },
  { taskId: 'care-bathroom-drains', requirementIds: ['downstairs-bathroom-06-008', 'downstairs-bathroom-06-009', 'downstairs-bathroom-06-010', 'downstairs-bathroom-13-013', 'downstairs-bathroom-13-014', 'downstairs-bathroom-13-015', 'downstairs-bathroom-13-016', 'downstairs-bathroom-13-017'] },
  { taskId: 'care-bathroom-limescale', requirementIds: ['downstairs-bathroom-06-006', 'downstairs-bathroom-11-002', 'downstairs-bathroom-13-005'] },
];

const kitchenChecklistHistoryLinks: ChecklistHistoryLink[] = [
  { taskId: 'deep-kitchen', requirementIds: taskIdsForChecklist(kitchenChecklist) },
  { taskId: 'micro-kitchen-towels', requirementIds: ['kitchen-21-003'] },
  { taskId: 'micro-dishcloth', requirementIds: ['kitchen-21-003'] },
  { taskId: 'micro-microwave', requirementIds: ['kitchen-11-002', 'kitchen-11-003', 'kitchen-11-004', 'kitchen-11-006', 'kitchen-11-007'] },
  { taskId: 'micro-coffee-station', requirementIds: ['kitchen-15-002', 'kitchen-15-004'] },
  { taskId: 'micro-cabinet-fronts', requirementIds: ['kitchen-05-003', 'kitchen-05-004'] },
  { taskId: 'micro-cabinet-handles', requirementIds: ['kitchen-05-005'] },
  { taskId: 'micro-backsplash', requirementIds: ['kitchen-07-004', 'kitchen-07-005'] },
  { taskId: 'micro-hood-exterior', requirementIds: ['kitchen-14-002', 'kitchen-14-003'] },
  { taskId: 'micro-fridge-handles', requirementIds: ['kitchen-10-013'] },
  { taskId: 'micro-bin-lid', requirementIds: ['kitchen-19-002'] },
  { taskId: 'micro-wash-bin', requirementIds: ['kitchen-19-001', 'kitchen-19-002'] },
  { taskId: 'micro-recycling-station', requirementIds: ['kitchen-19-001', 'kitchen-19-002', 'kitchen-19-003'] },
  { taskId: 'micro-dishwasher-seal', requirementIds: ['kitchen-09-008'] },
  { taskId: 'micro-sink-strainer', requirementIds: ['kitchen-08-007'] },
  { taskId: 'micro-under-sink-floor', requirementIds: ['kitchen-08-011', 'kitchen-08-012', 'kitchen-08-013'] },
  { taskId: 'care-dishwasher-filter', requirementIds: ['kitchen-09-003', 'kitchen-09-004', 'kitchen-09-005'] },
  { taskId: 'care-range-hood', requirementIds: ['kitchen-14-004', 'kitchen-14-005', 'kitchen-14-006', 'kitchen-14-007'] },
  { taskId: 'care-oven', requirementIds: ['kitchen-13-002', 'kitchen-13-003', 'kitchen-13-004', 'kitchen-13-005', 'kitchen-13-006', 'kitchen-13-007', 'kitchen-13-009', 'kitchen-13-010', 'kitchen-13-011'] },
  { taskId: 'care-fridge-interior', requirementIds: ['kitchen-10-003', 'kitchen-10-004', 'kitchen-10-005', 'kitchen-10-006', 'kitchen-10-007'] },
  { taskId: 'care-cabinets', requirementIds: ['kitchen-06-001', 'kitchen-06-002', 'kitchen-06-003', 'kitchen-06-004', 'kitchen-06-010'] },
  { taskId: 'care-freezer-defrost', requirementIds: ['kitchen-10-001', 'kitchen-10-008', 'kitchen-10-009', 'kitchen-10-010', 'kitchen-10-011'] },
];

const recreationRoomChecklistHistoryLinks: ChecklistHistoryLink[] = [
  { taskId: 'basement-lounge-reset', requirementIds: ['recreation-room-01-001', 'recreation-room-01-002', 'recreation-room-17-001', 'recreation-room-17-005', 'recreation-room-18-002', 'recreation-room-18-013'] },
];

const patioChecklistHistoryLinks: ChecklistHistoryLink[] = [
  {
    taskId: 'terrace-reset',
    requirementIds: ['patio-01-001', 'patio-01-002', 'patio-13-002', 'patio-16-001', 'patio-16-002'],
  },
];

const laundryRoomChecklistHistoryLinks: ChecklistHistoryLink[] = [
  { taskId: 'deep-laundry-room', requirementIds: taskIdsForChecklist(laundryRoomChecklist) },
  {
    taskId: 'laundry-bench-reset',
    requirementIds: ['laundry-room-01-003', 'laundry-room-06-004', 'laundry-room-06-005', 'laundry-room-06-006'],
  },
  {
    taskId: 'care-dryer-airflow',
    requirementIds: ['laundry-room-09-002', 'laundry-room-09-003', 'laundry-room-09-004', 'laundry-room-09-005', 'laundry-room-09-006', 'laundry-room-16-006'],
  },
  {
    taskId: 'care-washer-filter',
    requirementIds: ['laundry-room-08-002', 'laundry-room-08-003', 'laundry-room-08-006', 'laundry-room-08-007', 'laundry-room-08-009', 'laundry-room-08-010'],
  },
  { taskId: 'care-behind-dryer', requirementIds: ['laundry-room-09-013'] },
  {
    taskId: 'declutter-cleaning-products',
    requirementIds: ['laundry-room-05-009', 'laundry-room-05-010', 'laundry-room-13-002', 'laundry-room-13-003'],
  },
  {
    taskId: 'declutter-cleaning-tools',
    requirementIds: ['laundry-room-13-005', 'laundry-room-13-006', 'laundry-room-13-007'],
  },
];

const officeCinemaChecklistHistoryLinks: ChecklistHistoryLink[] = [
  {
    taskId: 'cinema-office-rescue',
    requirementIds: ['office-cinema-01-001', 'office-cinema-07-001', 'office-cinema-08-015', 'office-cinema-18-001'],
  },
];

const upstairsHallChecklistHistoryLinks: ChecklistHistoryLink[] = [
  {
    taskId: 'upstairs-hall-floor',
    requirementIds: ['upstairs-hall-01-001', 'upstairs-hall-13-001', 'upstairs-hall-15-007'],
  },
  {
    taskId: 'care-wardrobes',
    requirementIds: ['upstairs-hall-06-007', 'upstairs-hall-06-008', 'upstairs-hall-06-009', 'upstairs-hall-06-013', 'upstairs-hall-16-001'],
  },
];

const basementHallChecklistHistoryLinks: ChecklistHistoryLink[] = [
  {
    taskId: 'care-wardrobes',
    requirementIds: ['basement-hall-07-009', 'basement-hall-07-010', 'basement-hall-07-011', 'basement-hall-07-013', 'basement-hall-17-001'],
  },
];

const checklistHistoryLinks: Record<string, ChecklistHistoryLink[]> = {
  [bedroomChecklist.listId]: bedroomChecklistHistoryLinks,
  [livingRoomChecklist.listId]: livingRoomChecklistHistoryLinks,
  [upstairsBathroomChecklist.listId]: upstairsBathroomChecklistHistoryLinks,
  [downstairsBathroomChecklist.listId]: downstairsBathroomChecklistHistoryLinks,
  [kitchenChecklist.listId]: kitchenChecklistHistoryLinks,
  [recreationRoomChecklist.listId]: recreationRoomChecklistHistoryLinks,
  [patioChecklist.listId]: patioChecklistHistoryLinks,
  [laundryRoomChecklist.listId]: laundryRoomChecklistHistoryLinks,
  [officeCinemaChecklist.listId]: officeCinemaChecklistHistoryLinks,
  [upstairsHallChecklist.listId]: upstairsHallChecklistHistoryLinks,
  [basementHallChecklist.listId]: basementHallChecklistHistoryLinks,
};

export function historyLinksForChecklist(checklist: RoomChecklistDefinition): ChecklistHistoryLink[] {
  return checklistHistoryLinks[checklist.listId] ?? [];
}

export function taskCountForChecklist(checklist: RoomChecklistDefinition): number {
  return sectionsForChecklist(checklist).reduce((total, section) => total + section.tasks.length, 0);
}

export function taskIdsForChecklist(checklist: RoomChecklistDefinition): string[] {
  return checklist.sections.flatMap((section) => section.tasks.map((task) => task.id));
}

export function sectionsForChecklist(checklist: RoomChecklistDefinition): RoomChecklistSection[] {
  if (checklist.listId === bedroomChecklist.listId) return checklist.sections;
  return rehomeHiddenFloorTasks(checklist.sections).map((section) => ({
    ...section,
    tasks: condenseSection(section),
  }));
}

export function sourceTaskIdsForTask(task: RoomChecklistTask): string[] {
  return task.sourceTaskIds ?? [task.id];
}

export function taskStatusFromProgress(
  task: RoomChecklistTask,
  progress: Record<string, 'completed' | 'skipped'> | undefined,
): 'completed' | 'skipped' | undefined {
  const statuses = sourceTaskIdsForTask(task).map((taskId) => progress?.[taskId]);
  if (statuses.some((status) => !status)) return undefined;
  return statuses.every((status) => status === 'completed') ? 'completed' : 'skipped';
}

export function resolvedTaskCountForChecklist(
  checklist: RoomChecklistDefinition,
  progress: Record<string, 'completed' | 'skipped'> | undefined,
): number {
  return sectionsForChecklist(checklist)
    .flatMap((section) => section.tasks)
    .filter((task) => taskStatusFromProgress(task, progress)).length;
}

type ChecklistTaskPhase = 'prepare' | 'clean' | 'inspect' | 'restore';
type ChecklistTaskTopic =
  | 'main'
  | 'lighting'
  | 'drain'
  | 'textiles'
  | 'windows'
  | 'plants'
  | 'electronics'
  | 'pet'
  | 'trim'
  | 'floor-dry'
  | 'floor-wet'
  | 'floor-treatment';

function condenseSection(section: RoomChecklistSection): RoomChecklistTask[] {
  const groups = new Map<string, {
    firstIndex: number;
    phase: ChecklistTaskPhase;
    topic: ChecklistTaskTopic;
    tasks: RoomChecklistTask[];
  }>();

  section.tasks.forEach((task, index) => {
    const phase = phaseForTask(task);
    const rawTopic = topicForTask(task, section.title);
    const topic = rawTopic.startsWith('floor-') && phase !== 'clean'
      ? phase === 'prepare' ? 'floor-dry' : 'floor-wet'
      : rawTopic;
    const key = `${phase}:${topic}`;
    const group = groups.get(key);
    if (group) group.tasks.push(task);
    else groups.set(key, { firstIndex: index, phase, topic, tasks: [task] });
  });

  const phaseOrder: ChecklistTaskPhase[] = /^(Avslutning|Återställ)/i.test(section.title)
    ? ['restore', 'inspect', 'clean', 'prepare']
    : /kontroll/i.test(section.title)
      ? ['prepare', 'inspect', 'clean', 'restore']
      : ['prepare', 'clean', 'restore', 'inspect'];
  return [...groups.entries()]
    .map(([, group]) => group)
    .sort((left, right) => (
      phaseOrder.indexOf(left.phase) - phaseOrder.indexOf(right.phase)
      || left.firstIndex - right.firstIndex
    ))
    .map(({ phase, topic, tasks }) => {
      if (tasks.length === 1) return tasks[0]!;
      const uniqueSafeties = [...new Set(tasks.flatMap((task) => task.safety ? [task.safety] : []))];
      return {
        id: `${section.id}-${phase}-${topic}`,
        title: groupTitle(section.title, phase, topic),
        status: 'pending',
        condition: combinedCondition(tasks),
        safety: uniqueSafeties.length === 1 ? uniqueSafeties[0] : undefined,
        sourceTaskIds: tasks.map((task) => task.id),
        includedTasks: tasks,
      };
    });
}

function rehomeHiddenFloorTasks(sections: RoomChecklistSection[]): RoomChecklistSection[] {
  let floorSectionIndex = -1;
  sections.forEach((section, index) => {
    if (/^(Golv|Hårt golv|Badrumsgolvet|Klinkergolv|Plattgolv|Trallgolv|Heltäckningsmatta)|^Golv, lister/i.test(section.title)) {
      floorSectionIndex = index;
    }
  });
  if (floorSectionIndex < 0) return sections;

  const movedTasks: RoomChecklistTask[] = [];
  const nextSections = sections.map((section, sectionIndex) => ({
    ...section,
    tasks: section.tasks.filter((task) => {
      const shouldMove = sectionIndex !== floorSectionIndex
        && (
          (/\b(bakom|under)\b/i.test(task.title) && /\b(?:\w*golv\w*|\w*matta\w*)\b/i.test(task.title))
          || /\b(?:golvlist\w*|tröskel\w*|golvkant\w*)\b/i.test(task.title)
        );
      if (shouldMove) movedTasks.push(task);
      return !shouldMove;
    }),
  }));

  const floorSection = nextSections[floorSectionIndex]!;
  nextSections[floorSectionIndex] = {
    ...floorSection,
    tasks: [...movedTasks, ...floorSection.tasks],
  };
  return nextSections;
}

function topicForTask(task: RoomChecklistTask, sectionTitle: string): ChecklistTaskTopic {
  const title = task.title;
  const concernsHiddenFloor = /\b(bakom|under)\b/i.test(title) && /\b(?:\w*golv\w*|\w*matta\w*)\b/i.test(title);
  if (concernsHiddenFloor) return 'floor-dry';
  if (/\b(?:\w*avlopp\w*|\w*golvbrunn\w*|vattenlås\w*|bottenventil\w*|avrinning\w*|dräneringshål\w*)\b/i.test(title)) return 'drain';
  if (/^(Dammsug|Torrmoppa|Sopa)/i.test(title) && /\b(?:\w*golv\w*|tröskel\w*)\b/i.test(title)) return 'floor-dry';
  if (/\b(?:golvlist\w*|tröskel\w*|golvkant\w*)\b/i.test(title)) return 'trim';
  if (/\b(?:\w*lampa\w*|belysning\w*|spotlight\w*|ljuskälla\w*|takkopp\w*|kristallkrona\w*)\b/i.test(title)) return 'lighting';
  if (!/filtermatta/i.test(title) && /\b(?:\w*gardin\w*|textil\w*|handduk\w*|kudde\w*|pläd\w*|filt(?:ar|en)?|dyna\w*|madrass\w*|(?:badrums|naturfiber|vardagsrums|gång|heltäcknings)?matta\w*|klädsel\w*|kuddfodral\w*)\b/i.test(title)) return 'textiles';
  if (!/fönster- och dörrfoder/i.test(title) && /\b(?:fönster\w*|glasparti\w*|altandörr\w*)\b/i.test(title)) return 'windows';
  if (!/påväxt/i.test(title) && /\b(?:växt\w*|\w*kruka\w*|blad\w*|bevattningsvatten\w*)\b/i.test(title)) return 'plants';
  if (/(?:^|[\s,(])TV(?=[:\s,.)]|$)|\b(?:projektor\w*|dator\w*|bildskärm\w*|högtalare\w*|soundbar\w*|fjärrkontroll\w*|elektronik\w*|digitalpiano\w*|skärmduk\w*)\b/i.test(title)) return 'electronics';
  if (/\b(kattlåda|kattsand|husdjur|djurskål|djurskålar|foderstation)\b/i.test(title)) return 'pet';
  const sectionTopic = defaultTopicForSection(sectionTitle);
  if (sectionTopic === 'floor-wet') {
    if (/^(Punktbehandla|Fläckbehandla|Behandla|Bearbeta|Avlägsna)/i.test(title)) return 'floor-treatment';
    if (/^(Dammsug|Torrmoppa|Sopa|Ta bort|Borsta|Flytta|Plocka)/i.test(title)) return 'floor-dry';
  }
  if (sectionTopic) return sectionTopic;
  return 'main';
}

function defaultTopicForSection(sectionTitle: string): ChecklistTaskTopic | undefined {
  if (/^(Golv|Hårt golv|Badrumsgolvet|Klinkergolv|Plattgolv|Trallgolv|Heltäckningsmatta)|^Golv, lister/i.test(sectionTitle)) return 'floor-wet';
  if (/^(Taklamp|Pendellamp|Takarmatur|Golvlampa|Belysning)/i.test(sectionTitle)) return 'lighting';
  if (/^(Fönster|Husets fönster|Skjutbara glaspartier)/i.test(sectionTitle)) return 'windows';
  if (/^(TV|Takmonterad projektor|Dator|Högtalare|Digitalpiano)/i.test(sectionTitle)) return 'electronics';
  if (/^(Rund matta|Lång gångmatta|Matplatsens naturfibermatta)/i.test(sectionTitle)) return 'textiles';
  return undefined;
}

function groupTitle(
  sectionTitle: string,
  phase: ChecklistTaskPhase,
  topic: ChecklistTaskTopic,
): string {
  if (topic === 'main') return phaseTitle(mainSectionTitle(sectionTitle), phase);
  if (phase === 'clean') {
    const cleanTitles: Record<Exclude<ChecklistTaskTopic, 'main'>, string> = {
      lighting: 'Rengör belysningen',
      drain: 'Rengör avlopp och brunnar',
      textiles: 'Rengör mattor och textilier',
      windows: 'Rengör fönster och glaspartier',
      plants: 'Rengör växter, krukor och underlag',
      electronics: 'Rengör elektroniken',
      pet: 'Rengör husdjurszonen',
      trim: 'Rengör golvlister och trösklar',
      'floor-dry': 'Dammsug och torrengör hela golvet',
      'floor-wet': 'Rengör golvet',
      'floor-treatment': 'Punktbehandla golvet vid behov',
    };
    return cleanTitles[topic];
  }

  const subjects: Record<Exclude<ChecklistTaskTopic, 'main'>, string> = {
    lighting: 'belysningen',
    drain: 'avlopp och brunnar',
    textiles: 'mattor och textilier',
    windows: 'fönster och glaspartier',
    plants: 'växter och krukor',
    electronics: 'elektroniken',
    pet: 'husdjurszonen',
    trim: 'golvlister och trösklar',
    'floor-dry': 'golvet',
    'floor-wet': 'golvet',
    'floor-treatment': 'golvets fläckar och specialbehov',
  };
  const verb = phase === 'prepare' ? 'Förbered' : phase === 'restore' ? 'Återställ' : 'Kontrollera';
  return `${verb} ${subjects[topic]}`;
}

function mainSectionTitle(sectionTitle: string): string {
  const overrides: Record<string, string> = {
    'Tak och belysningsskenor': 'Taket',
    'Tak och infälld belysning': 'Taket',
    'Tak och infällda spotlights': 'Taket',
    'Tak, spotlights och takdetaljer': 'Tak och takdetaljer',
    'Tak, spotlights och sensorer': 'Tak och sensorer',
    'Tak, balkar, belysning och ventilation': 'Tak, balkar och ventilation',
    'Målade väggar, konst och vägglampor': 'Målade väggar och konst',
    'Prydnadsföremål och bordslampa': 'Prydnadsföremål',
    'Textilier och lösa tillbehör': 'Lösa tillbehör och behållare',
    'Träbänk, tillbehör och textilier': 'Träbänk och tillbehör',
    'Loungefåtöljer, träbänk och textilier': 'Loungefåtöljer och träbänk',
    'Tygsoffa, schäslong och textilier': 'Tygsoffa och schäslong',
    'Soffa, fåtöljer och lösa textilier': 'Soffa och fåtöljer',
    'Soffa, kuddar och plädar': 'Soffan',
    'Soffbord och vardagsrumsmatta': 'Soffbordet',
    'Soffbord och naturfibermatta': 'Soffbordet',
    'Växter och dekorationsföremål': 'Dekorationsföremål',
    'Växter, vas och dekorationer': 'Vas och dekorationer',
    'Handfat, blandare och avlopp': 'Handfat och blandare',
    'Fristående handfat, väggblandare och avlopp': 'Fristående handfat och väggblandare',
    'Tvättho, blandare och avlopp': 'Tvättho och blandare',
    'Diskho, blandare och avlopp': 'Diskho och blandare',
    'Duschens väggar, golv och avlopp': 'Duschens väggar och golv',
    'Duschens kakel, nisch, sittbänk och golvbrunn': 'Duschens kakel, nisch och sittbänk',
  };
  return overrides[sectionTitle] ?? sectionTitle;
}

function phaseForTask(task: RoomChecklistTask): ChecklistTaskPhase {
  const title = task.title;
  const firstWord = title.split(' ')[0]?.replace(',', '') ?? '';

  if (/^(Ta loss och rengör|Töm och rengör|Töm dammsugaren|Ta upp rengöringsvattnet|Ta bort (spindelväv|damm|hår|ludd|smuts|aska|kalk|beläggningar|rester|fläckar|torra blad|växtskräp)|(?:Ta|Flytta|Lyft) .+ och (?:rengör|dammsug|torka|tvätta))/i.test(title)) {
    return 'clean';
  }
  if (/^(Rulla eller förvara|Öppna vattenkranar|Ta bort städutrustning|Markera .+ som slutförd|Placera (?!inget))/i.test(title)) return 'restore';
  if (/\b(under rengöringen|medan .+ rengörs)\b/i.test(title)) return 'prepare';
  if (/^Vädra .+ under städningen/i.test(title) || /^Låt .+ (svalna|bli kall)/i.test(title)) return 'prepare';
  if (/^Vädra .+ (efter|tills)/i.test(title)) return 'restore';
  if (/^(Sätt tillbaka|Ställ tillbaka|Lägg tillbaka|Koppla in|Slå på|Häng upp|Placera tillbaka|Fyll på|Låt .+ torka|Åter|Återanslut|Anslut|Lämna|Förvara)/i.test(title)) {
    return 'restore';
  }
  if (/^(Kontrollera|Inspektera|Funktionstesta|Provkör|Notera|Testa|Mät|Lukta|Bekräfta|Bedöm|Verifiera|Säkerställ|Starta|Boka|Avbryt|Skilj|Gör en slutrunda|Dokumentera|Fotografera)/i.test(title)) {
    return /(\b(före|innan|rengöringskod|ytfinish|material|kall|kalla|sval|svala|avstängd|urkopplad)\b|skötsel|tvättråd|tvätt- och|tvättmärk)/i.test(title)
      ? 'prepare'
      : 'inspect';
  }
  if (/^(Koppla ur|Koppla bort|Sätt på ventilationen|Ordna en tillfällig)/i.test(title)) return 'prepare';
  if (/^Ordna /i.test(title)) return 'restore';
  if ([
    'Ta', 'Töm', 'Flytta', 'Stäng', 'Bryt', 'Lyft', 'Använd', 'Öppna', 'Släck',
    'Dra', 'Markera', 'Märk', 'Skydda', 'Blöt',
    'Välj', 'Säkra', 'Plocka', 'Identifiera', 'Lokalisera', 'Spara', 'Sortera', 'Planera', 'Håll',
    'Vik', 'Placera',
  ].includes(firstWord)) {
    return 'prepare';
  }
  return 'clean';
}

function combinedCondition(tasks: RoomChecklistTask[]): ChecklistCondition {
  if (tasks.some((task) => task.condition === 'always')) return 'always';
  const conditions = [...new Set(tasks.map((task) => task.condition))];
  return conditions.length === 1 ? conditions[0]! : 'if_applicable';
}

function phaseTitle(sectionTitle: string, phase: ChecklistTaskPhase): string {
  const isFinishSection = /^(Avslutning|Återställ)/i.test(sectionTitle);
  if (isFinishSection) {
    if (phase === 'inspect') return 'Gör slutkontrollen';
    if (phase === 'restore') return 'Återställ rummet';
    if (phase === 'clean') return 'Ta hand om städredskap och slutdetaljer';
    return 'Slutför de sista praktiska momenten';
  }

  const isControlSection = /kontroll/i.test(sectionTitle);
  if (isControlSection) {
    if (phase === 'inspect') return sectionTitle;
    if (phase === 'clean') return 'Åtgärda och rengör det som upptäcks';
    if (phase === 'restore') return 'Avsluta kontrollen';
    return 'Förbered kontrollen';
  }

  const subject = lowerFirst(sectionTitle);
  if (phase === 'prepare') return /^Förbered /i.test(sectionTitle) ? sectionTitle : `Förbered ${subject}`;
  if (phase === 'inspect') return `Kontrollera ${subject}`;
  if (phase === 'restore') return `Återställ ${subject}`;
  return /^Förbered /i.test(sectionTitle) ? 'Gör klart förberedelserna' : `Rengör ${subject}`;
}

function lowerFirst(value: string): string {
  if (value.length > 1 && value[0] === value[0]?.toLocaleUpperCase('sv-SE') && value[1] === value[1]?.toLocaleUpperCase('sv-SE')) {
    return value;
  }
  return value.charAt(0).toLocaleLowerCase('sv-SE') + value.slice(1);
}

const conditionLabels: Record<ChecklistCondition, string> = {
  always: 'Ska göras',
  if_accessible: 'Om åtkomligt',
  if_accessible_without_dismantling: 'Om åtkomligt utan demontering',
  if_allowed: 'Om det är tillåtet',
  if_applicable: 'Om det är relevant',
  if_ash_removed: 'När askan är borttagen',
  if_available: 'Om utrustningen finns',
  if_closed: 'När delen är stängd',
  if_cleaned_damp: 'Efter fuktig rengöring',
  if_disconnected: 'När den är urkopplad',
  if_due: 'När det är dags',
  if_due_and_material_allows: 'När det är dags och materialet tillåter',
  if_drawers_are_removable: 'Om lådorna går att ta ur',
  if_floor_drain_present: 'Om det finns golvbrunn',
  if_found: 'Om det hittas',
  if_glass: 'Om ytan är av glas',
  if_glass_present: 'Om det finns glas',
  if_helpful: 'Om det hjälper',
  if_in_scope: 'Om det ingår',
  if_issue_found: 'Om ett problem upptäcks',
  if_interior_cleaning_is_in_scope: 'Om invändig rengöring ingår',
  if_interior_cleaning_was_done: 'Om insidan har rengjorts',
  if_long_term_storage: 'Vid långtidsförvaring',
  if_manual_cleaning: 'Vid manuell rengöring',
  if_moved: 'Om möbeln har flyttats',
  if_needed: 'Vid behov',
  if_not_already_cleaned: 'Om det inte redan är rengjort',
  if_possible: 'Om möjligt',
  if_present: 'Om det finns',
  if_present_and_due: 'Om det finns och är dags',
  if_present_and_supported: 'Om det finns och manualen tillåter',
  if_recently_used: 'Om den nyligen har använts',
  if_removable: 'Om den går att ta loss',
  if_removed: 'Om den har tagits loss',
  if_recommended: 'Om tillverkaren rekommenderar',
  if_required: 'Om det krävs',
  if_rug_can_be_moved: 'Om mattan går att flytta',
  if_safe: 'Om det kan göras säkert',
  if_safely_accessible: 'Om säkert åtkomligt',
  if_safely_possible: 'Om det kan göras säkert',
  if_safely_movable: 'Om den kan flyttas säkert',
  if_step_stool: 'Om stabil pall används',
  if_smoke_alarm: 'Om det är en brandvarnare',
  if_stored_on_patio: 'Om det förvaras på altanen',
  if_stored_in_room: 'Om det förvaras i rummet',
  if_supported: 'Om materialet tillåter',
  if_supported_by_window: 'Om fönstret tillåter',
  if_textiles_stored: 'Om textilier förvaras där',
  if_user_accessible: 'Om användaren kommer åt delen',
  if_user_serviceable: 'Om delen är avsedd för användaråtkomst',
  if_vent_position_was_marked: 'Om ventilens läge har markerats',
  if_ventilation_component: 'Om det är en ventilationsdel',
  if_wallpaper_is_washable: 'Om tapeten är tvättbar',
  if_washed: 'Om den har tvättats',
  if_wet_cleaned: 'Efter våtrengöring',
  if_wheeled: 'Om den har hjul',
  if_wood: 'Om ytan är av trä',
  when_deep_cleaning_litter_box: 'Vid grundlig rengöring av kattlådan',
};

const safetyLabels: Record<ChecklistSafety, string> = {
  chemicals: 'Kemikalier',
  chemicals_and_fire: 'Kemikalier och brandsäkerhet',
  data_and_electricity: 'Data och elsäkerhet',
  electricity: 'Elsäkerhet',
  electricity_and_height: 'El och arbete på höjd',
  electricity_and_heat: 'El och värme',
  electricity_and_pet_food: 'El och djurfoder',
  electricity_and_plumbing: 'El, vatten och avlopp',
  electronics: 'Elektronik',
  electronics_and_height: 'Elektronik och arbete på höjd',
  fall: 'Fallrisk',
  fire: 'Brandsäkerhet',
  fire_and_electricity: 'Brand och el',
  fire_and_plumbing: 'Brand, vatten och avlopp',
  food: 'Livsmedelssäkerhet',
  glass: 'Glas',
  glass_and_pinch: 'Glas och klämrisk',
  height: 'Arbete på höjd',
  height_and_roof: 'Arbete på höjd och tak',
  heat: 'Heta ytor',
  heat_and_electricity: 'Värme och el',
  hygiene: 'Hygien',
  material: 'Materialkontroll',
  mechanical: 'Mekaniska delar',
  mechanical_and_electricity: 'Mekanik och el',
  moisture: 'Fukt',
  optics: 'Optik',
  pests: 'Skadedjur',
  pet_food: 'Djurfoderhygien',
  pinch: 'Klämrisk',
  pinch_and_electricity: 'Klämrisk och el',
  pinch_and_heat: 'Klämrisk och värme',
  plumbing: 'Vatten och avlopp',
  sharp_tool: 'Vassa redskap',
  sharp_tools: 'Vassa redskap',
  slip: 'Halkrisk',
  slip_and_chemicals: 'Halkrisk och kemikalier',
  temperature: 'Temperatur',
  water_and_electricity: 'Vatten och el',
};

export function conditionLabel(condition: ChecklistCondition): string {
  return conditionLabels[condition];
}

export function safetyLabel(safety: string): string {
  return safetyLabels[safety as ChecklistSafety] ?? safety;
}
