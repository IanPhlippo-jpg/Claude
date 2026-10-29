/** Property Panels of sketching (split from PropertyPanel.tsx, QA F103). */
import { lastPolygon } from '../../../core/sketch/lastShape';
import { rotateAbout, scaleAbout, segmentEntity, transformEntities, translate } from '../../../core/sketch/edit';
import { sketchDimensionName } from '../../../core/document/equations';
import { type ReactNode } from 'react';
import { lastRectangle } from '../../../core/sketch/lastShape';
import { useStore } from '../../store';
import { Button, NumberField, Section, round } from '../../../ui/components';
import { Icon, RelationGlyph } from '../../../ui/icons';
import { relationLabel, relationName, relationsForSelection } from '../../../core/sketch/relations';
import { isDimension, type Constraint } from '../../../core/sketch/types';
import { toggleConstruction } from '../../../core/sketch/model';
import { PLANE_LABELS } from '../../viewport/camera';
import { defaultDimText, APPLY_TOOLS, TOOL_TITLE, TOOL_HELP, Header, POLY_FIELDS, dimFavs, saveDimFavs } from './shared';
import type { PMContext } from './context';

/** the point-coordinate glyph of a Parameters row: a small point with the axis letter at its lower right */
const PtAxis = ({ axis }: { axis: 'x' | 'y' }) => (
  <span className="k-pm-ptaxis"><i />{axis.toUpperCase()}</span>
);

