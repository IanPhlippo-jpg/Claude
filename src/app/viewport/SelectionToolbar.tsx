import { useState } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { isRoundFeature } from '../../core/document/types';
import { edgesOnFace } from '../../core/features/round';
import type { BodyEdge } from '../../core/features/edgesets';

/**
 * The selection toolbar of Fillet / Chamfer, by design: after an edge is picked a see-through bar appears
 * near it to add the connected edges in one click (the loop or all edges of either face, the feature's edges,
 * all edges of the body). The red cross closes it.
 */
type Pick = 'loop1' | 'loop2' | 'face1' | 'face2' | 'tangent' | 'body';

const faceOf = (e: BodyEdge, n: THREE.Vector3, other: THREE.Vector3) => {
  const s = e.segments[0];
  const p = s.a;
  return { normal: [n.x, n.y, n.z] as [number, number, number], centroid: [p.x, p.y, p.z] as [number, number, number], curved: false, other };
};

/** the edges of a face connected to the start edge (its loop) */
function loopOf(edges: BodyEdge[], start: BodyEdge): BodyEdge[] {
  const key = (v: THREE.Vector3) => `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
  const ends = (e: BodyEdge) => [key(e.points[0]), key(e.points[e.points.length - 1])];
  const out = [start];
  const seen = new Set([start.id]);
  let grew = true;
  while (grew) {
    grew = false;
    const keys = new Set(out.flatMap(ends));
    for (const e of edges) {
      if (seen.has(e.id)) continue;
      if (ends(e).some((k) => keys.has(k))) { out.push(e); seen.add(e.id); grew = true; }
    }
  }
  return out;
}

export function SelectionToolbar({ project }: { project: (v: THREE.Vector3) => { x: number; y: number } }) {
  const st = useStore(useShallow((s) => ({ featureEdit: s.featureEdit, selectionToolbar: s.selectionToolbar, rebuild: s.rebuild, selectedEdges: s.selectedEdges, toggleSelectedEdge: s.toggleSelectedEdge })));
  const [closedFor, setClosedFor] = useState<string | null>(null);
  const fe = st.featureEdit;
  if (!fe || !isRoundFeature(fe.draft) || !st.selectionToolbar) return null;
  const body = st.rebuild.bodies[0];
  const lastId = st.selectedEdges[st.selectedEdges.length - 1];
  const edge = body?.edges.find((e) => e.id === lastId);
  if (!body || !edge || closedFor === lastId) return null;
  const seg = edge.segments[0];
  const f1 = faceOf(edge, seg.n1, seg.n2), f2 = faceOf(edge, seg.n2, seg.n1);
  const add = (p: Pick) => {
    let list: BodyEdge[] = [];
    if (p === 'face1' || p === 'loop1') list = edgesOnFace(body.edges, f1);
    if (p === 'face2' || p === 'loop2') list = edgesOnFace(body.edges, f2);
    if (p === 'loop1' || p === 'loop2') list = loopOf(list, edge);
    if (p === 'tangent') list = body.edges.filter((e) => !e.straight || e.closed);
    if (p === 'body') list = body.edges;
    const ids = [...new Set([...st.selectedEdges, ...list.map((e) => e.id)])];
    for (const id of ids) if (!st.selectedEdges.includes(id)) st.toggleSelectedEdge(id, true);
  };
  const q = project(edge.centroid);
  const items: [Pick, string, string][] = [
    ['loop1', 'Connected to start loop', 'M5 8h10v8H5zM5 8l3-3h10l-3 3M15 16l3-3V5'],
    ['loop2', 'Connected to end loop', 'M5 8h10v8H5zM5 8l3-3h10l-3 3M15 16l3-3V5M5 16h10'],
    ['face1', 'Connected to start face', 'M4 9h11v9H4zM4 9l4-4h11l-4 4M15 18l4-4V5'],
    ['face2', 'Connected to end face', 'M4 9h11v9H4zM15 18l4-4V5M15 9l4-4'],
    ['tangent', 'Curved edges', 'M5 18c0-7 4-12 14-12M5 18h14'],
    ['body', 'All edges of the body', 'M5 8l7-4 7 4v8l-7 4-7-4zM5 8l7 4 7-4M12 12v8'],
  ];
  return (
    <div className="k-seltoolbar" data-testid="selection-toolbar" style={{ left: q.x + 50, top: q.y - 90 }} onPointerDown={(e) => e.stopPropagation()}>
      {items.map(([k, tip, d]) => (
        <button key={k} className="k-tip" data-tip={tip} data-testid={`seltb-${k}`} onClick={() => add(k)}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none"><path d={d} stroke="#4f6d86" strokeWidth={1.3} fill="rgba(160,200,220,0.35)" strokeLinejoin="round" /></svg>
        </button>
      ))}
      <button className="k-tip k-seltoolbar-close" data-tip="Close" onClick={() => setClosedFor(lastId)}>
        <svg width={18} height={18} viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2" fill="#d9534f" /><path d="M7 7l10 10M17 7L7 17" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}
