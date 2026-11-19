import './print.css';
/**
 * The Property Panel of the 3D Print tab (docs/34 4.2): tabs Settings and Preview, collapsible groups Printer ·
 * Filament · Quality · Strength · Speed · Support · Others · Machine G-code, and the parts on the plate in tree style.
 * Every change updates the plate and marks a slice as out of date.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { NumberField, Section } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { useStore } from '../store';
import { PrintIcon } from './printIcons';
import { canWriteMultiMaterial, fdmPrinters, isAnnounced, isDiscontinued, layerHeightsFor, printerName } from '../../print/database';
import { insideVolume, worldBounds } from '../../print/plate';
import { type InfillPattern, type LineType, type ProcessSettings, type SeamPosition, type SupportKind } from '../../print/types';
import { NOT_PRINTED } from '../../print/gcode/dialects';
import {
  addSlot, beginSession, cancelSession, clearBambuProfile, currentPrinter, currentProcess, deletePlate, fmtTime, importBambuProfile, isStale, moveSelectedToPlate, okSession,
  patchProcess, placeSelected, removeSelected, removeSlot, resetProcess, rotateSelected, selectedCentre, selectItem, setItemFilament, setNozzle, setPlateIndex, setPreset,
  setPrinter, setSlot, undoPlate, usePrint, type ColorBy,
} from './printStore';
import { sameModel } from '../../print/gcode/importTemplate';
import { LINE_COLORS, legendRows } from './previewColors';
import { ResinFacts, ResinPreview, ResinSections } from './ResinPM';
import { resinStale, useResin } from './resinStore';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="k-pm-valuerow k-print-row"><span className="k-print-label">{label}</span>{children}</div>;
}

export function PrintPM() {
  const s = usePrint(useShallow((x) => x));
  const setTab = useStore((x) => x.setTab);
  const r = useResin(useShallow((x) => ({ result: x.result, overrides: x.overrides, resinId: x.resinId, layerHeight: x.layerHeight })));
  const kind = useStore((x) => x.doc.kind);
  const printer = currentPrinter(s);
  const proc = currentProcess(s);
  const [filter, setFilter] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  // FDM printers first, then the resin printers
  const printers = useMemo(() => (s.db ? [...fdmPrinters(s.db), ...s.db.printers.filter((p) => p.technology === 'resin')] : []), [s.db]);
  const setTabRef = useRef(setTab);
  setTabRef.current = setTab;
  // the tab works as a command: the state when it opened; OK keeps the changes, Cancel and Esc go back (docs/35 P3-9)
  useEffect(() => {
    beginSession();
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || (e.target as HTMLElement)?.closest?.('input, select, textarea') || useStore.getState().ask) return;
      cancelSession();
      setTabRef.current(useStore.getState().doc.kind === 'assembly' ? 'assembly' : 'features');
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  if (!s.db || !printer || !proc) return <div className="k-pm" data-testid="print-pm"><p className="k-pm-message">Loading the printer database…</p></div>;
  const items = s.plates[s.plateIndex].items;
  const sel = items.find((i) => i.id === s.selected) ?? null;
  const num = (k: keyof ProcessSettings, label: string, opts: { unit?: string; step?: number; min?: number; scale?: number } = {}) => (
    <Row label={label}><NumberField value={(proc[k] as number) * (opts.scale ?? 1)} unit={opts.unit} step={opts.step ?? 1} min={opts.min ?? 0}
      onChange={(v) => patchProcess({ [k]: Math.max(opts.min ?? 0, v) / (opts.scale ?? 1) } as Partial<ProcessSettings>)} /></Row>
  );
  const shown = printers.filter((p) => !filter || printerName(p).toLowerCase().includes(filter.toLowerCase()));
  const label = (p: typeof printer) => `${printerName(p)}${p.technology === 'resin' ? ' (resin)' : ''}${isAnnounced(p) ? ' (announced)' : isDiscontinued(p) ? ' (discontinued)' : ''}`;
  const resin = printer.technology === 'resin';
  const stale = resin ? resinStale() : isStale(s);
  const close = (ok: boolean) => { if (ok) okSession(); else cancelSession(); setTab(kind === 'assembly' ? 'assembly' : 'features'); };
  return (
    <div className="k-pm k-print-pm" data-testid="print-pm">
      <div className="k-pm-head">
        <div className="k-pm-title"><PrintIcon.Printer /> <b>3D Print</b><span className="grow" /><span className="k-pm-help" title="Help">?</span></div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" data-testid="print-ok" onClick={() => close(true)}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel (Esc)" data-testid="print-cancel" onClick={() => close(false)}><Icon.Close /></button>
        </div>
      </div>
      <div className="k-pm-tabs">
        <button className={s.pmTab === 'settings' ? 'active' : ''} data-testid="print-tab-settings" onClick={() => usePrint.setState({ pmTab: 'settings' })}>Settings</button>
        <button className={s.pmTab === 'preview' ? 'active' : ''} data-testid="print-tab-preview" onClick={() => usePrint.setState({ pmTab: 'preview' })}>Preview</button>
      </div>
      <p className="k-pm-message" data-testid="print-note">
        {s.slicing ? `${s.slicing.stage}: ${Math.round(s.slicing.fraction * 100)} %`
          : !items.length ? 'Add to Plate puts the open part on the plate.'
          : stale ? 'The plate or the settings changed: slice again.'
          : !(resin ? r.result : s.result) ? `Slice Plate makes the layers and the ${resin ? 'pixel masks' : 'G-code'}.` : 'Sliced: check the layers, then Export.'}
        <br /><span className="k-print-untested">{NOT_PRINTED}</span>
      </p>
      {s.pmTab === 'settings' ? (
        <>
          <Section title="Printer">
            <input className="k-input" placeholder="Search printers" value={filter} onChange={(e) => setFilter(e.target.value)} onKeyDown={(e) => e.stopPropagation()}
              data-testid="print-printer-search" />
            <select className="k-input" data-testid="print-printer" value={printer.id} onChange={(e) => setPrinter(e.target.value)} style={{ marginTop: 4 }}>
              {!shown.some((p) => p.id === printer.id) && <option value={printer.id}>{label(printer)}</option>}
              {shown.map((p) => <option key={p.id} value={p.id}>{label(p)}</option>)}
            </select>
            {resin ? <ResinFacts printer={printer} /> : (
              <>
                <Row label="Nozzle">
                  <select className="k-input" value={s.nozzle} onChange={(e) => setNozzle(Number(e.target.value))}>{printer.nozzles.map((n) => <option key={n.diameter}
                    value={n.diameter}>{n.diameter} mm</option>)}</select>
                </Row>
                <div className="k-muted k-print-facts">{printer.buildVolume.join(' x ')} mm
                  {' · '}{printer.gcodeFlavor === 'bambu' ? 'Bambu .gcode.3mf' : `${printer.gcodeFlavor === 'marlin' ? 'Marlin' : 'Klipper'} .gcode`}
                  {' · '}{printer.maxSpeed} mm/s · not print-tested</div>
              </>
            )}
          </Section>
          {resin ? <ResinSections /> : (<>
          <Section title="Filament">
            {s.slots.map((sl, i) => (
              <div className="k-pm-valuerow k-print-slot" key={i} data-testid={`print-slot-${i}`}>
                <span className="k-print-slotnr">{i + 1}</span>
                <input type="color" className="k-print-color" value={sl.color} onChange={(e) => setSlot(i, { color: e.target.value })} title="Colour" />
                <select className="k-input" value={sl.materialId} onChange={(e) => setSlot(i, { materialId: e.target.value, nozzleTemp: undefined,
                  bedTemp: undefined })}>{s.db!.materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                {s.slots.length > 1 && <button className="k-btn ghost icon k-tip" data-tip="Remove filament" onClick={() => removeSlot(i)}><Icon.Trash size={12} /></button>}
              </div>
            ))}
            {canWriteMultiMaterial(printer)
              ? <button className="k-btn" data-testid="print-add-slot" onClick={addSlot}>Add Filament</button>
              : s.slots.length > 1 && <p className="k-pm-message">The {printer.model} prints one filament: every part uses filament 1.</p>}
            {sel && s.slots.length > 1 && <Row label="Selected part"><select className="k-input" value={sel.filament}
              onChange={(e) => setItemFilament(Number(e.target.value))}>{s.slots.map((_, i) => <option key={i} value={i}>Filament {i + 1}</option>)}</select></Row>}
          </Section>
          <Section title="Quality">
            <Row label="Profile">
              <select className="k-input" data-testid="print-preset" value={s.preset} onChange={(e) => setPreset(e.target.value as typeof s.preset)}>
                <option value="quality">Quality</option><option value="standard">Standard</option><option value="strong">Strong</option><option value="fast">Fast</option>
              </select>
            </Row>
            <Row label="Layer height">
              <select className="k-input" data-testid="print-layer" value={proc.layerHeight}
                onChange={(e) => patchProcess({ layerHeight: Number(e.target.value) })}>{layerHeightsFor(s.nozzle).map((h) => <option key={h} value={h}>{h.toFixed(2)} mm</option>)}</select>
            </Row>
            {num('firstLayerHeight', 'First layer', { unit: 'mm', step: 0.04 })}
            {num('lineWidth', 'Line width', { unit: 'mm', step: 0.02 })}
            {num('wallCount', 'Walls', { min: 1 })}
            <label className="k-check"><input type="checkbox" checked={proc.variableLayerHeight}
              onChange={(e) => patchProcess({ variableLayerHeight: e.target.checked })} /> Variable layer height</label>
          </Section>
          <Section title="Strength">
            {num('topLayers', 'Top layers')}
            {num('bottomLayers', 'Bottom layers')}
            {num('infillDensity', 'Infill (%)', { scale: 100, step: 5 })}
            <Row label="Pattern">
              <select className="k-input" data-testid="print-pattern" value={proc.infillPattern} onChange={(e) => patchProcess({ infillPattern: e.target.value as InfillPattern })}>
                <option value="rectilinear">Rectilinear</option><option value="grid">Grid</option><option value="gyroid">Gyroid</option><option value="honeycomb">Honeycomb</option>
              </select>
            </Row>
          </Section>
          <Section title="Speed" defaultOpen={false}>
            {num('speedOuterWall', 'Outer wall (mm/s)', { step: 10 })}
            {num('speedInnerWall', 'Inner wall (mm/s)', { step: 10 })}
            {num('speedInfill', 'Infill (mm/s)', { step: 10 })}
            {num('speedSkin', 'Top/bottom (mm/s)', { step: 10 })}
            {num('speedTravel', 'Travel (mm/s)', { step: 10 })}
            {num('accel', 'Acceleration (mm/s²)', { step: 500 })}
          </Section>
          <Section title="Support">
            <Row label="Type">
              <select className="k-input" data-testid="print-support" value={proc.support} onChange={(e) => patchProcess({ support: e.target.value as SupportKind })}>
                <option value="none">None</option><option value="normal">Normal</option><option value="tree">Tree</option>
              </select>
            </Row>
            {proc.support !== 'none' && num('supportAngle', 'Threshold angle (°)', { step: 5 })}
          </Section>
          <Section title="Others" defaultOpen={false}>
            {num('skirtLoops', 'Skirt loops')}
            {num('brimWidth', 'Brim width', { unit: 'mm', step: 1 })}
            <Row label="Seam">
              <select className="k-input" value={proc.seam} onChange={(e) => patchProcess({ seam: e.target.value as SeamPosition })}>
                <option value="aligned">Aligned</option><option value="rear">Back</option><option value="nearest">Nearest</option><option value="random">Random</option>
              </select>
            </Row>
            {canWriteMultiMaterial(printer) && num('flushVolume', 'Flush volume (mm³)', { step: 10 })}
            <Row label="Build plate">
              <select className="k-input" value={proc.bedType} onChange={(e) => patchProcess({ bedType: e.target.value })}>
                {['Textured PEI Plate', 'Smooth PEI Plate', 'Cool Plate', 'Engineering Plate', 'High Temp Plate'].map((b) => <option key={b}>{b}</option>)}
              </select>
            </Row>
            <button className="k-btn" onClick={resetProcess} disabled={!Object.keys(s.overrides).length}>Back to Profile</button>
          </Section>
          {printer.gcodeFlavor === 'bambu' && (
            <Section title="Machine G-code" defaultOpen={false}>
              <div className="k-muted" data-testid="print-machine">{s.machine
                ? `Imported: ${s.machine.profileName} (${s.machine.printerModel})${s.machine.change ? ', with filament change' : ''}`
                : 'Own minimal start and end sequence. It does not load filament from the AMS: load it by hand. Multi-colour needs the imported code.'}</div>
              {s.machine && !sameModel(s.machine.printerModel, printer) && <p className="k-pm-message">The imported code is for the {s.machine.printerModel}: it is not used on this printer.</p>}
              <input ref={fileRef} type="file" accept=".json,.gcode,.txt" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0];
                if (f) void f.text().then((t) => importBambuProfile(t, f.name)); e.target.value = ''; }} />
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button className="k-btn" data-testid="print-import-bambu" onClick={() => fileRef.current?.click()}>Import from Bambu Studio…</button>
                {s.machine && <button className="k-btn" onClick={clearBambuProfile}>Use Own</button>}
              </div>
            </Section>
          )}
          </>)}
          <Section title={`Plate ${s.plateIndex + 1} of ${s.plates.length}`}>
            {s.plates.length > 1 && (
              <div className="k-print-plates">{s.plates.map((p,
                i) => <button key={p.id} className={`k-btn ${i === s.plateIndex ? 'active' : ''}`} onClick={() => setPlateIndex(i)}>{i + 1}</button>)}<button
                  className="k-btn ghost icon k-tip" data-tip="Delete this plate" onClick={() => deletePlate(s.plateIndex)}><Icon.Trash size={12} /></button></div>
            )}
            <div className="k-print-parts" data-testid="print-parts">
              {items.map((it) => {
                const out = !insideVolume(it, printer);
                return (
                  <div key={it.id} className={`k-tree-row k-print-part ${it.id === s.selected ? 'selected' : ''} ${out ? 'k-print-out' : ''}`} onClick={() => selectItem(it.id)}>
                    <Icon.Part size={14} /><span className="k-print-swatch" style={{ background: s.slots[it.filament]?.color }} /><span>{it.name}</span>{out && <span
                      className="k-print-outlabel">outside</span>}
                  </div>
                );
              })}
              {!items.length && <div className="k-muted">No parts on the plate.</div>}
            </div>
            {sel && (
              <>
                <div className="k-muted">{(() => { const b = worldBounds(sel);
                  return `${(b.max[0] - b.min[0]).toFixed(1)} x ${(b.max[1] - b.min[1]).toFixed(1)} x ${(b.max[2] - b.min[2]).toFixed(1)} mm`; })()}</div>
                <PartPlacement key={sel.id + (selectedCentre() ?? []).join(',')} />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                  {s.plates.length > 1 && (
                    <select className="k-input" style={{ width: 'auto' }} value="" onChange={(e) => moveSelectedToPlate(Number(e.target.value))} aria-label="Move to Plate">
                      <option value="">Move to Plate…</option>
                      {s.plates.map((p, i) => (i === s.plateIndex ? null : <option key={p.id} value={i}>{p.name}</option>))}
                    </select>
                  )}
                  <button className="k-btn" onClick={removeSelected}>Remove</button>
                </div>
              </>
            )}
            <button className="k-btn" style={{ marginTop: 4 }} disabled={!s.past.length} onClick={undoPlate}>Undo Plate Change</button>
          </Section>
        </>
      ) : (
        resin ? <ResinPreview /> : <PreviewTab />
      )}
    </div>
  );
}

function PreviewTab() {
  const s = usePrint(useShallow((x) => ({ result: x.result, colorBy: x.colorBy, hidden: x.hidden, slots: x.slots, db: x.db })));
  const st = s.result?.stats;
  if (!st) return <Section title="Summary"><div className="k-muted">Slice the plate first.</div></Section>;
  const mats = s.db?.materials ?? [];
  return (
    <>
      <Section title="Summary">
        <table className="k-print-summary" data-testid="print-summary"><tbody>
          <tr><td>Total time</td><td>{fmtTime(st.totalTime)}</td></tr>
          <tr><td>Printing</td><td>{fmtTime(st.printTime)}</td></tr>
          <tr><td>Layers</td><td>{st.layers}</td></tr>
          {st.filament.map((f) => (
            <tr key={f.slot}><td><span className="k-print-swatch"
              style={{ background: s.slots[f.slot]?.color }} /> {mats.find((m) => m.id === s.slots[f.slot]?.materialId)?.name ?? 'Filament'}</td>
              <td>{f.grams.toFixed(1)} g · {(f.length / 1000).toFixed(2)} m · € {f.cost.toFixed(2).replace('.', ',')}</td></tr>
          ))}
          {st.toolChanges > 0 && <tr><td>Filament changes</td><td>{st.toolChanges}</td></tr>}
        </tbody></table>
        {st.warnings.map((w, i) => <p key={i} className="k-pm-message">{w}</p>)}
      </Section>
      <Section title="Color Scheme">
        <select className="k-input" data-testid="print-colorby" value={s.colorBy} onChange={(e) => usePrint.setState({ colorBy: e.target.value as ColorBy })}>
          <option value="type">Line Type</option><option value="speed">Speed</option><option value="height">Layer Height</option><option value="width">Line Width</option>
          <option value="flow">Flow</option><option value="fan">Fan Speed</option><option value="filament">Filament</option>
        </select>
      </Section>
      <Section title="Line Types">
        {legendRows(st.timeByType).map((r) => r.key === 'wait' ? (
          <div key="wait" className="k-check k-print-legendrow" data-testid="print-wait-row"><span style={{ width: 13 }} /><span className="k-print-swatch k-print-swatch-wait" /> {r.label}
            <span className="grow" /><span className="k-muted">{r.pct.toFixed(1)} %</span></div>
        ) : (
          <label key={r.key} className="k-check k-print-legendrow">
            <input type="checkbox" checked={!s.hidden.includes(r.key as LineType)} onChange={(e) => usePrint.setState({ hidden: e.target.checked ? s.hidden.filter((x) => x !== r.key)
              : [...s.hidden, r.key as LineType] })} />
            <span className="k-print-swatch" style={{ background: LINE_COLORS[r.key as LineType] }} /> {r.label}<span className="grow" /><span
              className="k-muted">{r.pct.toFixed(1)} %</span>
          </label>
        ))}
      </Section>
    </>
  );
}

/** the selected part: its centre on the bed and a rotation about Z, typed in (docs/35 P3-15) */
function PartPlacement() {
  const c = selectedCentre() ?? [0, 0];
  const [rot, setRot] = useState(90);
  return (
    <>
      <Row label="Centre X"><NumberField value={c[0]} unit="mm" step={1} onChange={(v) => placeSelected(v, c[1])} /></Row>
      <Row label="Centre Y"><NumberField value={c[1]} unit="mm" step={1} onChange={(v) => placeSelected(c[0], v)} /></Row>
      <Row label="Rotate Z">
        <NumberField value={rot} unit="deg" step={15} onChange={setRot} />
        <button className="k-btn" onClick={() => rotateSelected(rot)}>Rotate</button>
      </Row>
    </>
  );
}
