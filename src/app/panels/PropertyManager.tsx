import { useEffect, useState } from 'react';
import { useActiveSketch, useActiveSolve, useStore } from '../store';
import { Button, NumberField, Section, Toggle, round } from '../../ui/components';
import { Icon, RelationGlyph } from '../../ui/icons';
import { relationLabel, relationsForSelection } from '../../core/sketch/relations';
import { isDimension, type Constraint } from '../../core/sketch/types';
import { PLANE_LABELS } from '../viewport/camera';

const TOOL_HELP: Record<string, string> = {
  select: 'Select entities. Drag blue (under defined) entities to explore the sketch. Ctrl for multiple selection. Box select left→right = inside, right→left = crossing.',
  line: 'Click to start and end a line. Lines chain automatically; double-click or Esc ends the chain. Horizontal/Vertical and Coincident relations are inferred.',
  centerline: 'Construction line: click the start and end point. Use it as mirror or symmetry axis.',
  rectangle: 'Click two opposite corners.',
  centerRectangle: 'Click the center and a corner.',
  circle: 'Click the center and a point on the circle.',
  arc3: 'Click the start point, the end point and a point on the arc.',
  arcCenter: 'Click the center, the start point and the end point.',
  polygon: 'Click the center and a vertex. Set the number of sides below.',
  spline: 'Click through points; double-click or Esc finishes.',
  point: 'Click to place a point.',
  dimension: 'Select a line (length), circle (diameter), arc (radius), two points (distance), point + line (distance) or two lines (angle). Click to place the dimension; the Modify box appears.',
};

