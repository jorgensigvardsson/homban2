import { useEffect, useState } from 'react';
import { buildPlan, cooldownFor, householdMembers, householdRooms, type Assignment, type Task as EngineTask } from '../domain/taskEngine';
import { allPlanningTasks } from '../domain/allPlanningTasks';
import { addTaskCompletion, isTaskOnCooldown, latestTaskCompletion, loadTaskHistory, saveTaskHistory, type TaskCompletion } from '../domain/taskHistory';
import { taskForDate } from '../domain/seasonality';
import { loadOrCreateTaskSchedule } from '../domain/taskSchedule';
import { getWeeklyRecommendations, recurrenceLabel } from '../domain/weeklyRecommendation';
import { getWeeklyOverview, type WeeklyOverview } from '../domain/weeklyOverview';

type Mode = 'daily' | 'weekend' | 'area' | 'guests' | 'declutter' | 'timed' | 'cat-pee' | 'cat-poop';
type IncidentMode = Extract<Mode, 'cat-pee' | 'cat-poop'>;
type Screen = 'home' | 'setup' | 'incident-choice' | 'session' | 'bonus' | 'done' | 'rest';

type ModeInfo = {
  id: Mode;
  title: string;
  duration: number;
  description: string;
  accent: string;
  eyebrow: string;
};

type Task = {
  id: string;
  title: string;
  room: string;
  minutes: number;
  detail: string;
  done: string;
  category: string;
  assignedTo?: string;
  steps?: string[];
  why?: string;
  cooldownHours?: number;
  tools?: string[];
  warnings?: string[];
  completionIds?: string[];
  subtasks?: Array<{ id: string; title: string; isComplete: boolean; completedLabel?: string }>;
};

type CleaningArea = {
  id: string;
  label: string;
  roomIds: string[];
};

const modes: ModeInfo[] = [
  { id: 'daily', title: 'Vardagsreset', duration: 20, description: 'En lätt reset när ni vill få det fint utan att storstäda.', accent: 'mint', eyebrow: 'Lätt reset' },
  { id: 'weekend', title: 'Helgreset', duration: 60, description: 'Nu tar vi tag i det: grundligt, rum för rum.', accent: 'sun', eyebrow: 'Storstädning' },
  { id: 'area', title: 'Storstäd ett område', duration: 60, description: 'Peka ut köket, ett badrum eller en annan zon som behöver all kraft.', accent: 'coral', eyebrow: 'Eget fokus' },
  { id: 'guests', title: 'Gäster snart', duration: 15, description: 'Fasad, funktion och fräschör där gästerna rör sig.', accent: 'coral', eyebrow: 'Snabb fasad' },
  { id: 'declutter', title: 'Rensa något', duration: 30, description: 'En låda, en hylla eller en kategori i taget.', accent: 'plum', eyebrow: 'Skapa luft' },
  { id: 'timed', title: 'Bestäm hur lång tid du vill spendera', duration: 20, description: 'Börja med tiden så anpassar vi nivån efter den.', accent: 'sky', eyebrow: 'Valfri tid' },
  { id: 'cat-pee', title: 'Kattkiss', duration: 15, description: 'Ta bort urin och lukt säkert, tills det är löst.', accent: 'sky', eyebrow: 'Akutläge' },
  { id: 'cat-poop', title: 'Kattbajs', duration: 15, description: 'Ta bort, rengör och återställ platsen säkert.', accent: 'plum', eyebrow: 'Akutläge' },
];

const homeModes = modes.filter((mode) => !isIncidentMode(mode.id));

const weeklyMode: ModeInfo = { id: 'weekend', title: 'Veckans rekommendation', duration: 30, description: 'En mogen sällanuppgift som håller hemmet i professionellt skick.', accent: 'sun', eyebrow: 'Återkommande' };
const cleaningAreas: CleaningArea[] = [
  { id: 'kitchen', label: 'Kök', roomIds: ['kitchen'] },
  { id: 'upstairs-bathroom', label: 'Badrum uppe', roomIds: ['upstairs-bathroom'] },
  { id: 'downstairs-bathroom', label: 'Badrum nere', roomIds: ['downstairs-bathroom'] },
  { id: 'living-room', label: 'Vardagsrum', roomIds: ['living-room'] },
  { id: 'laundry-room', label: 'Tvättstuga', roomIds: ['laundry-room'] },
  { id: 'halls', label: 'Hallar & trappor', roomIds: ['upstairs-hall', 'middle-hall', 'basement-hall'] },
  { id: 'bedrooms', label: 'Sovrum', roomIds: ['bedroom-1'] },
  { id: 'basement', label: 'Källarplan', roomIds: ['basement-lounge', 'basement-hall', 'downstairs-bathroom'] },
  { id: 'cinema-office', label: 'Biorum & kontor', roomIds: ['cinema-office'] },
];

