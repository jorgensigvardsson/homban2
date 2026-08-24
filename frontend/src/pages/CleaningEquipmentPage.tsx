import equipmentJson from '../../../stadutrustning_hela_huset.json';

interface EquipmentTask {
  id: string;
  title: string;
  quantity: string;
  priority: 'essential' | 'recommended' | 'specialist';
  status: string;
  condition: string;
  details?: string;
  safety?: string;
}

interface EquipmentSection {
  id: string;
  order: number;
  title: string;
  tasks: EquipmentTask[];
}

interface CleaningEquipmentList {
  title: string;
  description: string;
  definitionOfDone: string;
  zoneColorGuide: Array<{ color: string; zone: string }>;
  buyingStrategy: string[];
  sections: EquipmentSection[];
  avoidByDefault: Array<{ item: string; reason: string }>;
}

const equipment = equipmentJson as CleaningEquipmentList;
const itemCount = equipment.sections.reduce((total, section) => total + section.tasks.length, 0);

const priorityLabels: Record<EquipmentTask['priority'], string> = {
  essential: 'Basutrustning',
  recommended: 'Bra komplement',
  specialist: 'Specialist eller hyr',
};

const conditionLabels: Record<string, string> = {
  according_to_manual: 'Enligt manualen',
  always: 'Alltid användbar',
  if_compatible_hob: 'Om hällen är kompatibel',
  if_fireplace_used: 'Om eldstaden används',
  if_leather_furniture: 'Om det finns lädermöbler',
  if_manual_allows: 'Om manualen tillåter',
  if_minor_surface_growth_confirmed: 'Vid bekräftad mindre ytlig påväxt',
  if_rug_allows: 'Om mattan tillåter',
  if_surface_needs_reconditioning: 'Om ytan behöver återbehandlas',
  if_textile_label_allows: 'Om tvättrådet tillåter',
  if_wet_cleaning_allowed: 'Om våtrengöring är tillåten',
  if_wood_surfaces_require: 'Om träytorna behöver det',
  when_cleaning_chandelier: 'Vid rengöring av kristallkrona',
  when_cleaning_fridge: 'Vid kylskåpsrengöring',
  when_hygienically_needed: 'När hygienen kräver det',
  when_needed: 'Vid behov',
  when_opening_filters: 'När filter öppnas',
};

export function CleaningEquipmentPage() {
  return (
    <div className="ring-page equipment-page">
      <header className="equipment-hero">
        <p className="ring-eyebrow">Hela husets arsenal</p>
        <h1>{equipment.title}</h1>
        <p>{equipment.description}</p>
        <strong>{itemCount} saker i {equipment.sections.length} kategorier</strong>
      </header>

      <div className="equipment-guide-grid">
        <section className="equipment-guide-card">
          <p className="ring-eyebrow">Håll isär hygienzonerna</p>
          <h2>Färgkoda dukar och handskar</h2>
          <ul className="equipment-zone-list">
            {equipment.zoneColorGuide.map((entry) => (
              <li key={entry.color}>
                <span className={`equipment-zone-dot equipment-zone-${entry.color}`} />
                <strong>{entry.color}</strong>
                <span>{entry.zone}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="equipment-guide-card">
          <p className="ring-eyebrow">Köp i rätt ordning</p>
          <h2>Inköpsstrategi</h2>
          <ol className="equipment-strategy-list">
            {equipment.buyingStrategy.map((strategy) => <li key={strategy}>{strategy}</li>)}
          </ol>
        </section>
      </div>

      <div className="equipment-sections">
        {equipment.sections.map((section) => (
          <section className="equipment-section" key={section.id}>
            <header className="equipment-section-heading">
              <span>{section.order}</span>
              <div>
                <h2>{section.title}</h2>
                <small>{section.tasks.length} saker</small>
              </div>
            </header>

            <div className="equipment-items">
              {section.tasks.map((task) => (
                <article className="equipment-item" key={task.id}>
                  <div className="equipment-item-heading">
                    <h3>{task.title}</h3>
                    <strong>{task.quantity}</strong>
                  </div>
                  <div className="equipment-item-badges">
                    <span className={`equipment-priority equipment-priority-${task.priority}`}>
                      {priorityLabels[task.priority]}
                    </span>
                    {task.condition !== 'always' && (
                      <span>{conditionLabels[task.condition] ?? task.condition}</span>
                    )}
                  </div>
                  {task.details && <p>{task.details}</p>}
                  {task.safety && <p className="equipment-safety">⚠ {task.safety}</p>}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="equipment-avoid">
        <p className="ring-eyebrow">Mer är inte alltid bättre</p>
        <h2>Undvik som standard</h2>
        <div>
          {equipment.avoidByDefault.map((entry) => (
            <article key={entry.item}>
              <strong>{entry.item}</strong>
              <p>{entry.reason}</p>
            </article>
          ))}
        </div>
      </section>

      <p className="equipment-done-note">{equipment.definitionOfDone}</p>
    </div>
  );
}
