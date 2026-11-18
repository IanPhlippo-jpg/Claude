/**
 * The state of the 3D Print tab (a store of its own, so the main store does not grow): printer, nozzle, filament
 * slots, process settings, the plates with their parts, the slice and the preview. Settings are kept per user in
 * local storage (as the other user settings), including the start/end G-code imported from Bambu Studio.
 */
import { create } from 'zustand';
import { useStore } from '../store';
import { desktop } from '../desktop';
import { canWriteMultiMaterial, defaultNozzle, fdmPrinters, isAnnounced, loadDatabase, printerName, processProfile, type PrintDatabase } from '../../print/database';
import { arrangeFit, autoOrient, insideVolume, layFlat, makeItem, moveBy, placeAt, rotateZ, scaleItem, worldBounds, worldPositions } from '../../print/plate';
import { slotFor, type SlotInfo } from '../../print/build';
import { plateProblems, printerFile, projectFile, type SliceJob, type SliceOutput } from '../../print/run';
import { readMachineProfile, sameModel } from '../../print/gcode/importTemplate';
import { fromDocData, refreshPlates, saveToDocument, sourcesToAdd } from './printDoc';
import { cancelSlice, sliceInWorker } from './sliceClient';
import { topology } from '../../print/mesh';
import type { FilamentSlot, LineType, MachineCode, Plate, PlateItem, Printer, ProcessPreset, ProcessSettings, SliceProgress } from '../../print/types';

const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
const STORAGE = 'phlippo.print';
export type ColorBy = 'type' | 'speed' | 'height' | 'width' | 'flow' | 'fan' | 'filament';

export interface PrintState {
  db: PrintDatabase | null;
  printerId: string;
  nozzle: number;
  preset: ProcessPreset;
  /** the user's changes on top of the profile */
  overrides: Partial<ProcessSettings>;
  slots: FilamentSlot[];
  plates: Plate[];
  plateIndex: number;
  selected: string | null;
  past: Plate[][];
  tool: 'select' | 'layFlat';
  pmTab: 'settings' | 'preview';
  slicing: SliceProgress | null;
  result: SliceOutput | null;
  resultKey: string | null;
  colorBy: ColorBy;
  hidden: LineType[];
  layerLo: number;
  layerHi: number;
  move: number;
  /** start, end and change code imported from the user's own Bambu Studio (kept in his settings only) */
  machine: MachineCode | null;
  /** the state when the tab opened: Cancel (and Esc) go back to it (docs/35 P3-9) */
  session: { plates: Plate[]; printerId: string; nozzle: number; preset: ProcessPreset; overrides: Partial<ProcessSettings>; slots: FilamentSlot[] } | null;
}

const saved = (): Partial<PrintState> => { try { return JSON.parse(localStorage.getItem(STORAGE) ?? '{}'); } catch { return {}; } };
const persist = (s: PrintState) => {
  const { printerId, nozzle, preset, overrides, slots, machine } = s;
  try { localStorage.setItem(STORAGE, JSON.stringify({ printerId, nozzle, preset, overrides, slots, machine })); } catch { /* storage unavailable */ }
};

const initial = saved();
export const usePrint = create<PrintState>(() => ({
  db: null,
  printerId: initial.printerId ?? 'bambu-p1s',
  nozzle: initial.nozzle ?? 0.4,
  preset: initial.preset ?? 'standard',
  overrides: initial.overrides ?? {},
  slots: initial.slots?.length ? initial.slots : [{ materialId: 'pla', color: '#f2f2f2' }],
  plates: [{ id: 'plate1', name: 'Plate 1', items: [] }],
  plateIndex: 0,
  selected: null,
  past: [],
  tool: 'select',
  pmTab: 'settings',
  slicing: null,
  result: null,
  resultKey: null,
  colorBy: 'type',
  hidden: ['travel'],
  layerLo: 0,
  layerHi: 0,
  move: Number.MAX_SAFE_INTEGER,
  machine: initial.machine?.printerModel ? initial.machine : null,
  session: null,
}));

