/**
 * Self-test of the installed program (QA F97). The desktop shell starts it with --self-test, in a throw-away profile:
 * the app builds a plate with a hole, waits for the exact body of the B-rep kernel (OpenCascade WASM loaded over
 * app://), adds a fillet, writes STEP, and hands the result and the .kcad text back to the shell, which saves it
 * atomically, reads it back and quits. Nothing here runs in a normal start.
 */
import { createDocument, type Document } from '../core/document/types';
import { addCircle, addLine, createSketch } from '../core/sketch/model';
import { serializeDocument } from '../core/document/persistence';
import { useStore } from './store';
import { fitActive } from './viewport/bridge';

export interface SelfTestResult {
  steps: { name: string; ok: boolean; info?: string }[];
  kcad: string;
}

const until = async (ok: () => boolean, ms: number) => {
  const end = Date.now() + ms;
  while (!ok()) {
    if (Date.now() > end) return false;
    await new Promise((r) => setTimeout(r, 100));
  }
  return true;
};

export async function runSelfTest(): Promise<SelfTestResult> {
  const steps: SelfTestResult['steps'] = [];
  const step = (name: string, ok: boolean, info?: string) => steps.push({ name, ok, ...(info ? { info } : {}) });
  try {
    // the plate 80 x 60 x 10 with a Ø20 hole
    let sk = createSketch('s1', 'Sketch1', 'top');
    const c = [[-40, -30], [40, -30], [40, 30], [-40, 30]];
    for (let i = 0; i < 4; i++) sk = addLine(sk, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
    sk = addCircle(sk, { x: 0, y: 0 }, 10)[0];
    const d: Document = createDocument('SelfTest');
    d.sketches = { s1: sk };
    d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }] as Document['features'];
    step('the app started (Welcome)', useStore.getState().dialog === 'welcome');
    useStore.getState().setDialog(null);
    useStore.getState().openDocument(d);
    const bodies = () => useStore.getState().rebuild.bodies;
    step('sketch and extrude build a body', await until(() => bodies().length === 1, 15000));
    const exact1 = 80 * 60 * 10 - Math.PI * 100 * 10;
    const okExact = await until(() => bodies().length === 1 && !!bodies()[0].exact, 60000);
    step('the B-rep kernel (WASM) makes the body exact', okExact && Math.abs((bodies()[0].exactVolume ?? 0) - exact1) < 1e-6, String(bodies()[0]?.exactVolume));
    // a fillet on a long top edge, still exact
    const b = bodies()[0];
    const e = b.edges.filter((x) => x.straight && Math.abs(x.centroid.y - 10) < 1e-3).sort((p, q) => q.centroid.x - p.centroid.x)[0];
    const s = useStore.getState();
    s.startRound('fillet');
    useStore.getState().toggleSelectedEdge(e.id);
    useStore.getState().updateFeatureDraft({ size: 3 });
    useStore.getState().commitFeature();
    const exact2 = exact1 - (1 - Math.PI / 4) * 9 * 60;
    const okFillet = await until(() => useStore.getState().doc.features.some((f) => f.type === 'fillet') && bodies().every((x) => x.exact) && Math.abs((bodies()[0].exactVolume ?? 0) - exact2) < 1e-4, 60000);
    step('Fillet1 is exact', okFillet, String(bodies()[0]?.exactVolume));
    fitActive();
    step('no rebuild errors', !Object.keys(useStore.getState().rebuild.errors).length, JSON.stringify(useStore.getState().rebuild.errors));
    // STEP through the B-rep kernel
    const { exportStepDoc } = await import('../core/occt/occtClient');
    const st = await exportStepDoc(useStore.getState().doc, null, 'mm');
    const text = new TextDecoder().decode(st.bytes.slice(0, 200));
    step('STEP is written with exact surfaces', text.startsWith('ISO-10303-21') && st.exact === 1 && st.volumes.length === 1, `${st.bytes.length} bytes, exact ${st.exact}`);
    return { steps, kcad: serializeDocument(useStore.getState().doc) };
  } catch (err) {
    step('self-test ran to the end', false, err instanceof Error ? err.message : String(err));
    return { steps, kcad: '' };
  }
}