const members = [
  { id: 'malin', name: 'Malin', role: 'Vuxen', initials: 'M' },
  { id: 'jorgen', name: 'Jörgen', role: 'Vuxen', initials: 'J' },
  { id: 'alice', name: 'Alice', role: 'Frivillig', initials: 'A' },
  { id: 'annie', name: 'Annie', role: 'Frivillig', initials: 'A' },
  { id: 'ella', name: 'Ella', role: 'Frivillig', initials: 'E' },
];

const bonusAffirmations = [
  'Du gjorde mer än planen vågade hoppas på.',
  'Det där lilla extra syns faktiskt.',
  'Hemmet fick en high five av dig.',
  'Du hittade energi där den gömde sig.',
  'Det behöver inte vara perfekt. Det behöver bara kännas bättre.',
];

const incidentTaskBank: Record<IncidentMode, Task[]> = {
  'cat-pee': [
    { id: 'cat-pee-absorb', title: 'Sug upp utan att gnugga', room: 'Incidentplatsen', minutes: 5, detail: 'Sug upp så mycket urin som möjligt.', done: 'Ingen mer vätska går att pressa upp.', category: 'Akut', cooldownHours: 0, tools: ['Skyddshandskar', 'Papper eller absorberande handduk'], steps: ['Håll katten borta från platsen.', 'Tryck med absorberande material; gnugga inte.', 'Byt material och upprepa tills det kommer upp torrt.'] },
    { id: 'cat-pee-enzyme', title: 'Behandla rätt material', room: 'Incidentplatsen', minutes: 10, detail: 'Använd materialanpassad enzymrengöring.', done: 'Hela det drabbade området är behandlat enligt etiketten.', category: 'Säkerhet', cooldownHours: 0, tools: ['Enzymrengöring för katturin', 'Skyddshandskar'], warnings: ['Blanda aldrig med klorin, ammoniak eller andra rengöringsmedel.', 'Prova först på en dold yta och följ produktens verkningstid.'], steps: ['Identifiera materialet och läs produktetiketten.', 'Behandla hela området, även kanten runt den synliga fläcken.', 'Låt verka och torka precis enligt anvisningen.'] },
    { id: 'cat-pee-follow-up', title: 'Kontrollera när det har torkat', room: 'Samma plats', minutes: 5, detail: 'Lukt går inte att bedöma ordentligt förrän ytan torkat.', done: 'Platsen är torr, kontrollerad och noterad om behandling behöver upprepas.', category: 'Uppföljning', cooldownHours: 0, warnings: ['Återkommande urinering utanför lådan kan behöva bedömas av veterinär.'], steps: ['Håll platsen fri tills den är torr.', 'Kontrollera lukt och eventuell fläck i torrt skick.', 'Notera plats och datum om incidenten återkommer.'] },
  ],
  'cat-poop': [
    { id: 'cat-poop-remove', title: 'Ta bort allt fast material', room: 'Incidentplatsen', minutes: 5, detail: 'Lyft bort utan att pressa in smuts i ytan.', done: 'Allt synligt fast material är borta och förslutet.', category: 'Akut', cooldownHours: 0, tools: ['Engångshandskar', 'Papper', 'Förslutningsbar påse'], steps: ['Håll katten och andra borta från platsen.', 'Lyft upp materialet varsamt utan att gnida.', 'Förslut påsen och kasta den.'] },
    { id: 'cat-poop-clean', title: 'Rengör ytan materialanpassat', room: 'Incidentplatsen', minutes: 10, detail: 'Rengör från ytterkant mot mitten.', done: 'Synlig smuts är borta och ytan är rengjord utan produktrester.', category: 'Hygien', cooldownHours: 0, tools: ['Skyddshandskar', 'Separata dukar', 'Rengöring som materialet tål'], warnings: ['Blanda aldrig olika rengörings- eller desinfektionsmedel.', 'Använd inte samma duk på andra ytor.'], steps: ['Kontrollera vilket material som drabbats.', 'Ta upp rester med en separat fuktad duk från ytterkant mot mitten.', 'Rengör enligt materialets skötselråd och låt torka.'] },
    { id: 'cat-poop-finish', title: 'Avsluta hygieniskt', room: 'Incidentplatsen', minutes: 5, detail: 'Ta hand om avfall, händer och kattlåda.', done: 'Avfallet är ute, redskapen omhändertagna och händerna tvättade.', category: 'Uppföljning', cooldownHours: 0, warnings: ['Kontakta veterinär vid återkommande incidenter, diarré, blod, smärta eller påverkat allmäntillstånd.'], steps: ['Kasta engångsmaterial och tvätta återanvändbara redskap separat.', 'Tvätta händerna noggrant med tvål och vatten.', 'Kontrollera att kattlådan är ren, tillgänglig och lugnt placerad.'] },
  ],
};