const S = () => usePrint.getState();
const set = (p: Partial<PrintState>) => { usePrint.setState(p); persist(S()); };
const msg = (text: string, level: 'info' | 'warn' | 'error' = 'info') => useStore.getState().pushMessage(text, level);

export async function initPrint(): Promise<void> {
  if (S().db) return;
  const db = await loadDatabase();
  const fdm = fdmPrinters(db);
  const keep = fdm.find((p) => p.id === S().printerId) ?? fdm.find((p) => p.id === 'bambu-p1s') ?? fdm[0];
  usePrint.setState({ db, printerId: keep.id, nozzle: keep.nozzles.some((n) => n.diameter === S().nozzle) ? S().nozzle : defaultNozzle(keep) });
}

export const currentPrinter = (s: PrintState = S()): Printer | null => s.db?.printers.find((p) => p.id === s.printerId) ?? null;
export function currentProcess(s: PrintState = S()): ProcessSettings | null {
  const p = currentPrinter(s);
  return p ? { ...processProfile(s.preset, s.nozzle, p), ...s.overrides } : null;
}
export function slotInfos(s: PrintState = S()): SlotInfo[] {
  const mats = s.db?.materials ?? [];
  return s.slots.map((sl) => { const m = mats.find((x) => x.id === sl.materialId) ?? mats[0]; const info = slotFor(m, sl.color); return { ...info,
    nozzleTemp: sl.nozzleTemp ?? info.nozzleTemp, bedTemp: sl.bedTemp ?? info.bedTemp }; });
}
export const plate = (s: PrintState = S()) => s.plates[s.plateIndex];

/** the key of everything a slice depends on: a slice with another key is stale (docs/34 E10) */
export function sliceKey(s: PrintState = S()): string {
  return JSON.stringify([s.printerId, s.nozzle, currentProcess(s), s.slots, s.machine, plate(s).items.map((i) => [i.id, i.hash, i.matrix.map((v) => Math.round(v * 1e6)), i.filament])]);
}
export const isStale = (s: PrintState = S()) => !!s.result && s.resultKey !== sliceKey(s);

// ---- settings
export function setPrinter(id: string) {
  const p = S().db?.printers.find((x) => x.id === id);
  if (!p) return;
  // the user's changes stay (support, infill, walls); speeds and the nozzle-bound sizes come from the new profile
  const nozzle = p.nozzles.some((n) => n.diameter === S().nozzle) ? S().nozzle : defaultNozzle(p);
  set({ printerId: id, nozzle, overrides: keepOverrides(S().overrides, nozzle !== S().nozzle) });
  if (isAnnounced(p)) msg(`${printerName(p)} is announced, not yet for sale: its values are partly assumptions.`, 'warn');
}
export const setNozzle = (n: number) => set({ nozzle: n, overrides: keepOverrides(S().overrides, true) });
const SPEED_KEYS = ['speedOuterWall', 'speedInnerWall', 'speedInfill', 'speedSkin', 'speedFirstLayer', 'speedTravel', 'speedSupport', 'speedBridge', 'accel', 'primeTowerX', 'primeTowerY'];
const NOZZLE_KEYS = ['layerHeight', 'firstLayerHeight', 'lineWidth', 'firstLayerLineWidth', 'minLayerHeight', 'maxLayerHeight'];
function keepOverrides(o: Partial<ProcessSettings>, nozzleChanged: boolean): Partial<ProcessSettings> {
  return Object.fromEntries(Object.entries(o).filter(([k]) => !SPEED_KEYS.includes(k) && !(nozzleChanged && NOZZLE_KEYS.includes(k))));
}
export const setPreset = (p: ProcessPreset) => set({ preset: p, overrides: {} });
export const patchProcess = (p: Partial<ProcessSettings>) => set({ overrides: { ...S().overrides, ...p } });
export const resetProcess = () => set({ overrides: {} });
export const setSlot = (i: number, p: Partial<FilamentSlot>) => set({ slots: S().slots.map((s, k) => (k === i ? { ...s, ...p } : s)) });
export function addSlot() {
  const colors = ['#d03030', '#2f7fd8', '#2e9d4a', '#f0b400', '#1d1d1d', '#9b59b6', '#f28c28'];
  set({ slots: [...S().slots, { materialId: S().slots[0]?.materialId ?? 'pla', color: colors[(S().slots.length - 1) % colors.length] }] });
}
export function removeSlot(i: number) {
  if (S().slots.length <= 1) return;
  editPlate((items) => items.map((it) => (it.filament === i ? { ...it, filament: 0 } : it.filament > i ? { ...it, filament: it.filament - 1 } : it)));
  set({ slots: S().slots.filter((_, k) => k !== i) });
}

