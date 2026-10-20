import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { CadCamera, PLANES, PLANE_LABELS, sketchToWorld, type PlaneId } from './camera';
import { readColors, SketchScene } from './sketchScene';
import { ToolController, type ToolContext, type ToolRender } from './tools';
import { Overlay } from './Overlay';
import { Triad } from './ViewCube';
import { ConfirmationCorner, Hud, ViewSelector, viewDisplayName } from './Hud';
import { Icon, RelationGlyph } from '../../ui/icons';
import { Menu, type MenuItem } from '../../ui/components';
import type { SketchPoint } from '../../core/sketch/types';
import { updateConstraint } from '../../core/sketch/model';
import { hitTest, sketchBounds } from '../../core/sketch/geometry';
import { relationsForSelection } from '../../core/sketch/relations';

let sharedCamera: CadCamera | null = null;
export function getCamera(): CadCamera {
  if (!sharedCamera) sharedCamera = new CadCamera();
  return sharedCamera;
}

const FEEDBACK_ICON: Record<string, React.ReactNode> = {
  point: <Icon.Point size={12} />,
  line: <Icon.Line size={12} />,
  circle: <Icon.Circle size={12} />,
  arc: <Icon.Arc size={12} />,
  spline: <Icon.Spline size={12} />,
  dimension: <Icon.Dimension size={12} />,
  plane: <Icon.Plane size={12} />,
  relation: <Icon.Lock size={12} />,
};

