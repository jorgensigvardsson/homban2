import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { allPlanningTasks } from '../domain/allPlanningTasks';
import {
  conditionLabel,
  historyLinksForChecklist,
  resolvedTaskCountForChecklist,
  roomChecklistForRoom,
  safetyLabel,
  sectionsForChecklist,
  sourceTaskIdsForTask,
  taskCountForChecklist,
  taskIdsForChecklist,
  taskStatusFromProgress,
  type RoomChecklistTask,
} from '../domain/roomChecklist';
import {
  loadRoomChecklistProgress,
  saveRoomChecklistProgress,
  type ChecklistItemStatus,
  type ChecklistRoomProgress,
  type RoomChecklistProgress,
} from '../domain/roomChecklistProgress';
import { cooldownFor, householdRooms } from '../domain/taskEngine';
import {
  addTaskCompletion,
  isTaskOnCooldown,
  loadTaskHistory,
  saveTaskHistory,
  type TaskCompletion,
} from '../domain/taskHistory';

const participantOptions = [1, 2, 3, 4, 5];
const DEFAULT_AVERAGE_ACTIVE_MINUTES_PER_TASK = (8 * 60) / 108;
const SEQUENTIAL_WORK_SHARE = 0.25;

export function RoomChecklistPage() {
  const { roomId } = useParams();
  const room = householdRooms.find((candidate) => candidate.id === roomId);
  const checklist = roomId ? roomChecklistForRoom(roomId) : undefined;
  const [allProgress, setAllProgress] = useState<RoomChecklistProgress>(loadRoomChecklistProgress);
  const [history, setHistory] = useState<TaskCompletion[]>(loadTaskHistory);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(1);

  const roomProgress = useMemo(
    () => (roomId ? allProgress[roomId] ?? {} : {}),
    [allProgress, roomId],
  );
  const displaySections = useMemo(
    () => (checklist ? sectionsForChecklist(checklist) : []),
    [checklist],
  );
  const taskCount = checklist ? taskCountForChecklist(checklist) : 0;
  const completedCount = checklist ? resolvedTaskCountForChecklist(checklist, roomProgress) : 0;
  const completedPercent = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
  const sourceTaskCount = checklist ? taskIdsForChecklist(checklist).length : 0;
  const remainingSourceTaskCount = displaySections
    .flatMap((section) => section.tasks)
    .flatMap(sourceTaskIdsForTask)
    .filter((taskId) => !roomProgress[taskId]).length;
  const averageActiveMinutesPerSourceTask = checklist?.estimatedActiveMinutes && sourceTaskCount > 0
    ? checklist.estimatedActiveMinutes / sourceTaskCount
    : DEFAULT_AVERAGE_ACTIVE_MINUTES_PER_TASK;
  const estimatedMinutes = estimateRemainingMinutes(
    remainingSourceTaskCount,
    participantCount,
    averageActiveMinutesPerSourceTask,
  );

  if (!room || !roomId || !checklist) {
    return (
      <div className="ring-page narrow-page empty-checklist-page">
        <p className="ring-eyebrow">Rum för rum</p>
        <h1>Den checklistan finns inte än</h1>
        <p>Det här rummet väntar fortfarande på sitt fullständiga underlag.</p>
        <Link className="secondary-action" to="/rooms">← Till alla rum</Link>
      </div>
    );
  }

  const activeRoom = room;
  const activeRoomId = roomId;
  const activeChecklist = checklist;

  function setItemStatus(task: RoomChecklistTask, status: ChecklistItemStatus | undefined) {
    const currentRoomProgress = allProgress[activeRoomId] ?? {};
    const nextRoomProgress = { ...currentRoomProgress };
    for (const sourceTaskId of sourceTaskIdsForTask(task)) {
      if (status) nextRoomProgress[sourceTaskId] = status;
      else delete nextRoomProgress[sourceTaskId];
    }

    const nextAllProgress = { ...allProgress, [activeRoomId]: nextRoomProgress };
    setAllProgress(nextAllProgress);
    saveRoomChecklistProgress(nextAllProgress);
    syncCompletedPlannerTasks(nextRoomProgress);
  }

  function syncCompletedPlannerTasks(nextRoomProgress: ChecklistRoomProgress) {
    let nextHistory = history;
    const syncedTitles: string[] = [];

    for (const link of historyLinksForChecklist(activeChecklist)) {
      const allRequirementsResolved = link.requirementIds.every((taskId) => nextRoomProgress[taskId]);
      if (!allRequirementsResolved) continue;

      const plannerTask = allPlanningTasks.find((task) => task.id === link.taskId);
      if (!plannerTask || isTaskOnCooldown(plannerTask.id, cooldownFor(plannerTask), nextHistory)) continue;

      nextHistory = addTaskCompletion(nextHistory, plannerTask.id);
      syncedTitles.push(plannerTask.title);
    }

    if (nextHistory !== history) {
      setHistory(nextHistory);
      saveTaskHistory(nextHistory);
    }
    setSyncNotice(syncedTitles.length > 0
      ? `Veckoplaneringen uppdaterades: ${syncedTitles.join(', ')}.`
      : null);
  }

  function resetChecklist() {
    if (!window.confirm(`Starta om checklistan för ${activeRoom.name}? Veckohistoriken påverkas inte.`)) return;
    const nextProgress = { ...allProgress };
    delete nextProgress[activeRoomId];
    setAllProgress(nextProgress);
    saveRoomChecklistProgress(nextProgress);
    setSyncNotice(null);
  }

  return (
    <div className="ring-page checklist-page">
      <Link className="back-button checklist-back" to="/rooms">← Alla rum</Link>

      <header className="checklist-hero">
        <p className="ring-eyebrow">{activeChecklist.title}</p>
        <h1>{activeRoom.name}</h1>
        <p>{activeChecklist.description}</p>
      </header>

      <section className="checklist-team-panel" aria-labelledby="participant-heading">
        <div>
          <p className="ring-eyebrow">Arbetsstyrka</p>
          <h2 id="participant-heading">Hur många personer städar?</h2>
          <div className="participant-count-options" role="group" aria-label="Antal personer">
            {participantOptions.map((count) => (
              <button
                type="button"
                key={count}
                className={participantCount === count ? 'selected' : ''}
                aria-pressed={participantCount === count}
                onClick={() => setParticipantCount(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
        <div className="checklist-time-estimate" aria-live="polite">
          <span>Grovt estimat för det som återstår</span>
          <strong>{estimatedMinutes === 0 ? 'Klart' : formatEstimatedTime(estimatedMinutes)}</strong>
          <small>Aktiv städtid. Tvätt och torkning kan förlänga klocktiden.</small>
        </div>
      </section>

      <section className="checklist-progress-panel" aria-label="Framsteg">
        <div>
          <strong>{completedCount} / {taskCount}</strong>
          <span>{completedCount === taskCount ? 'Allt är hanterat' : 'punkter hanterade'}</span>
        </div>
        <div className="checklist-progress-track">
          <span style={{ width: `${completedPercent}%` }} />
        </div>
      </section>

      {sourceTaskCount > taskCount && (
        <p className="checklist-condensed-note">
          När flera delytor hör till samma jobb är de samlade under “delmoment ingår”. Öppna raden
          om du vill se den fullständiga detaljen.
        </p>
      )}

      {syncNotice && <p className="checklist-sync-notice" role="status">✓ {syncNotice}</p>}

      {completedCount === taskCount && (
        <section className="checklist-complete-banner">
          <span>✦</span>
          <div>
            <strong>{activeRoom.name} är färdigt på riktigt.</strong>
            <p>{activeChecklist.definitionOfDone}</p>
          </div>
        </section>
      )}

      <details className="checklist-scope">
        <summary>Så är listan avgränsad</summary>
        <ul>
          {activeChecklist.scopeNotes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      </details>

      <div className="checklist-sections">
        {displaySections.map((section) => {
          const resolvedInSection = section.tasks.filter((task) => taskStatusFromProgress(task, roomProgress)).length;
          const isSectionComplete = resolvedInSection === section.tasks.length;

          return (
            <section className="checklist-section" key={section.id}>
              <header className="checklist-section-heading">
                <span className="checklist-section-number">{section.order}</span>
                <span>
                  <strong>{section.title}</strong>
                  <small>{resolvedInSection} av {section.tasks.length}</small>
                </span>
                <span className={isSectionComplete ? 'section-status section-status-complete' : 'section-status'}>
                  {isSectionComplete ? 'Klar ✓' : 'Kvar'}
                </span>
              </header>

              <div className="checklist-items">
                {section.tasks.map((task) => {
                  const status = taskStatusFromProgress(task, roomProgress);
                  const isConditional = task.condition !== 'always';
                  const includedTasks = task.includedTasks ?? [];
                  const safetyBadges = [...new Set(
                    (includedTasks.length > 0 ? includedTasks : [task])
                      .flatMap((includedTask) => includedTask.safety ? [safetyLabel(includedTask.safety)] : []),
                  )];
                  return (
                    <article className={`checklist-item ${status ? `checklist-item-${status}` : ''}`} key={task.id}>
                      <button
                        type="button"
                        className="checklist-checkbox"
                        aria-label={status === 'completed' ? `Markera ${task.title} som ogjord` : `Markera ${task.title} som gjord`}
                        aria-pressed={status === 'completed'}
                        onClick={() => setItemStatus(task, status === 'completed' ? undefined : 'completed')}
                      >
                        {status === 'completed' ? '✓' : ''}
                      </button>

                      <div className="checklist-item-copy">
                        <h3>{task.title}</h3>
                        {task.details && <p>{task.details}</p>}
                        <div className="checklist-badges">
                          <span>{conditionLabel(task.condition)}</span>
                          {safetyBadges.map((label) => (
                            <span className="safety-badge" key={label}>⚠ {label}</span>
                          ))}
                        </div>
                        {includedTasks.length > 0 && (
                          <details className="checklist-included-tasks">
                            <summary>{includedTasks.length} delmoment ingår</summary>
                            <ul>
                              {includedTasks.map((includedTask) => (
                                <li key={includedTask.id}>
                                  <strong>{includedTask.title}</strong>
                                  {includedTask.details && <p>{includedTask.details}</p>}
                                  {(includedTask.condition !== 'always' || includedTask.safety) && (
                                    <small>
                                      {includedTask.condition !== 'always' && conditionLabel(includedTask.condition)}
                                      {includedTask.condition !== 'always' && includedTask.safety ? ' · ' : ''}
                                      {includedTask.safety && `⚠ ${safetyLabel(includedTask.safety)}`}
                                    </small>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>

                      {isConditional && (
                        <button
                          type="button"
                          className={`skip-action ${status === 'skipped' ? 'skip-action-active' : ''}`}
                          onClick={() => setItemStatus(task, status === 'skipped' ? undefined : 'skipped')}
                        >
                          {status === 'skipped' ? 'Ej relevant ✓' : 'Ej relevant'}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="checklist-footer">
        <p>Avprickningen sparas automatiskt på den här enheten.</p>
        {completedCount > 0 && <button type="button" onClick={resetChecklist}>Starta om checklistan</button>}
      </footer>
    </div>
  );
}

function estimateRemainingMinutes(
  remainingSourceTasks: number,
  participants: number,
  averageActiveMinutesPerSourceTask: number,
): number {
  if (remainingSourceTasks <= 0) return 0;
  const onePersonMinutes = averageActiveMinutesPerSourceTask * remainingSourceTasks;
  const sequentialMinutes = onePersonMinutes * SEQUENTIAL_WORK_SHARE;
  const parallelMinutes = onePersonMinutes - sequentialMinutes;
  const estimate = sequentialMinutes + parallelMinutes / participants;
  return Math.max(15, Math.round(estimate / 15) * 15);
}

function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) return `cirka ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0
    ? `cirka ${hours} tim`
    : `cirka ${hours} tim ${remainingMinutes} min`;
}
