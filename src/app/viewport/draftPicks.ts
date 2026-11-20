import { useStore } from '../store';
import { edgeRef } from '../../core/features/edgesets';

/**
 * Clicks in the graphics area that fill the list of a feature being made: Composite Curve takes a model edge,
 * Delete/Keep Body a body (adds it, or takes it off again). True when the click was used.
 */
export function pickForDraft(edgeAt: () => string | null, faceAt: () => { bodyId: string; faceId?: string; point?: { x: number; y: number; z: number } } | null): boolean {
  const st = useStore.getState();
  const d = st.featureEdit?.draft;
  // Jog ▸ Fixed Face (the click point says which side of the line stays) or the face of Up To Surface / Offset From Surface
  if (d?.type === 'jog' && (st.flangePick === 'fixedFace' || st.flangePick === 'surface')) {
    const hit = faceAt();
    const body = hit ? st.rebuild.bodies.find((b) => b.id === hit.bodyId) : undefined;
    const face = body?.faces.find((x) => x.id === hit!.faceId);
    if (!hit?.point || !body || !face) return false;
    if (face.curved) { st.pushMessage('Select a planar face.', 'warn'); return true; }
    const ref = { normal: [...face.normal] as [number, number, number], point: [hit.point.x, hit.point.y, hit.point.z] as [number, number, number], label: `Face<${body.faces.indexOf(face) + 1}>` };
    st.updateFeatureDraft(st.flangePick === 'fixedFace' ? { fixedFace: ref } : { surface: ref });
    useStore.setState({ flangePick: null, selectedFace: { bodyId: body.id, faceId: face.id }, selectedFaces: [{ bodyId: body.id, faceId: face.id }] });
    return true;
  }
  if (d?.type === 'compositeCurve') {
    const id = edgeAt();
    const e = id ? st.rebuild.bodies.flatMap((b) => b.edges).find((x) => x.id === id) : undefined;
    if (e) st.updateFeatureDraft({ edges: [...d.edges, edgeRef(e)] });
    return true;
  }
  if (d?.type === 'deleteBody') {
    const face = faceAt();
    if (face) st.updateFeatureDraft({ bodies: d.bodies.includes(face.bodyId) ? d.bodies.filter((x) => x !== face.bodyId) : [...d.bodies, face.bodyId] });
    return true;
  }
  return false;
}

/** a Yes/No question with "Don't show again": once that box was checked, the action goes on without asking */
export function confirmUnlessHidden(title: string, text: string, key: string, yes: () => void): void {
  let skip = false;
  try { skip = localStorage.getItem(`phlippo.dontShow.${key}`) === '1'; } catch { /* asked every time */ }
  if (skip) yes();
  else useStore.getState().setAsk({ title, text, yes, dontShowKey: key });
}
