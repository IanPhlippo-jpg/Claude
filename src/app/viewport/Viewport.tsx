import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { CadCamera, sketchToWorld, type PlaneId } from './camera';
import { readColors, SketchScene } from './sketchScene';
import { ToolController, type ToolContext, type ToolRender } from './tools';
import { Overlay } from './Overlay';
import { Triad, ViewCube } from './ViewCube';
import { Icon } from '../../ui/icons';
import type { SketchPoint } from '../../core/sketch/types';
import { updateConstraint } from '../../core/sketch/model';
import { sketchBounds } from '../../core/sketch/geometry';

export interface ViewportHandle {
  camera: CadCamera;
  zoomFit: () => void;
}

let sharedCamera: CadCamera | null = null;
export function getCamera(): CadCamera {
  if (!sharedCamera) sharedCamera = new CadCamera();
  return sharedCamera;
}

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
  const labelBoxes = useRef<{ id: string; x: number; y: number; w: number; h: number }[]>([]);
  const toolRenderRef = useRef<ToolRender | null>(null);
  const nav = useRef<{ mode: 'orbit' | 'pan'; x: number; y: number } | null>(null);

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
    return () => {
      ro.disconnect();
      renderer.dispose();
    };
  }, [camera]);

  // orientation: normal to the sketch plane when editing
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
      st.doc.features
        .filter((f) => f.type === 'sketch' && !f.suppressed && f.sketchId !== st.activeSketchId && st.doc.sketches[f.sketchId])
        .map((f) => ({ sketch: st.doc.sketches[f.sketchId], plane: st.doc.sketches[f.sketchId].plane })),
    [st.doc, st.activeSketchId],
  );

  // redraw scene whenever state changes
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
      showGrid: st.showGrid && !!sketch,
      scale: camera.scale,
      colors,
      otherSketches,
    });
    renderer.render(scene.scene, camera.camera);
  }, [scene, camera, sketch, plane, solve, st.selection, st.hover, st.showGrid, otherSketches]);

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
    if (sketch) {
      const b = sketchBounds(sketch);
      if (b) {
        const box = new THREE.Box3();
        box.expandByPoint(sketchToWorld(plane, b.min.x, b.min.y));
        box.expandByPoint(sketchToWorld(plane, b.max.x, b.max.y));
        box.expandByPoint(sketchToWorld(plane, b.min.x, b.max.y));
        box.expandByPoint(sketchToWorld(plane, b.max.x, b.min.y));
        camera.fit(box, 1.4);
        return;
      }
    }
    camera.fit(scene.bounds(), 1.4);
  }, [camera, scene, sketch, plane]);

  useEffect(() => {
    (window as unknown as { __kalibrZoomFit?: () => void }).__kalibrZoomFit = zoomFit;
  }, [zoomFit]);

  // ---- tool context ---------------------------------------------------------
  const ctx = (): ToolContext | null => {
    if (!sketch) return null;
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
      onDimensionCreated: onEditDimension,
      message: (t) => st.pushMessage(t, 'warn'),
      selection: st.selection,
      freePoints: solve?.freePoints ?? new Set(),
      hitAnnotation: (px, py) => {
        for (const b of labelBoxes.current) if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b.id;
        return null;
      },
    };
  };

  tools.onAnnotationDrag = (id, delta, phase) => {
    const s = sketch;
    if (!s) return;
    const c = s.constraints[id];
    if (!c) return;
    const base = c.labelOffset ?? (() => {
      // compute current default label via annotations: approximate with midpoint of refs
      const pts = c.refs.map((r) => (r in s.points ? s.points[r] : null)).filter(Boolean) as SketchPoint[];
      if (pts.length) return { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length };
      return { x: 0, y: 0 };
    })();
    if (phase === 'end' && (Math.abs(delta.x) > 1e-6 || Math.abs(delta.y) > 1e-6)) {
      st.commit('Maat verplaatsen', (sk) => updateConstraint(sk, id, { labelOffset: { x: base.x + delta.x, y: base.y + delta.y } }));
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

  const onPointerDown = (e: React.PointerEvent) => {
    hostRef.current?.focus();
    if (e.button === 1 || e.button === 2) {
      nav.current = { mode: e.button === 2 || e.ctrlKey ? 'pan' : 'orbit', x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      e.preventDefault();
      return;
    }
    const c = ctx();
    if (!c) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    tools.pointerDown(c, toPointer(e));
    refreshTool();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (nav.current) {
      const dx = e.clientX - nav.current.x, dy = e.clientY - nav.current.y;
      nav.current.x = e.clientX;
      nav.current.y = e.clientY;
      if (nav.current.mode === 'pan') camera.pan(dx, dy);
      else if (!sketch) camera.orbit(dx, dy);
      else camera.pan(dx, dy); // in a sketch, middle-drag pans (rotation would leave the plane)
      return;
    }
    const info = toPointer(e);
    st.setCursor(info.p);
    const c = ctx();
    if (!c) return;
    tools.pointerMove(c, info);
    // hover on annotations
    let hc: string | null = null;
    for (const b of labelBoxes.current) if (info.px >= b.x && info.px <= b.x + b.w && info.py >= b.y && info.py <= b.y + b.h) hc = b.id;
    setHoverConstraint(hc);
    refreshTool();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (nav.current) {
      nav.current = null;
      return;
    }
    const c = ctx();
    if (!c) return;
    tools.pointerUp(c, toPointer(e));
    refreshTool();
  };
  const onWheel = (e: React.WheelEvent) => {
    const r = hostRef.current!.getBoundingClientRect();
    camera.zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY > 0 ? 1.12 : 1 / 1.12);
  };
  const onDoubleClick = () => {
    const c = ctx();
    if (!c) return;
    tools.doubleClick(c);
    refreshTool();
  };

  // keyboard handled globally in shortcuts; expose cancel/enter via window events
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = ctx();
      if (!c) return;
      if (e.key === 'Escape') {
        if (tools.cancel()) e.stopPropagation();
        else if (st.tool !== 'select') st.setTool('select');
        else if (st.selection.length || st.selectedConstraint) st.setSelection([]);
        refreshTool();
      } else if (e.key === 'Enter' && !(e.target instanceof HTMLInputElement)) {
        tools.enter(c);
        refreshTool();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const project = useCallback((p: SketchPoint) => camera.worldToPixel(sketchToWorld(plane, p.x, p.y)), [camera, plane]);

  const unit = st.doc.units;
  return (
    <div
      ref={hostRef}
      className={`k-viewport ${sketch ? 'sketching tool-' + st.tool : ''}`}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <Overlay
        sketch={sketch}
        solve={solve}
        unit={unit}
        project={project}
        toolRender={toolRenderRef.current}
        showRelations={st.showRelations}
        selectedConstraint={st.selectedConstraint}
        hoverConstraint={hoverConstraint}
        onConstraintClick={(id) => st.selectConstraint(id)}
        onConstraintDoubleClick={(id) => onEditDimension(id)}
        width={size.w}
        height={size.h}
        pxPerUnit={1 / camera.scale}
        registerLabels={(b) => {
          labelBoxes.current = b;
        }}
      />
      {/* heads-up view toolbar */}
      <div className="k-hud">
        <button className="k-btn ghost icon k-tip" data-tip="Zoom to fit (F)" onClick={zoomFit}><Icon.Fit /></button>
        {sketch && <button className="k-btn ghost icon k-tip" data-tip="Normal to (Ctrl+8)" onClick={() => camera.normalTo(plane)}><Icon.Plane /></button>}
        <button className={`k-btn ghost icon k-tip ${st.showGrid ? 'active' : ''}`} data-tip="Raster" onClick={() => st.toggle('showGrid')}><Icon.Grid /></button>
        <button className={`k-btn ghost icon k-tip ${st.showRelations ? 'active' : ''}`} data-tip="Relaties tonen" onClick={() => st.toggle('showRelations')}><Icon.Lock /></button>
      </div>
      <ViewCube camera={camera} />
      <Triad camera={camera} />
      {!sketch && (
        <div className="k-viewport-empty">
          <Icon.Logo size={44} />
          <div>Geen actieve schets. Kies <b>Features ▸ Schets</b> of druk op <span className="k-kbd">Ctrl+Shift+S</span> om op een vlak te beginnen.</div>
        </div>
      )}
    </div>
  );
}