/** PropertyManager body: replaces the tree while a command/selection is active. */
export function PropertyManagerBody({ editDimensionId, onEditDone }: { editDimensionId: string | null; onEditDone: () => void }) {
  const st = useStore();
  const sketch = useActiveSketch();
  const solve = useActiveSolve();
  const [value, setValue] = useState(0);
  const [sides, setSides] = useState(6);
  const selected = st.selectedConstraint ?? editDimensionId;
  const c: Constraint | null = sketch && selected ? sketch.constraints[selected] ?? null : null;

  useEffect(() => {
    if (c?.value !== undefined) setValue(c.value);
  }, [c?.id, c?.value]);
  useEffect(() => {
    (window as unknown as { __phlippoPolygonSides?: number }).__phlippoPolygonSides = sides;
  }, [sides]);

  if (!sketch) {
    return (
      <>
        <div className="k-pm-title">
          <Icon.Part /> <b>{st.doc.name}</b>
        </div>
        <Section title="Document">
          <div className="k-field">
            <label>Name</label>
            <input className="k-input" value={st.doc.name} onChange={(e) => st.renameDocument(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          </div>
          <div className="k-field">
            <label>Unit system</label>
            <select className="k-input" value={st.unitSystem} onChange={(e) => st.setUnitSystem(e.target.value as 'MMGS')}>
              <option value="MKS">MKS (meter, kilogram, second)</option>
              <option value="CGS">CGS (centimeter, gram, second)</option>
              <option value="MMGS">MMGS (millimeter, gram, second)</option>
              <option value="IPS">IPS (inch, pound, second)</option>
            </select>
          </div>
        </Section>
        <Section title="Sketch">
          <p className="k-muted">Click <b>Sketch</b> and select a plane in the graphics area or in the FeatureManager:</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['front', 'top', 'right'] as const).map((p) => (
              <Button key={p} icon={<Icon.Plane />} onClick={() => st.newSketch(p)}>
                {PLANE_LABELS[p]}
              </Button>
            ))}
          </div>
        </Section>
      </>
    );
  }

  const relOptions = relationsForSelection(sketch, st.selection);
  const selectedEntities = st.selection.filter((s) => s.kind === 'entity');
  const constraintsOfSelection = sketch.constraintOrder
    .map((id) => sketch.constraints[id])
    .filter((k) => st.selection.some((s) => k.refs.includes(s.id)));

  const commitValue = () => {
    if (!c) return;
    if (c.value !== value) st.updateDimension(c.id, { value });
    onEditDone();
  };

  const header = (title: string, icon: React.ReactNode) => (
    <div className="k-pm-title">
      {icon} <b>{title}</b>
      <span className="grow" />
      <button className="k-pm-ok k-tip" data-tip="OK" onClick={() => (c ? commitValue() : st.exitSketch())}><Icon.Check /></button>
      <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={() => (c ? st.selectConstraint(null) : st.setTool('select'))}><Icon.Close /></button>
    </div>
  );

  return (
    <>
      {c ? header(isDimension(c) ? 'Dimension' : relationLabel(c.kind), <Icon.Dimension />) : header(sketch.name, <Icon.Sketch />)}
      {c && (
        <Section title={isDimension(c) ? 'Value' : 'Relation'}>
          <div className="k-field">
            <label>Type</label>
            <span>{relationLabel(c.kind)}</span>
          </div>
          {isDimension(c) && (
            <>
              <div className="k-field">
                <label>Primary Value</label>
                <NumberField value={value} onChange={setValue} unit={c.kind === 'angle' ? '°' : st.doc.units} step={c.kind === 'angle' ? 1 : 0.5} autoFocus onCommit={commitValue} />
              </div>
              <div className="k-field">
                <label>Driven</label>
                <Toggle value={!!c.driven} onChange={(v) => st.updateDimension(c.id, { driven: v })} />
              </div>
            </>
          )}
          <div className="k-field">
            <label>Status</label>
            <span className={`status ${solve?.constraintStatus[c.id] ?? 'ok'}`}>{solve?.constraintStatus[c.id] ?? 'ok'}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <Button variant="danger" icon={<Icon.Trash />} onClick={() => st.removeRelation(c.id)}>
              Delete
            </Button>
          </div>
        </Section>
      )}

      {!c && (
        <Section title="Message">
          <p style={{ margin: 0 }}>{TOOL_HELP[st.tool]}</p>
          {st.tool === 'polygon' && (
            <div className="k-field" style={{ marginTop: 8 }}>
              <label>Number of sides</label>
              <NumberField value={sides} onChange={(v) => setSides(Math.max(3, Math.min(40, Math.round(v))))} step={1} min={3} />
            </div>
          )}
        </Section>
      )}

      {st.selection.length > 0 && (
        <Section title={`Selected Entities (${st.selection.length})`}>
          <ul className="k-list">
            {st.selection.map((s) => {
              const e = sketch.entities[s.id];
              const label = s.kind === 'point' ? (s.id === sketch.origin ? 'Origin' : 'Point') : e ? { point: 'Point', line: 'Line', circle: 'Circle', arc: 'Arc', spline: 'Spline' }[e.kind] : s.id;
              const status = e ? solve?.entityStatus[e.id] : undefined;
              return (
                <li key={s.kind + s.id}>
                  <span>{label}</span>
                  {e?.construction && <span className="k-chip">construction</span>}
                  {status && <span className={`status ${status}`}>{status}</span>}
                </li>
              );
            })}
          </ul>
          {selectedEntities.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <Button icon={<Icon.Construction />} onClick={st.toggleConstructionSelection}>
                For construction
              </Button>
              <Button variant="danger" icon={<Icon.Trash />} onClick={st.deleteSelection}>
                Delete
              </Button>
            </div>
          )}
        </Section>
      )}

      {relOptions.length > 0 && (
        <Section title="Add Relations">
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
        <Section title="Existing Relations">
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
                    <button className="k-btn ghost icon" onClick={(e) => { e.stopPropagation(); st.removeRelation(k.id); }} title="Delete">
                      <Icon.Trash size={12} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title="Options" defaultOpen={false}>
        <div className="k-field"><label>Plane</label><span>{PLANE_LABELS[sketch.plane]}</span></div>
        <div className="k-field"><label>Entities</label><span>{sketch.entityOrder.length}</span></div>
        <div className="k-field"><label>Relations</label><span>{sketch.constraintOrder.length}</span></div>
        <div className="k-field"><label>Degrees of freedom</label><span>{solve?.dof ?? '–'}</span></div>
        <div className="k-field"><label>Snap to grid</label><Toggle value={st.snapGrid} onChange={() => st.toggle('snapGrid')} /></div>
      </Section>
    </>
  );
}
