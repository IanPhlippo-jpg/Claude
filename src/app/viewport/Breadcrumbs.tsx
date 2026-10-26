import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { getPref } from '../prefs';
import { Icon } from '../../ui/icons';
import { featureIcon } from '../panels/featureIcon';
import { MATE_ICON } from '../panels/AssemblyTreeBody';
import { faceOwner } from '../../core/features/faceOwner';
import { isSketchBased, type Feature } from '../../core/document/types';

/**
 * The breadcrumbs of the intended design (Options ▸ Display ▸ Show breadcrumbs on selection): after a selection a small
 * bar at the top left of the graphics area shows its parents (part ▸ body ▸ feature) with the feature's sketch
 * below it; it stays while the selection does.
 */
export function Breadcrumbs() {
  const st = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const on = getPref<boolean>('display.breadcrumbs') !== false;

  // the feature of the selection: the selected feature, or the feature that made the selected face
  const feature: Feature | null = useMemo(() => {
    if (st.selectedFeatureId) return st.doc.features.find((f) => f.id === st.selectedFeatureId) ?? null;
    const h = st.selectedFace;
    if (!h) return null;
    const body = st.rebuild.bodies.find((b) => b.id === h.bodyId);
    const face = body?.faces.find((f) => f.id === h.faceId);
    if (!body || !face?.triangles.length) return null;
    const src = body.geometry.index ? body.geometry.toNonIndexed() : body.geometry;
    const p = src.getAttribute('position'), t = face.triangles[0] * 3;
    const a = new THREE.Vector3().fromBufferAttribute(p, t), b = new THREE.Vector3().fromBufferAttribute(p, t + 1), c = new THREE.Vector3().fromBufferAttribute(p, t + 2);
    const ctr = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    try { return faceOwner(st.doc, [ctr.x, ctr.y, ctr.z], [n.x, n.y, n.z]); } catch { return null; }
  }, [st.selectedFeatureId, st.selectedFace, st.doc, st.rebuild]);

  const opacity = 1;

  // assembly: a selected component shows assembly ▸ component, with the component's mates above it
  const comp = st.doc.kind === 'assembly' ? (st.doc.components ?? []).find((c) => c.id === (st.selectedFeatureId ?? st.selectedFace?.bodyId)) : undefined;
  if (on && comp && opacity > 0 && !st.mateEdit && !st.insertingComponent) {
    const mates = (st.doc.mates ?? []).filter((m) => m.refs.some((r) => r.componentId === comp.id));
    return (
      <div className="k-crumbs" data-testid="breadcrumbs" ref={ref} style={{ opacity }} onPointerDown={(e) => e.stopPropagation()}>
        {mates.length > 0 && (
          <div className="k-crumbs-mates" data-testid="crumb-mates">
            <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden><path d="M2.5 12.5v-7h7M7 2.5l3 3-3 3" fill="none" stroke="#8a8a8a" strokeWidth={1.3} strokeLinejoin="round" /></svg>
            {mates.slice(0, 8).map((m) => (
              <button key={m.id} className="k-crumb-mate k-tip" data-tip={m.name} onClick={() => st.setSelectedFeature(m.id)}>{MATE_ICON[m.type] ?? <Icon.Mate size={16} />}</button>
            ))}
            {mates.length > 8 && <svg width={10} height={14} viewBox="0 0 10 14" aria-hidden><path d="M2 1l7 6-7 6z" fill="#9a9a9a" /></svg>}
          </div>
        )}
        <div className="k-crumbs-bar">
          <span className="k-crumb k-tip" data-tip={st.doc.name}><Icon.Component size={18} /></span>
          <Chevron />
          <span className="k-crumb active k-tip" data-tip={comp.name} data-testid="crumb-component" onClick={() => st.selectComponent(comp.id)}><Icon.Part size={18} /></span>
        </div>
      </div>
    );
  }
  if (!on || !feature || opacity <= 0 || st.activeSketchId || st.featureEdit || st.doc.kind === 'assembly' || st.doc.kind === 'drawing') return null;
  const sketchFeature = feature.type !== 'sketch' && isSketchBased(feature) ? st.doc.features.find((x) => x.type === 'sketch' && x.sketchId === (feature as { sketchId: string }).sketchId) : undefined;
  const isSketch = feature.type === 'sketch';
  const bodyName = st.rebuild.bodies.length > 1 ? st.rebuild.bodies.find((b) => b.featureIds?.includes(feature.id))?.id : null;
  return (
    <div className="k-crumbs" data-testid="breadcrumbs" ref={ref} style={{ opacity }} onPointerDown={(e) => e.stopPropagation()}>
      <div className="k-crumbs-bar">
        <span className="k-crumb k-tip" data-tip={st.doc.name}><Icon.Part size={18} /></span>
        <Chevron />
        {!isSketch && (
          <>
            <span className="k-crumb k-tip" data-tip={bodyName ?? 'Solid Body'}><Icon.Component size={18} /></span>
            <Chevron />
          </>
        )}
        <span className="k-crumb active" data-testid="crumb-feature" onClick={() => st.setSelectedFeature(feature.id)} onDoubleClick={() => (isSketch ? st.editSketch(feature.sketchId) : st.editFeature(feature.id))}>
          {isSketch ? <Icon.Sketch size={18} /> : featureIcon(feature)}
          <span>{feature.name}</span>
        </span>
        {sketchFeature && sketchFeature.type === 'sketch' && (
          <div className="k-crumbs-child">
            <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden><path d="M2.5 1.5v7h7M7 5.5l3 3-3 3" fill="none" stroke="#8a8a8a" strokeWidth={1.3} strokeLinejoin="round" /></svg>
            <span className="k-crumb boxed" data-testid="crumb-sketch" onClick={() => st.setSelectedFeature(sketchFeature.id)} onDoubleClick={() => st.editSketch(sketchFeature.sketchId)}>
              <Icon.Sketch size={18} />
              <span>{sketchFeature.name}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Chevron() {
  return (
    <svg className="k-crumb-sep" width={9} height={22} viewBox="0 0 9 22" aria-hidden>
      <path d="M1 0l7 11-7 11" fill="none" stroke="#d2d2d2" strokeWidth={1} />
    </svg>
  );
}
