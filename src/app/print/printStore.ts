/**
 * The state of the 3D Print tab (a store of its own, so the main store does not grow): printer, nozzle, filament
 * slots, process settings, the plates with their parts, the slice and the preview. Settings are kept per user in
 * local storage (as the other user settings), including the start/end G-code imported from Bambu Studio.
 */
import { create } from 'zustand';
import { useStore } from '../store';
import { componentBody, componentMatrix, partRebuild } from '../../core/assembly/assembly';
import { documentForConfiguration } from '../../core/document/configurations';
import { desktop } from '../desktop';
import { canWriteMultiMaterial, defaultNozzle, fdmPrinters, isAnnounced, loadDatabase, printerName, processProfile, type PrintDatabase } from '../../print/database';
import { arrange, autoOrient, insideVolume, layFlat, makeItem, moveBy, rotateZ, scaleItem, worldPositions } from '../../print/plate';
import { slotFor, type SlotInfo } from '../../print/build';
import { plateProblems, printerFile, projectFile, type SliceJob, type SliceOutput } from '../../print/run';
import { readMachineProfile } from '../../print/gcode/importTemplate';
import { transformPositions } from '../../print/mesh';
import { cancelSlice, sliceInWorker } from './sliceClient';
import type { FilamentSlot, LineType, Plate, PlateItem, Printer, ProcessPreset, ProcessSettings, SliceProgress } from '../../print/types';

const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
const STORAGE = 'phlippo.print';
export type ColorBy = 'type' | 'speed' | 'height' | 'filament';

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
  bambuStart: string | null;
  bambuEnd: string | null;
  bambuProfileName: string | null;
}

const saved = (): Partial<PrintState> => { try { return JSON.parse(localStorage.getItem(STORAGE) ?? '{}'); } catch { return {}; } };
const persist = (s: PrintState) => {
  const { printerId, nozzle, preset, overrides, slots, bambuStart, bambuEnd, bambuProfileName } = s;
  try { localStorage.setItem(STORAGE, JSON.stringify({ printerId, nozzle, preset, overrides, slots, bambuStart, bambuEnd, bambuProfileName })); } catch { /* storage unavailable */ }
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
  bambuStart: initial.bambuStart ?? null,
  bambuEnd: initial.bambuEnd ?? null,
  bambuProfileName: initial.bambuProfileName ?? null,
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
  return JSON.stringify([s.printerId, s.nozzle, currentProcess(s), s.slots, s.bambuStart, s.bambuEnd, plate(s).items.map((i) => [i.id, i.matrix.map((v) => Math.round(v * 1e6)), i.filament])]);
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
}
export function undoPlate() {
  const s = S();
  if (!s.past.length) return;
  usePrint.setState({ plates: s.past[s.past.length - 1], past: s.past.slice(0, -1) });
}
const onSelected = (f: (it: PlateItem) => PlateItem) => { const id = S().selected; if (!id) return msg('Select a part on the plate first.',
  'warn'); editPlate((items) => items.map((it) => (it.id === id ? f(it) : it))); };