// ---- plate edits (undoable)
function editPlate(f: (items: PlateItem[]) => PlateItem[]) {
  const s = S();
  const plates = s.plates.map((p, i) => (i === s.plateIndex ? { ...p, items: f(p.items) } : p));
  usePrint.setState({ plates, past: [...s.past.slice(-49), s.plates] });
  store();
}
/** the plates go into the open document (file format 4: docs/35 P2-12) */
const store = () => saveToDocument(S().plates, S().printerId, S().nozzle);
export function undoPlate() {
  const s = S();
  if (!s.past.length) return;
  usePrint.setState({ plates: s.past[s.past.length - 1], past: s.past.slice(0, -1) });
  store();
}
const onSelected = (f: (it: PlateItem) => PlateItem) => { const id = S().selected; if (!id) return msg('Select a part on the plate first.',
  'warn'); editPlate((items) => items.map((it) => (it.id === id ? f(it) : it))); };

/** Add to Plate: the open part (all bodies as one part, or each body), or the components of an assembly */
export function addToPlate(mode: 'part' | 'bodies' | 'components' | 'assembly' = 'part') {
  const st = useStore.getState();
  const p = currentPrinter();
  if (!p) return;
  const cx = p.buildVolume[0] / 2, cy = p.buildVolume[1] / 2;
  const found = sourcesToAdd(mode);
  if (!found.length) return msg(st.doc.kind === 'assembly' ? 'The assembly has no components with a solid body.' : 'There is no solid body to print; create one first.', 'warn');
  if (st.doc.kind !== 'assembly' && st.rebuild.bodies.some((b) => !b.exact)) msg('Part of the model is faceted (mesh kernel): curved faces print with visible facets.', 'info');
  const added = found.map((f) => makeItem(f.name, f.positions, cx, cy, 0, f.source));
  // the mesh is checked when it goes on the plate, every defect counted (docs/35 P2-7)
  for (const f of found) {
    const t = topology(f.positions);
    const defects = [t.openEdges && `${t.openEdges} open edges`, t.nonManifoldEdges && `${t.nonManifoldEdges} non-manifold edges`, t.degenerate && `${t.degenerate} degenerate triangles`,
      t.volume < 0 && 'the faces point inwards'].filter(Boolean);
    if (defects.length) msg(`${f.name}: ${defects.join(', ')}. The slicer closes the gaps per layer; check the model.`, 'warn');
  }
  if (plate().items.length || added.length > 1) editArranged((items) => [...items, ...added], p); else editPlate((items) => [...items, ...added]);
  usePrint.setState({ selected: added[added.length - 1]?.id ?? null });
  const out = plate().items.filter((it) => !insideVolume(it, p));
  if (out.length) msg(`${out.map((i) => i.name).join(', ')} does not fit in the build volume of the ${p.model}.`, 'warn');
}

/**
 * Arranges a plate; what does not fit goes onto new plates (docs/35 P3-8). A part bigger than the bed stays (red).
 */
function arrangeOn(items: PlateItem[], p: Printer): { items: PlateItem[]; extra: Plate[] } {
  const r = arrangeFit(items, p);
  const fits = (it: PlateItem) => { const b = worldBounds(it); return b.max[0] - b.min[0] <= p.buildVolume[0] && b.max[1] - b.min[1] <= p.buildVolume[1]; };
  let rest = r.overflow.filter(fits);
  const extra: Plate[] = [];
  while (rest.length && extra.length < 100) {
    const n = arrangeFit(rest, p);
    if (!n.placed.length) break;
    const k = S().plates.length + extra.length + 1;
    extra.push({ id: `plate${k}`, name: `Plate ${k}`, items: n.placed });
    rest = n.overflow;
  }
  return { items: [...r.placed, ...r.overflow.filter((x) => !fits(x)), ...rest], extra };
}
/** a plate edit with Arrange; extra plates are added after it */
function editArranged(f: (items: PlateItem[]) => PlateItem[], p: Printer) {
  let extra: Plate[] = [];
  editPlate((items) => { const r = arrangeOn(f(items), p); extra = r.extra; return r.items; });
  if (extra.length) {
    usePrint.setState({ plates: [...S().plates, ...extra] });
    store();
    msg(`Not everything fits on one plate: ${extra.length} more plate(s) were added.`);
  }
}

