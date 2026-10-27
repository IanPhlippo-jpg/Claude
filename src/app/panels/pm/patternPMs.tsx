/** Property Panels: patternPMs (split from PropertyPanel.tsx, QA F103). */
import { MAX_PATTERN_INSTANCES } from '../../../core/features/pattern';
import { resolvePlaneDef } from '../../../core/features/planes';
import { isSketchBased } from '../../../core/document/types';
import { type ReactNode } from 'react';
import { useStore } from '../../store';
import { Button, NumberField, Section } from '../../../ui/components';
import { Icon } from '../../../ui/icons';
import { holeSubtypePatch, ANSI_METRIC_NAMES, HOLE_SIZES, holeSizesFor, HOLE_TYPES, HoleTypeIcon, Header } from './shared';
import { NEXT, type PMContext } from './context';

export function mirrorPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st, holeStd, setHoleStd, holeSize, setHoleSize, holeFit, setHoleFit, customSizing, setCustomSizing, holeTab, setHoleTab } = ctx;
  // Mirror, Linear / Circular Pattern, Hole Tool
  if (st.featureEdit && (st.featureEdit.draft.type === 'mirror' || st.featureEdit.draft.type === 'linearPattern' || st.featureEdit.draft.type === 'circularPattern' || st.featureEdit.draft.type === 'sketchPattern' || st.featureEdit.draft.type === 'curvePattern' || st.featureEdit.draft.type === 'tablePattern' || st.featureEdit.draft.type === 'fillPattern' || st.featureEdit.draft.type === 'variablePattern' || st.featureEdit.draft.type === 'hole')) {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const axisOptions: { id: string; label: string; v: [number, number, number] }[] = [
      { id: 'x', label: 'X axis', v: [1, 0, 0] },
      { id: 'y', label: 'Y axis', v: [0, 1, 0] },
      { id: 'z', label: 'Z axis', v: [0, 0, 1] },
    ];
    const axisId = (v: [number, number, number]) => axisOptions.find((o) => o.v.every((x, i) => Math.abs(x - Math.abs(v[i])) < 1e-6))?.id ?? 'x';
    const seedFeatures = st.doc.features.filter((f) => f.type === 'extrude' || f.type === 'revolve');
    const planeOptions = [
      { id: 'front', label: 'Front Plane' },
      { id: 'top', label: 'Top Plane' },
      { id: 'right', label: 'Right Plane' },
      ...Object.values(st.doc.planes).map((pl) => ({ id: pl.id, label: pl.name })),
    ];
    const errBox = err ? (
      <Section title="Rebuild Errors">
        <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
      </Section>
    ) : null;
    if (d.type === 'mirror') {
      return (
        <>
          <Header title="Mirror" icon={<Icon.Mirror />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
          <Section title="Mirror Face/Plane">
            {/* a sheet metal part: the hint of the intended design on the mirror face box */}
            <div className={st.doc.sheetMetal ? 'k-tip' : undefined} data-tip={st.doc.sheetMetal ? 'To mirror a sheet metal part, please select a face of the sheet metal part as the Mirror Plane/Face' : undefined} data-testid="mirror-plane-box">
              <select className="k-input" value={d.plane} onChange={(e) => st.updateFeatureDraft({ plane: e.target.value })}>
                {planeOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          </Section>
          <Section title="Features to Mirror" defaultOpen={!!d.featureIds?.length}>
            <div className="k-selbox" style={{ minHeight: 30 }} data-testid="mirror-features">
              {st.doc.features.filter((f) => isSketchBased(f) && f.type !== 'sketch').map((f) => <label key={f.id} className="k-check"><input type="checkbox" checked={!!d.featureIds?.includes(f.id)} onChange={(e) => st.updateFeatureDraft({ featureIds: e.target.checked ? [...(d.featureIds ?? []), f.id] : (d.featureIds ?? []).filter((x) => x !== f.id), faces: undefined })} /> {f.name}</label>)}
              {!st.doc.features.some((f) => isSketchBased(f) && f.type !== 'sketch') && <span className="k-muted">No features to mirror.</span>}
            </div>
          </Section>
          <Section title="Faces to Mirror" defaultOpen={!!d.faces?.length}>
            <div className={`k-selbox${st.mirrorPick === 'faces' ? ' k-selbox-dir' : ''}`} style={{ minHeight: 30 }} data-testid="mirror-faces" onClick={() => useStore.setState({ mirrorPick: st.mirrorPick === 'faces' ? null : 'faces' })}>
              {d.faces?.length ? d.faces.map((f) => <div key={f.label} className="k-selbox-row">{f.label}<button className="k-btn ghost icon" style={{ marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); st.updateFeatureDraft({ faces: d.faces!.filter((x) => x.label !== f.label) }); }}>×</button></div>) : <span className="k-muted">Select faces in the graphics area.</span>}
            </div>
          </Section>
          <Section title="Bodies to Mirror" defaultOpen={!d.featureIds?.length && !d.faces?.length}>
            <div className="k-selbox" style={{ minHeight: 24 }} data-testid="mirror-bodies">
              {st.rebuild.bodies.length > 1 ? st.rebuild.bodies.map((b, i) => <label key={b.id} className="k-check"><input type="checkbox" checked={!d.bodies?.length || d.bodies.includes(b.id)} onChange={(e) => { const all = st.rebuild.bodies.map((x) => x.id); const cur = d.bodies?.length ? d.bodies : all; const next = e.target.checked ? [...cur, b.id] : cur.filter((x) => x !== b.id); st.updateFeatureDraft({ bodies: next.length === all.length ? undefined : next }); }} /> {st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? `Body${i + 1}`}</label>) : <div className="k-selbox-row">{st.rebuild.bodies[0] ? 'Solid Body' : '—'}</div>}
            </div>
          </Section>
          <Section title="Options">
            <label className="k-check"><input type="checkbox" data-testid="mirror-merge" checked={d.mergeSolids !== false} onChange={(e) => st.updateFeatureDraft({ mergeSolids: e.target.checked })} /> Merge solids</label>
            <label className="k-check"><input type="checkbox" data-testid="mirror-knit" checked={!!d.knitSurfaces} disabled={!d.faces?.length} onChange={(e) => st.updateFeatureDraft({ knitSurfaces: e.target.checked })} /> Knit surfaces</label>
            <label className="k-check"><input type="checkbox" data-testid="mirror-propagate" checked={d.propagateVisual !== false} onChange={(e) => st.updateFeatureDraft({ propagateVisual: e.target.checked })} /> Propagate visual properties</label>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="mirpreview" checked={(d.previewMode ?? 'full') === 'full'} onChange={() => { st.updateFeatureDraft({ previewMode: 'full' }); if (!st.detailedPreview) st.toggleDetailedPreview(); }} /> Full preview</label>
              <label className="k-check"><input type="radio" name="mirpreview" checked={d.previewMode === 'partial'} onChange={() => { st.updateFeatureDraft({ previewMode: 'partial' }); if (st.detailedPreview) st.toggleDetailedPreview(); }} /> Partial preview</label>
            </div>
          </Section>
          {errBox}
        </>
      );
    }
    if (d.type === 'hole') {
      return (
        <>
          <Header title={d.simple ? 'Hole' : d.advanced ? 'Advanced Hole' : holeTab === 'positions' ? 'Hole Position' : 'Hole Specification'} icon={<Icon.Hole />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
          {d.simple && (
            <Section title="Direction 1" data-testid="simplehole">
              <select className="k-input" value={d.depth > 0 ? 'blind' : 'throughAll'} onChange={(e) => st.updateFeatureDraft({ depth: e.target.value === 'blind' ? 10 : 0 })}><option value="blind">Blind</option><option value="throughAll">Through All</option></select>
              {d.depth > 0 && <div className="k-pm-valuerow k-tip" data-tip="Depth"><Icon.Depth size={16} /><NumberField value={d.depth} onChange={(v) => st.updateFeatureDraft({ depth: Math.max(0.1, v) })} unit={st.doc.units} step={1} min={0.1} /></div>}
              <div className="k-pm-valuerow k-tip" data-tip="Hole Diameter"><span className="k-pm-xy">⌀</span><NumberField value={d.diameter} onChange={(v) => st.updateFeatureDraft({ diameter: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} min={0.1} autoFocus /></div>
              <p className="k-muted">Click the face to place the hole; drag or dimension it afterwards.</p>
            </Section>
          )}
          {d.advanced && (
            <Section title="Far Side" check={!!d.farSide} onCheck={(on) => st.updateFeatureDraft({ farSide: on ? { kind: 'countersink', diameter: 10, depth: 2, angle: 90 } : undefined })}>
              {d.farSide && (
                <div data-testid="adv-farside">
                  <div className="k-pm-stylerow">
                    <button className={`k-pm-stylebtn k-tip ${d.farSide.kind === 'counterbore' ? 'active' : ''}`} data-tip="Counterbore" onClick={() => st.updateFeatureDraft({ farSide: { ...d.farSide!, kind: 'counterbore' } })}><HoleTypeIcon kind="counterbore" /></button>
                    <button className={`k-pm-stylebtn k-tip ${d.farSide.kind === 'countersink' ? 'active' : ''}`} data-tip="Countersink" onClick={() => st.updateFeatureDraft({ farSide: { ...d.farSide!, kind: 'countersink' } })}><HoleTypeIcon kind="countersink" /></button>
                  </div>
                  <div className="k-pm-valuerow k-tip" data-tip="Far Side Diameter"><Icon.Dimension size={14} /><NumberField value={d.farSide.diameter} onChange={(v) => st.updateFeatureDraft({ farSide: { ...d.farSide!, diameter: Math.max(0.1, v) } })} unit={st.doc.units} step={0.5} /></div>
                  {d.farSide.kind === 'counterbore' ? (
                    <div className="k-pm-valuerow k-tip" data-tip="Far Side Depth"><Icon.Arrow size={14} /><NumberField value={d.farSide.depth} onChange={(v) => st.updateFeatureDraft({ farSide: { ...d.farSide!, depth: Math.max(0.1, v) } })} unit={st.doc.units} step={0.5} /></div>
                  ) : (
                    <div className="k-pm-valuerow k-tip" data-tip="Far Side Angle"><Icon.MateAngle size={14} /><NumberField value={d.farSide.angle} onChange={(v) => st.updateFeatureDraft({ farSide: { ...d.farSide!, angle: Math.max(10, Math.min(170, v)) } })} unit="°" step={1} /></div>
                  )}
                </div>
              )}
            </Section>
          )}
          <div className="k-pm-tabs">
            <button className={holeTab === 'type' ? 'active' : ''} onClick={() => setHoleTab('type')}>Type</button>
            <button className={holeTab === 'positions' ? 'active' : ''} onClick={() => setHoleTab('positions')}>Positions</button>
          </div>
          {holeTab === 'type' && !d.simple && (<>
          <Section title="Hole Type">
            <div className="k-holetypes" data-testid="hole-types">
              {HOLE_TYPES.map((t) => (
                <button key={t.id} className={`k-pm-typebtn k-tip ${d.holeType === t.id ? 'active' : ''}`} data-tip={t.label} disabled={!t.enabled} onClick={() => { if (!t.enabled) return; const sz = holeSizesFor(holeStd).find((h) => h.size === holeSize); st.updateFeatureDraft(t.id === 'tap' && sz ? { holeType: 'tap', diameter: sz.tap, threadDiameter: Number(sz.size.slice(1)), pitch: sz.pitch, sizeName: sz.size } : { holeType: t.id as 'simple', ...(sz ? { diameter: sz.fit[holeFit] } : {}) }); }}><HoleTypeIcon kind={t.id} /></button>
              ))}
            </div>
            <div className="k-pm-label">Standard:</div>
            <select className="k-input" data-testid="hole-standard" value={holeStd} onChange={(e) => { const std = e.target.value; setHoleStd(std); const first = holeSizesFor(std)[0]; setHoleSize(std === 'ANSI Inch' ? first.size : 'M6'); const sz = holeSizesFor(std).find((h) => h.size === (std === 'ANSI Inch' ? first.size : 'M6')); if (sz) st.updateFeatureDraft({ diameter: sz.fit[holeFit], cbDiameter: sz.cb, cbDepth: sz.cbDepth, csDiameter: sz.cs, sizeName: sz.size }); }}><option>ISO</option><option>ANSI Metric</option><option>ANSI Inch</option><option>DIN</option><option>JIS</option></select>
            <div className="k-pm-label">Type:</div>
            <select className="k-input" data-testid="hole-subtype" value={d.holeSubtype ?? (d.holeType === 'tap' ? 'Tapped hole' : d.holeType === 'simple' ? 'Drill sizes' : d.holeType === 'countersink' ? 'Flat Head Screw - ISO 10642' : 'Socket Head Cap Screw - ISO 4762')} onChange={(e) => st.updateFeatureDraft(holeSubtypePatch(e.target.value, HOLE_SIZES.find((h) => h.size === holeSize), holeFit, d))}>
              {(d.holeType === 'tap' ? ['Tapped hole', 'Bottoming tapped hole'] : d.holeType === 'simple' ? ['Drill sizes', 'Screw Clearances', 'Tap Drills', 'Dowel Holes'] : d.holeType === 'countersink' ? ['Flat Head Screw - ISO 10642', 'Raised Countersunk Head - ISO 2010', 'Countersunk Head - ISO 7046'] : ['Hex Bolt - ISO 4014', 'Socket Head Cap Screw - ISO 4762', 'Pan Cross Head - ISO 7045', 'Hex Screw - ISO 4017']).map((o) => <option key={o} value={o}>{holeStd === 'ANSI Metric' ? ANSI_METRIC_NAMES[o] ?? o : o}</option>)}
            </select>
          </Section>
          <Section title="Hole Specifications">
            <div className="k-pm-label">Size:</div>
            <div><select className="k-input" data-testid="hole-size" value={holeSize} onChange={(e) => { setHoleSize(e.target.value); const sz = holeSizesFor(holeStd).find((h) => h.size === e.target.value); if (sz) st.updateFeatureDraft(d.holeType === 'tap' ? { diameter: sz.tap, threadDiameter: Number(sz.size.slice(1)), pitch: sz.pitch, sizeName: sz.size } : { diameter: sz.fit[holeFit], cbDiameter: sz.cb, cbDepth: sz.cbDepth, csDiameter: sz.cs, sizeName: sz.size }); }}>{holeSizesFor(holeStd).map((h) => <option key={h.size}>{h.size}</option>)}</select></div>
            <div className="k-pm-label">Fit:</div>
            <div><select className="k-input" value={holeFit} onChange={(e) => { const f = e.target.value as 'Close' | 'Normal' | 'Loose'; setHoleFit(f); const sz = holeSizesFor(holeStd).find((h) => h.size === holeSize); if (sz) st.updateFeatureDraft({ diameter: sz.fit[f] }); }}><option>Close</option><option>Normal</option><option>Loose</option></select></div>
            <label className="k-check"><input type="checkbox" checked={customSizing} onChange={(e) => setCustomSizing(e.target.checked)} /> Show custom sizing</label>
            {customSizing && <div className="k-pm-valuerow k-tip" data-tip="Through Hole Diameter"><Icon.Hole size={14} /><NumberField value={d.diameter} onChange={(v) => st.updateFeatureDraft({ diameter: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>}
            {customSizing && d.holeType === 'counterbore' && (
              <>
                <div className="k-pm-valuerow k-tip" data-tip="Counterbore Diameter"><Icon.Dimension size={14} /><NumberField value={d.cbDiameter} onChange={(v) => st.updateFeatureDraft({ cbDiameter: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>
                <div className="k-pm-valuerow k-tip" data-tip="Counterbore Depth"><Icon.Arrow size={14} /><NumberField value={d.cbDepth} onChange={(v) => st.updateFeatureDraft({ cbDepth: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>
              </>
            )}
            {customSizing && d.holeType === 'countersink' && (
              <>
                <div className="k-pm-valuerow k-tip" data-tip="Countersink Diameter"><Icon.Dimension size={14} /><NumberField value={d.csDiameter} onChange={(v) => st.updateFeatureDraft({ csDiameter: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>
                <div className="k-pm-valuerow k-tip" data-tip="Countersink Angle"><Icon.MateAngle size={14} /><NumberField value={d.csAngle} onChange={(v) => st.updateFeatureDraft({ csAngle: Math.max(10, Math.min(170, v)) })} unit="°" step={1} /></div>
              </>
            )}
            {customSizing && <button className="k-btn" style={{ marginTop: 4 }} onClick={() => { const sz = holeSizesFor(holeStd).find((h) => h.size === holeSize); if (sz) st.updateFeatureDraft({ diameter: sz.fit[holeFit], cbDiameter: sz.cb, cbDepth: sz.cbDepth, csDiameter: sz.cs, csAngle: 90 }); }}>Restore Default Values</button>}
          </Section>
          <Section title="End Condition">
            <div className="k-pm-valuerow">
              <Icon.Arrow size={14} />
              <select className="k-input" value={d.depth > 0 ? 'blind' : 'throughAll'} onChange={(e) => st.updateFeatureDraft({ depth: e.target.value === 'blind' ? 10 : 0 })}>
                <option value="throughAll">Through All</option>
                <option value="blind">Blind</option>
              </select>
            </div>
            {d.depth > 0 && <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.depth} onChange={(v) => st.updateFeatureDraft({ depth: Math.max(0.1, v) })} unit={st.doc.units} step={1} /></div>}
          </Section>
          <Section title="Options">
            {d.holeType === 'tap' && <label className="k-check"><input type="checkbox" checked={d.cosmeticThread !== false} onChange={(e) => st.updateFeatureDraft({ cosmeticThread: e.target.checked })} /> Cosmetic thread</label>}
            {d.holeType === 'tap' && <label className="k-check"><input type="checkbox" checked={d.threadCallout !== false} onChange={(e) => st.updateFeatureDraft({ threadCallout: e.target.checked })} /> With thread callout</label>}
            {d.holeType === 'counterbore' && <label className="k-check"><input type="checkbox" data-testid="hole-headclear" checked={d.headClearance !== undefined} onChange={(e) => st.updateFeatureDraft({ headClearance: e.target.checked ? 1 : undefined })} /> Head clearance</label>}
            {d.headClearance !== undefined && d.holeType === 'counterbore' && <div className="k-pm-valuerow k-tip" data-tip="Head clearance"><Icon.Dimension size={14} /><NumberField value={d.headClearance} onChange={(v) => st.updateFeatureDraft({ headClearance: Math.max(0, v) })} unit={st.doc.units} step={0.5} /></div>}
            {d.holeType !== 'countersink' && <label className="k-check"><input type="checkbox" data-testid="hole-nearcs" checked={!!d.nearCs} onChange={(e) => st.updateFeatureDraft({ nearCs: e.target.checked ? { diameter: (d.holeType === 'counterbore' ? d.cbDiameter : d.diameter) + 1, angle: 90 } : undefined })} /> Near side countersink</label>}
            {d.nearCs && (
              <div className="k-pm-xyrow"><span className="k-pm-xy">⌀</span><NumberField value={d.nearCs.diameter} onChange={(v) => st.updateFeatureDraft({ nearCs: { ...d.nearCs!, diameter: Math.max(0.1, v) } })} unit={st.doc.units} step={0.5} /><span className="k-pm-xy">∠</span><NumberField value={d.nearCs.angle} onChange={(v) => st.updateFeatureDraft({ nearCs: { ...d.nearCs!, angle: Math.max(10, Math.min(170, v)) } })} unit="°" step={5} /></div>
            )}
            {d.holeType === 'counterbore' && <label className="k-check"><input type="checkbox" data-testid="hole-underhead" checked={!!d.underHeadCs} onChange={(e) => st.updateFeatureDraft({ underHeadCs: e.target.checked ? { diameter: d.diameter + 1, angle: 90 } : undefined })} /> Under head countersink</label>}
            {d.underHeadCs && d.holeType === 'counterbore' && (
              <div className="k-pm-xyrow"><span className="k-pm-xy">⌀</span><NumberField value={d.underHeadCs.diameter} onChange={(v) => st.updateFeatureDraft({ underHeadCs: { ...d.underHeadCs!, diameter: Math.max(0.1, v) } })} unit={st.doc.units} step={0.5} /><span className="k-pm-xy">∠</span><NumberField value={d.underHeadCs.angle} onChange={(v) => st.updateFeatureDraft({ underHeadCs: { ...d.underHeadCs!, angle: Math.max(10, Math.min(170, v)) } })} unit="°" step={5} /></div>
            )}
            <label className="k-check"><input type="checkbox" data-testid="hole-farcs" checked={!!d.farCs} onChange={(e) => st.updateFeatureDraft({ farCs: e.target.checked ? { diameter: d.diameter + 1, angle: 90 } : undefined })} /> Far side countersink</label>
            {d.farCs && (
              <div className="k-pm-xyrow"><span className="k-pm-xy">⌀</span><NumberField value={d.farCs.diameter} onChange={(v) => st.updateFeatureDraft({ farCs: { ...d.farCs!, diameter: Math.max(0.1, v) } })} unit={st.doc.units} step={0.5} /><span className="k-pm-xy">∠</span><NumberField value={d.farCs.angle} onChange={(v) => st.updateFeatureDraft({ farCs: { ...d.farCs!, angle: Math.max(10, Math.min(170, v)) } })} unit="°" step={5} /></div>
            )}
          </Section>
          </>)}
          {holeTab === 'positions' && (
          <Section title="Hole Position(s)">
            {!d.plane ? (
              <p className="k-pm-message">Select a planar face first, then click Hole Tool.</p>
            ) : d.points.length === 0 ? (
              <p className="k-pm-message">Click on the face to position the hole. Click on the 'Type' tab to define the hole specification and size.</p>
            ) : (
              <ul className="k-list k-pm-edgelist">
                {d.points.map((pt, i) => <li key={i}>Point{i + 1}: {pt.x.toFixed(2)}, {pt.y.toFixed(2)}</li>)}
              </ul>
            )}
            {d.points.length > 0 && <Button onClick={() => st.updateFeatureDraft({ points: [] })}>Clear positions</Button>}
          </Section>
          )}
          {errBox}
        </>
      );
    }
    const isLinear = d.type === 'linearPattern';
    // the seed's sketch: its points (Selected point) and dimensions (Instances to Vary)
    const seedSketch = () => { const f = st.doc.features.find((x) => x.id === d.featureIds[0]) as { sketchId?: string } | undefined; return f?.sketchId ? st.doc.sketches[f.sketchId] : undefined; };
    const seedPoints = () => {
      const sk = seedSketch();
      if (!sk) return [] as { label: string; w: [number, number, number] }[];
      const pl = resolvePlaneDef(st.doc, sk.plane);
      return Object.entries(sk.points).filter(([id]) => id !== sk.origin).map(([, p], i) => ({ label: `Point${i + 1} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`, w: [0, 1, 2].map((k) => pl.origin[k] + pl.u[k] * p.x + pl.v[k] * p.y) as [number, number, number] }));
    };
    const seedDims = () => { const sk = seedSketch(); return sk ? sk.constraintOrder.map((id) => sk.constraints[id]).filter((c) => c && c.value !== undefined && !c.driven) : []; };
    return (
      <>
        <Header title={({ sketchPattern: 'Sketch Driven Pattern', curvePattern: 'Curve Driven Pattern', tablePattern: 'Table Driven Pattern', fillPattern: 'Fill Pattern', variablePattern: 'Variable Pattern', linearPattern: 'Linear Pattern', circularPattern: 'Circular Pattern' } as Record<string, string>)[d.type] ?? d.name} icon={<Icon.Pattern />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {(() => {
          // more instances than the limit: say so instead of cutting the pattern off silently (F81)
          const n = d.type === 'linearPattern' ? Math.max(1, d.dir1?.count ?? 1) * Math.max(1, d.dir2?.count ?? 1) - 1 : d.type === 'circularPattern' ? Math.max(1, d.count ?? 1) - 1 : 0;
          return n > MAX_PATTERN_INSTANCES ? <p className="k-pm-message warn" data-testid="pattern-limit">{n} instances requested: the maximum is {MAX_PATTERN_INSTANCES}. Lower the counts; OK is refused above the limit.</p> : null;
        })()}
        {d.type === 'curvePattern' ? (
          <Section title="Direction 1">
            <div className="k-field"><label>Pattern Direction (curve)</label>
              <select className="k-input" data-testid="crv-sketch" value={d.curve?.sketchId ?? ''} onChange={(e) => st.updateFeatureDraft({ curve: { ...d.curve!, sketchId: e.target.value } })}>
                <option value="">Select a sketch…</option>
                {st.doc.features.filter((f) => f.type === 'sketch').map((f) => <option key={f.id} value={(f as { sketchId: string }).sketchId}>{f.name}</option>)}
              </select>
            </div>
            <div className="k-pm-valuerow"><button className={`k-pm-stylebtn k-tip ${d.curve?.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ curve: { ...d.curve!, reverse: !d.curve?.reverse } })}><Icon.ReverseDir size={16} /></button></div>
            <div className="k-field"><label>Number of Instances</label><NumberField value={d.curve?.count ?? 4} onChange={(v) => st.updateFeatureDraft({ curve: { ...d.curve!, count: Math.max(1, Math.min(200, Math.round(v))) } })} step={1} min={1} /></div>
            <label className="k-check"><input type="checkbox" checked={!!d.curve?.equal} onChange={(e) => st.updateFeatureDraft({ curve: { ...d.curve!, equal: e.target.checked } })} /> Equal spacing</label>
            {!d.curve?.equal && <div className="k-field"><label>Spacing</label><NumberField value={d.curve?.spacing ?? 20} onChange={(v) => st.updateFeatureDraft({ curve: { ...d.curve!, spacing: Math.max(0.1, v) } })} unit={st.doc.units} step={1} /></div>}
            <div className="k-pm-sub">Curve method / Alignment method</div>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="crvalign" checked={!d.curve?.tangent} onChange={() => st.updateFeatureDraft({ curve: { ...d.curve!, tangent: false } })} /> Transform curve (align to seed)</label>
              <label className="k-check"><input type="radio" name="crvalign" checked={!!d.curve?.tangent} onChange={() => st.updateFeatureDraft({ curve: { ...d.curve!, tangent: true } })} /> Tangent to curve</label>
            </div>
          </Section>
        ) : d.type === 'tablePattern' ? (
          <Section title="Table">
            <div className="k-field"><label>Coordinate system</label>
              <select className="k-input" value={d.csysId ?? ''} onChange={(e) => st.updateFeatureDraft({ csysId: e.target.value || undefined })}>
                <option value="">Sketch plane of the seed</option>
                {(st.doc.refGeometry ?? []).filter((r) => r.kind === 'csys').map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <table className="k-pm-table" data-testid="tpattern-table">
              <thead><tr><th>Point</th><th>X</th><th>Y</th><th /></tr></thead>
              <tbody>
                <tr><td>0</td><td className="k-muted">0</td><td className="k-muted">0</td><td /></tr>
                {(d.table ?? []).map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td><NumberField value={r.x} onChange={(v) => st.updateFeatureDraft({ table: d.table!.map((q, j) => (j === i ? { ...q, x: v } : q)) })} step={1} /></td>
                    <td><NumberField value={r.y} onChange={(v) => st.updateFeatureDraft({ table: d.table!.map((q, j) => (j === i ? { ...q, y: v } : q)) })} step={1} /></td>
                    <td><button className="k-btn ghost icon" title="Delete row" onClick={() => st.updateFeatureDraft({ table: d.table!.filter((_, j) => j !== i) })}><Icon.Trash size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button data-testid="tpattern-add" onClick={() => { const last = d.table?.[d.table.length - 1] ?? { x: 0, y: 0 }; st.updateFeatureDraft({ table: [...(d.table ?? []), { x: last.x + 20, y: last.y }] }); }}>Add point</Button>
          </Section>
        ) : d.type === 'fillPattern' ? (
          <>
            <Section title="Fill Boundary">
              <div className="k-selbox" style={{ minHeight: 24 }} data-testid="fill-face">{d.fill ? <div className="k-selbox-row"><Icon.Sheet size={12} /> {d.fill.label}</div> : <span className="k-muted">Select a planar face, then start Fill Pattern again.</span>}</div>
            </Section>
            {d.fill && (
              <Section title="Pattern Layout">
                <div className="k-pm-stylerow">
                  <button className={`k-pm-stylebtn k-tip ${d.fill.layout === 'hex' ? 'active' : ''}`} data-tip="Perforation" onClick={() => st.updateFeatureDraft({ fill: { ...d.fill!, layout: 'hex' } })}>⬡</button>
                  <button className={`k-pm-stylebtn k-tip ${d.fill.layout === 'circular' ? 'active' : ''}`} data-tip="Circular" data-testid="fill-circular" onClick={() => st.updateFeatureDraft({ fill: { ...d.fill!, layout: 'circular' } })}><Icon.Circle size={14} /></button>
                  <button className={`k-pm-stylebtn k-tip ${d.fill.layout === 'square' ? 'active' : ''}`} data-tip="Square" onClick={() => st.updateFeatureDraft({ fill: { ...d.fill!, layout: 'square' } })}>▦</button>
                  <button className={`k-pm-stylebtn k-tip ${d.fill.layout === 'polygon' ? 'active' : ''}`} data-tip="Polygon" data-testid="fill-polygon" onClick={() => st.updateFeatureDraft({ fill: { ...d.fill!, layout: 'polygon', sides: d.fill!.sides ?? 6 } })}><Icon.Polygon size={14} /></button>
                </div>
                <div className="k-field"><label>Instance Spacing</label><NumberField value={d.fill.spacing} onChange={(v) => st.updateFeatureDraft({ fill: { ...d.fill!, spacing: Math.max(0.5, v) } })} unit={st.doc.units} step={1} /></div>
                <div className="k-field"><label>Margins</label><NumberField value={d.fill.margin} onChange={(v) => st.updateFeatureDraft({ fill: { ...d.fill!, margin: Math.max(0, v) } })} unit={st.doc.units} step={0.5} /></div>
                {d.fill.layout === 'polygon' && <div className="k-field"><label>Polygon sides</label><NumberField value={d.fill.sides ?? 6} onChange={(v) => st.updateFeatureDraft({ fill: { ...d.fill!, sides: Math.max(3, Math.round(v)) } })} step={1} min={3} /></div>}
                <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
                  <button className="k-btn" data-testid="fill-validate" onClick={() => st.pushMessage(`The pattern makes ${st.rebuild.bodies.length ? (st.rebuild.errors[d.id] ? 0 : (st.doc.features.find((x) => x.id === d.id) ? 'the shown' : 'the previewed')) : 0} instances; see the preview.`, 'info')}>Validate Count</button>
                </div>
              </Section>
            )}
          </>
        ) : d.type === 'variablePattern' ? (
          <Section title="Pattern Table">
            <select className="k-input" value={axisId(d.variable?.dir ?? [1, 0, 0])} onChange={(e) => st.updateFeatureDraft({ variable: { ...d.variable!, dir: axisOptions.find((o) => o.id === e.target.value)!.v } })}>
              {axisOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            {(() => {
              const seed = st.doc.features.find((f) => f.id === d.featureIds[0]) as { sketchId?: string } | undefined;
              const sk = seed?.sketchId ? st.doc.sketches[seed.sketchId] : undefined;
              const dims = sk ? sk.constraintOrder.map((id) => sk.constraints[id]).filter((c) => c && c.value !== undefined && !c.driven) : [];
              return (
                <>
                  <table className="k-pm-table" data-testid="varpattern-table">
                    <thead><tr><th>#</th><th>Offset</th>{dims.map((c, i) => <th key={c.id}>D{i + 1}</th>)}</tr></thead>
                    <tbody>
                      {(d.variable?.rows ?? []).map((r, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td><NumberField value={r.offset} onChange={(v) => st.updateFeatureDraft({ variable: { ...d.variable!, rows: d.variable!.rows.map((q, j) => (j === i ? { ...q, offset: v } : q)) } })} step={1} /></td>
                          {dims.map((c) => <td key={c.id}><NumberField value={r.values[c.id] ?? c.value!} onChange={(v) => st.updateFeatureDraft({ variable: { ...d.variable!, rows: d.variable!.rows.map((q, j) => (j === i ? { ...q, values: { ...q.values, [c.id]: v } } : q)) } })} step={1} /></td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Button data-testid="varpattern-add" onClick={() => { const rows = d.variable?.rows ?? []; const last = rows[rows.length - 1]; st.updateFeatureDraft({ variable: { ...d.variable!, rows: [...rows, { offset: (last?.offset ?? 0) + 25, values: { ...(last?.values ?? {}) } }] } }); }}>Add Instance</Button>
                  {!dims.length && <p className="k-muted">The seed sketch has no dimensions to vary; instances are copies.</p>}
                </>
              );
            })()}
          </Section>
        ) : d.type === 'sketchPattern' ? (
          <Section title="Selections">
            <div className="k-field"><label>Reference Sketch</label>
              <select className="k-input" value={d.sketchId ?? ''} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="skpattern-sketch">
                <option value="">Select a sketch…</option>
                {st.doc.features.filter((f) => f.type === 'sketch').map((f) => <option key={f.id} value={(f as { sketchId: string }).sketchId}>{f.name}</option>)}
              </select>
            </div>
            <div className="k-pm-sub">Reference point</div>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="skpref" checked={!d.refPoint} onChange={() => st.updateFeatureDraft({ refPoint: null })} /> Centroid</label>
              <label className="k-check"><input type="radio" name="skpref" data-testid="skpattern-selpoint" checked={!!d.refPoint} onChange={() => { const pts = seedPoints(); if (pts.length) st.updateFeatureDraft({ refPoint: pts[0].w }); }} /> Selected point</label>
            </div>
            {d.refPoint && (
              <select className="k-input" data-testid="skpattern-point" value={seedPoints().findIndex((p) => p.w.every((x, i) => Math.abs(x - d.refPoint![i]) < 1e-6))} onChange={(e) => st.updateFeatureDraft({ refPoint: seedPoints()[Number(e.target.value)].w })}>
                {seedPoints().map((p, i) => <option key={i} value={i}>{p.label}</option>)}
              </select>
            )}
          </Section>
        ) : isLinear ? (
          <>
            <Section title="Direction 1">
              <select className="k-input" value={axisId(d.dir1?.axis ?? [1, 0, 0])} onChange={(e) => st.updateFeatureDraft({ dir1: { ...(d.dir1 ?? { spacing: 20, count: 3 }), axis: axisOptions.find((o) => o.id === e.target.value)!.v } })}>
                {axisOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <div className="k-pm-valuerow"><button className={`k-pm-stylebtn k-tip ${(d.dir1?.axis[0] ?? 1) + (d.dir1?.axis[1] ?? 0) + (d.dir1?.axis[2] ?? 0) < 0 ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ dir1: { ...d.dir1!, axis: d.dir1!.axis.map((x) => -x) as [number, number, number] } })}><Icon.ReverseDir size={16} /></button><span className="k-muted">Spacing and instances</span></div>
              <div className="k-pm-radios">
                <label className="k-check"><input type="radio" name="lpmode" checked={!d.upTo1} onChange={() => st.updateFeatureDraft({ upTo1: undefined })} /> Spacing and instances</label>
                <label className="k-check"><input type="radio" name="lpmode" data-testid="lpattern-upto" checked={!!d.upTo1} onChange={() => st.updateFeatureDraft({ upTo1: { plane: 'right', offset: 0 } })} /> Up to reference</label>
              </div>
              {d.upTo1 && (
                <>
                  <div className="k-field"><label>Reference</label>
                    <select className="k-input" data-testid="lpattern-ref" value={d.upTo1.plane} onChange={(e) => st.updateFeatureDraft({ upTo1: { ...d.upTo1!, plane: e.target.value } })}>
                      <option value="front">Front Plane</option><option value="top">Top Plane</option><option value="right">Right Plane</option>
                      {Object.values(st.doc.planes).filter((p) => p.kind === 'reference').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="k-field"><label>Offset distance</label><NumberField value={d.upTo1.offset} onChange={(v) => st.updateFeatureDraft({ upTo1: { ...d.upTo1!, offset: v } })} unit={st.doc.units} step={1} /></div>
                </>
              )}
              {!d.upTo1 && <div className="k-field"><label>Spacing</label><NumberField value={d.dir1?.spacing ?? 20} onChange={(v) => st.updateFeatureDraft({ dir1: { ...d.dir1!, spacing: Math.max(0.1, v) } })} unit={st.doc.units} step={1} /></div>}
              <div className="k-field"><label>Instances</label><NumberField value={d.dir1?.count ?? 3} onChange={(v) => st.updateFeatureDraft({ dir1: { ...d.dir1!, count: Math.max(1, Math.min(200, Math.round(v))) } })} step={1} min={1} /></div>
            </Section>
            <Section title="Direction 2" defaultOpen={!!d.dir2} check={!!d.dir2} onCheck={(on) => st.updateFeatureDraft({ dir2: on ? { axis: [0, 0, 1], spacing: 20, count: 2 } : undefined })}>
              {d.dir2 && (
                <>
                  <select className="k-input" value={axisId(d.dir2.axis)} onChange={(e) => st.updateFeatureDraft({ dir2: { ...d.dir2!, axis: axisOptions.find((o) => o.id === e.target.value)!.v } })}>
                    {axisOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  <div className="k-field"><label>Spacing</label><NumberField value={d.dir2.spacing} onChange={(v) => st.updateFeatureDraft({ dir2: { ...d.dir2!, spacing: Math.max(0.1, v) } })} unit={st.doc.units} step={1} /></div>
                  <div className="k-field"><label>Instances</label><NumberField value={d.dir2.count} onChange={(v) => st.updateFeatureDraft({ dir2: { ...d.dir2!, count: Math.max(1, Math.min(200, Math.round(v))) } })} step={1} min={1} /></div>
                </>
              )}
              <label className="k-check"><input type="checkbox" data-testid="pattern-seedonly" checked={!!d.seedOnly} onChange={(e) => st.updateFeatureDraft({ seedOnly: e.target.checked })} /> Pattern seed only</label>
        </Section>
          </>
        ) : (
          <Section title="Direction 1">
            <select className="k-input" value={axisId(d.axis?.dir ?? [0, 1, 0])} onChange={(e) => st.updateFeatureDraft({ axis: { origin: d.axis?.origin ?? [0, 0, 0], dir: axisOptions.find((o) => o.id === e.target.value)!.v } })}>
              {axisOptions.map((o) => <option key={o.id} value={o.id}>{o.label} (through the origin)</option>)}
            </select>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="cpspacing" data-testid="cpattern-instance" checked={!!d.instanceSpacing} onChange={() => st.updateFeatureDraft({ instanceSpacing: true, angle: Math.min(d.angle ?? 360, 360 / Math.max(1, (d.count ?? 4))) })} /> Instance spacing</label>
              <label className="k-check"><input type="radio" name="cpspacing" checked={!d.instanceSpacing} onChange={() => st.updateFeatureDraft({ instanceSpacing: false, angle: 360 })} /> Equal spacing</label>
            </div>
            <div className="k-field"><label>Angle</label><NumberField value={d.angle ?? 360} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(1, Math.min(360, v)) })} unit="°" step={5} /></div>
            <div className="k-field"><label>Instances</label><NumberField value={d.count ?? 4} onChange={(v) => st.updateFeatureDraft({ count: Math.max(1, Math.min(360, Math.round(v))) })} step={1} min={1} /></div>
          </Section>
        )}
        <Section title="Features and Faces">
          {/* Fill Pattern: the selected features or a seed cut made by the pattern itself, by design */}
          {d.type === 'fillPattern' && d.fill && (
            <>
              <div className="k-pm-radios">
                <label className="k-check"><input type="radio" name="fillseed" checked={d.fill.seedCut === undefined} onChange={() => st.updateFeatureDraft({ fill: { ...d.fill!, seedCut: undefined } })} /> Selected features</label>
                <label className="k-check"><input type="radio" name="fillseed" data-testid="fill-seedcut" checked={d.fill.seedCut !== undefined} onChange={() => st.updateFeatureDraft({ fill: { ...d.fill!, seedCut: 3 } })} /> Create seed cut</label>
              </div>
              {d.fill.seedCut !== undefined && <div className="k-pm-valuerow k-tip" data-tip="Seed cut diameter"><Icon.Circle size={14} /><NumberField value={d.fill.seedCut} onChange={(v) => st.updateFeatureDraft({ fill: { ...d.fill!, seedCut: Math.max(0.1, v) } })} unit={st.doc.units} step={0.5} min={0.1} /></div>}
            </>
          )}
          {d.type === 'fillPattern' && d.fill?.seedCut !== undefined ? null : seedFeatures.length === 0 ? (
            <p className="k-pm-message">No extrude or revolve features yet.</p>
          ) : (
            <div className="k-pm-addrel">
              {seedFeatures.map((f) => (
                <label key={f.id} className="k-check">
                  <input type="checkbox" checked={d.featureIds.includes(f.id)} onChange={(e) => st.updateFeatureDraft({ featureIds: e.target.checked ? [...d.featureIds, f.id] : d.featureIds.filter((x) => x !== f.id) })} /> {f.name}
                </label>
              ))}
            </div>
          )}
          <div className="k-field" style={{ marginTop: 4 }}><label>Faces to Pattern</label>
            <div className="k-selbox" style={{ minHeight: 24 }} data-testid="pattern-faces" title="Click faces in the graphics area: the feature that made them is patterned">
              {d.featureIds.map((id) => st.doc.features.find((f) => f.id === id)).filter(Boolean).map((f) => <div key={f!.id} className="k-selbox-row"><Icon.Properties size={12} /> Faces of {f!.name}</div>)}
            </div>
          </div>
        </Section>
        <Section title="Bodies" defaultOpen={(d.bodies ?? []).length > 0}>
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="pattern-bodies">
            {st.rebuild.bodies.map((b, i) => (
              <label key={b.id} className="k-check"><input type="checkbox" checked={(d.bodies ?? []).includes(b.id)} onChange={(e) => st.updateFeatureDraft({ bodies: e.target.checked ? [...(d.bodies ?? []), b.id] : (d.bodies ?? []).filter((x) => x !== b.id) })} /> {st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? `Body ${i + 1}`}</label>
            ))}
          </div>
        </Section>
        <Section title="Instances to Skip">
          <div className="k-selbox" style={{ minHeight: 40 }}>
            {(d.skip ?? []).length ? (d.skip ?? []).map((i) => <div key={i} className="k-selbox-row" onClick={() => st.togglePatternSkip(i)} title="Click to restore">({i + 2})</div>) : <span className="k-muted">Click the instance markers in the graphics area to skip instances.</span>}
          </div>
        </Section>
        <Section title="Options">
          {isLinear && <label className="k-check"><input type="checkbox" data-testid="pattern-varysketch" checked={!!d.varySketch} onChange={(e) => st.updateFeatureDraft({ varySketch: e.target.checked })} /> Vary sketch</label>}
          <label className="k-check"><input type="checkbox" data-testid="pattern-geometry" checked={!!d.geometryPattern} onChange={(e) => st.updateFeatureDraft({ geometryPattern: e.target.checked })} /> Geometry pattern</label>
          <label className="k-check"><input type="checkbox" checked={d.propagateVisual !== false} onChange={(e) => st.updateFeatureDraft({ propagateVisual: e.target.checked })} /> Propagate visual properties</label>
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="ppreview" checked={!d.partialPreview} onChange={() => st.updateFeatureDraft({ partialPreview: false })} /> Full preview</label>
            <label className="k-check"><input type="radio" name="ppreview" checked={!!d.partialPreview} onChange={() => st.updateFeatureDraft({ partialPreview: true })} /> Partial preview</label>
          </div>
        </Section>
        {isLinear && (
          <Section title="Instances to Vary" defaultOpen={(d.varyDims ?? []).length > 0} check={(d.varyDims ?? []).length > 0} onCheck={(on) => st.updateFeatureDraft({ varyDims: on ? seedDims().slice(0, 1).map((c) => ({ constraintId: c.id, increment: 1 })) : [] })}>
            {seedDims().length ? seedDims().map((c, i) => {
              const vd = (d.varyDims ?? []).find((x) => x.constraintId === c.id);
              return (
                <div key={c.id} className="k-pm-valuerow" data-testid="pattern-varydim">
                  <label className="k-check" style={{ minWidth: 70 }}><input type="checkbox" checked={!!vd} onChange={(e) => st.updateFeatureDraft({ varyDims: e.target.checked ? [...(d.varyDims ?? []), { constraintId: c.id, increment: 1 }] : (d.varyDims ?? []).filter((x) => x.constraintId !== c.id) })} /> D{i + 1} ({c.value})</label>
                  <NumberField value={vd?.increment ?? 1} onChange={(v) => st.updateFeatureDraft({ varyDims: (d.varyDims ?? []).map((x) => (x.constraintId === c.id ? { ...x, increment: v } : x)) })} unit={st.doc.units} step={0.5} disabled={!vd} blankWhenDisabled={false} />
                </div>
              );
            }) : <p className="k-muted">The seed sketch has no dimensions to vary.</p>}
            <div className="k-pm-label" style={{ marginTop: 6 }}>Modified Instances:</div>
            <div className="k-selbox" style={{ minHeight: 28 }} data-testid="pattern-modified">
              {(d.modified ?? []).length ? (d.modified ?? []).map((m, k) => (
                <div key={k} className="k-pm-xyrow">
                  <span className="k-pm-xy">({m.i + 1},{m.j + 1})</span>
                  <NumberField value={m.dx ?? 0} onChange={(v) => st.updateFeatureDraft({ modified: d.modified!.map((x, q) => (q === k ? { ...x, dx: v } : x)) })} unit={st.doc.units} step={1} />
                  <NumberField value={m.dy ?? 0} onChange={(v) => st.updateFeatureDraft({ modified: d.modified!.map((x, q) => (q === k ? { ...x, dy: v } : x)) })} unit={st.doc.units} step={1} />
                  <button className="k-btn ghost icon" onClick={() => st.updateFeatureDraft({ modified: d.modified!.filter((_, q) => q !== k) })}>×</button>
                </div>
              )) : <span className="k-muted">Click an instance in the graphics area to move it on its own.</span>}
            </div>
          </Section>
        )}
        {errBox}
      </>
    );
  }
  return NEXT;
}
