export type ChecklistItemStatus = 'completed' | 'skipped';
export type ChecklistRoomProgress = Record<string, ChecklistItemStatus>;
export type RoomChecklistProgress = Record<string, ChecklistRoomProgress>;

const STORAGE_KEY = 'ring-pa.room-checklists.v1';

export function loadRoomChecklistProgress(): RoomChecklistProgress {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return {};
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([roomId, roomProgress]) => {
        if (!roomProgress || typeof roomProgress !== 'object' || Array.isArray(roomProgress)) return [];
        const validEntries = Object.entries(roomProgress).filter(
          (entry): entry is [string, ChecklistItemStatus] => entry[1] === 'completed' || entry[1] === 'skipped',
        );
        return [[roomId, Object.fromEntries(validEntries)]];
      }),
    );
  } catch {
    return {};
  }
}

export function saveRoomChecklistProgress(progress: RoomChecklistProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Checklist work should still be usable when browser storage is unavailable.
  }
}

export function resolvedChecklistCount(
  progress: ChecklistRoomProgress | undefined,
  currentTaskIds?: string[],
): number {
  const resolvedTaskIds = Object.keys(progress ?? {});
  if (!currentTaskIds) return resolvedTaskIds.length;
  const currentIds = new Set(currentTaskIds);
  return resolvedTaskIds.filter((taskId) => currentIds.has(taskId)).length;
}