export const selectItem = (id: string | null) => usePrint.setState({ selected: id });
export const removeSelected = () => { const id = S().selected; if (id) { editPlate((items) => items.filter((i) => i.id !== id)); usePrint.setState({ selected: null }); } };
export const moveSelected = (dx: number, dy: number) => onSelected((it) => moveBy(it, dx, dy));
export const rotateSelected = (deg: number) => onSelected((it) => rotateZ(it, deg));
export const scaleSelected = (f: number) => onSelected((it) => scaleItem(it, f));
export const layFlatSelected = (n: [number, number, number]) => onSelected((it) => layFlat(it, n));
export const setItemFilament = (slot: number) => onSelected((it) => ({ ...it, filament: slot }));
/** live drag on the plate: no undo step per mouse move (the drag start makes one) */
export function dragItem(id: string, dx: number, dy: number, first: boolean) {
  const s = S();
  const plates = s.plates.map((p, i) => (i === s.plateIndex ? { ...p, items: p.items.map((it) => (it.id === id ? moveBy(it, dx, dy) : it)) } : p));
  usePrint.setState(first ? { plates, past: [...s.past.slice(-49), s.plates] } : { plates });
}
export function autoOrientPlate() {
  const s = S(), proc = currentProcess();
  const ids = s.selected ? [s.selected] : plate().items.map((i) => i.id);
  editPlate((items) => items.map((it) => (ids.includes(it.id) ? autoOrient(it, proc?.supportAngle ?? 30) : it)));
}
export function arrangePlate() { const p = currentPrinter(); if (p) editArranged((items) => items, p); }
/** typed position of the selected part: the centre of its footprint (mm) */
export const placeSelected = (x: number, y: number) => onSelected((it) => placeAt(it, x, y));
export const selectedCentre = (): [number, number] | null => {
  const it = plate().items.find((i) => i.id === S().selected);
  if (!it) return null;
  const b = worldBounds(it);
  return [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2];
};
export function newPlate() { const s = S(); usePrint.setState({ plates: [...s.plates, { id: `plate${s.plates.length + 1}`, name: `Plate ${s.plates.length + 1}`, items: [] }],
  plateIndex: s.plates.length, selected: null, result: null }); store(); }
export const setPlateIndex = (i: number) => usePrint.setState({ plateIndex: i, selected: null, result: null });
export function deletePlate(i: number) {
  const s = S();
  if (s.plates.length <= 1) return;
  const plates = s.plates.filter((_, k) => k !== i);
  usePrint.setState({ plates: plates.map((p, k) => ({ ...p, name: `Plate ${k + 1}` })), plateIndex: Math.min(s.plateIndex, plates.length - 1), selected: null, result: null });
  store();
}
/** Move to Plate: the selected part goes to another plate */
export function moveSelectedToPlate(to: number) {
  const s = S(), id = s.selected;
  const it = plate(s).items.find((x) => x.id === id);
  if (!it || to === s.plateIndex || !s.plates[to]) return;
  usePrint.setState({ plates: s.plates.map((p, k) => (k === s.plateIndex ? { ...p, items: p.items.filter((x) => x.id !== id) } : k === to ? { ...p, items: [...p.items, it] } : p)),
    past: [...s.past.slice(-49), s.plates], selected: null });
  store();
}