export function sketchPM(ctx: PMContext): ReactNode {
  const { st, solve, value, setValue, sides, setSides, polyInscribed, setPolyInscribed, eqc, setEqc, fdef, setFdef, rectCons, setRectCons, sketchText, setSketchText, dimTab, setDimTab, dimFav, setDimFav, segment, setSegment, c, valueOf, setValueOf, onEditDone } = ctx;
  const sketch = ctx.sketch;
  // plane pick: "Edit Sketch" with the yellow message, by design shows it
  if (st.planePick) {
    return (
      <>
        <Header title="Edit Sketch" icon={<Icon.Sketch />} onCancel={st.cancelPlanePick} />
        <Section title="Message">
          <p className="k-pm-message">Select a plane on which to create a sketch for the entity.</p>
        </Section>
      </>
    );
  }

  if (!sketch) {
    return (
      <>
        <Header title={st.doc.name} icon={<Icon.Part />} />
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
          <p className="k-muted">Click <b>Sketch</b> and select a plane in the graphics area or in the Feature Tree:</p>
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
  // Pierce: one point selected while a curve of another sketch crosses the plane
  const selPoint = st.selection.length === 1 ? (st.selection[0].kind === 'point' ? st.selection[0].id : sketch.entities[st.selection[0].id]?.kind === 'point' ? (sketch.entities[st.selection[0].id] as { p: string }).p : null) : null;
  const pierceable = selPoint && Object.keys(st.doc.sketches).length > 1 ? selPoint : null;
  const selectedEntities = st.selection.filter((s) => s.kind === 'entity');
  const constraintsOfSelection = sketch.constraintOrder
    .map((id) => sketch.constraints[id])
    .filter((k) => st.selection.some((s) => k.refs.includes(s.id)));

  const commitValue = () => {
    if (!c) return;
    if (valueOf === c.id && c.value !== value) st.updateDimension(c.id, { value });
    onEditDone();
  };

  const dimName = (k: Constraint) => sketchDimensionName(sketch, k.id);
  const isDraw = ['line', 'centerline', 'midpointLine', 'rectangle', 'centerRectangle', 'rect3Corner', 'rect3Center', 'parallelogram', 'circle', 'perimeterCircle', 'arcCenter', 'arc3', 'tangentArc', 'polygon', 'slot', 'centerSlot', 'spline', 'ellipse', 'partialEllipse', 'point'].includes(st.tool);
  const isRect = st.tool === 'rectangle' || st.tool === 'centerRectangle' || st.tool === 'rect3Corner' || st.tool === 'rect3Center' || st.tool === 'parallelogram';
  // after a rectangle is drawn the intended design shows its relations, options and corner coordinates
  const lastRect = isRect ? lastRectangle(sketch) : null;
  const rectCorners = (lastRect ?? []).map((id) => {
    const e = sketch.entities[id];
    if (!e || e.kind !== 'line') return null;
    const p = sketch.points[e.p1];
    return p ? { id: e.p1, x: p.x, y: p.y } : null;
  });
  const rectRefs = new Set<string>([...(lastRect ?? []), ...rectCorners.filter(Boolean).map((c) => c!.id)]);
  const rectRelations = lastRect ? sketch.constraintOrder.map((id) => sketch.constraints[id]).filter((k) => k && k.refs.some((r) => rectRefs.has(r))) : [];
  const rectStatusRaw = lastRect ? lastRect.map((id) => solve?.entityStatus[id]) : [];
  const rectStatus = rectStatusRaw.some((x) => x === 'over') ? 'Over Defined' : rectStatusRaw.every((x) => x === 'full') ? 'Fully Defined' : 'Under Defined';
  const toolIcon: Record<string, ReactNode> = { rectangle: <Icon.Rect />, centerRectangle: <Icon.CenterRect />, rect3Corner: <Icon.Rect3Corner />, rect3Center: <Icon.Rect3Center />, parallelogram: <Icon.Parallelogram />, midpointLine: <Icon.MidLine />, circle: <Icon.Circle />, line: <Icon.Line />, centerline: <Icon.Construction />, arc3: <Icon.Arc />, arcCenter: <Icon.ArcCenter />, polygon: <Icon.Polygon />, slot: <Icon.Slot />, centerSlot: <Icon.Slot />, trim: <Icon.Trim />, extend: <Icon.Arrow />, sketchFillet: <Icon.Fillet2D />, sketchChamfer: <Icon.Chamfer />, offset: <Icon.Offset />, moveEntities: <Icon.Arrow />, copyEntities: <Icon.Arrow />, rotateEntities: <Icon.Rebuild />, scaleEntities: <Icon.Fit />, linearSketchPattern: <Icon.Pattern />, circularSketchPattern: <Icon.Pattern />, spline: <Icon.Spline />, styleSpline: <Icon.Spline />, equationCurve: <Icon.Spline />, partialEllipse: <Icon.Ellipse />, parabola: <Icon.Arc />, conic: <Icon.Arc />, fullyDefine: <Icon.Lock />, point: <Icon.Point />, dimension: <Icon.Dimension />, select: <Icon.Sketch /> };

  return (
    <>
      {c ? (
        <Header title={isDimension(c) ? 'Dimension' : relationLabel(c.kind)} icon={<Icon.Dimension />} onOk={commitValue} />
      ) : (
        <Header title={st.tool === 'select' && selectedEntities.length === 1 && sketch.entities[selectedEntities[0].id] ? `${({ line: 'Line', circle: 'Circle', arc: 'Arc', spline: 'Spline', ellipse: 'Ellipse', ellipseArc: 'Ellipse', conic: 'Conic', text: 'Text', point: 'Point' } as Record<string, string>)[sketch.entities[selectedEntities[0].id].kind] ?? 'Entity'} Properties` : st.tool === 'select' && st.selection.length === 1 && st.selection[0].kind === 'point' ? 'Point Properties' : TOOL_TITLE[st.tool] ?? sketch.name} icon={toolIcon[st.tool] ?? <Icon.Sketch />} onOk={st.tool === 'select' ? st.exitSketch : st.tool === 'equationCurve' ? () => { if ((eqc.param ? st.addEquationCurve(eqc.xt, eqc.x1, eqc.x2, eqc.yt) : st.addEquationCurve(eqc.expr, eqc.x1, eqc.x2))) st.setTool('select'); } : st.tool === 'fullyDefine' ? () => { st.fullyDefine(fdef); st.setTool('select'); } : APPLY_TOOLS.has(st.tool) ? st.applySketchTool : () => st.setTool('select')} onCancel={isDraw ? undefined : st.tool === 'select' ? st.discardSketch : () => st.setTool('select')} />
      )}

      {!c && (st.tool === 'line' || st.tool === 'centerline' || st.tool === 'midpointLine') && (
        <Section title="Message">
          <p className="k-pm-message" data-testid="line-message">Edit the settings of the next new line or sketch a new line.</p>
        </Section>
      )}
      {c && isDimension(c) && (
        <>
          <div className="k-pm-tabs">
            {(['value', 'leaders', 'other'] as const).map((t) => <button key={t} className={dimTab === t ? 'active' : ''} data-testid={`dimtab-${t}`} onClick={() => setDimTab(t)}>{t === 'value' ? 'Value' : t === 'leaders' ? 'Leaders' : 'Other'}</button>)}
          </div>
          {dimTab === 'leaders' && (
            <Section title="Witness/Leader Display" defaultOpen>
              <div className="k-pm-stylerow">
                {(['outside', 'inside', 'smart'] as const).map((a) => (
                  <button key={a} className={`k-pm-stylebtn k-tip ${(c.arrows ?? 'smart') === a ? 'active' : ''}`} data-tip={a === 'outside' ? 'Outside' : a === 'inside' ? 'Inside' : 'Smart'} data-testid={`dimarrows-${a}`} onClick={() => st.updateDimension(c.id, { arrows: a })}>{a === 'outside' ? '→|←' : a === 'inside' ? '←→' : '↔'}</button>
                ))}
              </div>
              <div className="k-field"><label>Arrow style</label>
                <select className="k-input" data-testid="dim-arrowstyle" value={c.arrowStyle ?? 'filled'} onChange={(e) => st.updateDimension(c.id, { arrowStyle: e.target.value as 'filled' })}>
                  <option value="filled">Closed filled</option><option value="open">Open</option><option value="dot">Dot</option><option value="slash">Slash</option>
                </select>
              </div>
            </Section>
          )}
          {dimTab === 'other' && (
            <>
              <Section title="Override Units" defaultOpen>
                <label className="k-check"><input type="checkbox" data-testid="dim-unitoverride" checked={!!c.unitOverride} onChange={(e) => st.updateDimension(c.id, { unitOverride: e.target.checked ? 'in' : undefined })} /> Override units</label>
                {c.unitOverride && <select className="k-input" value={c.unitOverride} onChange={(e) => st.updateDimension(c.id, { unitOverride: e.target.value as 'in' })}><option value="mm">millimeters</option><option value="cm">centimeters</option><option value="in">inches</option></select>}
              </Section>
              <Section title="Text Fonts" defaultOpen>
                <label className="k-check"><input type="checkbox" checked={c.fontSize === undefined} onChange={(e) => st.updateDimension(c.id, { fontSize: e.target.checked ? undefined : 15 })} /> Use document font</label>
                {c.fontSize !== undefined && <div className="k-pm-valuerow k-tip" data-tip="Font size (px)"><Icon.Text size={14} /><NumberField value={c.fontSize} onChange={(v) => st.updateDimension(c.id, { fontSize: Math.max(6, Math.min(48, v)) })} step={1} /></div>}
              </Section>
            </>
          )}
          {dimTab === 'value' && <>
          <Section title="Style" defaultOpen>
            {/* Favorites, by design: apply defaults, add/update, delete, save to a file, load from a file */}
            <div className="k-pm-stylerow">
              <button className="k-pm-stylebtn k-tip" data-tip="Apply the default attributes" data-testid="dimfav-default" onClick={() => st.updateDimension(c.id, { tol: undefined, precision: undefined, dual: undefined, arrows: undefined, arrowStyle: undefined, fontSize: undefined, justify: undefined, unitOverride: undefined, dimText: undefined })}><Icon.Undo size={14} /></button>
              <button className="k-pm-stylebtn k-tip" data-tip="Add or Update a Favorite" data-testid="dimfav-add" onClick={() => st.setAsk({ title: 'Add or Update a Favorite', text: 'Favorite name', input: dimFav || 'Favorite1', yes: (n) => { if (!n) return; const favs = { ...dimFavs(), [n]: { tol: c.tol, precision: c.precision, dual: c.dual, arrows: c.arrows, arrowStyle: c.arrowStyle, fontSize: c.fontSize, justify: c.justify, dimText: c.dimText } }; saveDimFavs(favs); setDimFav(n); } })}><Icon.Save size={14} /></button>
              <button className="k-pm-stylebtn k-tip" data-tip="Delete a Favorite" disabled={!dimFav} onClick={() => { const favs = { ...dimFavs() }; delete favs[dimFav]; saveDimFavs(favs); setDimFav(''); }}><Icon.Trash size={14} /></button>
              <button className="k-pm-stylebtn k-tip" data-tip="Save a Favorite" disabled={!dimFav} onClick={() => { const f = dimFavs()[dimFav]; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ [dimFav]: f }, null, 2)], { type: 'application/json' })); a.download = `${dimFav}.sldfvt.json`; a.click(); }}><Icon.Open size={14} /></button>
              <button className="k-pm-stylebtn k-tip" data-tip="Load Favorites" onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json'; i.onchange = async () => { const file = i.files?.[0]; if (!file) return; try { const add = JSON.parse(await file.text()); saveDimFavs({ ...dimFavs(), ...add }); setDimFav(Object.keys(add)[0] ?? ''); } catch { st.pushMessage('That file has no favorites.', 'warn'); } }; i.click(); }}><Icon.Folder size={14} /></button>
            </div>
            <select className="k-input" data-testid="dimfav-select" value={dimFav} onChange={(e) => { const n = e.target.value; setDimFav(n); const f = dimFavs()[n]; if (f) st.updateDimension(c.id, f); }}>
              <option value="">{'<NONE>'}</option>
              {Object.keys(dimFavs()).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Section>
          <Section title="Tolerance/Precision" defaultOpen>
            <div className="k-pm-valuerow k-tip" data-tip="Tolerance Type"><span className="k-pm-glyph"><b>1.50</b><i>±.01</i></span>
              <select className="k-input" style={{ flex: 1 }} data-testid="dim-tol" value={c.tol?.type ?? 'none'} onChange={(e) => st.updateDimension(c.id, { tol: e.target.value === 'none' ? undefined : { type: e.target.value as 'basic', plus: c.tol?.plus ?? 0.1, minus: c.tol?.minus ?? 0.1 } })}>
                <option value="none">None</option><option value="basic">Basic</option><option value="bilateral">Bilateral</option><option value="limit">Limit</option><option value="symmetric">Symmetric</option><option value="min">MIN</option><option value="max">MAX</option>
              </select>
            </div>
            {c.tol && ['bilateral', 'limit', 'symmetric'].includes(c.tol.type) && (
              <>
                <div className="k-pm-valuerow k-tip" data-tip="Maximum Variation"><span className="k-pm-xy">+</span><NumberField value={c.tol.plus ?? 0} onChange={(v) => st.updateDimension(c.id, { tol: { ...c.tol!, plus: Math.max(0, v) } })} unit={st.doc.units} step={0.01} /></div>
                {c.tol.type !== 'symmetric' && <div className="k-pm-valuerow k-tip" data-tip="Minimum Variation"><span className="k-pm-xy">−</span><NumberField value={c.tol.minus ?? 0} onChange={(v) => st.updateDimension(c.id, { tol: { ...c.tol!, minus: Math.max(0, v) } })} unit={st.doc.units} step={0.01} /></div>}
              </>
            )}
            <div className="k-pm-valuerow k-tip" data-tip="Unit Precision"><span className="k-pm-glyph"><b>X.XX</b></span>
              <select className="k-input" style={{ flex: 1 }} data-testid="dim-precision" value={c.precision ?? -1} onChange={(e) => st.updateDimension(c.id, { precision: Number(e.target.value) < 0 ? undefined : Number(e.target.value) })}>
                <option value={-1}>.12 (Document)</option><option value={0}>None</option><option value={1}>.1</option><option value={2}>.12</option><option value={3}>.123</option><option value={4}>.1234</option><option value={5}>.12345</option>
              </select>
            </div>
          </Section>
          <Section title="Primary Value" defaultOpen>
            <input className="k-input" data-testid="dim-name" key={`${c.id}:${dimName(c)}`} defaultValue={dimName(c)} onBlur={(e) => { if (e.target.value !== dimName(c)) st.renameDimension(c.id, e.target.value); }} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
            <div className="k-pm-valuerow">
              <Icon.Dimension size={14} />
              <NumberField key={c.id} value={valueOf === c.id ? value : c.value ?? 0} onChange={(v) => { setValue(v); setValueOf(c.id); }} unit={c.kind === 'angle' ? '°' : st.doc.units} step={c.kind === 'angle' ? 1 : 0.5} autoFocus={!st.modify} onCommit={commitValue} />
            </div>
            <label className="k-check"><input type="checkbox" checked={!!c.driven} onChange={(e) => st.updateDimension(c.id, { driven: e.target.checked })} /> Driven</label>
          </Section>
          <Section title="Dimension Text" defaultOpen>
            <textarea className="k-input k-pm-dimtext" data-testid="dim-text" value={c.dimText ?? defaultDimText(c.kind)} onChange={(e) => st.updateDimension(c.id, { dimText: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
            <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
              {(['left', 'center', 'right'] as const).map((j) => <button key={j} className={`k-pm-stylebtn k-tip ${(c.justify ?? 'center') === j ? 'active' : ''}`} data-tip={`Justify ${j}`} data-testid={`dimjust-${j}`} onClick={() => st.updateDimension(c.id, { justify: j === 'center' ? undefined : j })}>{j === 'left' ? '⫷' : j === 'center' ? '≡' : '⫸'}</button>)}
            </div>
            <div className="k-pm-stylerow k-dimsyms" style={{ marginTop: 4 }}>
              {[['Ø', 'Diameter'], ['°', 'Degree'], ['±', 'Plus/Minus'], ['℄', 'Centerline'], ['□', 'Square'], ['⌵', 'Countersink'], ['⊔', 'Counterbore'], ['↧', 'Depth/Deep']].map(([sym, tip]) => (
                <button key={sym} className="k-pm-stylebtn k-tip" data-tip={tip} data-testid={`dimsym-${tip}`} onClick={() => st.updateDimension(c.id, { dimText: (c.dimText ?? defaultDimText(c.kind)).includes('<DIM>') ? (c.dimText ?? defaultDimText(c.kind)).replace('<DIM>', `${sym}<DIM>`) : `${sym}${c.dimText}` })}>{sym}</button>
              ))}
            </div>
          </Section>
          <label className="k-check"><input type="checkbox" data-testid="dim-uppercase" checked={!!c.uppercase} onChange={(e) => st.updateDimension(c.id, { uppercase: e.target.checked || undefined })} /> All uppercase</label>
          <Section title="Dual Dimension" defaultOpen={!!c.dual} check={!!c.dual} onCheck={(on) => st.updateDimension(c.id, { dual: on || undefined })}>
            <p className="k-muted" style={{ margin: 0 }}>The value is shown in inches as well, in brackets.</p>
          </Section>
          </>}
          <div style={{ display: 'flex', gap: 6, padding: '8px 10px' }}>
            <Button variant="danger" icon={<Icon.Trash />} onClick={() => st.removeRelation(c.id)}>
              Delete
            </Button>
          </div>
        </>
      )}

      {c && !isDimension(c) && (
        <Section title="Relation">
          <div className="k-field">
            <label>Type</label>
            <span>{relationLabel(c.kind)}</span>
          </div>
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

      {!c && isRect && (
        <Section title="Rectangle Type">
          <div className="k-pm-typegrid k-pm-recttypes">
            <button className={`k-pm-typebtn ${st.tool === 'rectangle' ? 'active' : ''}`} title="Corner Rectangle" onClick={() => st.setTool('rectangle')}><Icon.PmRectCorner size={34} /></button>
            <button className={`k-pm-typebtn ${st.tool === 'centerRectangle' ? 'active' : ''}`} title="Center Rectangle" onClick={() => st.setTool('centerRectangle')}><Icon.PmRectCenter size={34} /></button>
            <button className={`k-pm-typebtn ${st.tool === 'rect3Corner' ? 'active' : ''}`} title="3 Point Corner Rectangle" data-testid="rect3corner" onClick={() => st.setTool('rect3Corner')}><Icon.PmRect3Corner size={34} /></button>
            <button className={`k-pm-typebtn ${st.tool === 'rect3Center' ? 'active' : ''}`} title="3 Point Center Rectangle" data-testid="rect3center" onClick={() => st.setTool('rect3Center')}><Icon.PmRect3Center size={34} /></button>
            <button className={`k-pm-typebtn ${st.tool === 'parallelogram' ? 'active' : ''}`} title="Parallelogram" data-testid="parallelogram" onClick={() => st.setTool('parallelogram')}><Icon.PmParallelogram size={34} /></button>
          </div>
          <label className="k-check"><input type="checkbox" checked={rectCons.on} onChange={(e) => setRectCons({ ...rectCons, on: e.target.checked })} data-testid="rect-construction" /> Add construction lines</label>
          {rectCons.on && (
            <div className="k-pm-radios" style={{ marginLeft: 18 }}>
              <label className="k-check"><input type="radio" name="rectcons" checked={rectCons.mode === 'corners'} onChange={() => setRectCons({ ...rectCons, mode: 'corners' })} /> From Corners</label>
              <label className="k-check"><input type="radio" name="rectcons" checked={rectCons.mode === 'midpoints'} onChange={() => setRectCons({ ...rectCons, mode: 'midpoints' })} data-testid="rect-midpoints" /> From Midpoints</label>
            </div>
          )}
        </Section>
      )}

      {!c && lastRect && (
        <>
          <Section title="Existing Relations">
            <ul className="k-list k-pm-relations k-pm-relbox" data-testid="rect-relations">
              {rectRelations.map((k) => {
                const G = RelationGlyph[k.kind];
                return (
                  <li key={k.id} onClick={() => st.selectConstraint(k.id)}>
                    {G ? <G size={14} /> : <Icon.Dimension size={14} />}
                    <span>{sketch ? relationName(sketch, k.id) : relationLabel(k.kind)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="k-pm-status"><span className="k-pm-info">i</span> {rectStatus}</div>
          </Section>
          <Section title="Add Relations">
            <div className="k-pm-addrel">
              <button className="k-pm-relbtn" onClick={() => st.addRelation('horizontal', [lastRect[0]])}>{RelationGlyph.horizontal && <RelationGlyph.horizontal size={14} />}<span>Horizontal</span></button>
              <button className="k-pm-relbtn" onClick={() => st.addRelation('vertical', [lastRect[0]])}>{RelationGlyph.vertical && <RelationGlyph.vertical size={14} />}<span>Vertical</span></button>
              <button className="k-pm-relbtn" onClick={() => st.commit('Fix', (k) => rectCorners.reduce((acc, c) => (c ? (Object.values(acc.constraints).some((x) => x.kind === 'fix' && x.refs[0] === c.id) ? acc : { ...acc, constraints: { ...acc.constraints, ['fx' + c.id]: { id: 'fx' + c.id, kind: 'fix', refs: [c.id] } }, constraintOrder: [...acc.constraintOrder, 'fx' + c.id] }) : acc), k))}>{RelationGlyph.fix && <RelationGlyph.fix size={14} />}<span>Fix</span></button>
            </div>
          </Section>
          <Section title="Options">
            <label className="k-check"><input type="checkbox" data-testid="rect-forconstruction" checked={lastRect.every((id) => sketch.entities[id]?.kind === 'line' && (sketch.entities[id] as { construction?: boolean }).construction)} onChange={() => st.commit('Construction geometry', (k) => toggleConstruction(k, lastRect))} /> For construction</label>
          </Section>
          <Section title="Parameters">
            <div className="k-pm-params" data-testid="rect-params">
              {rectCorners.map((c) => c && (
                <div key={c.id} className="k-pm-ptpair">
                  {(['x', 'y'] as const).map((ax) => (
                    <div key={ax} className="k-pm-valuerow k-pm-ptrow"><PtAxis axis={ax} /><NumberField value={round(c[ax])} onChange={(v) => st.commit('Rectangle parameters', (k) => ({ ...k, points: { ...k.points, [c.id]: { ...k.points[c.id], [ax]: v } } }))} step={1} /></div>
                  ))}
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {(st.tool === 'circle' || st.tool === 'perimeterCircle') && !c && (
        <Section title="Circle Type">
          <div className="k-pm-typerow">
            <button className={`k-pm-typebtn k-tip${st.tool === 'circle' ? ' active' : ''}`} data-tip="Circle" onClick={() => st.setTool('circle')}><Icon.Circle size={22} /></button>
            <button className={`k-pm-typebtn k-tip${st.tool === 'perimeterCircle' ? ' active' : ''}`} data-tip="Perimeter Circle" onClick={() => st.setTool('perimeterCircle')}><Icon.PerimeterCircle size={22} /></button>
          </div>
        </Section>
      )}
      {(st.tool === 'arcCenter' || st.tool === 'arc3' || st.tool === 'tangentArc') && !c && (
        <Section title="Arc Type">
          <div className="k-pm-typerow">
            <button className={`k-pm-typebtn k-tip${st.tool === 'arcCenter' ? ' active' : ''}`} data-tip="Centerpoint Arc" onClick={() => st.setTool('arcCenter')}><Icon.ArcCenter size={22} /></button>
            <button className={`k-pm-typebtn k-tip${st.tool === 'tangentArc' ? ' active' : ''}`} data-tip="Tangent Arc" onClick={() => st.setTool('tangentArc')}><Icon.TangentArc size={22} /></button>
            <button className={`k-pm-typebtn k-tip${st.tool === 'arc3' ? ' active' : ''}`} data-tip="3 Point Arc" onClick={() => st.setTool('arc3')}><Icon.Arc size={22} /></button>
          </div>
        </Section>
      )}
      {!c && !isRect && st.tool !== 'equationCurve' && st.tool !== 'fullyDefine' && !['circle', 'perimeterCircle', 'arcCenter', 'arc3', 'tangentArc', 'polygon', 'line', 'centerline', 'midpointLine'].includes(st.tool) && (
        <Section title="Message">
          <p className="k-pm-message">{TOOL_HELP[st.tool]}</p>
          {st.tool === 'text' && (
            <div data-testid="sketch-text-pm" style={{ marginTop: 8 }}>
              <div className="k-pm-sub">Text</div>
              <textarea className="k-input" rows={2} value={sketchText.text} onChange={(e) => setSketchText({ ...sketchText, text: e.target.value })} />
              <label className="k-check"><input type="checkbox" checked={sketchText.bold} onChange={(e) => setSketchText({ ...sketchText, bold: e.target.checked })} /> Bold</label>
              <div className="k-field"><label>Height</label><NumberField value={sketchText.height} onChange={(v) => setSketchText({ ...sketchText, height: Math.max(0.1, v) })} step={1} min={0.1} /></div>
              <div className="k-field"><label>Width Factor (%)</label><NumberField value={sketchText.widthFactor} onChange={(v) => setSketchText({ ...sketchText, widthFactor: Math.max(10, v) })} step={5} min={10} /></div>
              <div className="k-field"><label>Spacing (%)</label><NumberField value={sketchText.spacing} onChange={(v) => setSketchText({ ...sketchText, spacing: Math.max(10, v) })} step={5} min={10} /></div>
              <div className="k-field"><label>Rotate (°)</label><NumberField value={sketchText.angle} onChange={(v) => setSketchText({ ...sketchText, angle: v })} step={15} /></div>
            </div>
          )}
        </Section>
      )}

      {st.selection.length > 0 && (
        <Section title={`Selected Entities (${st.selection.length})`}>
          <ul className="k-list">
            {st.selection.map((s) => {
              const e = sketch.entities[s.id];
              const label = s.kind === 'point' ? (s.id === sketch.origin ? 'Origin' : 'Point') : e ? { point: 'Point', line: 'Line', circle: 'Circle', arc: 'Arc', spline: e.kind === 'spline' && e.style ? 'Style Spline' : e.kind === 'spline' && e.equation ? 'Equation Driven Curve' : 'Spline', ellipse: 'Ellipse', ellipseArc: 'Partial Ellipse', conic: e.kind === 'conic' && e.parabola ? 'Parabola' : 'Conic', text: 'Text' }[e.kind] : s.id;
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

      {!c && st.selection.length === 1 && st.selection[0].kind === 'point' && sketch.points[st.selection[0].id] && (
        <Section title="Control Vertex Parameters">
          {(['x', 'y'] as const).map((ax) => (
            <div key={ax} className="k-pm-valuerow k-tip" data-tip={ax === 'x' ? 'X Coordinate' : 'Y Coordinate'} data-testid={`point-${ax}`}>
              <span className="k-pm-xy">{ax.toUpperCase()}</span>
              <NumberField value={round(sketch.points[st.selection[0].id][ax])} onChange={(v) => { const id = st.selection[0].id; st.commit('Point', (k) => ({ ...k, points: { ...k.points, [id]: { ...k.points[id], [ax]: v } } })); }} unit={st.doc.units} step={1} />
            </div>
          ))}
        </Section>
      )}
      {constraintsOfSelection.length > 0 && !c && (
        <Section title="Existing Relations">
          <ul className="k-list k-pm-relations">
            {constraintsOfSelection.map((k) => {
              const G = RelationGlyph[k.kind];
              return (
                <li key={k.id} onClick={() => st.selectConstraint(k.id)}>
                  {G ? <G size={14} /> : <Icon.Dimension size={14} />}
                  <span>{sketch ? relationName(sketch, k.id) : relationLabel(k.kind)}</span>
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

      {(relOptions.length > 0 || pierceable) && (
        <Section title="Add Relations">
          <div className="k-pm-addrel">
            {pierceable && <button className="k-pm-relbtn" data-testid="rel-pierce" onClick={() => st.addPierce(pierceable)}><RelationGlyph.pierce size={14} /><span>Pierce</span></button>}
            {relOptions.map((o) => {
              const G = RelationGlyph[o.kind];
              return (
                <button key={o.kind + o.refs.join()} className="k-pm-relbtn" onClick={() => st.addRelation(o.kind, o.refs, { internal: o.internal })}>
                  {G && <G size={14} />}
                  <span>{o.label}</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {!c && st.tool === 'equationCurve' && (
        <>
          <Section title="Equation Type">
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="eqtype" checked={!eqc.param} onChange={() => setEqc({ ...eqc, param: false, x1: 0, x2: 60 })} /> Explicit</label>
              <label className="k-check"><input type="radio" name="eqtype" checked={eqc.param} onChange={() => setEqc({ ...eqc, param: true, x1: 0, x2: 6.283185307 })} /> Parametric</label>
            </div>
          </Section>
          <Section title="Parameters">
            <div className="k-pm-sub">Equation</div>
            {eqc.param ? (
              <>
                <div className="k-pm-valuerow"><span className="k-pm-xy">x<sub>t</sub> =</span><input className="k-input" data-testid="eq-xt" value={eqc.xt} onChange={(e) => setEqc({ ...eqc, xt: e.target.value })} onKeyDown={(e) => e.stopPropagation()} /></div>
                <div className="k-pm-valuerow"><span className="k-pm-xy">y<sub>t</sub> =</span><input className="k-input" data-testid="eq-yt" value={eqc.yt} onChange={(e) => setEqc({ ...eqc, yt: e.target.value })} onKeyDown={(e) => e.stopPropagation()} /></div>
              </>
            ) : <div className="k-pm-valuerow"><span className="k-pm-xy">y<sub>x</sub> =</span><input className="k-input" data-testid="eq-expr" value={eqc.expr} onChange={(e) => setEqc({ ...eqc, expr: e.target.value })} onKeyDown={(e) => e.stopPropagation()} /></div>}
            <div className="k-pm-sub">Parameters</div>
            <div className="k-pm-xyrow">
              <span className="k-pm-xy">{eqc.param ? 't' : 'x'}<sub>1</sub></span><NumberField value={eqc.x1} onChange={(v) => setEqc({ ...eqc, x1: v })} step={1} />
              <span className="k-pm-xy">{eqc.param ? 't' : 'x'}<sub>2</sub></span><NumberField value={eqc.x2} onChange={(v) => setEqc({ ...eqc, x2: v })} step={1} />
            </div>
            <p className="k-muted" style={{ marginTop: 6 }}>x in mm, sin/cos/tan in radians; pi and e are known.</p>
            <Button data-testid="eq-apply" onClick={() => { if ((eqc.param ? st.addEquationCurve(eqc.xt, eqc.x1, eqc.x2, eqc.yt) : st.addEquationCurve(eqc.expr, eqc.x1, eqc.x2))) st.setTool('select'); }}>Apply</Button>
          </Section>
        </>
      )}
      {!c && st.tool === 'fullyDefine' && (
        <>
          <Section title="Entities to Fully Define">
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="fdent" checked={!fdef.selected} onChange={() => setFdef({ ...fdef, selected: false })} /> All entities in sketch</label>
              <label className="k-check"><input type="radio" name="fdent" checked={fdef.selected} onChange={() => setFdef({ ...fdef, selected: true })} /> Selected entities ({selectedEntities.length})</label>
            </div>
            <Button data-testid="fd-calc" onClick={() => { st.fullyDefine(fdef); st.setTool('select'); }}>Calculate</Button>
          </Section>
          <Section title="Relations">
            <label className="k-check"><input type="checkbox" checked={fdef.relations} onChange={(e) => setFdef({ ...fdef, relations: e.target.checked })} /> Horizontal and Vertical</label>
          </Section>
          <Section title="Dimensions">
            <label className="k-check"><input type="checkbox" checked={fdef.dimensions} onChange={(e) => setFdef({ ...fdef, dimensions: e.target.checked })} /> Lengths, radii and positions from the origin</label>
            <div className="k-field"><label>Horizontal Dimensions Scheme</label><select className="k-input" data-testid="fd-hscheme" value={fdef.hScheme} onChange={(e) => setFdef({ ...fdef, hScheme: e.target.value as 'baseline' })}><option value="ordinate">Ordinate</option><option value="baseline">Baseline</option><option value="chain">Chain</option></select></div>
            <div className="k-field"><label>Vertical Dimensions Scheme</label><select className="k-input" value={fdef.vScheme} onChange={(e) => setFdef({ ...fdef, vScheme: e.target.value as 'baseline' })}><option value="ordinate">Ordinate</option><option value="baseline">Baseline</option><option value="chain">Chain</option></select></div>
          </Section>
        </>
      )}

      {!c && st.tool === 'trim' && (
        <Section title="Options">
          <div className="k-pm-radios" data-testid="trim-modes">
            {([['power', 'Power trim'], ['corner', 'Corner'], ['inside', 'Trim away inside'], ['outside', 'Trim away outside'], ['closest', 'Trim to closest']] as const).map(([m, l]) => (
              <label key={m} className="k-check"><input type="radio" name="trimmode" data-testid={`trim-${m}`} checked={st.sketchTool.trimMode === m} onChange={() => st.setSketchTool({ trimMode: m })} /> {l}</label>
            ))}
          </div>
          <p className="k-muted" style={{ margin: '4px 0' }}>{({ power: 'Drag across the entities to trim them.', corner: 'Click two lines: they are trimmed or extended to meet.', inside: 'Click two boundary entities, then the entities to trim between them.', outside: 'Click two boundary entities, then the entities to trim outside them.', closest: 'Click the part of an entity to remove.' } as Record<string, string>)[st.sketchTool.trimMode]}</p>
          <label className="k-check" style={{ marginTop: 4 }}><input type="checkbox" checked={st.sketchTool.trimKeep} onChange={(e) => st.setSketchTool({ trimKeep: e.target.checked })} /> Keep trimmed entities as construction geometry</label>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.trimIgnore} onChange={(e) => st.setSketchTool({ trimIgnore: e.target.checked })} /> Ignore trimming of construction geometry</label>
        </Section>
      )}
      {!c && st.tool === 'segment' && (
        <Section title="Segment Parameters">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="segmode" checked={segment.mode === 'points'} onChange={() => setSegment({ ...segment, mode: 'points' })} /> Sketch points</label>
            <label className="k-check"><input type="radio" name="segmode" data-testid="segment-segments" checked={segment.mode === 'segments'} onChange={() => setSegment({ ...segment, mode: 'segments' })} /> Sketch segments</label>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Number of segments"><Icon.Pattern size={14} /><NumberField value={segment.n} onChange={(v) => setSegment({ ...segment, n: Math.max(2, Math.min(100, Math.round(v))) })} step={1} min={2} /></div>
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="segment-entity">{selectedEntities.length ? selectedEntities.slice(0, 1).map((it) => <div key={it.id} className="k-selbox-row"><Icon.Line size={12} /> {sketch.entities[it.id]?.kind ?? it.id}</div>) : <span className="k-muted">Select a line, arc, circle or spline.</span>}</div>
          <button className="k-btn" style={{ marginTop: 4 }} data-testid="segment-apply" disabled={!selectedEntities.length} onClick={() => { const id = selectedEntities[0].id; st.commit('Segment', (k) => segmentEntity(k, id, segment.n, segment.mode)); useStore.setState({ selection: [] }); }}>Apply</button>
        </Section>
      )}
      {!c && st.tool === 'sketchFillet' && (
        <Section title="Fillet Parameters">
          <div className="k-pm-valuerow">
            <Icon.Arc size={14} />
            <NumberField value={st.sketchTool.filletRadius} onChange={(v) => st.setSketchTool({ filletRadius: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus />
          </div>
          <label className="k-check"><input type="checkbox" data-testid="skfillet-keep" checked={st.sketchTool.filletKeepCorners} onChange={(e) => st.setSketchTool({ filletKeepCorners: e.target.checked })} /> Keep constrained corners</label>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.filletDimension} onChange={(e) => st.setSketchTool({ filletDimension: e.target.checked })} /> Dimension each fillet</label>
          <p className="k-muted" style={{ margin: '4px 0 0' }}>{selectedEntities.length ? 'Now click the second line.' : 'Click the first line of the corner.'}</p>
        </Section>
      )}
      {!c && st.tool === 'sketchChamfer' && (
        <Section title="Chamfer Parameters">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="chamfermode" checked={st.sketchTool.chamferMode === 'angle'} onChange={() => st.setSketchTool({ chamferMode: 'angle' })} /> Angle-distance</label>
            <label className="k-check"><input type="radio" name="chamfermode" checked={st.sketchTool.chamferMode === 'distance'} onChange={() => st.setSketchTool({ chamferMode: 'distance' })} /> Distance-distance</label>
          </div>
          {st.sketchTool.chamferMode === 'angle' && <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={st.sketchTool.chamferAngle} onChange={(v) => st.setSketchTool({ chamferAngle: Math.max(1, Math.min(89, v)) })} unit="°" step={5} /></div>}
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.chamferEqual} onChange={(e) => st.setSketchTool({ chamferEqual: e.target.checked })} /> Equal distance</label>
          <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>D1</span><NumberField value={st.sketchTool.chamferD1} onChange={(v) => st.setSketchTool({ chamferD1: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>
          {!st.sketchTool.chamferEqual && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>D2</span><NumberField value={st.sketchTool.chamferD2} onChange={(v) => st.setSketchTool({ chamferD2: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} /></div>}
          <p className="k-muted" style={{ margin: '4px 0 0' }}>{selectedEntities.length ? 'Now click the second line.' : 'Click the first line of the corner.'}</p>
        </Section>
      )}
      {!c && st.tool === 'offset' && (
        <Section title="Parameters">
          <div className="k-pm-valuerow">
            <Icon.Dimension size={14} />
            <NumberField value={st.sketchTool.offsetDistance} onChange={(v) => st.setSketchTool({ offsetDistance: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} autoFocus onCommit={st.applySketchTool} />
          </div>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.offsetDimensions} onChange={(e) => st.setSketchTool({ offsetDimensions: e.target.checked })} /> Add dimensions</label>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.offsetReverse} onChange={(e) => st.setSketchTool({ offsetReverse: e.target.checked })} /> Reverse</label>
          <label className="k-check"><input type="checkbox" data-testid="offset-chain" checked={st.sketchTool.offsetChain} onChange={(e) => st.setSketchTool({ offsetChain: e.target.checked })} /> Select chain</label>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.offsetBidirectional} onChange={(e) => st.setSketchTool({ offsetBidirectional: e.target.checked })} /> Bi-directional</label>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.offsetCapEnds} disabled={!st.sketchTool.offsetBidirectional} onChange={(e) => st.setSketchTool({ offsetCapEnds: e.target.checked })} /> Cap ends</label>
          <p className="k-muted" style={{ margin: '6px 0 2px' }}>Construction geometry:</p>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.offsetBaseConstruction} onChange={(e) => st.setSketchTool({ offsetBaseConstruction: e.target.checked })} /> Base geometry</label>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.offsetConstruction} onChange={(e) => st.setSketchTool({ offsetConstruction: e.target.checked })} /> Offset geometry</label>
          <p className="k-muted" style={{ margin: '4px 0 0' }}>{selectedEntities.length} entit{selectedEntities.length === 1 ? 'y' : 'ies'} selected.</p>
        </Section>
      )}
      {!c && (st.tool === 'moveEntities' || st.tool === 'copyEntities') && (
        <>
          <Section title={st.tool === 'moveEntities' ? 'Entities to Move' : 'Entities to Copy'}>
            <div className="k-selbox" style={{ minHeight: 24 }}>{selectedEntities.length ? selectedEntities.map((e, i) => <div key={e.id} className="k-selbox-row">{sketch.entities[e.id]?.kind === 'line' ? 'Line' : sketch.entities[e.id]?.kind === 'circle' ? 'Circle' : sketch.entities[e.id]?.kind === 'arc' ? 'Arc' : 'Entity'}{i + 1}</div>) : <span className="k-muted">Select the entities in the graphics area.</span>}</div>
            <label className="k-check"><input type="checkbox" data-testid="move-keeprel" checked={st.sketchTool.keepRelations} onChange={(e) => st.setSketchTool({ keepRelations: e.target.checked })} /> Keep relations</label>
          </Section>
          <Section title="Parameters">
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="movemode" checked={st.sketchTool.moveMode === 'fromTo'} onChange={() => st.setSketchTool({ moveMode: 'fromTo' })} /> From/To</label>
              <label className="k-check"><input type="radio" name="movemode" checked={st.sketchTool.moveMode === 'xy'} onChange={() => st.setSketchTool({ moveMode: 'xy' })} /> X/Y</label>
            </div>
            {st.sketchTool.moveMode === 'fromTo' ? (
              <>
                <div className="k-pm-sub">Base point</div>
                <div className="k-pm-xyrow"><span className="k-pm-xy">X</span><NumberField value={st.sketchTool.fromX} onChange={(v) => st.setSketchTool({ fromX: v })} step={1} /><span className="k-pm-xy">Y</span><NumberField value={st.sketchTool.fromY} onChange={(v) => st.setSketchTool({ fromY: v })} step={1} /></div>
                <div className="k-pm-sub">To point</div>
                <div className="k-pm-xyrow"><span className="k-pm-xy">X</span><NumberField value={st.sketchTool.toX} onChange={(v) => st.setSketchTool({ toX: v })} step={1} /><span className="k-pm-xy">Y</span><NumberField value={st.sketchTool.toY} onChange={(v) => st.setSketchTool({ toY: v })} step={1} /></div>
              </>
            ) : (
              <>
                <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>ΔX</span><NumberField value={st.sketchTool.dx} onChange={(v) => st.setSketchTool({ dx: v })} unit={st.doc.units} step={1} autoFocus /></div>
                <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>ΔY</span><NumberField value={st.sketchTool.dy} onChange={(v) => st.setSketchTool({ dy: v })} unit={st.doc.units} step={1} /></div>
              </>
            )}
            <button className="k-btn" data-testid="move-repeat" disabled={!selectedEntities.length} onClick={() => st.setSketchTool(st.sketchTool.moveMode === 'fromTo' ? { toX: st.sketchTool.toX + (st.sketchTool.toX - st.sketchTool.fromX), toY: st.sketchTool.toY + (st.sketchTool.toY - st.sketchTool.fromY) } : { dx: st.sketchTool.dx * 2, dy: st.sketchTool.dy * 2 })}>Repeat</button>
          </Section>
        </>
      )}
      {!c && (st.tool === 'rotateEntities' || st.tool === 'scaleEntities') && (
        <>
          <Section title={st.tool === 'rotateEntities' ? 'Entities to Rotate' : 'Entities to Scale'}>
            <div className="k-selbox" style={{ minHeight: 24 }}>{selectedEntities.length ? <span>{selectedEntities.length} selected</span> : <span className="k-muted">Select the entities in the graphics area.</span>}</div>
            <label className="k-check"><input type="checkbox" checked={st.sketchTool.keepRelations} onChange={(e) => st.setSketchTool({ keepRelations: e.target.checked })} /> Keep relations</label>
          </Section>
          <Section title="Parameters">
            <p className="k-muted" style={{ margin: '0 0 2px' }}>{st.tool === 'rotateEntities' ? 'Center of rotation:' : 'Scale about:'}</p>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>X</span><NumberField value={st.sketchTool.cx} onChange={(v) => st.setSketchTool({ cx: v })} unit={st.doc.units} step={1} /></div>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>Y</span><NumberField value={st.sketchTool.cy} onChange={(v) => st.setSketchTool({ cy: v })} unit={st.doc.units} step={1} /></div>
            {st.tool === 'rotateEntities' ? (
              <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={st.sketchTool.angle} onChange={(v) => st.setSketchTool({ angle: v })} unit="°" step={5} autoFocus /></div>
            ) : (
              <div className="k-pm-valuerow"><Icon.Fit size={14} /><NumberField value={st.sketchTool.scale} onChange={(v) => st.setSketchTool({ scale: Math.max(0.01, v) })} step={0.1} min={0.01} autoFocus /></div>
            )}
          </Section>
        </>
      )}
      {!c && st.tool === 'linearSketchPattern' && (
        <>
          <Section title="Direction 1">
            <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={st.sketchTool.spacing} onChange={(v) => st.setSketchTool({ spacing: v })} unit={st.doc.units} step={1} autoFocus /></div>
            <div className="k-pm-valuerow"><Icon.Pattern size={14} /><NumberField value={st.sketchTool.count} onChange={(v) => st.setSketchTool({ count: Math.max(1, Math.round(v)) })} step={1} min={1} /></div>
            <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={st.sketchTool.direction} onChange={(v) => st.setSketchTool({ direction: v })} unit="°" step={15} /></div>
            <label className="k-check"><input type="checkbox" checked={st.sketchTool.patternDimensions} onChange={(e) => st.setSketchTool({ patternDimensions: e.target.checked })} /> Add dimensions</label>
          </Section>
          <Section title="Direction 2" defaultOpen={false}>
            <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={st.sketchTool.spacing2} onChange={(v) => st.setSketchTool({ spacing2: v })} unit={st.doc.units} step={1} /></div>
            <div className="k-pm-valuerow"><Icon.Pattern size={14} /><NumberField value={st.sketchTool.count2} onChange={(v) => st.setSketchTool({ count2: Math.max(1, Math.round(v)) })} step={1} min={1} /></div>
            <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={st.sketchTool.direction2} onChange={(v) => st.setSketchTool({ direction2: v })} unit="°" step={15} /></div>
          </Section>
          <Section title="Entities to Pattern">
            <div className="k-selbox" style={{ minHeight: 24 }}>{selectedEntities.length ? <span>{selectedEntities.length} selected</span> : <span className="k-muted">Select the entities in the graphics area.</span>}</div>
          </Section>
        </>
      )}
      {!c && st.tool === 'circularSketchPattern' && (
        <>
          <Section title="Parameters">
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>X</span><NumberField value={st.sketchTool.cx} onChange={(v) => st.setSketchTool({ cx: v })} unit={st.doc.units} step={1} /></div>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>Y</span><NumberField value={st.sketchTool.cy} onChange={(v) => st.setSketchTool({ cy: v })} unit={st.doc.units} step={1} /></div>
            <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={st.sketchTool.circAngle} onChange={(v) => st.setSketchTool({ circAngle: v })} unit="°" step={15} /></div>
            <div className="k-pm-valuerow"><Icon.Pattern size={14} /><NumberField value={st.sketchTool.circCount} onChange={(v) => st.setSketchTool({ circCount: Math.max(1, Math.round(v)) })} step={1} min={1} autoFocus /></div>
            <label className="k-check"><input type="checkbox" data-testid="circpat-equal" checked={st.sketchTool.circEqual} onChange={(e) => st.setSketchTool({ circEqual: e.target.checked })} /> Equal spacing</label>
            <label className="k-check"><input type="checkbox" checked={st.sketchTool.patternDimensions} onChange={(e) => st.setSketchTool({ patternDimensions: e.target.checked })} /> Add dimensions</label>
          </Section>
          <Section title="Entities to Pattern">
            <div className="k-selbox" style={{ minHeight: 24 }}>{selectedEntities.length ? <span>{selectedEntities.length} selected</span> : <span className="k-muted">Select the entities in the graphics area.</span>}</div>
          </Section>
        </>
      )}
      {!c && (st.tool === 'slot' || st.tool === 'centerSlot' || st.tool === 'arcSlot' || st.tool === 'centerArcSlot') && (
        <>
          <Section title="Slot Types">
            <div className="k-pm-stylerow">
              <button className={`k-pm-stylebtn k-tip ${st.tool === 'slot' ? 'active' : ''}`} data-tip="Straight Slot" onClick={() => st.setTool('slot')}><Icon.Slot size={16} /></button>
              <button className={`k-pm-stylebtn k-tip ${st.tool === 'centerSlot' ? 'active' : ''}`} data-tip="Centerpoint Straight Slot" onClick={() => st.setTool('centerSlot')}><Icon.Slot size={16} /></button>
              <button className={`k-pm-stylebtn k-tip ${st.tool === 'arcSlot' ? 'active' : ''}`} data-tip="3 Point Arc Slot" onClick={() => st.setTool('arcSlot')}><Icon.Slot size={16} /></button>
              <button className={`k-pm-stylebtn k-tip ${st.tool === 'centerArcSlot' ? 'active' : ''}`} data-tip="Centerpoint Arc Slot" onClick={() => st.setTool('centerArcSlot')}><Icon.Slot size={16} /></button>
            </div>
            <label className="k-check"><input type="checkbox" data-testid="slot-dims" checked={st.sketchTool.slotDimensions} onChange={(e) => st.setSketchTool({ slotDimensions: e.target.checked })} /> Add dimensions</label>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="slotlen" checked={!st.sketchTool.slotOverall} onChange={() => st.setSketchTool({ slotOverall: false })} /> Center to Center</label>
              <label className="k-check"><input type="radio" name="slotlen" checked={st.sketchTool.slotOverall} onChange={() => st.setSketchTool({ slotOverall: true })} /> Overall Length</label>
            </div>
          </Section>
          <Section title="Parameters" defaultOpen={false}>
            <p className="k-muted">Center and width follow the clicks; dimension the slot afterwards with Smart Dimension.</p>
          </Section>
        </>
      )}

      {!c && !lastRect && isDraw && (st.tool === 'line' || st.tool === 'centerline') && (
        <Section title="Orientation">
          <div className="k-pm-radios" data-testid="line-orientation">
            {([['sketched', 'As sketched'], ['horizontal', 'Horizontal'], ['vertical', 'Vertical'], ['angle', 'Angle']] as const).map(([id, label]) => (
              <label key={id} className="k-check"><input type="radio" name="lineori" checked={(st.sketchTool.lineOrientation ?? 'sketched') === id} onChange={() => st.setSketchTool({ lineOrientation: id })} /> {label}</label>
            ))}
            {st.sketchTool.lineOrientation === 'angle' && <div className="k-pm-valuerow k-tip" data-tip="Angle" style={{ marginLeft: 18 }}><Icon.MateAngle size={14} /><NumberField value={st.sketchTool.lineAngle ?? 45} onChange={(v) => st.setSketchTool({ lineAngle: v })} unit="°" step={5} /></div>}
          </div>
        </Section>
      )}
      {!c && !lastRect && (selectedEntities.length > 0 || (isDraw && !isRect)) && (
        <Section title="Options">
          {selectedEntities.length > 0 && !isDraw ? (
            <label className="k-check"><input type="checkbox" checked={selectedEntities.every((s) => sketch.entities[s.id]?.construction)} onChange={st.toggleConstructionSelection} /> For construction</label>
          ) : (
            <>
              <label className="k-check"><input type="checkbox" data-testid="tool-construction" checked={st.sketchTool.forConstruction} onChange={(e) => st.setSketchTool({ forConstruction: e.target.checked })} /> For construction</label>
              {st.tool === 'line' && <label className="k-check"><input type="checkbox" data-testid="line-infinite" checked={st.sketchTool.infiniteLength} onChange={(e) => st.setSketchTool({ infiniteLength: e.target.checked })} /> Infinite length</label>}
              {(st.tool === 'line' || st.tool === 'centerline') && <label className="k-check"><input type="checkbox" data-testid="line-midpoint" checked={!!st.sketchTool.midpointLine} onChange={(e) => st.setSketchTool({ midpointLine: e.target.checked })} /> Midpoint line</label>}
              {(st.tool === 'line' || st.tool === 'centerline' || isRect || st.tool === 'circle' || st.tool === 'perimeterCircle') && <label className="k-check"><input type="checkbox" data-testid="tool-adddims" checked={!!st.sketchTool.addDimensions} onChange={(e) => st.setSketchTool({ addDimensions: e.target.checked })} /> Add dimensions</label>}
              {(st.tool === 'circle' || st.tool === 'perimeterCircle') && <label className="k-check"><input type="checkbox" data-testid="circle-diameter" disabled={!st.sketchTool.addDimensions} checked={st.sketchTool.circleDiameter !== false} onChange={(e) => st.setSketchTool({ circleDiameter: e.target.checked })} /> Diameter dimensions</label>}
            </>
          )}
        </Section>
      )}

      {/* Polygon > Parameters by design: sides, inscribed / circumscribed, centre, diameter, angle, New Polygon */}
      {!c && st.tool === 'polygon' && (
        <Section title="Parameters">
          <div className="k-pm-valuerow k-tip" data-tip="Number of sides" data-testid="polygon-sides"><Icon.Polygon size={16} /><NumberField value={sides} onChange={(v) => setSides(Math.max(3, Math.min(40, Math.round(v))))} step={1} min={3} /></div>
          <div className="k-pm-radios" style={{ paddingLeft: 26 }}>
            <label className="k-check"><input type="radio" name="polycirc" data-testid="polygon-inscribed" checked={polyInscribed} onChange={() => setPolyInscribed(true)} /> Inscribed circle</label>
            <label className="k-check"><input type="radio" name="polycirc" data-testid="polygon-circumscribed" checked={!polyInscribed} onChange={() => setPolyInscribed(false)} /> Circumscribed circle</label>
          </div>
          {/* the polygon drawn last: centre, circle diameter and angle can be changed (greyed until there is one) */}
          {(() => {
            const pg = lastPolygon(sketch);
            const vals = pg ? [pg.center.x, pg.center.y, pg.diameter, pg.angle] : [0, 0, 0, 0];
            const edit = (i: number, v: number) => {
              if (!pg) return;
              const ids = [pg.circleId, ...pg.lineIds];
              const xf = i === 0 ? translate(v - pg.center.x, 0) : i === 1 ? translate(0, v - pg.center.y) : i === 2 ? scaleAbout(pg.center, Math.max(0.001, v) / pg.diameter) : rotateAbout(pg.center, v - pg.angle);
              st.commit('Polygon Parameters', (k) => transformEntities(k, ids, xf));
            };
            return POLY_FIELDS.map(([t, l], i) => (
              <div key={t} className="k-pm-valuerow k-tip" data-tip={t} data-testid={`polygon-param-${i}`}><span className="k-pm-xy">{l}</span><NumberField value={Math.round(vals[i] * 1e6) / 1e6} onChange={(v) => edit(i, v)} disabled={!pg} blankWhenDisabled unit={i === 3 ? '°' : st.doc.units} step={i === 3 ? 15 : 1} /></div>
            ));
          })()}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}><button className="k-btn" onClick={() => st.setTool('polygon')}>New Polygon</button></div>
        </Section>
      )}
      {/* Parameters of the entity drawn last, greyed until there is one, by design */}
      {!c && isDraw && !isRect && (st.tool === 'circle' || st.tool === 'perimeterCircle' || st.tool === 'arcCenter' || st.tool === 'arc3' || st.tool === 'tangentArc' || st.tool === 'line' || st.tool === 'centerline') && (() => {
        const kind = st.tool === 'circle' || st.tool === 'perimeterCircle' ? 'circle' : st.tool === 'line' || st.tool === 'centerline' ? 'line' : 'arc';
        const lastId = [...sketch.entityOrder].reverse().find((id) => sketch.entities[id]?.kind === kind);
        const e = lastId ? sketch.entities[lastId] : null;
        const setPt = (pid: string, patch: { x?: number; y?: number }) => st.commit('Parameters', (k) => ({ ...k, points: { ...k.points, [pid]: { ...k.points[pid], ...patch } } }));
        const setR = (sid: string, v: number) => st.commit('Parameters', (k) => ({ ...k, scalars: { ...k.scalars, [sid]: Math.max(0.001, v) } }));
        const row = (label: string, value: number | null, on: (v: number) => void, unitDeg = false) => (
          <div className="k-pm-valuerow" key={label}><span className="k-pm-xy">{label}</span><NumberField value={value ?? 0} onChange={on} disabled={value === null} blankWhenDisabled={false} unit={unitDeg ? '°' : st.doc.units} step={1} /></div>
        );
        if (kind === 'line') {
          const l = e && e.kind === 'line' ? e : null;
          const a = l ? sketch.points[l.p1] : null, b = l ? sketch.points[l.p2] : null;
          const len = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : null;
          const ang = a && b ? (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI : null;
          return (
            <>
              <Section title="Parameters">
                {row('L', len !== null ? round(len) : null, (v) => { if (!l || !a || !b || !len) return; const k2 = v / len; setPt(l.p2, { x: a.x + (b.x - a.x) * k2, y: a.y + (b.y - a.y) * k2 }); })}
                {row('∠', ang !== null ? round(ang) : null, (v) => { if (!l || !a || !len) return; const t = (v * Math.PI) / 180; setPt(l.p2, { x: a.x + len * Math.cos(t), y: a.y + len * Math.sin(t) }); }, true)}
              </Section>
              {/* Additional Parameters, by design: start and end point, ΔX and ΔY */}
              <Section title="Additional Parameters" defaultOpen={false}>
                {row('x₁', a ? round(a.x) : null, (v) => l && setPt(l.p1, { x: v }))}
                {row('y₁', a ? round(a.y) : null, (v) => l && setPt(l.p1, { y: v }))}
                {row('x₂', b ? round(b.x) : null, (v) => l && setPt(l.p2, { x: v }))}
                {row('y₂', b ? round(b.y) : null, (v) => l && setPt(l.p2, { y: v }))}
                {row('ΔX', a && b ? round(b.x - a.x) : null, (v) => l && a && setPt(l.p2, { x: a.x + v }))}
                {row('ΔY', a && b ? round(b.y - a.y) : null, (v) => l && a && setPt(l.p2, { y: a.y + v }))}
              </Section>
            </>
          );
        }
        const ce = e && (e.kind === 'circle' || e.kind === 'arc') ? e : null;
        const cp = ce ? sketch.points[ce.center] : null;
        const r = ce ? sketch.scalars[ce.r] : null;
        return (
          <Section title="Parameters">
            {row('Cx', cp ? round(cp.x) : null, (v) => ce && setPt(ce.center, { x: v }))}
            {row('Cy', cp ? round(cp.y) : null, (v) => ce && setPt(ce.center, { y: v }))}
            {row('R', r !== null ? round(r) : null, (v) => ce && setR(ce.r, v))}
          </Section>
        );
      })()}
      {!c && isRect && !lastRect && (
        <Section title="Parameters">
          {[1, 2, 3, 4].flatMap((i) => (['x', 'y'] as const).map((ax) => (
            <div className="k-pm-valuerow k-pm-ptrow" key={ax + i}><PtAxis axis={ax} /><NumberField value={0} onChange={() => undefined} disabled unit="" step={1} /></div>
          )))}
        </Section>
      )}
    </>
  );
}