/** Add to Plate: the open part (all bodies as one part, or each body), or the components of an assembly */
export function addToPlate(mode: 'part' | 'bodies' | 'components' | 'assembly' = 'part') {
  const st = useStore.getState();
  const p = currentPrinter();
  if (!p) return;
  const cx = p.buildVolume[0] / 2, cy = p.buildVolume[1] / 2;
  const added: PlateItem[] = [];
  const posOf = (g: import('three').BufferGeometry) => { const n = g.index ? g.toNonIndexed() : g; return new Float32Array(n.getAttribute('position').array as ArrayLike<number>); };
  if (st.doc.kind === 'assembly') {
    const parts: { name: string; pos: Float32Array }[] = [];
    for (const c of st.doc.components ?? []) {
      if (c.suppressed || c.hidden) continue;
      const body = componentBody(partRebuild(documentForConfiguration(c.part, c.configuration)));
      if (!body) continue;
      const m = componentMatrix(c).elements;
      parts.push({ name: c.name ?? c.part.name, pos: transformPositions(posOf(body.geometry), Array.from(m)) });
    }
    if (!parts.length) return msg('The assembly has no components with a solid body.', 'warn');
    if (mode === 'assembly') {
      const all = new Float32Array(parts.reduce((n, q) => n + q.pos.length, 0));
      let o = 0;
      for (const q of parts) { all.set(q.pos, o); o += q.pos.length; }
      added.push(makeItem(st.doc.name, all, cx, cy));
    } else for (const q of parts) added.push(makeItem(q.name, q.pos, cx, cy));
  } else {
    const bodies = st.rebuild.bodies.filter((b) => !(st.rebuild.autoHidden ?? []).includes(b.id));
    if (!bodies.length) return msg('There is no solid body to print; create one first.', 'warn');
    if (bodies.some((b) => !b.exact)) msg('Part of the model is faceted (mesh kernel): curved faces print with visible facets.', 'info');
    if (mode === 'bodies') bodies.forEach((b, i) => added.push(makeItem(`${st.doc.name} body ${i + 1}`, posOf(b.geometry), cx, cy)));
    else {
      const all = bodies.map((b) => posOf(b.geometry));
      const pos = new Float32Array(all.reduce((n, a) => n + a.length, 0));
      let o = 0;
      for (const a of all) { pos.set(a, o); o += a.length; }
      added.push(makeItem(st.doc.name, pos, cx, cy));
    }
  }
  editPlate((items) => (items.length || added.length > 1 ? arrange([...items, ...added], p) : [...items, ...added]));
  usePrint.setState({ selected: added[added.length - 1]?.id ?? null });
  const out = plate().items.filter((it) => !insideVolume(it, p));
  if (out.length) msg(`${out.map((i) => i.name).join(', ')} does not fit in the build volume of the ${p.model}.`, 'warn');
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
export function arrangePlate() { const p = currentPrinter(); if (p) editPlate((items) => arrange(items, p)); }
export function newPlate() { const s = S(); usePrint.setState({ plates: [...s.plates, { id: `plate${s.plates.length + 1}`, name: `Plate ${s.plates.length + 1}`, items: [] }],
  plateIndex: s.plates.length, selected: null, result: null }); }
export const setPlateIndex = (i: number) => usePrint.setState({ plateIndex: i, selected: null, result: null });
export function deletePlate(i: number) {
  const s = S();
  if (s.plates.length <= 1) return;
  const plates = s.plates.filter((_, k) => k !== i);
  usePrint.setState({ plates: plates.map((p, k) => ({ ...p, name: `Plate ${k + 1}` })), plateIndex: Math.min(s.plateIndex, plates.length - 1), selected: null, result: null });
}

/** the slice job of the current plate */
export function jobOf(s: PrintState = S()): SliceJob | null {
  const p = currentPrinter(s), proc = currentProcess(s);
  if (!p || !proc) return null;
  return {
    meshes: plate(s).items.map((it) => ({ positions: worldPositions(it), name: it.name, filament: Math.min(it.filament, s.slots.length - 1) })),
    printer: p, nozzle: s.nozzle, process: proc, slots: slotInfos(s), name: useStore.getState().doc.name, appVersion: APP_VERSION,
    startGcode: p.gcodeFlavor === 'bambu' ? s.bambuStart ?? undefined : undefined, endGcode: p.gcodeFlavor === 'bambu' ? s.bambuEnd ?? undefined : undefined,
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
  if (!confirmed && isAnnounced(job.printer)) {
    useStore.getState().setAsk({ title: '3D Print', text: `The ${printerName(job.printer)} is announced, not yet for sale. Its values are partly assumptions. Export anyway?`,
      yes: () => void exportPrinterFile(true), yesLabel: 'Export' });
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

/** Import from Bambu Studio: a machine profile (.json) or G-code the user picks on his own computer */
export function importBambuProfile(text: string, fileName: string) {
  const r = readMachineProfile(text);
  if (!r.start) return msg(`${fileName} holds no start G-code (machine_start_gcode); choose the machine profile of your printer.`, 'warn');
  set({ bambuStart: r.start, bambuEnd: r.end ?? null, bambuProfileName: r.name ?? fileName });
  msg(`Start${r.end ? ' and end' : ''} G-code imported from ${r.name ?? fileName}; it stays in your settings only.`);
}
export const clearBambuProfile = () => set({ bambuStart: null, bambuEnd: null, bambuProfileName: null });
