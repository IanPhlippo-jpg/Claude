import { useEffect, useState } from 'react';
import { useActiveSketch, useActiveSolve, useStore } from '../store';
import { DockPanel } from './Dock';
import { Button, NumberField, Section, Toggle, round } from '../../ui/components';
import { Icon, RelationGlyph } from '../../ui/icons';
import { relationLabel, relationsForSelection } from '../../core/sketch/relations';
import { isDimension, type Constraint } from '../../core/sketch/types';
import { PLANE_LABELS } from '../viewport/camera';

const TOOL_HELP: Record<string, string> = {
  select: 'Klik om te selecteren, sleep blauwe punten om de schets te verkennen. Ctrl/Shift voor meervoudige selectie. Sleep een kader (links→rechts: volledig binnen, rechts→links: kruisend).',
  line: 'Klik begin- en eindpunt. Lijnen ketenen automatisch; Esc of dubbelklik beëindigt. Horizontaal/verticaal en coincident worden automatisch toegevoegd.',
  rectangle: 'Klik twee tegenoverliggende hoeken.',
  centerRectangle: 'Klik het middelpunt en een hoek.',
  circle: 'Klik het middelpunt en een punt op de omtrek.',
  arc3: 'Klik beginpunt, eindpunt en een punt op de boog.',
  arcCenter: 'Klik middelpunt, beginpunt en eindpunt.',
  spline: 'Klik doorgangspunten; Enter of dubbelklik sluit af.',
  point: 'Klik om een punt te plaatsen.',
  dimension: 'Selecteer een lijn (lengte), cirkel (diameter), boog (radius), twee punten (afstand), punt + lijn (afstand) of twee lijnen (hoek). Klik daarna om de maat te plaatsen.',
};

