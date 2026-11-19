/**
 * Resin mode of the 3D Print tab (docs/33 phase 4): the same tab, plate and parts; with a resin printer chosen the
 * settings are resin, exposure, lift, hollowing and supports, the slice gives pixel masks and the export a .goo file.
 * The settings are kept per user in local storage, as the FDM settings.
 */
import { create } from 'zustand';
import { useStore } from '../store';
import { isAnnounced, printerName } from '../../print/database';
import { makeItem, worldBounds, worldPositions } from '../../print/plate';
import { resinTestPiece } from '../../print/shapes';
import { machineOf, resinAssumptions, resinSettings, FIXTURE_RESINS } from '../../print/resin/profile';
import { gooFile, liftOf, resinProblems, type ResinJob, type ResinOutput } from '../../print/resin/slice';
import type { Resin, ResinMachine, ResinSettings } from '../../print/resin/types';
import type { Printer } from '../../print/types';
import { addPlateItems, currentPrinter, fmtTime, plate, safetyAssumptions, saveFile, usePrint } from './printStore';
import { sliceResinInWorker } from './sliceClient';

const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
const STORAGE = 'phlippo.print.resin';

export interface ResinState {
  resinId: string;
  layerHeight: number;
  /** the user's changes on top of the resin profile */
  overrides: Partial<ResinSettings>;
  result: ResinOutput | null;
  /** the LCD the result was sliced for (the preview decodes with it, also after another printer is chosen) */
  machine: ResinMachine | null;
  resultKey: string | null;
  /** the layer shown in the preview */
  layer: number;
}

const saved = (): Partial<ResinState> => { try { return JSON.parse(localStorage.getItem(STORAGE) ?? '{}'); } catch { return {}; } };
const initial = typeof localStorage === 'undefined' ? {} : saved();
export const useResin = create<ResinState>(() => ({
  resinId: initial.resinId ?? 'resin-standard', layerHeight: initial.layerHeight ?? 0.05, overrides: initial.overrides ?? {}, result: null, machine: null, resultKey: null, layer: 0,
}));
const R = () => useResin.getState();
const set = (p: Partial<ResinState>) => {
  useResin.setState(p);
  const { resinId, layerHeight, overrides } = R();
  try { localStorage.setItem(STORAGE, JSON.stringify({ resinId, layerHeight, overrides })); } catch { /* storage unavailable */ }
};
const msg = (text: string, level: 'info' | 'warn' | 'error' = 'info') => useStore.getState().pushMessage(text, level);

export const isResin = (p: Printer | null = currentPrinter()) => p?.technology === 'resin';
export const resins = (): Resin[] => usePrint.getState().db?.resins ?? FIXTURE_RESINS;
export const currentResin = (s: ResinState = R()): Resin => resins().find((r) => r.id === s.resinId) ?? resins()[0];
export const currentResinSettings = (s: ResinState = R()): ResinSettings => ({ ...resinSettings(currentResin(s), s.layerHeight), ...s.overrides });
export const currentMachine = () => { const p = currentPrinter(); return p ? machineOf(p) : null; };

export const setResin = (id: string) => set({ resinId: id, overrides: keepManual(R().overrides) });
export const setResinLayer = (h: number) => set({ layerHeight: h });
export const patchResin = (p: Partial<ResinSettings>) => set({ overrides: { ...R().overrides, ...p } });
/** back to the resin profile; drain holes and support points by hand stay */
export const resetResin = () => set({ overrides: keepManual(R().overrides) });
const keepManual = (o: Partial<ResinSettings>): Partial<ResinSettings> => {
  const { drainHoles, addedPoints, removedPoints } = o;
  return Object.fromEntries(Object.entries({ drainHoles, addedPoints, removedPoints }).filter(([, v]) => v !== undefined));
};
export const clearManual = () => set({ overrides: { ...R().overrides, addedPoints: [], removedPoints: [] } });
export function addSupportPoint(x: number, y: number, z: number) { patchResin({ addedPoints: [...currentResinSettings().addedPoints, [x, y, z]] }); }
/**
 * A click on a part with the Support Points tool (plate coordinates of the part as it stands on the plate): a point
 * there, at the height it will have on the supports; with remove, the automatic and hand-made points near it go.
 */