/** the slice job of the current plate */
export function jobOf(s: PrintState = S()): SliceJob | null {
  const p = currentPrinter(s), proc = currentProcess(s);
  if (!p || !proc) return null;
  return {
    meshes: plate(s).items.map((it) => ({ positions: worldPositions(it), name: it.name, filament: Math.min(it.filament, s.slots.length - 1) })),
    printer: p, nozzle: s.nozzle, process: proc, slots: slotInfos(s), name: useStore.getState().doc.name, appVersion: APP_VERSION,
    machine: p.gcodeFlavor === 'bambu' && s.machine ? s.machine : undefined,
  };
}

export async function slicePlate(): Promise<boolean> {
  const job = jobOf();
  if (!job) return false;
  const problems = plateProblems(job);
  if (problems.length) { msg(problems[0], 'error'); return false; }
  const key = sliceKey();
  usePrint.setState({ slicing: { stage: 'Starting', fraction: 0 } });
  try {
    const result = await sliceInWorker(job, (p) => usePrint.setState({ slicing: p }));
    const n = result.stats.layers;
    usePrint.setState({ result, resultKey: key, slicing: null, pmTab: 'preview', layerLo: 0, layerHi: Math.max(0, n - 1), move: Number.MAX_SAFE_INTEGER });
    for (const w of result.stats.warnings.slice(0, 3)) msg(w, 'warn');
    msg(`Sliced: ${n} layers, ${fmtTime(result.stats.totalTime)}, ${result.stats.filament.reduce((a, f) => a + f.grams, 0).toFixed(1)} g.`);
    return true;
  } catch (err) {
    usePrint.setState({ slicing: null });
    msg((err as Error).message, /cancel/i.test((err as Error).message) ? 'info' : 'error');
    return false;
  }
}
export const cancelSlicing = () => { if (cancelSlice()) usePrint.setState({ slicing: null }); };

export const fmtTime = (sec: number) => {
  if (sec >= 3600) { const min = Math.round(sec / 60); return `${Math.floor(min / 60)}h ${min % 60}m`; }
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

async function save(file: { name: string; data: Uint8Array; mime: string }, ext: string, label: string) {
  const api = desktop();
  const buf = file.data.buffer.slice(file.data.byteOffset, file.data.byteOffset + file.data.byteLength) as ArrayBuffer;
  if (api) {
    const r = await api.saveFileAs({ defaultPath: file.name, filters: [{ name: label, extensions: [ext] }], data: buf });
    if (r) msg(r.error ? `Cannot save ${r.name}: ${r.error}` : `${r.name} saved.`, r.error ? 'error' : 'info');
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buf], { type: file.mime }));
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  msg(`${file.name} saved.`);
}

/** Export: the printer file, after the checks of docs/34 3.3 (stale slice, outside the bed, announced printer) */
export async function exportPrinterFile(confirmed = false): Promise<void> {
  const s = S(), job = jobOf();
  if (!job) return;
  if (!s.result) return msg('Slice the plate first.', 'warn');
  if (isStale()) return msg('The plate or the settings changed after slicing: slice again before exporting.', 'warn');
  const problems = plateProblems(job);
  if (problems.length) return msg(problems[0], 'error');
  if (job.meshes.some((m) => m.filament > 0) && !canWriteMultiMaterial(job.printer)) return msg(`The ${job.printer.model} prints one filament.`, 'error');
  // a printer with an assumption on a safety field (bed, travel limits, excluded zones, temperatures, G-code flavour), or
  // one that is only announced: the user confirms first (docs/35 P2-11); the file carries the same list
  const risky = safetyAssumptions(job.printer);
  if (!confirmed && (isAnnounced(job.printer) || risky.length)) {
    const what = `${isAnnounced(job.printer) ? `The ${printerName(job.printer)} is announced, not yet for sale. ` : ''}`
      + (risky.length ? `These values of the ${printerName(job.printer)} are assumptions, not checked against the printer: ${risky.join('; ')}. ` : '');
    useStore.getState().setAsk({ title: '3D Print', text: `${what}Nothing has been printed with this file yet. Export anyway?`, yes: () => void exportPrinterFile(true), yesLabel: 'Export' });
    return;
  }
  const file = await printerFile(s.result, job);
  await save(file, file.name.endsWith('.gcode.3mf') ? '3mf' : 'gcode', file.name.endsWith('.3mf') ? 'Bambu Lab print file' : 'G-code');
}