export function HomePage() {
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedMode, setSelectedMode] = useState<Mode>('daily');
  const [selectedAreaId, setSelectedAreaId] = useState('kitchen');
  const [selectedMembers, setSelectedMembers] = useState(['malin', 'jorgen']);
  const [selectedMinutes, setSelectedMinutes] = useState(20);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [plannedTasks, setPlannedTasks] = useState<Task[]>([]);
  const [bonusTasks, setBonusTasks] = useState<Task[]>([]);
  const [baseTaskCount, setBaseTaskCount] = useState(0);
  const [bonusCompleted, setBonusCompleted] = useState(0);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [completionHistory, setCompletionHistory] = useState<TaskCompletion[]>(loadTaskHistory);
  const [taskSchedule] = useState(() => loadOrCreateTaskSchedule(allPlanningTasks, completionHistory));
  const [weeklySession, setWeeklySession] = useState(false);
  const [incidentSession, setIncidentSession] = useState(false);
  const selectedArea = cleaningAreas.find((area) => area.id === selectedAreaId) ?? cleaningAreas[0]!;
  const baseMode = modes.find((item) => item.id === selectedMode) ?? modes[0]!;
  const mode = selectedMode === 'area' ? { ...baseMode, title: `Storstäd ${selectedArea.label.toLowerCase()}` } : baseMode;
  const activeMode = weeklySession ? weeklyMode : mode;
  const specialTasks = selectedMode === 'cat-pee' || selectedMode === 'cat-poop' ? incidentTaskBank[selectedMode] : [];
  const planningNow = new Date();
  const planningTasks = allPlanningTasks.map((task) => taskForDate(task, planningNow));
  const weeklyRecommendations = getWeeklyRecommendations(planningTasks, completionHistory, planningNow, taskSchedule);
  const weeklyRecommendation = weeklyRecommendations[0];
  const otherDueRecommendations = weeklyRecommendations.filter((recommendation, index) => index > 0 && recommendation.status === 'due').length;
  const weeklyOverview = getWeeklyOverview(planningTasks, completionHistory, planningNow, taskSchedule);

  useEffect(() => {
    if (screen !== 'session' || incidentSession || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [screen, secondsLeft, incidentSession]);

  function startSetup(nextMode: Mode, areaId?: string) {
    setWeeklySession(false);
    setIncidentSession(false);
    setSelectedMode(nextMode);
    if (nextMode === 'area') {
      const suggestedArea = cleaningAreas.find((area) => weeklyOverview.deepCleanTask && area.roomIds.includes(weeklyOverview.deepCleanTask.roomId));
      setSelectedAreaId(areaId ?? suggestedArea?.id ?? 'kitchen');
    }
    setSelectedMinutes(modes.find((item) => item.id === nextMode)?.duration ?? 20);
    setScreen('setup');
  }

  function startAreaSetup(roomId?: string) {
    const area = cleaningAreas.find((candidate) => roomId && candidate.roomIds.includes(roomId));
    startSetup('area', area?.id ?? 'kitchen');
  }

  function startIncident(nextMode: IncidentMode) {
    const tasks = incidentTaskBank[nextMode];
    setSelectedMode(nextMode);
    setWeeklySession(false);
    setIncidentSession(true);
    setCompletedTaskIds([]);
    setPlannedTasks(tasks);
    setBonusTasks([]);
    setBaseTaskCount(tasks.length);
    setBonusCompleted(0);
    setSecondsLeft(0);
    setScreen('session');
  }

  function startWeeklyRecommendation() {
    if (!weeklyRecommendation) return;
    const task = toDisplayTask(weeklyRecommendation.task, undefined, completionHistory, planningTasks, planningNow);
    setWeeklySession(true);
    setIncidentSession(false);
    setCompletedTaskIds([]);
    setPlannedTasks([task]);
    setBonusTasks([]);
    setBaseTaskCount(1);
    setBonusCompleted(0);
    setSecondsLeft(task.minutes * 60);
    setScreen('session');
  }

  function startSession(ignoreHistory = false) {
    if (selectedMode !== 'daily' && selectedMode !== 'weekend' && selectedMode !== 'area' && selectedMode !== 'guests' && selectedMode !== 'declutter' && selectedMode !== 'timed') return;
    const planMode = selectedMode === 'area' ? 'weekend' : selectedMode === 'timed' ? (selectedMinutes >= 45 ? 'weekend' : 'daily') : selectedMode;
    setCompletedTaskIds([]);
    setBonusCompleted(0);
    setSecondsLeft(selectedMinutes * 60);
    const plan = buildPlan({
        mode: planMode,
        availableMinutes: selectedMinutes,
        participantIds: selectedMembers,
        rooms: householdRooms,
        tasks: planningTasks,
        members: householdMembers,
        completionHistory: ignoreHistory ? [] : completionHistory,
        now: planningNow,
        roomIds: selectedMode === 'area' ? selectedArea.roomIds : undefined,
        initialSchedule: taskSchedule,
    });
    const nextPlannedTasks = toDisplayPlan(plan.assignments, selectedMembers.length > 1, planningTasks, completionHistory, planningNow);
    setPlannedTasks(nextPlannedTasks);
    setBaseTaskCount(nextPlannedTasks.length);
    setBonusTasks(plan.unassignedTaskIds.flatMap((taskId) => {
        const task = planningTasks.find((item) => item.id === taskId);
        return task ? [toDisplayTask(task, undefined, completionHistory, planningTasks, planningNow)] : [];
    }));
    if (nextPlannedTasks.length === 0) {
      setScreen('rest');
      return;
    }
    setScreen('session');
  }

  function finishTask(id: string) {
    if (completedTaskIds.includes(id)) return;
    const nextCompleted = [...completedTaskIds, id];
    setCompletedTaskIds(nextCompleted);
    const completedTask = plannedTasks.find((task) => task.id === id);
    const completionIds = completedTask?.completionIds ?? [id];
    const nextHistory = completionIds.reduce((history, completionId) => addTaskCompletion(history, completionId), completionHistory);
    setCompletionHistory(nextHistory);
    saveTaskHistory(nextHistory);
    const taskPosition = plannedTasks.findIndex((task) => task.id === id);
    if (taskPosition >= baseTaskCount) setBonusCompleted((value) => value + 1);
    if (nextCompleted.length >= (plannedTasks.length || specialTasks.length)) {
      if (bonusTasks.length > 0 && secondsLeft > 0) setScreen('bonus');
      else setScreen('done');
    }
  }

  function startBonus() {
    const bonusTask = bonusTasks[0];
    if (!bonusTask) return setScreen('done');
    setPlannedTasks((current) => [...current, bonusTask]);
    setBonusTasks((current) => current.slice(1));
    setSecondsLeft(Math.max(60, bonusTask.minutes * 60));
    setScreen('session');
  }

  function toggleMember(id: string) {
    setSelectedMembers((current) => current.includes(id) ? current.filter((memberId) => memberId !== id) : [...current, id]);
  }

  if (screen === 'setup') {
    return <SetupScreen mode={mode} selectedMinutes={selectedMinutes} setSelectedMinutes={setSelectedMinutes} selectedMembers={selectedMembers} toggleMember={toggleMember} selectedAreaId={selectedAreaId} setSelectedAreaId={setSelectedAreaId} onBack={() => setScreen('home')} onStart={() => startSession()} />;
  }

  if (screen === 'incident-choice') {
    return <IncidentChoiceScreen onBack={() => setScreen('home')} onChoose={startIncident} />;
  }

  if (screen === 'session') {
    const sessionTasks = plannedTasks.length > 0 ? plannedTasks : specialTasks;
    return <SessionScreen mode={activeMode} tasks={sessionTasks} completedTaskIds={completedTaskIds} secondsLeft={secondsLeft} untimed={incidentSession} hideWhy={incidentSession} onDone={finishTask} onBack={() => weeklySession || incidentSession ? setScreen('home') : setScreen('setup')} />;
  }

  if (screen === 'bonus') {
    return <BonusScreen onAccept={startBonus} onSkip={() => setScreen('done')} />;
  }

  if (screen === 'done') {
    return <DoneScreen mode={activeMode} taskCount={plannedTasks.length || specialTasks.length} bonusCompleted={bonusCompleted} incident={incidentSession} onAgain={() => weeklySession || incidentSession ? setScreen('home') : setScreen('setup')} onHome={() => setScreen('home')} />;
  }

  if (screen === 'rest') {
    return <RestScreen mode={mode} onRepeat={() => startSession(true)} onHome={() => setScreen('home')} />;
  }

  return (
    <section className="ring-page">
      <div className="ring-hero"><div><p className="ring-eyebrow">{formatToday()}</p><h1>Ring På</h1><p className="ring-lede">Ett fräscht hem börjar med det ni faktiskt orkar idag.</p></div><div className="freshness-mark" aria-label="Hemmet är på god väg"><strong>72</strong><span>%</span><small>gästredo</small></div></div>
      <div className="priority-strip"><div className="priority-icon">✦</div><div><strong>Störst effekt just nu</strong><p>Köket och hallen ger mest fräschör på kortast tid.</p></div><span className="priority-time">12 min</span></div>
      <WeeklyOverviewCard overview={weeklyOverview} onPlanArea={startAreaSetup} />
      <div className="section-heading"><div><p className="ring-eyebrow">Välj dagsform</p><h2>Vad behöver huset?</h2></div><span className="live-dot">● På plats</span></div>
      <div className="mode-grid">{homeModes.map((item) => <button key={item.id} type="button" className={`mode-card mode-${item.accent}`} onClick={() => startSetup(item.id)}><span className="mode-duration">{item.eyebrow}</span><span className="mode-title">{item.title}</span><span className="mode-description">{item.description}</span><span className="mode-arrow">→</span></button>)}<button type="button" className="mode-card mode-plum" onClick={() => setScreen('incident-choice')}><span className="mode-duration">Akutläge</span><span className="mode-title">Kattkaos</span><span className="mode-description">Ett lugnt protokoll när olyckan är framme.</span><span className="mode-arrow">→</span></button></div>
      <div className={`today-band ${weeklyRecommendation?.status === 'due' ? 'recommendation-overdue' : ''}`}><div><p className="ring-eyebrow">Veckans rekommendation</p>{weeklyRecommendation ? <><h3>{weeklyRecommendation.task.title}</h3><p>{weeklyRecommendation.status === 'due' ? weeklyRecommendation.overdueDays && weeklyRecommendation.overdueDays > 0 ? `Förfallen med ${weeklyRecommendation.overdueDays} dagar` : 'Dags igen idag' : 'Ny i rotationen'} · {recurrenceLabel(weeklyRecommendation.task.recurrenceDays!)} · {weeklyRecommendation.task.durationMinutes} min{otherDueRecommendations > 0 ? ` · ${otherDueRecommendations} andra förfallna` : ''}</p></> : <><h3>Ni är ikapp med sällanuppgifterna</h3><p>Nästa rekommendation visas när ett intervall har löpt ut.</p></>}</div>{weeklyRecommendation && <button type="button" onClick={startWeeklyRecommendation}>Ta den →</button>}</div>
    </section>
  );
}

function WeeklyOverviewCard({ overview, onPlanArea }: { overview: WeeklyOverview; onPlanArea: (roomId?: string) => void }) {
  return <section className={`weekly-overview weekly-${overview.pace}`}>
    <div className="weekly-overview-heading"><div><p className="ring-eyebrow">Veckoplan</p><h2>{overview.title}</h2></div><span>{overview.plannedMinutes} min planerat</span></div>
    <p className="weekly-description">{overview.description}</p>
    <div className="weekly-metrics"><div><strong>{overview.completedCount}</strong><span>aktiviteter klara</span><small>{overview.completedMinutes} minuter registrerade</small></div><div><strong>{overview.suggestions.length}</strong><span>fokus framåt</span><small>{overview.deepCleanMessage}</small></div></div>
    {overview.suggestions.length > 0 && <ul className="weekly-suggestions">{overview.suggestions.map((task) => <li key={task.id}><span>{task.title}</span><small>{task.durationMinutes} min</small></li>)}</ul>}
    <p className="rotation-note">{overview.rotationNote}</p>
    <p className="season-note">{overview.seasonNote}</p>
    {overview.deepCleanTask && <button type="button" className="weekly-plan-action" onClick={() => onPlanArea(overview.deepCleanTask?.roomId)}>Planera området →</button>}
  </section>;
}

function SetupScreen({ mode, selectedMinutes, setSelectedMinutes, selectedMembers, toggleMember, selectedAreaId, setSelectedAreaId, onBack, onStart }: { mode: ModeInfo; selectedMinutes: number; setSelectedMinutes: (value: number) => void; selectedMembers: string[]; toggleMember: (id: string) => void; selectedAreaId: string; setSelectedAreaId: (id: string) => void; onBack: () => void; onStart: () => void }) {
  return <section className="ring-page narrow-page">
    <button type="button" className="back-button" onClick={onBack}>← Till översikten</button>
    <div className="setup-heading"><p className="ring-eyebrow">Ditt pass</p><h1>{mode.title}</h1><p>{mode.description}</p></div>
    <div className={`setup-banner mode-${mode.accent}`}><span>{selectedMinutes} min</span><strong>Ni behöver inte göra allt. Bara detta.</strong></div>
    {mode.id === 'area' && <div className="setup-block">
      <div className="section-heading"><div><p className="ring-eyebrow">Eget fokus</p><h2>Vilket område behöver er?</h2></div></div>
      <div className="area-options">{cleaningAreas.map((area) => <button key={area.id} type="button" className={selectedAreaId === area.id ? 'selected' : ''} onClick={() => setSelectedAreaId(area.id)}><span>{selectedAreaId === area.id ? '✓' : '○'}</span>{area.label}</button>)}</div>
    </div>}
    <div className="setup-block"><div className="section-heading"><div><p className="ring-eyebrow">Kapacitet</p><h2>Hur länge har ni?</h2></div><strong className="big-number">{selectedMinutes}<small> min</small></strong></div><div className="time-options">{timeOptionsFor(mode.id).map((minutes) => <button key={minutes} type="button" className={selectedMinutes === minutes ? 'selected' : ''} onClick={() => setSelectedMinutes(minutes)}>{minutes} min</button>)}</div></div>
    <div className="setup-block"><div className="section-heading"><div><p className="ring-eyebrow">Tillsammans</p><h2>Vilka är med?</h2></div><span>{selectedMembers.length} valda</span></div><div className="member-grid">{members.map((member) => <button key={member.id} type="button" className={`member-choice ${selectedMembers.includes(member.id) ? 'selected' : ''}`} onClick={() => toggleMember(member.id)}><span className="member-avatar">{member.initials}</span><span><strong>{member.name}</strong><small>{member.role}</small></span><span className="checkmark">{selectedMembers.includes(member.id) ? '✓' : ''}</span></button>)}</div></div>
    <button type="button" className="primary-action" disabled={selectedMembers.length === 0} onClick={onStart}>Starta passet <span>→</span></button>
  </section>;
}

function IncidentChoiceScreen({ onBack, onChoose }: { onBack: () => void; onChoose: (mode: IncidentMode) => void }) {
  return <section className="ring-page narrow-page"><button type="button" className="back-button" onClick={onBack}>← Till översikten</button><div className="setup-heading"><p className="ring-eyebrow">Kattkaos</p><h1>Vad har hänt?</h1><p>Välj olycka så går vi direkt till rätt protokoll.</p></div><div className="mode-grid incident-choice-grid"><button type="button" className="mode-card mode-sky" onClick={() => onChoose('cat-pee')}><span className="mode-duration">Akutprotokoll</span><span className="mode-title">Kiss</span><span className="mode-description">Sug upp, enzymbehandla och följ upp.</span><span className="mode-arrow">→</span></button><button type="button" className="mode-card mode-plum" onClick={() => onChoose('cat-poop')}><span className="mode-duration">Akutprotokoll</span><span className="mode-title">Bajs</span><span className="mode-description">Ta bort, rengör och avsluta hygieniskt.</span><span className="mode-arrow">→</span></button></div></section>;
}

function timeOptionsFor(mode: Mode): number[] {
  if (mode === 'weekend') return [45, 60, 90, 120];
  if (mode === 'area') return [30, 45, 60, 90, 120];
  if (mode === 'guests') return [10, 15, 20, 30];
  if (mode === 'timed') return [10, 15, 20, 30, 45, 60, 90, 120];
  return [10, 15, 20, 30, 45, 60];
}

function toDisplayTask(task: EngineTask, assignedTo?: string, history: TaskCompletion[] = [], taskBank: EngineTask[] = allPlanningTasks, now = new Date()): Task {
  const room = householdRooms.find((item) => item.id === task.roomId);
  const includedTasks = (task.includedTaskIds ?? []).flatMap((taskId) => {
    const includedTask = taskBank.find((candidate) => candidate.id === taskId);
    if (!includedTask) return [];
    const completion = latestTaskCompletion(includedTask.id, history);
    const isComplete = isTaskOnCooldown(includedTask.id, cooldownFor(includedTask), history, now);
    return [{
      id: includedTask.id,
      title: includedTask.title,
      isComplete,
      completedLabel: isComplete && completion ? completionLabel(completion.completedAt, now) : undefined,
    }];
  });
  return {
    id: task.id,
    title: task.title,
    room: room?.name ?? 'Huset',
    minutes: task.durationMinutes,
    detail: task.steps.join(' '),
    done: task.doneDefinition.join(' '),
    category: categoryLabel(task.category),
    assignedTo,
    steps: task.steps,
    why: task.recommendationReason ?? whyForTask(task),
    tools: [...task.tools, ...(task.products ?? [])],
    warnings: task.safetyWarnings,
    completionIds: task.includedTaskIds ? [task.id, ...task.includedTaskIds] : undefined,
    subtasks: includedTasks.length > 0 ? includedTasks : undefined,
  };
}

function toDisplayPlan(assignments: Assignment[], showNames: boolean, taskBank: EngineTask[], history: TaskCompletion[], now = new Date()): Task[] {
  const groups = new Map<string, Array<{ task: EngineTask; assignedTo?: string }>>();
  for (const assignment of assignments) {
    const task = taskBank.find((candidate) => candidate.id === assignment.taskId);
    const member = householdMembers.find((candidate) => candidate.id === assignment.memberId);
    if (!task) continue;
    const key = task.bundleKey ? `${assignment.memberId}:${task.bundleKey}` : assignment.id;
    const group = groups.get(key) ?? [];
    group.push({ task, assignedTo: showNames ? member?.name : undefined });
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => {
    if (group.length === 1) return toDisplayTask(group[0]!.task, group[0]!.assignedTo, history, taskBank, now);
    const tasks = group.map((entry) => entry.task);
    const roomNames = [...new Set(tasks.map((task) => householdRooms.find((room) => room.id === task.roomId)?.name ?? 'Huset'))];
    return {
      id: `bundle:${tasks.map((task) => task.id).join('+')}`,
      completionIds: tasks.map((task) => task.id),
      title: tasks[0]!.bundleLabel ?? 'Ta några små detaljer',
      room: roomNames.join(' & '),
      minutes: tasks.reduce((total, task) => total + task.durationMinutes, 0),
      detail: tasks.map((task) => task.title).join('. '),
      done: `Alla ${tasks.length} detaljer är klara.`,
      category: categoryLabel(tasks[0]!.category),
      assignedTo: group[0]!.assignedTo,
      steps: tasks.map((task) => task.title),
      why: 'Flera små detaljer delar redskap och arbetszon, så de går snabbare att ta tillsammans.',
      tools: [...new Set(tasks.flatMap((task) => [...task.tools, ...(task.products ?? [])]))],
      warnings: [...new Set(tasks.flatMap((task) => task.safetyWarnings ?? []))],
    };
  });
}

function completionLabel(completedAt: string, now: Date): string {
  const completed = new Date(completedAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const completionDay = new Date(completed.getFullYear(), completed.getMonth(), completed.getDate()).getTime();
  const daysAgo = Math.round((today - completionDay) / (24 * 60 * 60 * 1000));
  if (daysAgo <= 0) return 'idag';
  if (daysAgo === 1) return 'igår';
  if (daysAgo < 7) return new Intl.DateTimeFormat('sv-SE', { weekday: 'long' }).format(completed);
  return new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short' }).format(completed);
}

function whyForTask(task: EngineTask): string {
  if (task.category === 'visible') return 'Det här ger snabbt ett lugnare intryck eftersom de stora, synliga ytorna kommer först.';
  if (task.category === 'hygiene') return 'Rena kontaktpunkter gör rummet skönare att använda och lättare att hålla efter.';
  if (task.category === 'floor') return 'Smulor, hår och skräp på golvet märks direkt när man går in i ett rum.';
  if (task.category === 'odor') return 'Att ta bort luktkällan gör mer för fräschören än att försöka dölja den.';
  if (task.category === 'declutter') return 'En liten avgränsad rensning frigör plats utan att hela hemmet behöver bli ett projekt.';
  return 'Det här flyttar hemmet framåt med en liten, konkret insats.';
}

function categoryLabel(category: EngineTask['category']): string {
  return {
    visible: 'Synligt',
    hygiene: 'Hygien',
    floor: 'Golv',
    odor: 'Lukt',
    laundry: 'Tvätt',
    declutter: 'Rensa',
  }[category];
}

function SessionScreen({ mode, tasks, completedTaskIds, secondsLeft, untimed = false, hideWhy = false, onDone, onBack }: { mode: ModeInfo; tasks: Task[]; completedTaskIds: string[]; secondsLeft: number; untimed?: boolean; hideWhy?: boolean; onDone: (id: string) => void; onBack: () => void }) {
  const [issueTaskId, setIssueTaskId] = useState<string | null>(null);
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  const completedCount = completedTaskIds.length;
  return <section className="ring-page session-page">
    <div className="session-top"><button type="button" className="back-button" onClick={onBack}>× Avsluta pass</button><span>{mode.title} · {untimed ? 'tills det är löst' : `${minutes}:${seconds}`}</span></div>
    <div className="progress-line"><span style={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }} /></div>
    <p className="task-count">{completedCount} av {tasks.length} {untimed ? 'steg klara · följ ordningen' : `uppdrag klara${tasks.length > 1 ? ' · alla jobbar samtidigt' : ' · ett tydligt fokus'}`}</p>
    <div className="parallel-grid">{tasks.map((task) => {
      const isComplete = completedTaskIds.includes(task.id);
      const issueOpen = issueTaskId === task.id;
      const completedSubtasks = task.subtasks?.filter((subtask) => subtask.isComplete).length ?? 0;
      return <article key={task.id} className={`task-card parallel-card ${isComplete ? 'task-complete' : ''}`}>
        <span className="task-category">{task.category} · {task.room}</span>
        <h2>{task.title}</h2>
        {task.assignedTo && <p className="assigned-task">För {task.assignedTo}</p>}
        {!hideWhy && <p className="task-why"><strong>Varför:</strong> {task.why ?? 'Det här är en liten, konkret insats som gör hemmet lättare att ta hand om.'}</p>}
        {task.subtasks && <div className="subtask-status"><div><strong>Delmoment i uppdraget</strong><span>{completedSubtasks} av {task.subtasks.length} redan klara</span></div><ul>{task.subtasks.map((subtask) => <li key={subtask.id} className={subtask.isComplete ? 'subtask-complete' : ''}><span>{subtask.isComplete ? '✓' : '○'}</span><div><strong>{subtask.title}</strong><small>{subtask.isComplete ? `Redan klart · ${subtask.completedLabel}` : 'Kvar i det här uppdraget'}</small></div></li>)}</ul></div>}
        {task.warnings && task.warnings.length > 0 && <div className="safety-warning"><strong>Säkerhet först</strong>{task.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
        {task.tools && task.tools.length > 0 && <p className="task-tools"><strong>Ta fram:</strong> {task.tools.join(', ')}</p>}
        {task.steps && <div className="task-steps"><strong>{task.subtasks ? 'Gör så här med det som återstår' : 'Gör så här'}</strong><ol>{task.steps.map((step) => <li key={step}>{step}</li>)}</ol></div>}
        <div className="done-definition"><span>{isComplete ? '✓' : '○'}</span><div><strong>{isComplete ? 'Klart' : 'När är det klart?'}</strong><p>{task.done}</p></div></div>
        {issueOpen && <div className="issue-panel" role="status"><strong>Gör minsta säkra versionen.</strong><p>Hoppa över moment som kräver utrustning du saknar. Om jobbet är större än väntat: samla det lösa, säkra ytan och lämna resten till ett senare pass.</p></div>}
        <button type="button" className={isComplete ? 'secondary-action card-action' : 'primary-action card-action'} disabled={isComplete} onClick={() => onDone(task.id)}>{isComplete ? 'Färdig' : 'Klart'} <span>✓</span></button>
        {!isComplete && <button type="button" className="issue-button" aria-expanded={issueOpen} onClick={() => setIssueTaskId(issueOpen ? null : task.id)}>Värre än väntat / saknar utrustning</button>}
      </article>;
    })}</div>
  </section>;
}

function formatToday(): string {
  const value = new Intl.DateTimeFormat('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isIncidentMode(mode: Mode): mode is IncidentMode {
  return mode === 'cat-pee' || mode === 'cat-poop';
}

function DoneScreen({ mode, taskCount, bonusCompleted, incident = false, onAgain, onHome }: { mode: ModeInfo; taskCount: number; bonusCompleted: number; incident?: boolean; onAgain: () => void; onHome: () => void }) {
  return <section className="ring-page narrow-page done-page"><div className="done-spark">✦</div><p className="ring-eyebrow">{incident ? 'Akutprotokollet är klart' : 'Passet är klart'}</p><h1>{incident ? 'Omhändertaget.' : 'Det räckte.'}</h1><p className="done-copy">{incident ? `Alla ${taskCount} steg för ${mode.title.toLowerCase()} är genomförda. Kontrollera platsen igen när den har torkat och reagera om problemet återkommer.` : `Ni tog hand om ${taskCount} uppgifter i ${mode.title.toLowerCase()}. Huset behöver inte vara perfekt för att kännas bra.`}</p>{!incident && <div className="done-result"><strong>+{18 + bonusCompleted * 7}</strong><span>fräschör idag</span><small>Det syns där det räknas.</small></div>}{bonusCompleted > 0 && <div className="affirmation-list"><p className="ring-eyebrow">Dagens extra</p>{Array.from({ length: bonusCompleted }, (_, index) => <p key={index} className="affirmation">“{bonusAffirmations[index % bonusAffirmations.length]}”</p>)}</div>}<button type="button" className="primary-action" onClick={onHome}>Till översikten <span>→</span></button><button type="button" className="text-action" onClick={onAgain}>{incident ? 'Klar' : 'Kör ett pass till'}</button></section>;
}

function BonusScreen({ onAccept, onSkip }: { onAccept: () => void; onSkip: () => void }) {
  return <section className="ring-page narrow-page bonus-page"><div className="bonus-orbit"><span>✦</span></div><p className="ring-eyebrow">Ni blev klara tidigt</p><h1>Lite till?</h1><p className="done-copy">Det finns tid kvar. En bonusuppgift kan ge ungefär <strong>+7 % fräschör</strong> till.</p><div className="hidden-bonus"><span className="bonus-question">?</span><strong>En överraskningsuppgift väntar</strong><small>Du behöver inte veta vad den är innan du tackar ja.</small></div><button type="button" className="primary-action" onClick={onAccept}>Ja, kör bonus <span>→</span></button><button type="button" className="text-action" onClick={onSkip}>Nej tack, vi är nöjda</button></section>;
}

function RestScreen({ mode, onRepeat, onHome }: { mode: ModeInfo; onRepeat: () => void; onHome: () => void }) {
  return <section className="ring-page narrow-page done-page"><div className="done-spark">✓</div><p className="ring-eyebrow">Inget behöver upprepas ännu</p><h1>Ni är ikapp.</h1><p className="done-copy">De relevanta uppgifterna för {mode.title.toLowerCase()} har gjorts nyligen. Ring På väntar hellre än att ge er samma kort för tätt.</p><button type="button" className="primary-action" onClick={onHome}>Till översikten <span>→</span></button><button type="button" className="text-action" onClick={onRepeat}>Planera ändå</button></section>;
}
