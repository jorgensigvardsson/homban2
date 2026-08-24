import { declutterTasks } from './declutterTaskBank';
import { microTasks } from './microTaskBank';
import { professionalTasks } from './professionalTaskBank';
import { householdTasks } from './taskBank';
import { householdRooms } from './taskEngine';

const activeRoomIds = new Set(householdRooms.map((room) => room.id));

export const allPlanningTasks = [...householdTasks, ...microTasks, ...declutterTasks, ...professionalTasks]
  .filter((task) => activeRoomIds.has(task.roomId));