export function PropertyManager({ editDimensionId, onEditDone }: { editDimensionId: string | null; onEditDone: () => void }) {
  const st = useStore();
  const sketch = useActiveSketch();
  const solve = useActiveSolve();
  const [value, setValue] = useState(0);
  const selected = st.selectedConstraint ?? editDimensionId;
  const c: Constraint | null = sketch && selected ? sketch.constraints[selected] ?? null : null;

  useEffect(() => {
    if (c?.value !== undefined) setValue(c.value);
  }, [c?.id, c?.value]);

  if (!sketch) {
    return (
      <DockPanel id="properties" title="Property Manager">
        <Section title="Part">
          <div className="k-field">
            <label>Naam</label>
            <input className="k-input" value={st.doc.name} onChange={(e) => st.renameDocument(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          </div>
          <div className="k-field">
            <label>Eenheden</label>
            <select className="k-input" value={st.doc.units} onChange={(e) => st.setUnits(e.target.value as 'mm')}>
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="m">m</option>
              <option value="in">inch</option>
            </select>
          </div>
        </Section>
        <Section title="Nieuwe schets">
          <p className="k-muted">Kies een referentievlak:</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['front', 'top', 'right'] as const).map((p) => (
              <Button key={p} icon={<Icon.Plane />} onClick={() => st.newSketch(p)}>
                {PLANE_LABELS[p]}
              </Button>
            ))}
          </div>
        </Section>
      </DockPanel>
    );
  }

  const relOptions = relationsForSelection(sketch, st.selection);
  const selectedEntities = st.selection.filter((s) => s.kind === 'entity');
  const constraintsOfSelection = sketch.constraintOrder
    .map((id) => sketch.constraints[id])
    .filter((k) => st.selection.some((s) => k.refs.includes(s.id)) || st.selection.some((s) => s.kind === 'point' && k.refs.includes(s.id)));

  const commitValue = () => {
    if (!c) return;
    if (c.value !== value) st.updateDimension(c.id, { value });
    onEditDone();
  };

  return (
    <DockPanel
      id="properties"
      title={sketch.name}
      actions={
        <>
          <button className="k-btn ghost icon k-tip" data-tip="Schets afsluiten" onClick={st.exitSketch}>
            <Icon.Check />
          </button>
        </>
      }
    >
      {c && (
        <Section title={isDimension(c) ? 'Maat' : 'Relatie'}>
          <div className="k-field">
            <label>Type</label>
            <span>{relationLabel(c.kind)}</span>
          </div>
          {isDimension(c) && (
            <>
              <div className="k-field">
                <label>Waarde</label>
                <NumberField value={value} onChange={setValue} unit={c.kind === 'angle' ? '°' : st.doc.units} step={c.kind === 'angle' ? 1 : 0.5} autoFocus onCommit={commitValue} />
              </div>
              <div className="k-field">
                <label>Driven (referentie)</label>
                <Toggle value={!!c.driven} onChange={(v) => st.updateDimension(c.id, { driven: v })} />
              </div>
            </>
          )}
          <div className="k-field">
            <label>Status</label>
            <span className={`status ${solve?.constraintStatus[c.id] ?? 'ok'}`}>{solve?.constraintStatus[c.id] ?? 'ok'}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {isDimension(c) && (
              <Button variant="primary" icon={<Icon.Check />} onClick={commitValue}>
                Toepassen
              </Button>
            )}
            <Button variant="danger" icon={<Icon.Trash />} onClick={() => st.removeRelation(c.id)}>
              Verwijderen
            </Button>
          </div>
        </Section>
      )}

      {!c && (
        <Section title="Gereedschap">
          <p style={{ margin: 0 }}>{TOOL_HELP[st.tool]}</p>
        </Section>
      )}

      {st.selection.length > 0 && (
        <Section title={`Selectie (${st.selection.length})`}>
          <ul className="k-list">
            {st.selection.map((s) => {
              const e = sketch.entities[s.id];
              const label = s.kind === 'point' ? (s.id === sketch.origin ? 'Oorsprong' : 'Punt') : e ? { point: 'Punt', line: 'Lijn', circle: 'Cirkel', arc: 'Boog', spline: 'Spline' }[e.kind] : s.id;
              const status = e ? solve?.entityStatus[e.id] : undefined;
              return (
                <li key={s.kind + s.id}>
                  <span>{label}</span>
                  {e?.construction && <span className="k-chip">constructie</span>}
                  {status && <span className={`status ${status}`}>{status}</span>}
                </li>
              );
            })}
          </ul>
          {selectedEntities.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <Button icon={<Icon.Construction />} onClick={st.toggleConstructionSelection}>
                Constructie
              </Button>
              <Button variant="danger" icon={<Icon.Trash />} onClick={st.deleteSelection}>
                Verwijderen
              </Button>
            </div>
          )}
        </Section>
      )}

      {relOptions.length > 0 && (
        <Section title="Relatie toevoegen">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {relOptions.map((o) => {
              const G = RelationGlyph[o.kind];
              return (
                <button key={o.kind + o.refs.join()} className="k-tool small" onClick={() => st.addRelation(o.kind, o.refs, { internal: o.internal })}>
                  {G && <G size={14} />}
                  <span>{o.label}</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {constraintsOfSelection.length > 0 && !c && (
        <Section title="Bestaande relaties">
          <ul className="k-list">
            {constraintsOfSelection.map((k) => {
              const G = RelationGlyph[k.kind];
              return (
                <li key={k.id} onClick={() => st.selectConstraint(k.id)}>
                  {G ? <G size={14} /> : <Icon.Dimension size={14} />}
                  <span>{relationLabel(k.kind)}</span>
                  {k.value !== undefined && <span className="k-muted">{round(k.value)}</span>}
                  <span className="tail">
                    <span className={`status ${solve?.constraintStatus[k.id] ?? 'ok'}`}>{solve?.constraintStatus[k.id] ?? 'ok'}</span>
                    <button className="k-btn ghost icon" onClick={(e) => { e.stopPropagation(); st.removeRelation(k.id); }} title="Verwijderen">
                      <Icon.Trash size={12} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title="Schets" defaultOpen={false}>
        <div className="k-field"><label>Vlak</label><span>{PLANE_LABELS[sketch.plane]}</span></div>
        <div className="k-field"><label>Entiteiten</label><span>{sketch.entityOrder.length}</span></div>
        <div className="k-field"><label>Relaties</label><span>{sketch.constraintOrder.length}</span></div>
        <div className="k-field"><label>Vrijheidsgraden</label><span>{solve?.dof ?? '–'}</span></div>
        <div className="k-field"><label>Raster-snap</label><Toggle value={st.snapGrid} onChange={() => st.toggle('snapGrid')} /></div>
      </Section>
    </DockPanel>
  );
}
