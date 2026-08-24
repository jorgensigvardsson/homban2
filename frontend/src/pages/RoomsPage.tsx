import { Link } from 'react-router';
import { householdRooms, type Floor } from '../domain/taskEngine';
import { resolvedTaskCountForChecklist, roomChecklistForRoom, taskCountForChecklist } from '../domain/roomChecklist';
import { loadRoomChecklistProgress } from '../domain/roomChecklistProgress';

const floorLabels: Record<Floor, string> = {
  upper: 'Övervåning',
  middle: 'Mellanplan',
  lower: 'Källarplan',
  separate: 'Separat del',
};

export function RoomsPage() {
  const progress = loadRoomChecklistProgress();

  return (
    <div className="ring-page rooms-page">
      <header className="rooms-hero">
        <p className="ring-eyebrow">Ingen timer. Inga genvägar.</p>
        <h1>Rum för rum</h1>
        <p>
          Välj ett rum och gör hela listan, uppifrån och ned. Det du gör här räknas också i
          veckoplaneringen.
        </p>
      </header>

      <div className="room-overview-grid">
        {householdRooms.map((room) => {
          const checklist = roomChecklistForRoom(room.id);
          const taskCount = checklist ? taskCountForChecklist(checklist) : 0;
          const hasChecklist = Boolean(checklist);
          const completed = checklist ? resolvedTaskCountForChecklist(checklist, progress[room.id]) : 0;
          const percent = hasChecklist ? Math.round((completed / taskCount) * 100) : 0;

          if (!hasChecklist) {
            return (
              <article className="room-overview-card room-overview-card-disabled" key={room.id}>
                <div>
                  <span className="room-floor">{floorLabels[room.floor]}</span>
                  <h2>{room.name}</h2>
                </div>
                <span className="room-coming">Checklista kommer</span>
              </article>
            );
          }

          return (
            <Link className="room-overview-card" key={room.id} to={`/rooms/${room.id}`}>
              <div>
                <span className="room-floor">{floorLabels[room.floor]}</span>
                <h2>{room.name}</h2>
                <p>{completed} av {taskCount} punkter hanterade</p>
              </div>
              <div className="room-card-progress" aria-label={`${percent} procent färdigt`}>
                <span style={{ width: `${percent}%` }} />
              </div>
              <strong>{completed === taskCount ? 'Klart ✓' : 'Öppna listan →'}</strong>
            </Link>
          );
        })}
      </div>

      <p className="rooms-footnote">
        Master bedroom, övre hall, källarhall, kök, vardagsrum, gillestuga, biorum/kontor, båda
        badrummen, tvättstugan och altanen har nu fullständiga checklistor. Entréhallen väntar
        tills renoveringen är klar.
      </p>
    </div>
  );
}