export function pickSupportPoint(x: number, y: number, z: number, remove: boolean) {
  const s = currentResinSettings();
  const r = (v: number) => Math.round(v * 100) / 100;
  if (remove) {
    patchResin({ addedPoints: s.addedPoints.filter((p) => Math.hypot(p[0] - x, p[1] - y) >= 1.5), removedPoints: [...s.removedPoints, [r(x), r(y)]] });
    return;
  }
  patchResin({ addedPoints: [...s.addedPoints, [r(x), r(y), r(z + liftOf(s))]] });
}
/** the resin test piece (an L with a raised F: a mirrored print shows; docs/35 R-2) in the middle of the LCD */
export function addTestPiece() {
  const m = currentMachine();
  if (!m) return;
  const p = resinTestPiece(0, 0), cad = new Float32Array(p.length);
  // plate (Z up) to CAD (Y up): the item puts it back with CAD_TO_PLATE
  for (let i = 0; i < p.length; i += 3) { cad[i] = p[i]; cad[i + 1] = p[i + 2]; cad[i + 2] = -p[i + 1]; }
  addPlateItems([makeItem('Resin test piece (L with F)', cad, m.size[0] / 2, m.size[1] / 2)]);
}
export function removeSupportsNear(x: number, y: number) { patchResin({ removedPoints: [...currentResinSettings().removedPoints, [x, y]] }); }
/** a drain hole under the selected part (or the first part): the middle of its footprint, radius 1.5 mm */
export function addDrainHole() {
  const st = usePrint.getState(), items = plate(st).items;
  const it = items.find((i) => i.id === st.selected) ?? items[0];
  if (!it) return msg('Add a part to the plate first.', 'warn');
  const b = worldBounds(it);
  patchResin({ drainHoles: [...currentResinSettings().drainHoles, { x: Math.round((b.min[0] + b.max[0]) / 2), y: Math.round((b.min[1] + b.max[1]) / 2), r: 1.5 }] });
}

/** the resin slice job of the current plate */
export function resinJobOf(): ResinJob | null {
  const p = currentPrinter(), m = p && machineOf(p);
  if (!p || !m) return null;
  return {
    meshes: plate().items.map((it) => ({ positions: worldPositions(it), name: it.name, filament: 0 })), printer: p, machine: m, settings: currentResinSettings(),
    resin: currentResin(), name: useStore.getState().doc.name, appVersion: APP_VERSION,
  };
}
export function resinKey(): string {
  const s = usePrint.getState();
  return JSON.stringify([s.printerId, currentResinSettings(), plate(s).items.map((i) => [i.id, i.hash, i.matrix.map((v) => Math.round(v * 1e6))])]);
}
export const resinStale = () => !!R().result && R().resultKey !== resinKey();

export async function sliceResin(): Promise<boolean> {
  const job = resinJobOf();
  if (!job) return false;
  const problems = resinProblems(job);
  if (problems.length) { msg(problems[0], 'error'); return false; }
  const key = resinKey();
  usePrint.setState({ slicing: { stage: 'Starting', fraction: 0 } });
  try {
    const result = await sliceResinInWorker(job, (p) => usePrint.setState({ slicing: p }));
    useResin.setState({ result, machine: job.machine, resultKey: key, layer: 0 });
    usePrint.setState({ slicing: null, pmTab: 'preview' });
    for (const w of result.stats.warnings.slice(0, 3)) msg(w, 'warn');
    msg(`Sliced: ${result.stats.layers} layers, ${fmtTime(result.stats.printTime)}, ${(result.stats.volume / 1000).toFixed(1)} ml resin.`);
    return true;
  } catch (err) {
    usePrint.setState({ slicing: null });
    msg((err as Error).message, /cancel/i.test((err as Error).message) ? 'info' : 'error');
    return false;
  }
}

/** Export: the .goo file, after the checks (stale slice, problems, file format of the printer, assumptions) */
export async function exportGoo(confirmed = false): Promise<void> {
  const job = resinJobOf(), out = R().result;
  if (!job) return;
  if (!out) return msg('Slice the plate first.', 'warn');
  if (resinStale()) return msg('The plate or the settings changed after slicing: slice again before exporting.', 'warn');
  const problems = resinProblems(job);
  if (problems.length) return msg(problems[0], 'error');
  if (job.printer.fileFormat !== 'goo') return msg(`The ${printerName(job.printer)} takes .${job.printer.fileFormat} files; Phlippo CAD writes .goo only.`, 'error');
  // the FDM safety fields and the LCD fields (size, resolution, mirroring, format) that rest on an assumption (R-6)
  const risky = [...new Set([...safetyAssumptions(job.printer), ...resinAssumptions(job.machine)])];
  if (!confirmed) {
    const what = `${isAnnounced(job.printer) ? `The ${printerName(job.printer)} is announced, not yet for sale. ` : ''}`
      + (risky.length ? `These values of the ${printerName(job.printer)} are assumptions: ${risky.join('; ')}. ` : '');
    useStore.getState().setAsk({ title: '3D Print', yesLabel: 'Export', yes: () => void exportGoo(true),
      text: `${what}The .goo layout follows Elegoo's public spec; byte order and checksum are not yet checked against Elegoo's own slicer, and nothing has been printed with it. Export anyway?` });
    return;
  }
  await saveFile(gooFile(out, job), 'goo', 'Elegoo resin print file');
}
