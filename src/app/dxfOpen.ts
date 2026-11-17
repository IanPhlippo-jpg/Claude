/**
 * DXF in the program (docs/32 item 5): File ▸ Open of a .dxf opens a new part with the drawing as a 2D sketch on the
 * Front plane (ready to extrude), Insert ▸ DXF/DWG adds a drawing to the open sketch at its origin. A DWG file is a
 * closed format: it is refused with the advice to save it as DXF first.
 */
import { useStore } from './store';
import { desktop, setDocumentHandle } from './desktop';
import { fitActive } from './viewport/bridge';
import { withUnsavedCheck } from './MenuBar';
import { readDxf, type DxfDrawing } from '../core/exchange/dxfRead';
import { addDxfToSketch, describeCounts } from '../core/exchange/dxfSketch';

export const DXF_FILTERS = [{ name: 'DXF (*.dxf)', extensions: ['dxf'] }, { name: 'DWG (*.dwg)', extensions: ['dwg'] }];

const DWG_MESSAGE = 'is a DWG file. DWG is a closed format that this program cannot read: save it as DXF (ASCII) in the program that made it and open the .dxf.';

/** the file as a drawing, or null after a message */
function parse(name: string, data: ArrayBuffer): DxfDrawing | null {
  const st = useStore.getState();
  if (/\.dwg$/i.test(name)) { st.pushMessage(`${name} ${DWG_MESSAGE}`, 'warn'); return null; }
  try {
    return readDxf(new TextDecoder('utf-8').decode(data));
  } catch (err) {
    const m = (err as Error).message;
    st.pushMessage(/DWG/.test(m) ? `${name} ${DWG_MESSAGE}` : `Cannot open ${name}: ${m}`, /DWG/.test(m) ? 'warn' : 'error');
    return null;
  }
}

/** what was read, what was left out and in which unit */
function report(name: string, d: DxfDrawing, counts: Record<string, number>, where: string): void {
  const st = useStore.getState();
  const what = describeCounts(counts) || 'no sketch geometry';
  const unit = d.unitKnown ? (d.unit === 'mm' ? '' : ` (${d.unit} converted to mm)`) : ' (the file names no unit: read as mm)';
  st.pushMessage(`${name} ${where}: ${what}${unit}.`);
  const skipped = Object.entries(d.skipped).map(([k, n]) => `${n} ${k}`).join(', ');
  if (skipped) st.pushMessage(`${name}: not imported (no sketch counterpart): ${skipped}.`, 'warn');
}

/** File ▸ Open of a .dxf (or .dwg): a new part with Sketch1 on the Front plane */
export function openDxf(name: string, data: ArrayBuffer): void {
  const d = parse(name, data);
  if (!d) return;
  withUnsavedCheck(() => {
    const s = useStore.getState();
    s.newDocument('part');
    setDocumentHandle(null);
    useStore.setState((x) => ({ doc: { ...x.doc, name: name.replace(/\.[^.]+$/, '') || x.doc.name } }));
    useStore.getState().newSketch('front');
    let counts: Record<string, number> = {};
    useStore.getState().commit('Import DXF', (sk) => {
      const r = addDxfToSketch(sk, d);
      counts = r.counts;
      return r.sketch;
    });
    // the sketch closes and stays selected: Extruded Boss/Base takes it straight away
    useStore.getState().exitSketch();
    useStore.getState().setDialog(null);
    report(name, d, counts, 'opened as Sketch1 on the Front Plane');
    requestAnimationFrame(() => requestAnimationFrame(fitActive));
  });
}

/** Insert ▸ DXF/DWG: the drawing into the open sketch, its origin on the sketch origin */
export function insertDxf(name: string, data: ArrayBuffer): void {
  const st = useStore.getState();
  const id = st.activeSketchId;
  if (!id) { st.pushMessage('Open a sketch first: Insert ▸ DXF/DWG adds the drawing to the open sketch.', 'warn'); return; }
  const d = parse(name, data);
  if (!d) return;
  let counts: Record<string, number> = {};
  st.commit('Insert DXF', (sk) => {
    const r = addDxfToSketch(sk, d);
    counts = r.counts;
    return r.sketch;
  });
  report(name, d, counts, `inserted into ${useStore.getState().doc.sketches[id]?.name ?? 'the sketch'}`);
  requestAnimationFrame(() => requestAnimationFrame(fitActive));
}

/** Insert ▸ DXF/DWG…: pick the file (desktop dialog or the browser's file chooser) */
export function insertDxfDialog(): void {
  if (!useStore.getState().activeSketchId) { useStore.getState().pushMessage('Open a sketch first: Insert ▸ DXF/DWG adds the drawing to the open sketch.', 'warn'); return; }
  const api = desktop();
  if (api) {
    void api.openFile([{ name: 'DXF/DWG', extensions: ['dxf', 'dwg'] }, ...DXF_FILTERS]).then((f) => {
      if (!f) return;
      if (f.error || !f.data) useStore.getState().pushMessage(`Cannot open ${f.name}: ${f.error ?? 'the file could not be read'}.`, 'error');
      else insertDxf(f.name, f.data);
    });
    return;
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.dxf,.dwg';
  input.setAttribute('data-testid', 'insert-dxf-input');
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) void file.arrayBuffer().then((buf) => insertDxf(file.name, buf));
  };
  input.click();
}