export async function exportProject(): Promise<void> {
  const s = S();
  if (!plate(s).items.length) return msg('The plate is empty: add a part first.', 'warn');
  const infos = slotInfos(s);
  const file = await projectFile(plate(s).items.map((it) => ({ name: it.name, positions: it.positions, matrix: it.matrix })), { printer: s.printerId, nozzle: s.nozzle,
    process: currentProcess(s), slots: s.slots, from: `Phlippo CAD ${APP_VERSION}` }, plate(s).items.map((it) => infos[it.filament]?.color ?? '#cfd3d8'), useStore.getState().doc.name);
  await save(file, '3mf', '3MF project');
}

/** the safety fields of a printer that rest on an assumption (AANNAME) */
export function safetyAssumptions(p: Printer): string[] {
  const fields = ['buildVolume', 'printableArea', 'excludeAreas', 'travelLimits', 'maxNozzleTemp', 'maxBedTemp', 'gcodeFlavor', 'origin'];
  const out: string[] = [];
  for (const a of p.assumptions ?? []) {
    const text = typeof a === 'string' ? a : `${a.field ?? ''}: ${a.note ?? ''}`;
    const field = fields.find((f) => text.startsWith(f));
    if (field && /AANNAME|assum/i.test(text) && !out.includes(field)) out.push(field);
  }
  return out;
}

/**
 * Import from Bambu Studio: the machine profile (.json) of the user's printer, picked on his own computer. It holds
 * the start, end and filament-change code and says which printer it is for; it is only used on that model (P1-5).
 */
export function importBambuProfile(text: string, fileName: string) {
  const r = readMachineProfile(text);
  if (!r.start || !r.printerModel) return msg(`${fileName} is not a Bambu Studio machine profile with start G-code and a printer model; choose the machine profile (.json) of your printer.`, 'warn');
  set({ machine: { start: r.start, end: r.end, change: r.change, printerModel: r.printerModel, profileName: r.name ?? fileName } });
  const p = currentPrinter();
  const fits = p ? sameModel(r.printerModel, p) : false;
  msg(`Machine G-code imported from ${r.name ?? fileName} (${r.printerModel})${r.change ? ', with the filament change' : ''}; it stays in your settings only.`
    + (fits ? '' : ` It is not for the chosen printer, so it is not used for it.`), fits ? 'info' : 'warn');
}
export const clearBambuProfile = () => set({ machine: null });

// ---- the tab as a command: the state when it opened, OK keeps, Cancel and Esc go back (docs/35 P3-9)
export function beginSession() {
  const s = S();
  if (s.session) return;
  usePrint.setState({ session: { plates: s.plates, printerId: s.printerId, nozzle: s.nozzle, preset: s.preset, overrides: s.overrides, slots: s.slots } });
}
export const okSession = () => usePrint.setState({ session: null });
export function cancelSession() {
  const s = S().session;
  if (!s) return;
  cancelSlice();
  set({ plates: s.plates, printerId: s.printerId, nozzle: s.nozzle, preset: s.preset, overrides: s.overrides, slots: s.slots, session: null, selected: null, result: null, slicing: null });
  store();
}

// ---- following the model: a rebuild refreshes the parts (stale slice); another document brings its own plates
if (typeof window !== 'undefined') {
  let docId: string | undefined;
  useStore.subscribe((st, prev) => {
    if (!st.hasDocument || st.doc.kind === 'drawing') return;
    if (st.doc.id !== docId) {
      docId = st.doc.id;
      const data = st.doc.print3d;
      const r = data ? fromDocData(data) : { plates: [{ id: 'plate1', name: 'Plate 1', items: [] }], missing: 0 };
      usePrint.setState({ plates: r.plates, plateIndex: 0, selected: null, result: null, past: [] });
      if (r.missing) msg(`${r.missing} part(s) of the stored 3D Print plates are no longer in the model.`, 'warn');
      return;
    }
    if (st.rebuild !== prev.rebuild && !st.rebuild.pending) {
      const plates = refreshPlates(S().plates);
      if (plates) usePrint.setState({ plates });
    }
  });
}