export function Viewport({ onEditDimension }: { onEditDimension: (id: string) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useMemo(() => getCamera(), []);
  const scene = useMemo(() => new SketchScene(), []);
  const tools = useMemo(() => new ToolController(), []);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [, bump] = useState(0);
  const [hoverConstraint, setHoverConstraint] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [zoomArea, setZoomArea] = useState<{ active: boolean; a?: { x: number; y: number }; b?: { x: number; y: number } }>({ active: false });
  const [cursorPx, setCursorPx] = useState<{ x: number; y: number } | null>(null);
  const labelBoxes = useRef<{ id: string; x: number; y: number; w: number; h: number }[]>([]);
  const toolRenderRef = useRef<ToolRender | null>(null);
  const nav = useRef<{ mode: 'orbit' | 'pan' | 'zoom'; x: number; y: number } | null>(null);

  const st = useStore();
  const sketch = st.activeSketchId ? st.doc.sketches[st.activeSketchId] : null;
  const solve = st.activeSketchId ? st.solve[st.activeSketchId] ?? null : null;
  const plane: PlaneId = sketch?.plane ?? 'front';
  const theme = st.theme;

  // renderer setup
  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    rendererRef.current = renderer;
    const host = hostRef.current!;
    const ro = new ResizeObserver(() => {
      const w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false);
      camera.resize(w, h);
      setSize({ w, h });
    });
    ro.observe(host);
    camera.resize(host.clientWidth, host.clientHeight);
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    setSize({ w: host.clientWidth, h: host.clientHeight });
    camera.onViewName = (n) => useStore.getState().setViewName(viewDisplayName(n));
    return () => {
      ro.disconnect();
      renderer.dispose();
    };
  }, [camera]);

  // orientation: normal to the sketch plane when a sketch opens
  const lastSketch = useRef<string | null>(null);
  useEffect(() => {
    if (st.activeSketchId && st.activeSketchId !== lastSketch.current) {
      camera.normalTo(plane);
      setTimeout(() => zoomFit(), 280);
    }
    lastSketch.current = st.activeSketchId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.activeSketchId]);

  useEffect(() => {
    tools.setTool(st.tool);
    toolRenderRef.current = null;
    bump((n) => n + 1);
  }, [st.tool, tools]);

  const otherSketches = useMemo(
    () =>
      st.show.sketches
        ? st.doc.features
            .filter((f, i) => f.type === 'sketch' && !f.suppressed && (st.rollbackIndex === null || i < st.rollbackIndex) && f.sketchId !== st.activeSketchId && st.doc.sketches[f.sketchId])
            .map((f) => ({ sketch: st.doc.sketches[f.sketchId], plane: st.doc.sketches[f.sketchId].plane }))
        : [],
    [st.doc, st.activeSketchId, st.show.sketches, st.rollbackIndex],
  );

  const planesToDraw = useMemo(() => {
    const ids: PlaneId[] = ['front', 'top', 'right'];
    if (st.planePick) return ids.map((id) => ({ id, highlight: st.hoverPlane === id }));
    const out: { id: PlaneId; highlight: boolean }[] = [];
    for (const id of ids) {
      if (st.show.planes || st.hoverPlane === id) out.push({ id, highlight: st.hoverPlane === id });
    }
    return out;
  }, [st.planePick, st.hoverPlane, st.show.planes]);

  const draw = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer || !hostRef.current) return;
    const colors = readColors(hostRef.current);
    const tr = toolRenderRef.current;
    const selection = new Set(st.selection.filter((s) => s.kind === 'entity').map((s) => s.id));
    const selectedPoints = new Set(st.selection.filter((s) => s.kind === 'point').map((s) => s.id));
    scene.update({
      sketch,
      plane,
      solve,
      selection,
      selectedPoints,
      hover: st.hover,
      preview: tr?.preview ?? [],
      previewPoints: tr?.previewPoints ?? [],
      showGrid: st.show.grid && !!sketch,
      scale: camera.scale,
      colors,
      otherSketches,
      planes: planesToDraw,
      showOrigin: st.show.origin,
      planeSize: Math.max(60, camera.scale * Math.min(size.w, size.h) * 0.3),
      shadedContours: st.shadedContours,
    });
    renderer.render(scene.scene, camera.camera);
  }, [scene, camera, sketch, plane, solve, st.selection, st.hover, st.show.grid, st.show.origin, st.shadedContours, otherSketches, planesToDraw, size]);

  useEffect(() => {
    draw();
  }, [draw, size, theme]);

  useEffect(() => {
    const prev = camera.onChange;
    camera.onChange = () => {
      prev?.();
      draw();
      bump((n) => n + 1);
    };
    return () => {
      camera.onChange = prev;
    };
  }, [camera, draw]);

  const zoomFit = useCallback(() => {
    // fit to sketch geometry only (never to the origin glyph or reference planes)
    const box = new THREE.Box3();
    const addSketch = (sk: typeof sketch, pl: PlaneId) => {
      if (!sk) return;
      const b = sketchBounds(sk);
      if (!b) return;
      box.expandByPoint(sketchToWorld(pl, b.min.x, b.min.y));
      box.expandByPoint(sketchToWorld(pl, b.max.x, b.max.y));
      box.expandByPoint(sketchToWorld(pl, b.min.x, b.max.y));
      box.expandByPoint(sketchToWorld(pl, b.max.x, b.min.y));
    };
    if (sketch) addSketch(sketch, plane);
    else for (const o of otherSketches) addSketch(o.sketch, o.plane);
    camera.fit(box.isEmpty() ? null : box, 1.4);
  }, [camera, sketch, plane, otherSketches]);

  useEffect(() => {
    const w = window as unknown as { __phlippoZoomFit?: () => void; __phlippoProject?: (p: SketchPoint) => { x: number; y: number } };
    w.__phlippoZoomFit = zoomFit;
    w.__phlippoProject = (p) => {
      const r = hostRef.current?.getBoundingClientRect();
      const q = camera.worldToPixel(sketchToWorld(plane, p.x, p.y));
      return { x: q.x + (r?.left ?? 0), y: q.y + (r?.top ?? 0) };
    };
  }, [zoomFit, camera, plane]);

  // ---- tool context ---------------------------------------------------------
  const ctx = (): ToolContext | null => {
    if (!sketch) return null;
    tools.polygonSides = (window as unknown as { __phlippoPolygonSides?: number }).__phlippoPolygonSides ?? 6;
    return {
      sketch,
      tolerance: 8 * camera.scale,
      snapGrid: st.snapGrid,
      gridSize: st.gridSize,
      commit: st.commit,
      select: st.setSelection,
      toggleSelect: st.toggleSelect,
      selectConstraint: st.selectConstraint,
      setHover: st.setHover,
      dragPoint: st.dragPoint,
      onDimensionCreated: (id) => {
        // Modify dialog at the pointer, like the manual describes
        const p = cursorPxRef.current ?? { x: size.w / 2, y: size.h / 2 };
        const r = hostRef.current!.getBoundingClientRect();
        st.setModify({ id, x: r.left + p.x + 16, y: r.top + p.y + 16 });
        onEditDimension(id);
      },
      message: (t) => st.pushMessage(t, 'warn'),
      selection: st.selection,
      freePoints: solve?.freePoints ?? new Set(),
      hitAnnotation: (px, py) => {
        for (const b of labelBoxes.current) if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b.id;
        return null;
      },
    };
  };
  const cursorPxRef = useRef<{ x: number; y: number } | null>(null);

  tools.onAnnotationDrag = (id, delta, phase) => {
    const s = sketch;
    if (!s) return;
    const c = s.constraints[id];
    if (!c) return;
    const base = c.labelOffset ?? (() => {
      const pts = c.refs.map((r) => (r in s.points ? s.points[r] : null)).filter(Boolean) as SketchPoint[];
      if (pts.length) return { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length };
      return { x: 0, y: 0 };
    })();
    if (phase === 'end' && (Math.abs(delta.x) > 1e-6 || Math.abs(delta.y) > 1e-6)) {
      st.commit('Move dimension', (sk) => updateConstraint(sk, id, { labelOffset: { x: base.x + delta.x, y: base.y + delta.y } }));
    }
  };

  const toPointer = (e: React.PointerEvent | React.MouseEvent) => {
    const r = hostRef.current!.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const p = camera.pixelToPlane(px, py, plane) ?? { x: 0, y: 0 };
    return { p, px, py, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, button: e.button };
  };

  const refreshTool = () => {
    const c = ctx();
    toolRenderRef.current = c ? tools.render(c) : null;
    draw();
    bump((n) => n + 1);
  };

  /** which reference plane is under the pixel (plane-pick mode) */
  const planeAt = (px: number, py: number): PlaneId | null => {
    const ray = camera.pixelToRay(px, py);
    const sizeW = Math.max(60, camera.scale * Math.min(size.w, size.h) * 0.3);
    let best: { id: PlaneId; d: number } | null = null;
    for (const id of ['front', 'top', 'right'] as PlaneId[]) {
      const b = PLANES[id];
      const hit = ray.intersectPlane(new THREE.Plane(b.n, 0), new THREE.Vector3());
      if (!hit) continue;
      const u = hit.dot(b.u), v = hit.dot(b.v);
      if (Math.abs(u) <= sizeW && Math.abs(v) <= sizeW * 0.75) {
        // nearest hit along the ray wins (the plane in front)
        const d = hit.distanceTo(ray.origin);
        if (!best || d < best.d) best = { id, d };
      }
    }
    return best?.id ?? null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    hostRef.current?.focus();
    setCtxMenu(null);
    if (e.button === 1) {
      // middle: rotate; Ctrl+middle: pan; Shift+middle: zoom (desktop-CAD convention)
      nav.current = { mode: e.ctrlKey ? 'pan' : e.shiftKey ? 'zoom' : 'orbit', x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      e.preventDefault();
      return;
    }
    if (e.button === 2) return; // context menu on contextmenu event
    const info = toPointer(e);
    if (zoomArea.active) {
      setZoomArea({ active: true, a: { x: info.px, y: info.py }, b: { x: info.px, y: info.py } });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }
    if (st.planePick) {
      const p = planeAt(info.px, info.py);
      if (p) st.newSketch(p);
      return;
    }
    if (st.placing) {
      st.placeItem(info.p);
      return;
    }
    const c = ctx();
    if (!c) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    tools.pointerDown(c, info);
    refreshTool();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const r = hostRef.current!.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    cursorPxRef.current = { x: px, y: py };
    setCursorPx({ x: px, y: py });
    if (nav.current) {
      const dx = e.clientX - nav.current.x, dy = e.clientY - nav.current.y;
      nav.current.x = e.clientX;
      nav.current.y = e.clientY;
      if (nav.current.mode === 'pan') camera.pan(dx, dy);
      else if (nav.current.mode === 'zoom') camera.zoomStep(dy > 0 ? 1 + dy * 0.01 : 1 / (1 - dy * 0.01));
      else camera.orbit(dx, dy);
      return;
    }
    if (zoomArea.active && zoomArea.a) {
      setZoomArea({ ...zoomArea, b: { x: px, y: py } });
      return;
    }
    if (st.planePick) {
      st.setHoverPlane(planeAt(px, py));
      st.setFeedback(planeAt(px, py) ? 'plane' : null);
      return;
    }
    const info = toPointer(e);
    st.setCursor(info.p);
    const c = ctx();
    if (!c) {
      st.setFeedback(null);
      return;
    }
    tools.pointerMove(c, info);
    let hc: string | null = null;
    for (const b of labelBoxes.current) if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) hc = b.id;
    setHoverConstraint(hc);
    // system feedback symbol next to the cursor
    if (hc) st.setFeedback(sketch && sketch.constraints[hc]?.value !== undefined ? 'dimension' : 'relation');
    else {
      const h = hitTest(c.sketch, info.p, c.tolerance);
      st.setFeedback(h ? (h.kind === 'point' ? 'point' : c.sketch.entities[h.id]?.kind ?? null) : null);
    }
    refreshTool();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (nav.current) {
      nav.current = null;
      return;
    }
    if (zoomArea.active && zoomArea.a && zoomArea.b) {
      camera.zoomToArea(zoomArea.a.x, zoomArea.a.y, zoomArea.b.x, zoomArea.b.y);
      setZoomArea({ active: false });
      return;
    }
    const c = ctx();
    if (!c) return;
    tools.pointerUp(c, toPointer(e));
    refreshTool();
  };
  const onWheel = (e: React.WheelEvent) => {
    const r = hostRef.current!.getBoundingClientRect();
    // manual: roll the wheel toward you to zoom in (reversible in Options)
    const zoomIn = st.reverseWheel ? e.deltaY < 0 : e.deltaY > 0;
    camera.zoomAt(e.clientX - r.left, e.clientY - r.top, zoomIn ? 1 / 1.12 : 1.12);
  };
  const onDoubleClick = () => {
    const c = ctx();
    if (!c) return;
    tools.doubleClick(c);
    refreshTool();
  };
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const r = hostRef.current!.getBoundingClientRect();
    setCtxMenu({ x: e.clientX - r.left, y: e.clientY - r.top });
    if (sketch && !st.selection.length) {
      const info = toPointer(e);
      const h = hitTest(sketch, info.p, 8 * camera.scale);
      if (h) st.setSelection([{ kind: h.kind, id: h.id }]);
    }
  };

  // keyboard: Escape / Enter handled here (needs tool state)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomArea.active) setZoomArea({ active: false });
        if (st.show.viewSelector) st.toggleShow('viewSelector');
        if (st.planePick) st.cancelPlanePick();
        if (st.placing) st.cancelPlacing();
        if (st.modify) st.setModify(null);
        if (ctxMenu) setCtxMenu(null);
        const c = ctx();
        if (!c) return;
        if (tools.cancel()) {
          e.stopPropagation();
          st.setTool('select');
        } else if (st.tool !== 'select') st.setTool('select');
        else if (st.selection.length || st.selectedConstraint) st.setSelection([]);
        refreshTool();
      } else if (e.key === 'Enter' && !(e.target instanceof HTMLInputElement)) {
        const c = ctx();
        if (!c) return;
        if (tools.busy) tools.enter(c);
        else st.repeatLastTool();
        refreshTool();
      } else if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target instanceof HTMLInputElement)) {
        // D: move the confirmation corner (OK/Cancel) to the pointer
        if (sketch) st.setConfirmAtCursor(st.confirmAtCursor ? null : cursorPxRef.current);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const project = useCallback((p: SketchPoint) => camera.worldToPixel(sketchToWorld(plane, p.x, p.y)), [camera, plane]);

  // context toolbar items (relations for the selection) + shortcut menu
  const ctxItems = (): { toolbar: MenuItem[]; menu: MenuItem[] } => {
    if (!sketch) {
      return {
        toolbar: [],
        menu: [
          { label: 'Sketch', icon: <Icon.Sketch />, onSelect: st.startPlanePick },
          { label: 'Zoom to fit', icon: <Icon.Fit />, shortcut: 'F', onSelect: zoomFit },
          { label: 'View Orientation…', icon: <Icon.Orientation />, shortcut: 'Space', onSelect: () => st.setDialog('orientation') },
          { separator: true },
          { label: `${st.show.planes ? '✓ ' : ''}Show Planes`, icon: <Icon.Plane />, onSelect: () => st.toggleShow('planes') },
        ],
      };
    }
    const rel = relationsForSelection(sketch, st.selection);
    const toolbar: MenuItem[] = rel.map((o) => {
      const G = RelationGlyph[o.kind];
      return { label: o.label, icon: G ? <G size={14} /> : undefined, onSelect: () => st.addRelation(o.kind, o.refs, { internal: o.internal }) };
    });
    const hasEnt = st.selection.some((s) => s.kind === 'entity');
    const menu: MenuItem[] = [
      { label: 'Select', icon: <Icon.Select />, shortcut: 'Esc', onSelect: () => st.setTool('select') },
      { label: 'Smart Dimension', icon: <Icon.Dimension />, shortcut: 'M', onSelect: () => st.setTool('dimension') },
      { separator: true },
      ...(hasEnt
        ? [
            { label: 'Construction Geometry', icon: <Icon.Construction />, shortcut: 'X', onSelect: st.toggleConstructionSelection },
            { label: 'Mirror Entities', icon: <Icon.Mirror />, onSelect: st.mirrorSelection },
            { label: 'Delete', icon: <Icon.Trash />, shortcut: 'Del', onSelect: st.deleteSelection },
            { separator: true },
          ]
        : []),
      { label: 'Display/Delete Relations', icon: <Icon.Lock />, onSelect: () => st.setTaskPane('relations') },
      { label: 'Exit Sketch', icon: <Icon.Exit />, onSelect: st.exitSketch },
      { separator: true },
      { label: 'Zoom to fit', icon: <Icon.Fit />, shortcut: 'F', onSelect: zoomFit },
      { label: 'Normal To', icon: <Icon.Plane />, shortcut: 'Ctrl+8', onSelect: () => camera.normalTo(plane) },
    ];
    return { toolbar, menu };
  };

  const unit = st.doc.units;
  const feedback = st.feedback;
  return (
    <div
      ref={hostRef}
      className={`k-viewport ${sketch ? 'sketching tool-' + st.tool : ''} ${st.planePick || zoomArea.active ? 'picking' : ''} ${feedback ? 'has-feedback' : ''}`}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => { setCursorPx(null); st.setFeedback(null); }}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <Overlay
        sketch={sketch}
        solve={solve}
        unit={unit}
        project={project}
        toolRender={toolRenderRef.current}
        showRelations={st.show.relations}
        selectedConstraint={st.selectedConstraint}
        hoverConstraint={hoverConstraint}
        onConstraintClick={(id) => st.selectConstraint(id)}
        onConstraintDoubleClick={(id) => {
          const p = cursorPxRef.current ?? { x: 0, y: 0 };
          const r = hostRef.current!.getBoundingClientRect();
          st.selectConstraint(id);
          st.setModify({ id, x: r.left + p.x + 16, y: r.top + p.y + 16 });
          onEditDimension(id);
        }}
        width={size.w}
        height={size.h}
        pxPerUnit={1 / camera.scale}
        registerLabels={(b) => {
          labelBoxes.current = b;
        }}
      />
      {/* plane labels in plane-pick mode / hover */}
      {planesToDraw.map((pl) => {
        const b = PLANES[pl.id];
        const sizeW = Math.max(60, camera.scale * Math.min(size.w, size.h) * 0.3);
        const corner = b.u.clone().multiplyScalar(-sizeW * 0.95).addScaledVector(b.v, sizeW * 0.65);
        const p = camera.worldToPixel(corner);
        return (
          <span key={pl.id} className={`k-plane-label ${pl.highlight ? 'hl' : ''}`} style={{ left: p.x, top: p.y }}>
            {PLANE_LABELS[pl.id]}
          </span>
        );
      })}
      {zoomArea.a && zoomArea.b && (
        <div className="k-zoom-rect" style={{ left: Math.min(zoomArea.a.x, zoomArea.b.x), top: Math.min(zoomArea.a.y, zoomArea.b.y), width: Math.abs(zoomArea.a.x - zoomArea.b.x), height: Math.abs(zoomArea.a.y - zoomArea.b.y) }} />
      )}
      <Hud camera={camera} zoomFit={zoomFit} onZoomArea={() => setZoomArea({ active: !zoomArea.active })} zoomAreaActive={zoomArea.active} />
      {sketch && <ConfirmationCorner sketch onOk={st.exitSketch} onCancel={st.discardSketch} />}
      {st.planePick && <ConfirmationCorner sketch={false} onOk={() => st.hoverPlane && st.newSketch(st.hoverPlane)} onCancel={st.cancelPlanePick} />}
      {st.show.viewSelector && <ViewSelector camera={camera} onClose={() => st.toggleShow('viewSelector')} />}
      <div className="k-triad-wrap">
        <Triad camera={camera} />
        <span className="k-viewname">{st.viewName}</span>
      </div>
      {feedback && cursorPx && (
        <span className="k-feedback" style={{ left: cursorPx.x + 14, top: cursorPx.y + 10 }}>
          {FEEDBACK_ICON[feedback]}
        </span>
      )}
      {ctxMenu && (() => {
        const { toolbar, menu } = ctxItems();
        return (
          <div className="k-ctx" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
            {toolbar.length > 0 && (
              <div className="k-ctx-toolbar">
                {toolbar.map((t, i) => (
                  <button key={i} className="k-btn ghost icon k-tip" data-tip={t.label} onClick={() => { t.onSelect?.(); setCtxMenu(null); }}>
                    {t.icon}
                  </button>
                ))}
              </div>
            )}
            <Menu items={menu} onClose={() => setCtxMenu(null)} style={{ position: 'static' }} />
          </div>
        );
      })()}
      <div className="k-doctabs">
        <button className="k-doctab-arrow">‹</button>
        <button className="k-doctab-arrow">›</button>
        <button className="k-doctab active">Model</button>
        <button className="k-doctab">Motion Study 1</button>
      </div>
      {!sketch && !st.planePick && st.doc.features.length === 0 && (
        <div className="k-viewport-empty">
          <Icon.Logo size={44} />
          <div>Click <b>Sketch</b> in the CommandManager and select a plane, or double-click a plane in the FeatureManager design tree.</div>
        </div>
      )}
    </div>
  );
}
