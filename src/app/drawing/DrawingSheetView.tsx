import { bridge } from '../viewport/bridge';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../../ui/icons';
import { drawingToolClick, tableGrid } from './DrawingExtras';
import { alternateLines, faceRegionAt, alignedPosition, nearestCircle, nearestLine, projectedPlacement, projectedView, sectionFlipFor, sectionFrame, sheetSize, sheetToView, viewBounds, viewGeometry, viewOnSheet, viewScale, viewToSheet } from '../../core/drawing/sheet';
import { viewFrame } from '../../core/drawing/hlr';
import { layoutBalloons, visibleAnchors } from '../../core/drawing/balloons';
import { dimensionText } from '../../core/drawing/dimtext';
import type { DrawingSheet, DrawingView } from '../../core/document/types';
import { lengthDecimals } from '../prefs';
import { partRebuild, rebuildAssembly } from '../../core/assembly/assembly';
import * as THREE from 'three';
import { massProperties } from '../../core/features/measure';

let symbolSeq = 0;
/** ids for symbols / magnetic lines created here in one go (one undo step) */
const newSymbolId = () => `sy${Date.now().toString(36)}${(++symbolSeq).toString(36)}`;

/** px per sheet mm at zoom 1 */
const BASE = 3;

/**
 * The drawing sheet: paper (the intended default paper colour) with border, zones and title block (Sheet Format1), the views
 * (visible lines solid, hidden lines dashed), center marks, dimensions and notes. Middle-drag pans,
 * the wheel zooms at the cursor, views are dragged with the left button; placing views, dimensions
 * and notes follows the active command (drawingEdit).
 */
/** the intended default drawing paper colour (Options ▸ Colors ▸ Drawings, Paper Color) */
export const PAPER = '#e8e8e0';

/** the sheet tabs under the graphics area (Sheet1, Add Sheet), by design */
const SHEET_TABS_H = 21;

export function DrawingSheetView() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, drawingEdit: s.drawingEdit, prefs: s.prefs, reverseWheel: s.reverseWheel, drawingTool: s.drawingTool, placeView: s.placeView, placeProjectedView: s.placeProjectedView, pushMessage: s.pushMessage, placeDrawingDimension: s.placeDrawingDimension, startDrawingDimensionOnCircle: s.startDrawingDimensionOnCircle, startDrawingDimensionOnLine: s.startDrawingDimensionOnLine, placeNote: s.placeNote, setSectionLine: s.setSectionLine, placeSectionView: s.placeSectionView, setDetailCircle: s.setDetailCircle, placeDetailView: s.placeDetailView, addBrokenOutPoint: s.addBrokenOutPoint, setAuxEdge: s.setAuxEdge, placeAuxView: s.placeAuxView, setDrawingEdit: s.setDrawingEdit, setViewCrop: s.setViewCrop, setViewBreak: s.setViewBreak, applyDocument: s.applyDocument, cancelDrawingEdit: s.cancelDrawingEdit, addSymbol: s.addSymbol, addRevision: s.addRevision, addCenterMark: s.addCenterMark, selectDrawingDimension: s.selectDrawingDimension, selectedDrawingDimensionId: s.selectedDrawingDimensionId, beginAnnotationMove: s.beginAnnotationMove, selectDrawingView: s.selectDrawingView, setManagerTab: s.setManagerTab, moveAnnotation: s.moveAnnotation, updateDrawingDimension: s.updateDrawingDimension, moveDrawingView: s.moveDrawingView, commitViewMove: s.commitViewMove, selectedDrawingViewId: s.selectedDrawingViewId, setDrawingTool: s.setDrawingTool, deleteDrawingView: s.deleteDrawingView, activateSheet: s.activateSheet, setDialog: s.setDialog, addSheet: s.addSheet })));
  const sheet = st.doc.sheets?.[0];
  // WEIGHT in the title block: the mass of the first view's model (part material density)
  const firstModel = sheet?.views[0]?.model;
  const weight = useMemo(() => {
    if (!firstModel || firstModel.kind === 'assembly') return '';
    const body = partRebuild(firstModel).bodies[0];
    if (!body) return '';
    const m = massProperties(body.geometry, firstModel.material ? firstModel.material.density / 1e6 : 0.001).mass;
    return `${m.toFixed(1)} g`;
  }, [firstModel]);
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [zoom, setZoom] = useState<{ k: number; x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const statusRaf = useRef(0);
  const drag = useRef<{ kind: 'pan' | 'view' | 'annot'; x: number; y: number; viewId?: string; start?: [number, number]; annot?: { kind: 'symbol' | 'note' | 'table' | 'dimension'; id: string } } | null>(null);
  const [dragAnnot, setDragAnnot] = useState<string | null>(null);
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
    // the host is a new element once the sheet exists (the empty host above returns early): measure that one
  }, [!!sheet]);
  const [sw, sh] = sheet ? sheetSize(sheet) : [297, 210];
  // zoom to fit: the sheet fills the host with a margin
  // the sheet keeps fitting the window (resizes, panels) until the user zooms or pans
  const manualZoom = useRef(false);
  const fit = useCallback(() => {
    manualZoom.current = false;
    const k = Math.min((size.w - 40) / (sw * BASE), (size.h - SHEET_TABS_H - 40) / (sh * BASE));
    setZoom({ k, x: (size.w - sw * BASE * k) / 2, y: (size.h - SHEET_TABS_H - sh * BASE * k) / 2 });
  }, [size, sw, sh]);
  useEffect(() => {
    if (!manualZoom.current) fit();
  }, [fit]);
  // Zoom to Sheet (F, the ribbon, the menu) while the sheet is shown; the model's Zoom to Fit returns when it closes
  useEffect(() => {
    bridge.sheetFit = fit;
    return () => { if (bridge.sheetFit === fit) bridge.sheetFit = undefined; };
  }, [fit]);
  const z = zoom ?? { k: 1, x: 0, y: 0 };
  // sheet mm -> screen px (sheet origin bottom-left)
  const toPx = (p: [number, number]): [number, number] => [z.x + p[0] * BASE * z.k, z.y + (sh - p[1]) * BASE * z.k];
  const toSheet = (px: number, py: number): [number, number] => [(px - z.x) / (BASE * z.k), sh - (py - z.y) / (BASE * z.k)];
  const pxOf = (e: React.PointerEvent | React.WheelEvent): [number, number] => {
    const r = hostRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  // sheet mm <-> screen px of the sheet host (for the test hooks)
  useEffect(() => {
    bridge.sheet = { toPx: (p: [number, number]) => { const r = hostRef.current!.getBoundingClientRect(); const q = toPx(p); return { x: q[0] + r.left, y: q[1] + r.top }; }, toSheet, viewToSheet: (viewId: string, p: [number, number]) => { const v = sheet?.views.find((x) => x.id === viewId); return v && sheet ? viewToSheet(sheet, v, viewGeometry(v), p) : null; }, bounds: (viewId: string) => { const v = sheet?.views.find((x) => x.id === viewId); return v && sheet ? viewBounds(sheet, v, viewGeometry(v)) : null; } };
  });
  const de = st.drawingEdit;
  const firstAngle = st.prefs['doc.standard'] === 'ISO' || st.prefs['doc.standard'] === 'DIN';

  const viewAt = (p: [number, number]): DrawingView | null => {
    if (!sheet) return null;
    for (const v of [...sheet.views].reverse()) {
      const b = viewBounds(sheet, v, viewGeometry(v));
      if (p[0] >= b.x && p[0] <= b.x + b.w && p[1] >= b.y && p[1] <= b.y + b.h) return v;
    }
    return null;
  };

  /** the annotation under a sheet point: balloons and symbols by their position, notes by their text, tables by their frame */
  const annotationAt = (p: [number, number]): { kind: 'symbol' | 'note' | 'table' | 'dimension'; id: string; start: [number, number] } | null => {
    if (!sheet) return null;
    for (const sy of [...(sheet.symbols ?? [])].reverse()) {
      if (sy.kind === 'areaHatch' || sy.kind === 'centerline' || sy.kind === 'cloud') continue;
      if (Math.hypot(sy.position[0] - p[0], sy.position[1] - p[1]) < (sy.kind === 'balloon' ? 4 : 5)) return { kind: 'symbol', id: sy.id, start: sy.position };
    }
    for (const d of [...sheet.dimensions].reverse()) {
      const v = sheet.views.find((x) => x.id === d.viewId);
      if (!v) continue;
      const g = viewGeometry(v);
      let lp = viewToSheet(sheet, v, g, d.label);
      if (d.kind === 'linear') {
        // the text sits on the dimension line: the middle between the witness lines at the label's offset
        const A = viewToSheet(sheet, v, g, d.a), B = viewToSheet(sheet, v, g, d.b);
        if (d.orientation === 'h') lp = [(A[0] + B[0]) / 2, lp[1]];
        else if (d.orientation === 'v') lp = [lp[0], (A[1] + B[1]) / 2];
      }
      if (Math.abs(p[0] - lp[0]) < 7 && Math.abs(p[1] - lp[1]) < 4) return { kind: 'dimension', id: d.id, start: viewToSheet(sheet, v, g, d.label) };
    }
    for (const n of [...sheet.notes].reverse()) {
      const fs = n.fontSize ?? 3.5;
      if (p[0] >= n.position[0] - 1 && p[0] <= n.position[0] + n.text.length * fs * 0.62 + 1 && p[1] >= n.position[1] - 1.5 && p[1] <= n.position[1] + fs + 0.5) return { kind: 'note', id: n.id, start: n.position };
    }
    for (const t of [...(sheet.tables ?? [])].reverse()) {
      const g = tableGrid(sheet, t);
      if (g && p[0] >= g.pos[0] && p[0] <= g.pos[0] + g.w && p[1] <= g.pos[1] && p[1] >= g.pos[1] - g.h) return { kind: 'table', id: t.id, start: g.pos };
    }
    return null;
  };

  const onWheel = (e: React.WheelEvent) => {
    const [px, py] = pxOf(e);
    const zoomIn = st.reverseWheel ? e.deltaY < 0 : e.deltaY > 0;
    const f = zoomIn ? 1.12 : 1 / 1.12;
    const nk = Math.max(0.05, Math.min(40, z.k * f));
    const sx = (px - z.x) / z.k, sy = (py - z.y) / z.k;
    manualZoom.current = true;
    setZoom({ k: nk, x: px - sx * nk, y: py - sy * nk });
  };
  const onPointerDown = (e: React.PointerEvent) => {
    hostRef.current?.focus();
    const [px, py] = pxOf(e);
    if (e.button === 1) {
      drag.current = { kind: 'pan', x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      e.preventDefault();
      return;
    }
    if (e.button !== 0 || !sheet) return;
    const p = toSheet(px, py);
    if (st.drawingTool && drawingToolClick(p)) return;
    if (de?.mode === 'modelView' && de.model) {
      st.placeView(p);
      return;
    }
    if (de?.mode === 'projected' && de.parentId) {
      const parent = sheet.views.find((v) => v.id === de.parentId);
      if (parent) {
        const dir = directionFrom(parent, p);
        const type = dir && projectedPlacement(parent, dir, firstAngle);
        if (dir && type) st.placeProjectedView(type, alignedPosition(parent, dir, p), parent.id);
        else st.pushMessage('Move the cursor above, below, left or right of the parent view to project it.', 'warn');
      }
      return;
    }
    if (de?.mode === 'dimension') {
      const v = viewAt(p);
      if (de.dimStart) {
        st.placeDrawingDimension(p);
        return;
      }
      if (v) {
        const c = nearestCircle(sheet, v, p);
        const l = nearestLine(sheet, v, p);
        const tol = 2 / z.k;
        // a circle wins over the short facet lines it is drawn with
        if (c && c.distance < tol) st.startDrawingDimensionOnCircle(v.id, c.viewCircle);
        else if (l && l.distance < tol) st.startDrawingDimensionOnLine(v.id, l.viewLine);
        else st.pushMessage('Select an edge or a circle of a drawing view.', 'warn');
      }
      return;
    }
    if (de?.mode === 'note') {
      st.placeNote(p);
      return;
    }
    if (de?.mode === 'section') {
      if (de.sectionAt === undefined) {
        const v = viewAt(p);
        if (!v || v.section || v.detail) {
          st.pushMessage('Click in a model view to place the cutting line.', 'warn');
          return;
        }
        const q = sheetToView(sheet, v, viewGeometry(v), p);
        st.setSectionLine(v.id, de.sectionAxis === 'h' ? q[1] : q[0]);
      } else st.placeSectionView(p);
      return;
    }
    if (de?.mode === 'detail') {
      if (!de.detailCenter) {
        const v = viewAt(p);
        if (!v || v.section || v.detail) {
          st.pushMessage('Click in a model view for the centre of the detail circle.', 'warn');
          return;
        }
        st.setDetailCircle(v.id, sheetToView(sheet, v, viewGeometry(v), p));
      } else if (!de.detailRadius) {
        const v = sheet.views.find((x) => x.id === de.parentId)!;
        const q = sheetToView(sheet, v, viewGeometry(v), p);
        const hw = Math.max(1, Math.abs(q[0] - de.detailCenter[0])), hh = Math.max(1, Math.abs(q[1] - de.detailCenter[1]));
        if (de.detailProfile) st.setDetailCircle(v.id, de.detailCenter, Math.hypot(hw, hh), [hw, hh]);
        else st.setDetailCircle(v.id, de.detailCenter, Math.max(1, Math.hypot(q[0] - de.detailCenter[0], q[1] - de.detailCenter[1])));
      } else st.placeDetailView(p);
      return;
    }
    if (de?.mode === 'brokenOut' && de.brokenOut && !de.brokenOut.closed) {
      const bo = de.brokenOut;
      const v = bo.points.length ? sheet.views.find((x) => x.id === bo.viewId) : viewAt(p);
      if (!v || v.section || v.detail || v.aux) {
        st.pushMessage('Draw the closed profile in a model view.', 'warn');
        return;
      }
      const g = viewGeometry({ ...v, brokenOut: undefined, crop: undefined, break: undefined });
      const q = sheetToView(sheet, v, g, p);
      // clicking the first point again closes the profile
      const first = bo.points[0] ? viewToSheet(sheet, v, g, bo.points[0]) : null;
      const close = !!first && bo.points.length >= 3 && Math.hypot(first[0] - p[0], first[1] - p[1]) < 2.5;
      st.addBrokenOutPoint(v.id, q, close);
      return;
    }
    if (de?.mode === 'aux') {
      if (!de.auxEdge) {
        const v = viewAt(p);
        const hit = v && !v.section && !v.detail ? nearestLine(sheet, v, p) : null;
        if (!v || !hit || hit.distance > 3) {
          st.pushMessage('Select a linear edge in a model view.', 'warn');
          return;
        }
        st.setAuxEdge(v.id, hit.viewLine.a, hit.viewLine.b);
      } else st.placeAuxView(p);
      return;
    }
    if ((de?.mode === 'crop' || de?.mode === 'break') && de.viewTool) {
      const v = sheet.views.find((x) => x.id === de.viewTool!.viewId);
      if (!v) return;
      const g = viewGeometry({ ...v, crop: undefined, break: undefined });
      const q = sheetToView(sheet, v, g, p);
      if (!de.viewTool.first) {
        st.setDrawingEdit({ viewTool: { ...de.viewTool, first: q } });
        return;
      }
      const f = de.viewTool.first;
      if (de.mode === 'crop') st.setViewCrop(v.id, { min: [Math.min(f[0], q[0]), Math.min(f[1], q[1])], max: [Math.max(f[0], q[0]), Math.max(f[1], q[1])] });
      else {
        const k = de.viewTool.axis === 'y' ? 1 : 0;
        st.setViewBreak(v.id, { axis: de.viewTool.axis ?? 'x', a: Math.min(f[k], q[k]), b: Math.max(f[k], q[k]), gap: de.breakGap ?? 6, ...(de.breakStyle && de.breakStyle !== 'zigzag' ? { style: de.breakStyle } : {}) });
      }
      return;
    }
    if (de?.mode === 'symbol' && de.symbolKind) {
      const kind = de.symbolKind;
      const v = viewAt(p);
      if (kind === 'autoBalloon') {
        if (!v) {
          st.pushMessage('Click in a drawing view for Auto Balloon.', 'warn');
          return;
        }
        const ab = autoBalloons(v);
        st.applyDocument('Auto Balloon', { ...st.doc, sheets: [{ ...sheet, symbols: [...(sheet.symbols ?? []), ...ab.symbols], magneticLines: [...(sheet.magneticLines ?? []), ...ab.lines] }, ...(st.doc.sheets ?? []).slice(1)] });
        st.cancelDrawingEdit();
        return;
      }
      if (kind === 'centerline') {
        const l = v ? nearestLine(sheet, v, p) : null;
        if (!v || !l || l.distance > 3 / z.k) {
          st.pushMessage('Select two parallel edges in a drawing view.', 'warn');
          return;
        }
        if (!de.symbolLine) {
          st.setDrawingEdit({ symbolLine: [l.line.a, l.line.b] });
          return;
        }
        const [a1, b1] = de.symbolLine;
        let [a2, b2] = [l.line.a, l.line.b];
        if (Math.hypot(a1[0] - a2[0], a1[1] - a2[1]) > Math.hypot(a1[0] - b2[0], a1[1] - b2[1])) [a2, b2] = [b2, a2];
        const A: [number, number] = [(a1[0] + a2[0]) / 2, (a1[1] + a2[1]) / 2], B: [number, number] = [(b1[0] + b2[0]) / 2, (b1[1] + b2[1]) / 2];
        const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, ext = 2.5;
        st.addSymbol({ kind: 'centerline', position: A, a: [A[0] - (dx / L) * ext, A[1] - (dy / L) * ext], b: [B[0] + (dx / L) * ext, B[1] + (dy / L) * ext] });
        return;
      }
      if (kind === 'areaHatch') {
        const hv = viewAt(p);
        if (!hv || hv.section || hv.detail || hv.aux) {
          st.pushMessage('Click a face in a model view.', 'warn');
          return;
        }
        const g = viewGeometry(hv);
        const tris = faceRegionAt(hv.model, hv.type, sheetToView(sheet, hv, g, p));
        if (!tris) {
          st.pushMessage('No face facing the view at that point.', 'warn');
          return;
        }
        st.addSymbol({ kind: 'areaHatch', position: p, viewId: hv.id, tris });
        return;
      }
      if (kind === 'revision') {
        // a revision symbol carries the current revision; the first one starts the revision table with A
        let revs = sheet.revisions ?? [];
        if (!revs.length) { st.addRevision(''); revs = useStore.getState().doc.sheets?.[0]?.revisions ?? []; }
        st.addSymbol({ kind: 'revision', position: p, text: revs[revs.length - 1]?.rev ?? 'A' });
        return;
      }
      if (!de.symbolAnchor) {
        if (kind === 'holeCallout') {
          const c = v ? nearestCircle(sheet, v, p) : null;
          if (!v || !c || c.distance > 3 / z.k) {
            st.pushMessage('Select the edge of a hole in a drawing view.', 'warn');
            return;
          }
          const dx = p[0] - c.circle.c[0], dy = p[1] - c.circle.c[1], L = Math.hypot(dx, dy) || 1;
          const dia = 2 * c.viewCircle.r;
          // a tapped hole of the Hole Tool with "With thread callout": the thread designation, by design
          const tap = v.model.kind !== 'assembly' ? v.model.features.find((x) => x.type === 'hole' && !x.suppressed && x.holeType === 'tap' && x.threadDiameter && (Math.abs(x.diameter - dia) < 0.05 || Math.abs(x.threadDiameter - dia) < 0.05)) : undefined;
          const text = tap && tap.type === 'hole' && tap.threadCallout !== false
            ? `${tap.sizeName ?? `M${tap.threadDiameter}`}x${(tap.pitch ?? 1).toFixed(1)} - 6H ${tap.depth > 0 ? `▼ ${(tap.threadDepth || tap.depth).toFixed(2)}` : 'THRU'}`
            : `Ø${dia.toFixed(2)} THRU ALL`;
          st.setDrawingEdit({ symbolAnchor: [c.circle.c[0] + (dx / L) * c.circle.r, c.circle.c[1] + (dy / L) * c.circle.r], symbolText: text });
          return;
        }
        if (kind === 'balloon') {
          if (!v) {
            st.pushMessage('Click on a component in a drawing view.', 'warn');
            return;
          }
          // Balloon text: item number (default), the quantity of that part, or the custom text typed in the PM
          const item = balloonItem(v, p);
          const qty = v.model.kind === 'assembly' ? String((v.model.components ?? []).filter((c) => c.part.name === componentCentres(v).find((x) => String(x.item) === item)?.name).length || 1) : '1';
          st.setDrawingEdit({ symbolAnchor: p, symbolText: de.balloonText === 'quantity' ? qty : de.balloonText === 'custom' ? de.symbolText ?? '' : item });
          return;
        }
        st.setDrawingEdit({ symbolAnchor: p });
        return;
      }
      const base = { position: p, anchor: de.symbolAnchor };
      if (kind === 'balloon') st.addSymbol({ ...base, kind, text: de.symbolText ?? '1', ...(de.balloonShape && de.balloonShape !== 'circular' ? { shape: de.balloonShape } : {}), ...(de.balloonSize && de.balloonSize !== '2' ? { size: de.balloonSize } : {}) });
      else if (kind === 'holeCallout') st.addSymbol({ ...base, kind, text: de.symbolText ?? '' });
      else if (kind === 'surfaceFinish') st.addSymbol({ ...base, kind, text: de.finish ?? '3.2' });
      else if (kind === 'datum') st.addSymbol({ ...base, kind, text: de.symbolText ?? 'A' });
      else if (kind === 'gtol') st.addSymbol({ ...base, kind, symbol: de.gtolSymbol ?? '⏥', tol: de.gtolTol ?? '0.05', datum: de.gtolDatum ?? '' });
      else if (kind === 'cloud') st.addSymbol({ kind, position: p, a: de.symbolAnchor, b: p });
      else if (kind === 'weld') st.addSymbol({ ...base, kind, text: de.symbolText ?? '5', contour: de.weldContour ?? 'fillet' });
      else if (kind === 'datumTarget') st.addSymbol({ ...base, kind, text: de.symbolText ?? 'A1' });
      return;
    }
    if (de?.mode === 'centerMark') {
      const v = viewAt(p);
      const c = v ? nearestCircle(sheet, v, p) : null;
      if (v && c && c.distance < 3 / z.k) st.addCenterMark(v.id, c.viewCircle);
      else st.pushMessage('Select a circular edge in a drawing view.', 'warn');
      return;
    }
    // annotations (balloons, notes, tables, symbols) are picked before the views and dragged, by design
    const an = !de ? annotationAt(p) : null;
    if (an) {
      if (an.kind === 'dimension') st.selectDrawingDimension(an.id);
      else if (st.selectedDrawingDimensionId) st.selectDrawingDimension(null);
      st.beginAnnotationMove();
      drag.current = { kind: 'annot', x: e.clientX, y: e.clientY, annot: an, start: an.start };
      setDragAnnot(an.id);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }
    const v = viewAt(p);
    st.selectDrawingView(v?.id ?? null);
    // clicking a view opens its Property Panel (Drawing View1 …), by design
    st.setManagerTab(v ? 'properties' : 'tree');
    if (v) {
      drag.current = { kind: 'view', x: e.clientX, y: e.clientY, viewId: v.id, start: [v.position[0], v.position[1]] };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const [px, py] = pxOf(e);
    const sp = toSheet(px, py);
    setCursor(sp);
    // sheet coordinates in the status bar, by design
    if (!statusRaf.current) statusRaf.current = requestAnimationFrame(() => { statusRaf.current = 0; useStore.getState().setCursor({ x: sp[0], y: sp[1] }); });
    if (drag.current?.kind === 'pan') {
      manualZoom.current = true;
      setZoom({ ...z, x: z.x + e.clientX - drag.current.x, y: z.y + e.clientY - drag.current.y });
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
      return;
    }
    // a new table / block follows the cursor until the click that places it
    if (st.drawingTool?.kind === 'placeTable') st.moveAnnotation({ kind: 'table', id: st.drawingTool.id }, [sp[0] - 2, sp[1] + 2]);
    if (drag.current?.kind === 'annot' && drag.current.annot && drag.current.start) {
      const dx = (e.clientX - drag.current.x) / (BASE * z.k), dy = -(e.clientY - drag.current.y) / (BASE * z.k);
      const np: [number, number] = [drag.current.start[0] + dx, drag.current.start[1] + dy];
      const an = drag.current.annot;
      if (an.kind === 'dimension') {
        const dm = sheet?.dimensions.find((x) => x.id === an.id);
        const v = dm && sheet?.views.find((x) => x.id === dm.viewId);
        if (dm && v && sheet) st.updateDrawingDimension(dm.id, { label: sheetToView(sheet, v, viewGeometry(v), np) }, false);
      } else st.moveAnnotation(an as { kind: 'symbol' | 'note' | 'table'; id: string }, np);
      return;
    }
    if (drag.current?.kind === 'view' && drag.current.viewId && drag.current.start && sheet) {
      const dx = (e.clientX - drag.current.x) / (BASE * z.k), dy = -(e.clientY - drag.current.y) / (BASE * z.k);
      const view = sheet.views.find((v) => v.id === drag.current!.viewId);
      let pos: [number, number] = [drag.current.start[0] + dx, drag.current.start[1] + dy];
      // projected views stay aligned with their parent
      const parent = view?.parentId ? sheet.views.find((v) => v.id === view.parentId) : undefined;
      if (view && parent) {
        const vertical = Math.abs(view.position[0] - parent.position[0]) < 1e-6;
        pos = vertical ? [parent.position[0], pos[1]] : [pos[0], parent.position[1]];
      }
      st.moveDrawingView(drag.current.viewId, pos);
    }
  };
  const onPointerUp = () => {
    if (drag.current?.kind === 'view' && drag.current.viewId) st.commitViewMove(drag.current.viewId);
    if (drag.current?.kind === 'annot') { st.commitViewMove(''); setDragAnnot(null); }
    drag.current = null;
  };

  const cursorPos = cursor;
  const decimals = lengthDecimals();
  const previewView = useMemo(() => {
    if (!sheet || !cursorPos || !de) return null;
    if (de.mode === 'modelView' && de.model) {
      const v: DrawingView = { id: '__preview', name: '', type: de.orientation, position: cursorPos, scale: de.useCustomScale ? de.scale : undefined, displayStyle: de.displayStyle, model: de.model, modelName: '' };
      return v;
    }
    if (de.mode === 'projected' && de.parentId) {
      const parent = sheet.views.find((v) => v.id === de.parentId);
      const dir = parent && directionFrom(parent, cursorPos);
      const type = parent && dir ? projectedPlacement(parent, dir, firstAngle) : null;
      if (parent && dir && type) return { ...parent, id: '__preview', type, position: alignedPosition(parent, dir, cursorPos), parentId: parent.id };
    }
    return null;
  }, [sheet, cursorPos, de, firstAngle]);

  if (!sheet) return <div className="k-sheet-host" ref={hostRef} />;
  const [ox, oy] = toPx([0, sh]);
  const pxW = sw * BASE * z.k, pxH = sh * BASE * z.k;
  const mm = BASE * z.k;
  const border = 10 * mm;

  const renderView = (v: DrawingView, preview = false) => {
    const { lines, circles, v2d } = viewOnSheet(sheet, v);
    const b = viewBounds(sheet, v, v2d);
    const [bx, by] = toPx([b.x, b.y + b.h]);
    const selected = st.selectedDrawingViewId === v.id;
    const drawLines = v.displayStyle === 'wireframe' ? lines.map((l) => ({ ...l, hidden: false })) : v.displayStyle === 'hiddenVisible' ? lines : lines.filter((l) => !l.hidden || (l.cosmetic && !!v.threadDraft));
    return (
      <g key={v.id} className={`k-dv ${preview ? 'preview' : ''}`} opacity={preview ? 0.5 : 1}>
        {(selected || preview) && <rect x={bx} y={by} width={b.w * mm} height={b.h * mm} fill="none" stroke={preview ? '#1e6fd9' : '#4a90d9'} strokeDasharray="4 3" strokeWidth={1} />}
        {v2d.hatchClip && (
          <clipPath id={`k-boclip-${v.id}`}>
            <path d={v2d.hatchClip.map((pt, k) => { const q = toPx(viewToSheet(sheet, v, v2d, pt)); return `${k ? 'L' : 'M'}${q[0].toFixed(2)},${q[1].toFixed(2)}`; }).join('') + 'Z'} />
          </clipPath>
        )}
        {v2d.hatchClip && (
          <path className="k-bo-outline" d={v2d.hatchClip.map((pt, k) => { const q = toPx(viewToSheet(sheet, v, v2d, pt)); return `${k ? 'L' : 'M'}${q[0].toFixed(2)},${q[1].toFixed(2)}`; }).join('') + 'Z'} fill="none" stroke="#000" strokeWidth={0.8} />
        )}
        {v2d.hatch && v2d.hatch.length > 0 && [0, 1, 2].map((variant) => {
          // Auto hatching: each component its own hatch (45°, 135°, 45° denser), by design
          const loops = v2d.hatch!.filter((_, i) => (v2d.hatchVar?.[i] ?? 0) === variant);
          if (!loops.length) return null;
          return <path key={'h' + variant} data-hatch-variant={variant} clipPath={v2d.hatchClip ? `url(#k-boclip-${v.id})` : undefined} d={loops.map((t) => t.map((pt, k) => { const q = toPx(viewToSheet(sheet, v, v2d, pt)); return `${k ? 'L' : 'M'}${q[0].toFixed(2)},${q[1].toFixed(2)}`; }).join('') + 'Z').join('')} fill={variant === 0 ? 'url(#k-hatch)' : variant === 1 ? 'url(#k-hatch-b)' : 'url(#k-hatch-c)'} fillRule="nonzero" stroke="none" />;
        })}
        {v.detail && v.detail.outline && v.detail.outline !== 'none' && !preview && (() => {
          // Detail View ▸ Full outline (the circle) or Jagged outline around the enlarged view
          const c = toPx(viewToSheet(sheet, v, v2d, v.detail.center));
          const R = v.detail.radius * viewScale(sheet, v) * mm;
          if (v.detail.outline === 'full') return <circle className="k-detail-outline" cx={c[0]} cy={c[1]} r={R} fill="none" stroke="#000" strokeWidth={1.2} />;
          const n = 72;
          const d = Array.from({ length: n + 1 }, (_, i) => { const a = (i / n) * Math.PI * 2, rr = R * (1 + (i % 2 ? 1 : -1) * (0.012 + 0.014 * Math.abs(Math.sin(i * 1.7)))); return `${i ? 'L' : 'M'}${(c[0] + rr * Math.cos(a)).toFixed(2)},${(c[1] + rr * Math.sin(a)).toFixed(2)}`; }).join('');
          return <path className="k-detail-outline" d={d} fill="none" stroke="#000" strokeWidth={0.9} />;
        })()}
        {v.altPosition && !preview && alternateLines(v).map((l, i) => {
          // the alternate position in phantom lines (long dash, two short dashes), by design
          const a = toPx(viewToSheet(sheet, v, v2d, l.a)), q = toPx(viewToSheet(sheet, v, v2d, l.b));
          return <line key={'alt' + i} className="k-alt-position" x1={a[0]} y1={a[1]} x2={q[0]} y2={q[1]} stroke="#3c3c3c" strokeWidth={0.8} strokeDasharray="9 2 2 2 2 2" />;
        })}
        {drawLines.map((l, i) => {
          const a = toPx(l.a), q = toPx(l.b);
          if (l.cosmetic) return <line key={i} className="k-cosmetic-thread" x1={a[0]} y1={a[1]} x2={q[0]} y2={q[1]} stroke="#000" strokeWidth={0.7} strokeDasharray="4 2" />;
          if (l.bend) {
            // Flat Pattern Display: a bend line as a phantom line (dash dot dot) with its bend note beside the middle
            const mx = (a[0] + q[0]) / 2, my = (a[1] + q[1]) / 2;
            return <g key={i} className="k-bend-line" data-testid="bend-line"><line x1={a[0]} y1={a[1]} x2={q[0]} y2={q[1]} stroke="#000" strokeWidth={0.8} strokeDasharray="8 2 2 2 2 2" />{l.note && <text x={mx + 3} y={my - 3} fontSize={9} fill="#000" data-testid="bend-note">{l.note}</text>}</g>;
          }
          return <line key={i} x1={a[0]} y1={a[1]} x2={q[0]} y2={q[1]} stroke={l.hidden ? '#555' : '#000'} strokeWidth={l.hidden ? 0.9 : 1.6} strokeDasharray={l.hidden ? '5 3' : undefined} strokeLinecap="round" />;
        })}
        {sheet.centerMarks.filter((m) => m.viewId === v.id).map((m) => {
          const c = toPx(viewToSheet(sheet, v, v2d, m.c));
          const r = m.r * viewScale(sheet, v) * mm;
          const g = 2 * mm, ext = r + 3 * mm;
          return (
            <g key={m.id} stroke="#000" strokeWidth={0.7}>
              <line x1={c[0] - ext} y1={c[1]} x2={c[0] - g} y2={c[1]} /><line x1={c[0] + g} y1={c[1]} x2={c[0] + ext} y2={c[1]} />
              <line x1={c[0]} y1={c[1] - ext} x2={c[0]} y2={c[1] - g} /><line x1={c[0]} y1={c[1] + g} x2={c[0]} y2={c[1] + ext} />
              <line x1={c[0] - 1.2 * mm} y1={c[1]} x2={c[0] + 1.2 * mm} y2={c[1]} /><line x1={c[0]} y1={c[1] - 1.2 * mm} x2={c[0]} y2={c[1] + 1.2 * mm} />
            </g>
          );
        })}
        {v.arrowLabel && !preview && (() => {
          // Projected View ▸ Arrow: VIEW A under this view
          const p1 = toPx([b.x + b.w / 2, b.y - 5]);
          return <text x={p1[0]} y={p1[1]} fontSize={3.5 * mm} textAnchor="middle" fontFamily="Century Gothic, Arial, sans-serif" fill="#000" data-testid="view-arrow-label">VIEW {v.arrowLabel}</text>;
        })()}
        {!preview && sheet.views.filter((x) => x.arrowLabel && x.parentId === v.id).map((x) => {
          // the viewing arrow beside the parent, on the side of the projected view, pointing at the parent
          const dx = x.position[0] - v.position[0], dy = x.position[1] - v.position[1];
          const horiz = Math.abs(dx) > Math.abs(dy);
          const sx = horiz ? Math.sign(dx) : 0, sy = horiz ? 0 : Math.sign(dy);
          const edge: [number, number] = [horiz ? (sx > 0 ? b.x + b.w : b.x) : b.x + b.w / 2, horiz ? b.y + b.h / 2 : sy > 0 ? b.y + b.h : b.y];
          const tip = toPx([edge[0] + sx * 3, edge[1] + sy * 3]), tail = toPx([edge[0] + sx * 15, edge[1] + sy * 15]);
          const lp = toPx([edge[0] + sx * 19, edge[1] + sy * 19]);
          return (
            <g key={'va' + x.id} className="k-view-arrow">
              <line x1={tail[0]} y1={tail[1]} x2={tip[0]} y2={tip[1]} stroke="#000" strokeWidth={0.9} />
              {arrow(tip, tail, mm)}
              <text x={lp[0]} y={lp[1] + 1.3 * mm} fontSize={3.5 * mm} textAnchor="middle" fontFamily="Century Gothic, Arial, sans-serif">{x.arrowLabel}</text>
            </g>
          );
        })}
        {(v.section || v.detail || v.aux) && !preview && (() => {
          const lx = b.x + b.w / 2, ly = b.y - 5;
          const p1 = toPx([lx, ly]);
          const sc = v.scale ?? sheet.scale;
          return (
            <text x={p1[0]} y={p1[1]} fontSize={3.5 * mm} textAnchor="middle" fontFamily="Century Gothic, Arial, sans-serif" fill="#000">
              {v.section ? `SECTION ${v.section.label}-${v.section.label}` : v.aux ? (v.aux.noLabel ? '' : `VIEW ${v.aux.label}`) : `DETAIL ${v.detail!.label}`}
              {v.detail && <tspan x={p1[0]} dy={4.5 * mm}>SCALE {sc[0]} : {sc[1]}</tspan>}
            </text>
          );
        })()}
        {!preview && sheet.views.filter((x) => x.aux?.parentId === v.id && !x.aux.noArrow).map((x) => {
          // viewing arrow of an auxiliary view: perpendicular to the edge, pointing at it, with the letter
          const ax = x.aux!;
          const L = Math.hypot(ax.dir[0], ax.dir[1]) || 1;
          const n: [number, number] = [(-ax.dir[1] / L) * ax.side, (ax.dir[0] / L) * ax.side];
          const ms = viewToSheet(sheet, v, v2d, ax.mid);
          const tip = toPx([ms[0] + n[0] * 4, ms[1] + n[1] * 4]), tail = toPx([ms[0] + n[0] * 16, ms[1] + n[1] * 16]);
          const ddx = tip[0] - tail[0], ddy = tip[1] - tail[1], dl = Math.hypot(ddx, ddy) || 1;
          const ux = ddx / dl, uy = ddy / dl, hl = 3.2 * mm, hw = 1.1 * mm;
          const lp = toPx([ms[0] + n[0] * 21, ms[1] + n[1] * 21]);
          return (
            <g key={'aux' + x.id} className="k-aux-arrow">
              <line x1={tail[0]} y1={tail[1]} x2={tip[0] - ux * hl} y2={tip[1] - uy * hl} stroke="#000" strokeWidth={0.9} />
              <path d={`M${tip[0]},${tip[1]} L${tip[0] - ux * hl - uy * hw},${tip[1] - uy * hl + ux * hw} L${tip[0] - ux * hl + uy * hw},${tip[1] - uy * hl - ux * hw} Z`} fill="#000" />
              <text x={lp[0]} y={lp[1] + 1.3 * mm} fontSize={3.5 * mm} textAnchor="middle" fontFamily="Century Gothic, Arial, sans-serif">{ax.label}</text>
            </g>
          );
        })}
        {!preview && sheet.views.filter((x) => x.section?.parentId === v.id || x.detail?.parentId === v.id).map((x) => {
          if (x.section) {
            // cutting line: chain line with thick ends, arrows pointing the viewing direction, letters
            const sf = sectionFrame(x.section), pf = viewFrame(x.section.parentType);
            const look: [number, number] = [-sf.w.dot(pf.u), -sf.w.dot(pf.v)];
            const ext = 6;
            const a = x.section.axis === 'h' ? toPx(viewToSheet(sheet, v, v2d, [v2d.min[0], x.section.at])) : toPx(viewToSheet(sheet, v, v2d, [x.section.at, v2d.min[1]]));
            const c = x.section.axis === 'h' ? toPx(viewToSheet(sheet, v, v2d, [v2d.max[0], x.section.at])) : toPx(viewToSheet(sheet, v, v2d, [x.section.at, v2d.max[1]]));
            const dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy) || 1;
            const ux = dx / L, uy = dy / L;
            const A: [number, number] = [a[0] - ux * ext * mm, a[1] - uy * ext * mm], C: [number, number] = [c[0] + ux * ext * mm, c[1] + uy * ext * mm];
            const ax = look[0], ay = -look[1];
            const arrow = (p0: [number, number]) => {
              const tip: [number, number] = [p0[0] + ax * 7 * mm, p0[1] + ay * 7 * mm];
              const s1 = 1.2 * mm, back: [number, number] = [tip[0] - ax * 2.6 * mm, tip[1] - ay * 2.6 * mm];
              return (
                <g>
                  <line x1={p0[0]} y1={p0[1]} x2={back[0]} y2={back[1]} stroke="#000" strokeWidth={1.4} />
                  <path d={`M${tip[0]},${tip[1]}L${back[0] - ay * s1},${back[1] + ax * s1}L${back[0] + ay * s1},${back[1] - ax * s1}Z`} fill="#000" />
                  <text x={tip[0] + ax * 3 * mm} y={tip[1] + ay * 3 * mm + 1.3 * mm} fontSize={4 * mm} textAnchor="middle" fontFamily="Century Gothic, Arial, sans-serif" fontWeight="bold">{x.section!.label}</text>
                </g>
              );
            };
            return (
              <g key={'sl' + x.id} className="k-section-line">
                <line x1={A[0]} y1={A[1]} x2={C[0]} y2={C[1]} stroke="#000" strokeWidth={0.8} strokeDasharray={`${8 * mm} ${1.5 * mm} ${1.5 * mm} ${1.5 * mm}`} />
                <line x1={A[0]} y1={A[1]} x2={A[0] + ux * 5 * mm} y2={A[1] + uy * 5 * mm} stroke="#000" strokeWidth={2.2} />
                <line x1={C[0]} y1={C[1]} x2={C[0] - ux * 5 * mm} y2={C[1] - uy * 5 * mm} stroke="#000" strokeWidth={2.2} />
                {arrow(A)}
                {arrow(C)}
              </g>
            );
          }
          const d = x.detail!;
          const c = toPx(viewToSheet(sheet, v, v2d, d.center));
          const k = viewScale(sheet, v) * mm;
          const r = d.radius * k;
          const dash = `${6 * mm} ${1.2 * mm} ${1.2 * mm} ${1.2 * mm}`;
          const style = d.style ?? 'perStandard';
          // the label: at the circle (per standard / broken / no leader), on a leader, or the circle joined to the detail view
          const lab: [number, number] = style === 'leader' ? [c[0] + r + 9 * mm, c[1] - r - 6 * mm] : style === 'noLeader' ? [c[0] + r + 2 * mm, c[1] + 1.5 * mm] : [c[0] + r * 0.75 + 2 * mm, c[1] - r * 0.75 - 1 * mm];
          const dv = toPx(x.position);
          return (
            <g key={'dc' + x.id} className="k-detail-circle" data-style={style}>
              {d.rect
                ? <rect x={c[0] - d.rect[0] * k} y={c[1] - d.rect[1] * k} width={2 * d.rect[0] * k} height={2 * d.rect[1] * k} fill="none" stroke="#000" strokeWidth={0.9} strokeDasharray={dash} />
                : style === 'broken'
                  // Broken Circle: the circle opens where the label sits
                  ? <path d={`M${c[0] + r * Math.cos(-0.55)},${c[1] + r * Math.sin(-0.55)} A${r},${r} 0 1 1 ${c[0] + r * Math.cos(-1.05)},${c[1] + r * Math.sin(-1.05)}`} fill="none" stroke="#000" strokeWidth={0.9} strokeDasharray={dash} />
                  : <circle cx={c[0]} cy={c[1]} r={r} fill="none" stroke="#000" strokeWidth={0.9} strokeDasharray={dash} />}
              {style === 'leader' && <line x1={c[0] + r * 0.71} y1={c[1] - r * 0.71} x2={lab[0] - 1 * mm} y2={lab[1] + 1 * mm} stroke="#000" strokeWidth={0.6} />}
              {style === 'connected' && <line x1={c[0]} y1={c[1]} x2={dv[0]} y2={dv[1]} stroke="#000" strokeWidth={0.6} strokeDasharray={dash} />}
              {style !== 'connected' && <text x={lab[0]} y={lab[1]} fontSize={4 * mm} fontFamily="Century Gothic, Arial, sans-serif" fontWeight="bold">{d.label}</text>}
            </g>
          );
        })}
        {circles.filter((c) => !c.hidden && de?.mode === 'centerMark').map((c, i) => {
          const p = toPx(c.c);
          return <circle key={'c' + i} cx={p[0]} cy={p[1]} r={c.r * mm} fill="none" stroke="#1e6fd9" strokeWidth={0.6} strokeDasharray="2 2" />;
        })}
      </g>
    );
  };

  /** BOM item number of the component under a point of an assembly view (1 for a part) */
  const componentCentres = (v: DrawingView, visible = false): { name: string; item: number; at: [number, number] }[] => {
    if (v.model.kind !== 'assembly') {
      const g = viewGeometry(v);
      // a part: the dot on the longest visible edge's midpoint, by design attaches to an edge of the part
      const l = visible ? [...g.lines].filter((x) => !x.hidden).sort((a, b) => Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]) - Math.hypot(a.b[0] - a.a[0], a.b[1] - a.a[1]))[0] : undefined;
      return [{ name: v.model.name, item: 1, at: l ? [(l.a[0] + l.b[0]) / 2, (l.a[1] + l.b[1]) / 2] : [(g.min[0] + g.max[0]) / 2, (g.min[1] + g.max[1]) / 2] }];
    }
    const fr = viewFrame(v.type);
    const items = new Map<string, number>();
    for (const c of v.model.components ?? []) if (!items.has(c.part.name)) items.set(c.part.name, items.size + 1);
    const bodies = rebuildAssembly(v.model).bodies;
    const vis = visible ? visibleAnchors(bodies, fr) : null;
    return bodies.map((b) => {
      b.geometry.computeBoundingBox();
      const c = b.geometry.boundingBox!.getCenter(new THREE.Vector3());
      const comp = (v.model.components ?? []).find((x) => x.id === b.id);
      return { name: comp?.part.name ?? b.id, item: items.get(comp?.part.name ?? '') ?? 1, at: vis?.get(b.id) ?? ([c.dot(fr.u), c.dot(fr.v)] as [number, number]) };
    });
  };
  const balloonItem = (v: DrawingView, p: [number, number]): string => {
    const g = viewGeometry(v);
    const q = sheetToView(sheet, v, g, p);
    let best = '1', bd = Infinity;
    for (const c of componentCentres(v)) { const d = Math.hypot(c.at[0] - q[0], c.at[1] - q[1]); if (d < bd) { bd = d; best = String(c.item); } }
    return best;
  };
  /** Auto Balloon: one balloon per part, on a ring around the view with a leader to the part */
  const autoBalloons = (v: DrawingView): { symbols: NonNullable<DrawingSheet['symbols']>; lines: NonNullable<DrawingSheet['magneticLines']> } => {
    const g = viewGeometry(v);
    const b = viewBounds(sheet, v, g);
    const seen = new Set<number>();
    const picked: { item: number; a: [number, number] }[] = [];
    for (const c of componentCentres(v, true)) {
      // Ignore multiple instances (default on): one balloon per part number
      if (de?.ignoreMultiple !== false && seen.has(c.item)) continue;
      seen.add(c.item);
      let at = c.at;
      if (de?.balloonAttach === 'edges') {
        // Leader attachment ▸ Edges: the nearest point of a visible edge, with an arrow (a dot sits on a face)
        let best = Infinity;
        for (const l of g.lines) {
          if (l.hidden) continue;
          const dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1], L2 = dx * dx + dy * dy || 1;
          const t = Math.max(0, Math.min(1, ((c.at[0] - l.a[0]) * dx + (c.at[1] - l.a[1]) * dy) / L2));
          const q: [number, number] = [l.a[0] + dx * t, l.a[1] + dy * t];
          const d = Math.hypot(q[0] - c.at[0], q[1] - c.at[1]);
          if (d < best) { best = d; at = q; }
        }
      }
      picked.push({ item: c.item, a: viewToSheet(sheet, v, g, at) });
    }
    // the balloons of the intended design sit clear of the view and of each other: 2 characters = 8 mm, 2 mm apart
    const lay = layoutBalloons(picked.map((p) => p.a), { x: b.x, y: b.y, w: b.w, h: b.h }, de?.balloonLayout ?? 'square', { offset: 12, gap: 10 });
    const symbols = picked.map((p, i) => ({ id: newSymbolId(), kind: 'balloon' as const, anchor: p.a, position: lay.positions[i], text: String(p.item), viewId: v.id, ...(de?.balloonAttach === 'edges' ? { head: 'arrow' as const } : {}) }));
    const lines = de?.insertMagnetic === false ? [] : lay.lines.map((l) => ({ id: newSymbolId(), a: l.a, b: l.b, balloons: l.members.map((i) => symbols[i].id) }));
    return { symbols, lines };
  };
  const renderSymbol = (sy: NonNullable<DrawingSheet['symbols']>[number]) => {
    const P = toPx(sy.position);
    const fs = 3.5 * mm;
    const font = 'Century Gothic, Arial, sans-serif';
    const leader = (to: [number, number], from: [number, number], head: 'arrow' | 'dot' | 'triangle' | 'none') => {
      const T = toPx(to), F = toPx(from);
      return (
        <g>
          <line x1={F[0]} y1={F[1]} x2={T[0]} y2={T[1]} stroke="#000" strokeWidth={0.6} />
          {head === 'arrow' && arrow(T, F, mm)}
          {head === 'dot' && <circle cx={T[0]} cy={T[1]} r={0.6 * mm} fill="#000" />}
          {head === 'triangle' && (() => { const dx = T[0] - F[0], dy = T[1] - F[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, w = 1.6 * mm, h = 2.4 * mm; return <path d={`M${T[0]},${T[1]}L${T[0] - ux * h - uy * w},${T[1] - uy * h + ux * w}L${T[0] - ux * h + uy * w},${T[1] - uy * h - ux * w}Z`} fill="#000" />; })()}
        </g>
      );
    };
    if (sy.kind === 'areaHatch' && sy.tris && sy.viewId) {
      const hv = sheet.views.find((x) => x.id === sy.viewId);
      if (!hv) return null;
      const g = viewGeometry(hv);
      const d = sy.tris.map((t) => t.map((pt, k) => { const q = toPx(viewToSheet(sheet, hv, g, pt)); return `${k ? 'L' : 'M'}${q[0].toFixed(2)},${q[1].toFixed(2)}`; }).join('') + 'Z').join('');
      return <path key={sy.id} className="k-area-hatch" d={d} fill="url(#k-hatch)" stroke="none" />;
    }
    if (sy.kind === 'revision') {
      // revision symbol: a triangle with the revision letter
      const s = 4.2 * mm;
      return (
        <g key={sy.id} className="k-revision-symbol">
          <path d={`M${P[0]},${P[1] - s * 0.62}L${P[0] + s * 0.62},${P[1] + s * 0.42}L${P[0] - s * 0.62},${P[1] + s * 0.42}Z`} fill={PAPER} stroke="#000" strokeWidth={0.7} />
          <text x={P[0]} y={P[1] + fs * 0.3} fontSize={fs * 0.85} textAnchor="middle" fontFamily={font}>{sy.text}</text>
        </g>
      );
    }
    if (sy.kind === 'cloud' && sy.a && sy.b) {
      // revision cloud: scallops along a rectangle
      const A = toPx(sy.a), B = toPx(sy.b);
      const x0 = Math.min(A[0], B[0]), x1 = Math.max(A[0], B[0]), y0 = Math.min(A[1], B[1]), y1 = Math.max(A[1], B[1]);
      const r = 2.5 * mm;
      const side = (ax: number, ay: number, bx: number, by: number) => {
        const L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / (2 * r)));
        let d = '';
        for (let k = 1; k <= n; k++) d += ` A${(L / n) / 2},${(L / n) / 2} 0 0 1 ${ax + ((bx - ax) * k) / n},${ay + ((by - ay) * k) / n}`;
        return d;
      };
      const d = `M${x0},${y0}` + side(x0, y0, x1, y0) + side(x1, y0, x1, y1) + side(x1, y1, x0, y1) + side(x0, y1, x0, y0);
      return <path key={sy.id} className="k-revision-cloud" d={d} fill="none" stroke="#000" strokeWidth={0.7} />;
    }
    if (sy.kind === 'weld') {
      // weld symbol: arrow to the joint, reference line, fillet weld triangle (arrow side) with its size
      const u = mm, len = 16 * u;
      const dir = sy.anchor && toPx(sy.anchor)[0] < P[0] ? 1 : -1;
      const E = [P[0] + dir * len, P[1]];
      const m = (P[0] + E[0]) / 2;
      return (
        <g key={sy.id} className="k-weld">
          {sy.anchor && leader(sy.anchor, sy.position, 'arrow')}
          <line x1={P[0]} y1={P[1]} x2={E[0]} y2={E[1]} stroke="#000" strokeWidth={0.7} />
          {(sy.contour ?? 'fillet') === 'fillet' && <path d={`M${m - 2 * u},${P[1]}L${m - 2 * u},${P[1] + 4 * u}L${m + 2 * u},${P[1]}Z`} fill="none" stroke="#000" strokeWidth={0.7} />}
          {sy.contour === 'square' && <path data-contour="square" d={`M${m - 1.5 * u},${P[1]}L${m - 1.5 * u},${P[1] + 4 * u}M${m + 1.5 * u},${P[1]}L${m + 1.5 * u},${P[1] + 4 * u}`} fill="none" stroke="#000" strokeWidth={0.7} />}
          {sy.contour === 'vgroove' && <path data-contour="vgroove" d={`M${m - 2.5 * u},${P[1] + 4 * u}L${m},${P[1]}L${m + 2.5 * u},${P[1] + 4 * u}`} fill="none" stroke="#000" strokeWidth={0.7} />}
          <text x={m - 3 * u} y={P[1] + 3.6 * u} fontSize={fs * 0.85} textAnchor="end" fontFamily={font}>{sy.text}</text>
        </g>
      );
    }
    if (sy.kind === 'datumTarget') {
      // datum target: a divided circle with the target label, leader to an X on the part
      const r = 4.5 * mm;
      const A = sy.anchor ? toPx(sy.anchor) : P;
      const dx = A[0] - P[0], dy = A[1] - P[1], L = Math.hypot(dx, dy) || 1, x = 1.4 * mm;
      return (
        <g key={sy.id} className="k-datum-target">
          {sy.anchor && <line x1={P[0] + (dx / L) * r} y1={P[1] + (dy / L) * r} x2={A[0]} y2={A[1]} stroke="#000" strokeWidth={0.6} />}
          {sy.anchor && <path d={`M${A[0] - x},${A[1] - x}L${A[0] + x},${A[1] + x}M${A[0] - x},${A[1] + x}L${A[0] + x},${A[1] - x}`} stroke="#000" strokeWidth={0.8} />}
          <circle cx={P[0]} cy={P[1]} r={r} fill={PAPER} stroke="#000" strokeWidth={0.7} />
          <line x1={P[0] - r} y1={P[1]} x2={P[0] + r} y2={P[1]} stroke="#000" strokeWidth={0.6} />
          <text x={P[0]} y={P[1] + r * 0.62} fontSize={fs * 0.8} textAnchor="middle" fontFamily={font}>{sy.text}</text>
        </g>
      );
    }
    if (sy.kind === 'centerline' && sy.a && sy.b) {
      const A = toPx(sy.a), B = toPx(sy.b);
      return <line key={sy.id} className="k-centerline" x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke="#000" strokeWidth={0.5} strokeDasharray={`${6 * mm} ${1 * mm} ${1 * mm} ${1 * mm}`} />;
    }
    if (sy.kind === 'balloon') {
      // Balloon Settings ▸ size: 2 characters (8 mm), 1 character, or tight around the text
      const r = (sy.size === '1' ? 3 : sy.size === 'tight' ? Math.max(2.2, (sy.text ?? '').length * 1.1 + 1) : 4) * mm;
      const A = sy.anchor ? toPx(sy.anchor) : P;
      const dx = A[0] - P[0], dy = A[1] - P[1], L = Math.hypot(dx, dy) || 1;
      return (
        <g key={sy.id} className="k-balloon">
          {sy.anchor && <line x1={P[0] + (dx / L) * r} y1={P[1] + (dy / L) * r} x2={A[0]} y2={A[1]} stroke="#000" strokeWidth={0.6} />}
          {sy.anchor && (sy.head === 'arrow' ? arrow(A, P, mm) : <circle cx={A[0]} cy={A[1]} r={0.6 * mm} fill="#000" />)}
          {sy.shape === 'box' ? <rect x={P[0] - r} y={P[1] - r} width={2 * r} height={2 * r} fill={PAPER} stroke="#000" strokeWidth={0.7} />
            : sy.shape === 'triangle' ? <path d={`M${P[0]},${P[1] - r * 1.25} L${P[0] + r * 1.15},${P[1] + r * 0.75} L${P[0] - r * 1.15},${P[1] + r * 0.75} Z`} fill={PAPER} stroke="#000" strokeWidth={0.7} />
            : <circle cx={P[0]} cy={P[1]} r={r} fill={PAPER} stroke="#000" strokeWidth={0.7} />}
          <text x={P[0]} y={P[1] + fs * 0.35} fontSize={fs} textAnchor="middle" fontFamily={font}>{sy.text}</text>
        </g>
      );
    }
    if (sy.kind === 'surfaceFinish') {
      // the check-mark symbol with the roughness above it, on a leader to the surface
      const u = mm;
      return (
        <g key={sy.id} className="k-surface-finish">
          {sy.anchor && leader(sy.anchor, [sy.position[0], sy.position[1]], 'arrow')}
          <path d={`M${P[0] - 3 * u},${P[1] - 2.5 * u}L${P[0]},${P[1]}L${P[0] + 5 * u},${P[1] - 8 * u}L${P[0] + 12 * u},${P[1] - 8 * u}`} fill="none" stroke="#000" strokeWidth={0.7} />
          <line x1={P[0] - 3 * u} y1={P[1] - 2.5 * u} x2={P[0] + 2.5 * u} y2={P[1] - 2.5 * u} stroke="#000" strokeWidth={0.7} />
          <text x={P[0] + 5.5 * u} y={P[1] - 9 * u} fontSize={fs * 0.9} fontFamily={font}>Ra {sy.text}</text>
        </g>
      );
    }
    if (sy.kind === 'datum') {
      const w = 6 * mm;
      return (
        <g key={sy.id} className="k-datum">
          {sy.anchor && leader(sy.anchor, [sy.position[0], sy.position[1] - 3.5], 'triangle')}
          <rect x={P[0] - w / 2} y={P[1] - w / 2} width={w} height={w} fill={PAPER} stroke="#000" strokeWidth={0.7} />
          <text x={P[0]} y={P[1] + fs * 0.35} fontSize={fs} textAnchor="middle" fontFamily={font}>{sy.text}</text>
        </g>
      );
    }
    if (sy.kind === 'gtol') {
      const h = 6 * mm, c1 = 7 * mm, c2 = Math.max(10, (sy.tol ?? '').length * 2.4) * mm, c3 = sy.datum ? 7 * mm : 0;
      const x0 = P[0], y0 = P[1] - h / 2;
      return (
        <g key={sy.id} className="k-gtol">
          {sy.anchor && leader(sy.anchor, [sy.position[0], sy.position[1]], 'arrow')}
          <rect x={x0} y={y0} width={c1 + c2 + c3} height={h} fill={PAPER} stroke="#000" strokeWidth={0.7} />
          <line x1={x0 + c1} y1={y0} x2={x0 + c1} y2={y0 + h} stroke="#000" strokeWidth={0.7} />
          {c3 > 0 && <line x1={x0 + c1 + c2} y1={y0} x2={x0 + c1 + c2} y2={y0 + h} stroke="#000" strokeWidth={0.7} />}
          <text x={x0 + c1 / 2} y={P[1] + fs * 0.4} fontSize={fs * 1.15} textAnchor="middle" fontFamily="Segoe UI Symbol, Arial">{sy.symbol}</text>
          <text x={x0 + c1 + c2 / 2} y={P[1] + fs * 0.35} fontSize={fs} textAnchor="middle" fontFamily={font}>{sy.tol}</text>
          {c3 > 0 && <text x={x0 + c1 + c2 + c3 / 2} y={P[1] + fs * 0.35} fontSize={fs} textAnchor="middle" fontFamily={font}>{sy.datum}</text>}
        </g>
      );
    }
    // hole callout: leader with arrow to the hole edge, text at the end on a short shoulder
    return (
      <g key={sy.id} className="k-hole-callout">
        {sy.anchor && leader(sy.anchor, sy.position, 'arrow')}
        <line x1={P[0]} y1={P[1]} x2={P[0] + 3 * mm} y2={P[1]} stroke="#000" strokeWidth={0.6} />
        <text x={P[0] + 4 * mm} y={P[1] + fs * 0.35} fontSize={fs} fontFamily={font}>{sy.text}</text>
      </g>
    );
  };

  /** Revision Table at the top right of the sheet: REVISIONS / REV. / DESCRIPTION / DATE / APPROVED, by design. */
  const renderRevisionTable = () => {
    const revs = sheet.revisions ?? [];
    const cols = [12, 60, 24, 22];
    const rowH = 6;
    const [sw3, sh3] = sheetSize(sheet);
    const x1 = sw3 - 10, y1 = sh3 - 10;
    const W = cols.reduce((a, b) => a + b, 0);
    const x0 = x1 - W;
    const cells: React.ReactElement[] = [];
    const a0 = toPx([x0, y1]), b0 = toPx([x1, y1 - rowH]);
    cells.push(<rect key="hd" x={a0[0]} y={a0[1]} width={b0[0] - a0[0]} height={b0[1] - a0[1]} fill={PAPER} stroke="#000" strokeWidth={0.9} />);
    const hp = toPx([x0 + W / 2, y1 - rowH / 2 - 1.1]);
    cells.push(<text key="hdt" x={hp[0]} y={hp[1]} fontSize={2.8 * mm} textAnchor="middle" fontFamily="Century Gothic, Arial, sans-serif" fontWeight={600}>REVISIONS</text>);
    [['REV.', 'DESCRIPTION', 'DATE', 'APPROVED'], ...revs.map((r) => [r.rev, r.description, r.date, r.approved])].forEach((row, ri) => {
      const yTop = y1 - (ri + 1) * rowH;
      let x = x0;
      row.forEach((txt, ci) => {
        const a = toPx([x, yTop]), b = toPx([x + cols[ci], yTop - rowH]);
        cells.push(<rect key={`r${ri}-${ci}`} x={a[0]} y={a[1]} width={b[0] - a[0]} height={b[1] - a[1]} fill={PAPER} stroke="#000" strokeWidth={ri === 0 ? 0.9 : 0.5} />);
        const tp = toPx([x + (ci === 1 ? 1.5 : cols[ci] / 2), yTop - rowH / 2 - 1.1]);
        cells.push(<text key={`rt${ri}-${ci}`} x={tp[0]} y={tp[1]} fontSize={2.8 * mm} textAnchor={ci === 1 ? 'start' : 'middle'} fontFamily="Century Gothic, Arial, sans-serif" fontWeight={ri === 0 ? 600 : 400}>{txt}</text>);
        x += cols[ci];
      });
    });
    return <g className="k-revision-table" data-testid="revision-table">{cells}</g>;
  };

  /** a grid of cells at a sheet position (top left), first row bold */
  const renderGrid = (key: string, testid: string, pos: [number, number], rows: string[][], cols: number[]) => {
    const rowH = 6;
    const cells: React.ReactElement[] = [];
    rows.forEach((r, ri) => {
      const yTop = pos[1] - ri * rowH;
      let x = pos[0];
      r.forEach((txt, ci) => {
        const a = toPx([x, yTop]), b = toPx([x + cols[ci], yTop - rowH]);
        cells.push(<rect key={`${ri}-${ci}`} x={a[0]} y={a[1]} width={b[0] - a[0]} height={b[1] - a[1]} fill={PAPER} stroke="#000" strokeWidth={ri === 0 ? 0.9 : 0.5} />);
        const tp = toPx([x + cols[ci] / 2, yTop - rowH / 2 - 1.1]);
        cells.push(<text key={`t${ri}-${ci}`} x={tp[0]} y={tp[1]} fontSize={2.8 * mm} textAnchor="middle" fontFamily="Century Gothic, Arial, sans-serif" fontWeight={ri === 0 ? 600 : 400}>{txt}</text>);
        x += cols[ci];
      });
    });
    return <g key={key} data-testid={testid}>{cells}</g>;
  };
  const renderHoleTable = (t: NonNullable<DrawingSheet['tables']>[number]) => {
    const g = tableGrid(sheet, t);
    return g ? renderGrid(t.id, 'hole-table', g.pos, g.rows, g.cols) : null;
  };
  const renderGeneralTable = (t: NonNullable<DrawingSheet['tables']>[number]) => {
    const g = tableGrid(sheet, t);
    return g ? renderGrid(t.id, 'general-table', g.pos, g.rows, g.cols) : null;
  };

  /** Bill of Materials table at the top right of the sheet: ITEM NO. / PART NUMBER / DESCRIPTION / QTY. */
  const renderBom = (t: NonNullable<DrawingSheet['tables']>[number]) => {
    const g = tableGrid(sheet, t);
    if (!g) return null;
    const { cols, rowH } = g;
    const x0 = g.pos[0], y1 = g.pos[1];
    const cells: React.ReactElement[] = [];
    g.rows.forEach((r, ri) => {
      const yTop = y1 - ri * rowH;
      let x = x0;
      r.forEach((txt, ci) => {
        const a = toPx([x, yTop]), b = toPx([x + cols[ci], yTop - rowH]);
        cells.push(<rect key={`${ri}-${ci}`} x={a[0]} y={a[1]} width={b[0] - a[0]} height={b[1] - a[1]} fill={PAPER} stroke="#000" strokeWidth={ri === 0 ? 0.9 : 0.5} />);
        const tp = toPx([x + (ci === 1 || ci === 2 ? 1.5 : cols[ci] / 2), yTop - rowH / 2 - 1.1]);
        cells.push(<text key={`t${ri}-${ci}`} x={tp[0]} y={tp[1]} fontSize={2.8 * mm} textAnchor={ci === 1 || ci === 2 ? 'start' : 'middle'} fontFamily="Century Gothic, Arial, sans-serif" fontWeight={ri === 0 ? 600 : 400}>{txt}</text>);
        x += cols[ci];
      });
    });
    return <g key={t.id} className="k-bom-table" data-testid="bom-table">{cells}</g>;
  };

  const renderDimension = (d: DrawingSheet['dimensions'][number]) => {
    const v = sheet.views.find((x) => x.id === d.viewId);
    if (!v) return null;
    const v2d = viewGeometry(v);
    const A = toPx(viewToSheet(sheet, v, v2d, d.a)), B = toPx(viewToSheet(sheet, v, v2d, d.b)), L = toPx(viewToSheet(sheet, v, v2d, d.label));
    const dt = dimensionText(d, decimals);
    const text = dt.main;
    const fs = (d.fontSize ?? 3.5) * mm;
    const sel = st.selectedDrawingDimensionId === d.id;
    const col = sel ? '#1e6fd9' : '#1a3d8f';
    // tolerance stacked right of the value (bilateral / limit), dual value below, basic in a box
    const extras = (x: number, y: number, anchor: 'middle' | 'start' | 'end') => {
      const w = text.length * fs * 0.56;
      const right = anchor === 'middle' ? x + w / 2 : anchor === 'start' ? x + w : x;
      return (
        <>
          {dt.boxed && <rect x={(anchor === 'middle' ? x - w / 2 : anchor === 'start' ? x : x - w) - 0.8 * mm} y={y - fs * 0.95} width={w + 1.6 * mm} height={fs * 1.25} fill="none" strokeWidth={0.6} />}
          {dt.upper && <text x={dt.main ? right + 0.6 * mm : x} y={y - fs * (dt.main ? 0.45 : 0.55)} fontSize={dt.main ? fs * 0.7 : fs} textAnchor={dt.main ? 'start' : anchor} stroke="none" fontFamily="Century Gothic, Arial, sans-serif" data-testid="dim-tol-upper">{dt.upper}</text>}
          {dt.lower && <text x={dt.main ? right + 0.6 * mm : x} y={y + fs * (dt.main ? 0.25 : 0.55)} fontSize={dt.main ? fs * 0.7 : fs} textAnchor={dt.main ? 'start' : anchor} stroke="none" fontFamily="Century Gothic, Arial, sans-serif" data-testid="dim-tol-lower">{dt.lower}</text>}
          {dt.dual && <text x={x} y={y + fs * 1.15} fontSize={fs} textAnchor={anchor} stroke="none" fontFamily="Century Gothic, Arial, sans-serif" data-testid="dim-dual-text">{dt.dual}</text>}
        </>
      );
    };
    if (d.kind === 'linear') {
      // extension lines perpendicular to the measured direction, dimension line through the label
      const horiz = d.orientation === 'h', vert = d.orientation === 'v';
      let pa: [number, number], pb: [number, number];
      if (horiz) { pa = [A[0], L[1]]; pb = [B[0], L[1]]; }
      else if (vert) { pa = [L[0], A[1]]; pb = [L[0], B[1]]; }
      else {
        const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const off = (L[0] - A[0]) * nx + (L[1] - A[1]) * ny;
        pa = [A[0] + nx * off, A[1] + ny * off];
        pb = [B[0] + nx * off, B[1] + ny * off];
      }
      const mid: [number, number] = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
      const ang = (Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) * 180) / Math.PI;
      // Leaders ▸ arrows outside the witness lines (with short tails), inside, or smart: outside when the text does not fit
      const span = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
      const outside = d.arrows === 'outside' || ((d.arrows ?? 'smart') === 'smart' && span < text.length * fs * 0.56 + 6 * mm);
      const ux = (pb[0] - pa[0]) / (span || 1), uy = (pb[1] - pa[1]) / (span || 1);
      const tail = 5 * mm;
      const oa: [number, number] = [pa[0] - ux * tail, pa[1] - uy * tail], ob: [number, number] = [pb[0] + ux * tail, pb[1] + uy * tail];
      return (
        <g key={d.id} className="k-ddim" data-dim-id={d.id} data-arrows={outside ? 'outside' : 'inside'} stroke={col} strokeWidth={0.8} fill={col}>
          <line x1={A[0]} y1={A[1]} x2={pa[0]} y2={pa[1]} /><line x1={B[0]} y1={B[1]} x2={pb[0]} y2={pb[1]} />
          {outside ? <><line x1={oa[0]} y1={oa[1]} x2={ob[0]} y2={ob[1]} />{arrow(pa, oa, mm)}{arrowHead(pb, ob, mm, d.secondArrow)}</> : <><line x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]} />{arrow(pa, pb, mm)}{arrowHead(pb, pa, mm, d.secondArrow)}</>}
          <g transform={`rotate(${Math.abs(ang) > 90 ? ang + 180 : ang} ${mid[0]} ${mid[1]})`}>
            <text x={mid[0]} y={mid[1] - 1.2 * mm} fontSize={fs} textAnchor="middle" stroke="none" fontFamily="Century Gothic, Arial, sans-serif">{text}</text>
            {extras(mid[0], mid[1] - 1.2 * mm, 'middle')}
          </g>
        </g>
      );
    }
    // diameter / radius: leader from the circle to the label
    const r = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const dx = L[0] - A[0], dy = L[1] - A[1], len = Math.hypot(dx, dy) || 1;
    const onCircle: [number, number] = [A[0] + (dx / len) * r, A[1] + (dy / len) * r];
    const start = d.kind === 'radius' ? A : [A[0] - (dx / len) * r, A[1] - (dy / len) * r] as [number, number];
    return (
      <g key={d.id} className="k-ddim" data-dim-id={d.id} stroke={col} strokeWidth={0.8} fill={col}>
        <line x1={start[0]} y1={start[1]} x2={L[0]} y2={L[1]} />
        {arrow(onCircle, start, mm)}
        {d.kind === 'diameter' && arrow(start, onCircle, mm)}
        <line x1={L[0]} y1={L[1]} x2={L[0] + (dx >= 0 ? 6 * mm : -6 * mm)} y2={L[1]} />
        <text x={L[0] + (dx >= 0 ? 1 : -1) * mm} y={L[1] - 0.8 * mm} fontSize={fs} textAnchor={dx >= 0 ? 'start' : 'end'} stroke="none" fontFamily="Century Gothic, Arial, sans-serif">{text}</text>
        {extras(L[0] + (dx >= 0 ? 1 : -1) * mm, L[1] - 0.8 * mm, dx >= 0 ? 'start' : 'end')}
      </g>
    );
  };

  // the title block as the intended default sheet format (bottom right)
  const tb = { w: 180 * mm, h: 44 * mm };
  const tbx = ox + pxW - border - tb.w, tby = oy + pxH - border - tb.h;
  const zones = sheet.format?.zones === false ? 0 : sheet.size === 'A4' ? 4 : sheet.size === 'A3' ? 6 : 8;
  const title = sheet.views[0]?.model.name ?? st.doc.name;

  return (
    <div
      className="k-sheet-host"
      ref={hostRef}
      tabIndex={0}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && st.drawingTool) st.setDrawingTool(null);
        else if (e.key === 'Escape') {
          if (de?.dimStart) st.setDrawingEdit({ dimStart: undefined });
          else if (de) st.cancelDrawingEdit();
          else st.selectDrawingView(null);
        } else if (e.key === 'Delete' && st.selectedDrawingDimensionId && !de && sheet) {
          // Delete removes the selected dimension, by design
          const id = st.selectedDrawingDimensionId;
          st.selectDrawingDimension(null);
          st.applyDocument('Delete', { ...st.doc, sheets: [{ ...sheet, dimensions: sheet.dimensions.filter((x) => x.id !== id) }, ...(st.doc.sheets ?? []).slice(1)] });
        } else if (e.key === 'Delete' && st.selectedDrawingViewId && !de) st.deleteDrawingView(st.selectedDrawingViewId);
        else if (e.key === 'f' || e.key === 'F') fit();
      }}
    >
      <svg width={size.w} height={Math.max(0, size.h - SHEET_TABS_H)} className="k-sheet-svg">
        <defs>
          <pattern id="k-hatch" patternUnits="userSpaceOnUse" width={2.5 * mm} height={2.5 * mm} patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={2.5 * mm} stroke="#000" strokeWidth={0.6} />
          </pattern>
          <pattern id="k-hatch-b" patternUnits="userSpaceOnUse" width={2.5 * mm} height={2.5 * mm} patternTransform="rotate(-45)">
            <line x1={0} y1={0} x2={0} y2={2.5 * mm} stroke="#000" strokeWidth={0.6} />
          </pattern>
          <pattern id="k-hatch-c" patternUnits="userSpaceOnUse" width={1.4 * mm} height={1.4 * mm} patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={1.4 * mm} stroke="#000" strokeWidth={0.5} />
          </pattern>
        </defs>
        <rect x={ox + 6} y={oy + 6} width={pxW} height={pxH} fill="rgba(0,0,0,0.18)" />
        <rect className="k-sheet-paper" x={ox} y={oy} width={pxW} height={pxH} fill={PAPER} stroke="#888" strokeWidth={1} />
        {sheet.showFormat && (
          <g className="k-sheet-format">
            <rect x={ox + border} y={oy + border} width={pxW - 2 * border} height={pxH - 2 * border} fill="none" stroke="#000" strokeWidth={1.4} />
            {Array.from({ length: zones }, (_, i) => {
              const x = ox + border + ((pxW - 2 * border) * (i + 0.5)) / zones;
              // zone label in the margin and a tick at the zone boundary, as the intended sheet format
              const xt = ox + border + ((pxW - 2 * border) * i) / zones;
              return <g key={'z' + i}><text x={x} y={oy + border - 2.6 * mm} fontSize={4.5 * mm} textAnchor="middle" fill="#000">{zones - i}</text><text x={x} y={oy + pxH - border + 6.6 * mm} fontSize={4.5 * mm} textAnchor="middle" fill="#000">{zones - i}</text>{i > 0 && <><line x1={xt} y1={oy + border * 0.35} x2={xt} y2={oy + border} stroke="#000" strokeWidth={0.6} /><line x1={xt} y1={oy + pxH - border} x2={xt} y2={oy + pxH - border * 0.35} stroke="#000" strokeWidth={0.6} /></>}</g>;
            })}
            {Array.from({ length: Math.round(zones * 0.7) }, (_, i) => {
              const n = Math.round(zones * 0.7);
              const y = oy + border + ((pxH - 2 * border) * (i + 0.5)) / n;
              const letter = String.fromCharCode(65 + (n - 1 - i));
              const yt = oy + border + ((pxH - 2 * border) * i) / n;
              return <g key={'l' + i}><text x={ox + border - 5 * mm} y={y + 1.6 * mm} fontSize={4.5 * mm} textAnchor="middle" fill="#000">{letter}</text><text x={ox + pxW - border + 5 * mm} y={y + 1.6 * mm} fontSize={4.5 * mm} textAnchor="middle" fill="#000">{letter}</text>{i > 0 && <><line x1={ox + border * 0.35} y1={yt} x2={ox + border} y2={yt} stroke="#000" strokeWidth={0.6} /><line x1={ox + pxW - border} y1={yt} x2={ox + pxW - border * 0.35} y2={yt} stroke="#000" strokeWidth={0.6} /></>}</g>;
            })}
            {(() => {
              // the title block of the intended ISO sheet format (180 x 44 mm): a band of general notes on top,
              // the NAME / SIGNATURE / DATE grid, MATERIAL / WEIGHT, and TITLE / DWG NO. / size / SCALE / SHEET
              const X = (u: number) => tbx + u * mm, Y = (v: number) => tby + v * mm;
              const L = (x1: number, y1: number, x2: number, y2: number, k: string) => <line key={k} x1={X(x1)} y1={Y(y1)} x2={X(x2)} y2={Y(y2)} />;
              const T = (x: number, y: number, t: string, k: string, extra: Record<string, unknown> = {}) => <text key={k} x={X(x)} y={Y(y)} {...extra}>{t}</text>;
              const tbv = sheet.titleBlock ?? {};
              const mat = sheet.views[0] ? sheet.views[0].model.material?.name ?? '' : '';
              const rows = ['DRAWN', "CHK'D", "APPV'D", 'MFG', 'Q.A'];
              return (
                <>
                  <g stroke="#000" strokeWidth={0.5} fill="none">
                    <rect x={X(0)} y={Y(0)} width={180 * mm} height={44 * mm} strokeWidth={0.9} />
                    {L(0, 14, 180, 14, 'h1')}
                    {[70, 115, 140, 165].map((x, i) => L(x, 0, x, 14, 'tv' + i))}
                    {L(70, 14, 70, 44, 'v1')}
                    {L(115, 14, 115, 44, 'v2')}
                    {[14, 34, 54].map((x, i) => L(x, 14, x, 44, 'gv' + i))}
                    {[19, 24, 29, 34, 39].map((y, i) => L(0, y, 70, y, 'gh' + i))}
                    {L(70, 29, 115, 29, 'mw')}
                    {L(115, 29, 180, 29, 'tt')}
                    {L(115, 39, 180, 39, 'ts')}
                    {L(166, 29, 166, 39, 'sz')}
                    {L(150, 39, 150, 44, 'sc')}
                  </g>
                  <g fontSize={1.9 * mm} fill="#000" fontFamily="Century Gothic, Arial, sans-serif">
                    {T(1, 2.8, 'UNLESS OTHERWISE SPECIFIED:', 'u1')}
                    {T(1, 5.4, 'DIMENSIONS ARE IN MILLIMETERS', 'u2')}
                    {T(1, 8, 'SURFACE FINISH:', 'u3')}
                    {T(1, 10.6, 'TOLERANCES:', 'u4')}
                    {T(4, 13.1, 'LINEAR:', 'u5')}
                    {T(30, 13.1, 'ANGULAR:', 'u6')}
                    {T(71, 2.8, 'FINISH:', 'f1')}
                    {T(127.5, 6, 'DEBUR AND', 'd1', { textAnchor: 'middle' })}
                    {T(127.5, 8.6, 'BREAK SHARP', 'd2', { textAnchor: 'middle' })}
                    {T(127.5, 11.2, 'EDGES', 'd3', { textAnchor: 'middle' })}
                    {T(152.5, 7.2, 'DO NOT SCALE', 'n1', { textAnchor: 'middle' })}
                    {T(152.5, 9.8, 'DRAWING', 'n2', { textAnchor: 'middle' })}
                    {T(172.5, 2.8, 'REVISION', 'r1', { textAnchor: 'middle' })}
                    {T(172.5, 9.5, (sheet.revisions ?? []).slice(-1)[0]?.rev ?? '', 'r2', { textAnchor: 'middle', fontSize: 3.5 * mm, 'data-testid': 'tb-revision' })}
                    {T(24, 17.6, 'NAME', 'gn', { textAnchor: 'middle' })}
                    {T(44, 17.6, 'SIGNATURE', 'gs', { textAnchor: 'middle' })}
                    {T(62, 17.6, 'DATE', 'gd', { textAnchor: 'middle' })}
                    {rows.map((r, i) => T(1, 22.6 + i * 5, r, 'gr' + i))}
                    <g data-testid="title-block-values">
                      {T(15, 22.6, tbv.drawnBy ?? '', 'vd')}
                      {T(55, 22.6, tbv.drawnDate ?? '', 'vdd')}
                      {T(15, 27.6, tbv.checkedBy ?? '', 'vc')}
                      {T(15, 32.6, tbv.approvedBy ?? '', 'va')}
                      {tbv.company && T(92.5, 9, tbv.company, 'co', { textAnchor: 'middle', fontSize: 3 * mm, fontWeight: 'bold' })}
                    </g>
                    {T(71, 16.8, 'MATERIAL:', 'm1')}
                    {T(92.5, 24.5, mat, 'm2', { textAnchor: 'middle', fontSize: 3 * mm })}
                    {T(71, 31.8, 'WEIGHT:', 'w1')}
                    {T(92.5, 39.5, weight, 'w2', { textAnchor: 'middle', fontSize: 3 * mm })}
                    {T(116, 16.8, 'TITLE:', 't1')}
                    {T(147.5, 25.8, tbv.title || title, 't2', { textAnchor: 'middle', fontSize: 5 * mm, fontWeight: 'bold' })}
                    {T(116, 31.8, 'DWG NO.', 'dn')}
                    {T(141, 37.3, tbv.dwgNo || st.doc.name, 'dv', { textAnchor: 'middle', fontSize: 3.5 * mm })}
                    {T(173, 36.8, sheet.size, 'sz', { textAnchor: 'middle', fontSize: 5 * mm })}
                    {T(116, 42.8, `SCALE:${sheet.scale[0]}:${sheet.scale[1]}`, 'sc')}
                    {T(151, 42.8, `SHEET 1 OF ${1 + (st.doc.otherSheets ?? []).length}`, 'sh')}
                  </g>
                </>
              );
            })()}
          </g>
        )}
        {sheet.views.map((v) => {
          // Broken-out Section ▸ Preview: the view shows the cut while the depth is set
          const bo = de?.mode === 'brokenOut' && de.brokenOutPreview && de.brokenOut?.closed && de.brokenOut.viewId === v.id && de.brokenOut.points.length >= 3 ? de.brokenOut : null;
          return renderView(bo ? { ...v, brokenOut: { poly: bo.points, depth: Math.max(0.01, bo.depth) } } : v);
        })}
        {previewView && (de?.mode !== 'modelView' || de.preview !== false ? renderView(previewView, true) : (() => {
          // Preview off: only the outline of the view follows the pointer
          const g = viewGeometry(previewView);
          const s = viewScale(sheet, previewView);
          const c = toPx(previewView.position);
          const w = (g.max[0] - g.min[0]) * s * mm, h = (g.max[1] - g.min[1]) * s * mm;
          return <rect data-testid="view-frame-preview" x={c[0] - w / 2} y={c[1] - h / 2} width={w} height={h} fill="none" stroke="#1e6fd9" strokeDasharray="4 3" strokeWidth={1} />;
        })())}
        {de?.mode === 'section' && de.sectionAt === undefined && cursorPos && (() => {
          const v = viewAt(cursorPos);
          if (!v || v.section || v.detail) return null;
          const g = viewGeometry(v);
          const q = sheetToView(sheet, v, g, cursorPos);
          const a = de.sectionAxis === 'h' ? toPx(viewToSheet(sheet, v, g, [g.min[0] - 5, q[1]])) : toPx(viewToSheet(sheet, v, g, [q[0], g.min[1] - 5]));
          const c = de.sectionAxis === 'h' ? toPx(viewToSheet(sheet, v, g, [g.max[0] + 5, q[1]])) : toPx(viewToSheet(sheet, v, g, [q[0], g.max[1] + 5]));
          return <line x1={a[0]} y1={a[1]} x2={c[0]} y2={c[1]} stroke="#1e6fd9" strokeWidth={1.2} strokeDasharray="10 3 3 3" />;
        })()}
        {de?.mode === 'section' && de.sectionAt !== undefined && cursorPos && (() => {
          const parent = sheet.views.find((v) => v.id === de.parentId);
          if (!parent) return null;
          const axis = de.sectionAxis ?? 'v';
          const pos: [number, number] = axis === 'v' ? [cursorPos[0], parent.position[1]] : [parent.position[0], cursorPos[1]];
          return renderView({ ...parent, id: '__secprev', position: pos, section: { parentId: parent.id, parentType: parent.type, axis, at: de.sectionAt, flip: sectionFlipFor(axis, parent.position, pos, !!de.sectionFlip), label: '' } }, true);
        })()}
        {de?.mode === 'brokenOut' && de.brokenOut && de.brokenOut.points.length > 0 && (() => {
          const bo = de.brokenOut;
          const v = sheet.views.find((x) => x.id === bo.viewId);
          if (!v) return null;
          const g = viewGeometry({ ...v, brokenOut: undefined, crop: undefined, break: undefined });
          const pts = bo.points.map((pt) => toPx(viewToSheet(sheet, v, g, pt)));
          if (!bo.closed && cursorPos) pts.push(toPx(cursorPos));
          return <path className="k-bo-profile" d={pts.map((q, k) => `${k ? 'L' : 'M'}${q[0]},${q[1]}`).join('') + (bo.closed ? 'Z' : '')} fill="none" stroke="#1e6fd9" strokeWidth={1.2} />;
        })()}
        {de?.mode === 'detail' && de.detailCenter && (() => {
          const parent = sheet.views.find((v) => v.id === de.parentId);
          if (!parent) return null;
          const g = viewGeometry(parent);
          const c = toPx(viewToSheet(sheet, parent, g, de.detailCenter));
          let r = de.detailRadius;
          if (!r && cursorPos) { const q = sheetToView(sheet, parent, g, cursorPos); r = Math.hypot(q[0] - de.detailCenter[0], q[1] - de.detailCenter[1]); }
          const circle = <circle cx={c[0]} cy={c[1]} r={(r ?? 0) * viewScale(sheet, parent) * mm} fill="none" stroke="#1e6fd9" strokeWidth={1.2} />;
          if (!de.detailRadius || !cursorPos) return circle;
          return <g>{circle}{renderView({ ...parent, id: '__detprev', position: cursorPos, scale: de.useCustomScale ? de.scale : [2, 1], detail: { parentId: parent.id, parentType: parent.type, center: de.detailCenter, radius: de.detailRadius, label: '' } }, true)}</g>;
        })()}
        {sheet.dimensions.map(renderDimension)}
        {de?.mode === 'dimension' && de.dimStart && cursorPos && (() => {
          const v = sheet.views.find((x) => x.id === de.dimStart!.viewId);
          if (!v) return null;
          const v2d = viewGeometry(v);
          const sheetLabel = cursorPos;
          const viewLabel = sheetToViewLocal(sheet, v, v2d, sheetLabel);
          const d = { id: '__dimpreview', viewId: v.id, kind: de.dimStart.kind, a: de.dimStart.a, b: de.dimStart.b, label: viewLabel, value: de.dimStart.value, orientation: de.dimStart.kind === 'linear' ? orientationFor(de.dimStart.a, de.dimStart.b, viewLabel) : undefined } as DrawingSheet['dimensions'][number];
          return <g opacity={0.6}>{renderDimension(d)}</g>;
        })()}
        {(sheet.symbols ?? []).map((sy) => renderSymbol(sy))}
        {(sheet.tables ?? []).map((t) => (t.kind === 'hole' ? renderHoleTable(t) : t.kind === 'general' ? renderGeneralTable(t) : renderBom(t)))}
        {(sheet.magneticLines ?? []).filter((ml) => st.drawingTool?.kind === 'magneticLine' || (dragAnnot && ml.balloons.includes(dragAnnot))).map((ml) => { const a = toPx(ml.a), b = toPx(ml.b); return <line key={ml.id} data-testid="magnetic-line" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#3a7bd5" strokeWidth={0.8} strokeDasharray="6 3" />; })}
        {st.drawingTool?.kind === 'magneticLine' && st.drawingTool.a && (() => { const a = toPx(st.drawingTool.a); return <circle cx={a[0]} cy={a[1]} r={3} fill="#3a7bd5" />; })()}
        {(sheet.revisions ?? []).length > 0 && renderRevisionTable()}
        {sheet.views.filter((v) => v.break).map((v) => {
          // break lines: two zigzag lines across the view at the gap
          const g = viewGeometry(v);
          const br = v.break!;
          const k = br.axis === 'x' ? 0 : 1;
          const at1 = Math.min(br.a, br.b), at2 = at1 + br.gap;
          const lo = k === 0 ? g.min[1] - 3 : g.min[0] - 3, hi = k === 0 ? g.max[1] + 3 : g.max[0] + 3;
          // Break line style: straight, curve (S-shape), zig zag (one large zig in the middle) or small zig zag
          const style = br.style ?? 'zigzag';
          const zig = (c: number) => {
            const pts: [number, number][] = [];
            const n = style === 'smallZigzag' ? 16 : style === 'curve' ? 24 : style === 'straight' ? 1 : 8;
            for (let i = 0; i <= n; i++) {
              const s = lo + ((hi - lo) * i) / n;
              const off = style === 'straight' ? 0 : style === 'curve' ? 1.6 * Math.sin((i / n) * Math.PI * 2) : style === 'smallZigzag' ? (i % 2 ? 0.6 : -0.6) : i % 2 ? 1.2 : -1.2;
              pts.push(k === 0 ? [c + off, s] : [s, c + off]);
            }
            return pts.map((pt, i) => { const q = toPx(viewToSheet(sheet, v, g, pt)); return `${i ? 'L' : 'M'}${q[0]},${q[1]}`; }).join('');
          };
          return <g key={'brk' + v.id} className="k-break-lines" data-style={style}><path d={zig(at1)} fill="none" stroke="#000" strokeWidth={0.6} /><path d={zig(at2)} fill="none" stroke="#000" strokeWidth={0.6} /></g>;
        })}
        {de?.mode === 'symbol' && de.symbolAnchor && cursorPos && de.symbolKind && de.symbolKind !== 'centerline' && de.symbolKind !== 'autoBalloon' && (
          <g opacity={0.6}>{renderSymbol({ id: '__symprev', kind: de.symbolKind, position: cursorPos, anchor: de.symbolAnchor, text: de.symbolKind === 'surfaceFinish' ? de.finish : de.symbolText, symbol: de.gtolSymbol, tol: de.gtolTol, datum: de.gtolDatum })}</g>
        )}
        {sheet.notes.map((n) => {
          const p = toPx(n.position);
          const fs = (n.fontSize ?? 3.5) * mm;
          const lines = n.text.split('\n');
          const w = Math.max(...lines.map((l) => l.length)) * fs * 0.56, h = lines.length * fs * 1.2;
          // the text block's box for the alignment (left / center / right of the click) and the border
          const x0 = n.align === 'center' ? p[0] - w / 2 : n.align === 'right' ? p[0] - w : p[0];
          const anchor = n.align === 'center' ? 'middle' : n.align === 'right' ? 'end' : 'start';
          const cx = x0 + w / 2, cy = p[1] - fs + h / 2;
          const A = n.anchor ? toPx(n.anchor) : null;
          return (
            <g key={n.id} className="k-note" data-border={n.border}>
              {A && <><line x1={A[0]} y1={A[1]} x2={x0 - 1 * mm} y2={cy} stroke="#000" strokeWidth={0.6} />{arrow(A, [x0 - 1 * mm, cy], mm)}</>}
              {n.border === 'box' && <rect x={x0 - 1.5 * mm} y={p[1] - fs - 1.2 * mm} width={w + 3 * mm} height={h + 2 * mm} fill="none" stroke="#000" strokeWidth={0.6} />}
              {n.border === 'circular' && <circle cx={cx} cy={cy} r={Math.max(w, h) / 2 + 2 * mm} fill="none" stroke="#000" strokeWidth={0.6} />}
              {n.border === 'triangle' && (() => { const s = Math.max(w, h) + 6 * mm; return <path d={`M${cx},${cy - s * 0.62} L${cx + s * 0.6},${cy + s * 0.42} L${cx - s * 0.6},${cy + s * 0.42} Z`} fill="none" stroke="#000" strokeWidth={0.6} />; })()}
              <text x={n.align === 'center' ? cx : n.align === 'right' ? p[0] : p[0]} y={p[1]} textAnchor={anchor} fontSize={fs} fontWeight={n.bold ? 700 : 400} fontStyle={n.italic ? 'italic' : 'normal'} fill="#000" fontFamily="Century Gothic, Arial, sans-serif" data-testid="sheet-note" className={st.drawingTool?.kind === 'formatPainter' && st.drawingTool.source === n.id ? 'k-note-source' : ''}>
                {lines.map((l, i) => <tspan key={i} x={n.align === 'center' ? cx : p[0]} dy={i ? fs * 1.2 : 0}>{l}</tspan>)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="k-doctabs k-sheettabs">
        <button className="k-doctab-arrow">⏮</button>
        <button className="k-doctab-arrow">‹</button>
        <button className="k-doctab-arrow">›</button>
        <button className="k-doctab-arrow">⏭</button>
        {[sheet, ...(st.doc.otherSheets ?? [])].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { numeric: true })).map((sh) => (
          <button key={sh.id} className={`k-doctab ${sh.id === sheet.id ? 'active' : ''}`} data-testid="sheet-tab" onClick={() => sh.id !== sheet.id && st.activateSheet(sh.id)} onDoubleClick={() => sh.id === sheet.id && st.setDialog('sheetProperties')}><Icon.Sheet size={12} /> {sh.name ?? 'Sheet1'}</button>
        ))}
        <button className="k-doctab k-tip" data-tip="Add Sheet" data-testid="add-sheet" onClick={st.addSheet}><Icon.Sheet size={12} />+</button>
      </div>
      <div className="k-sheet-hint">{de?.mode === 'modelView' && de.model ? 'Click in the sheet to place the view.' : de?.mode === 'projected' ? 'Move the cursor to one side of the view and click to place the projected view (Esc to finish).' : de?.mode === 'dimension' ? (de.dimStart ? 'Click to place the dimension.' : 'Select an edge or circle to dimension.') : de?.mode === 'note' ? 'Click to place the note.' : de?.mode === 'centerMark' ? 'Select a circular edge.' : de?.mode === 'altPosition' ? 'Choose the alternate position and click OK.' : de?.mode === 'titleBlock' ? 'Fill in the title block fields and click OK.' : de?.mode === 'brokenOut' ? (de.brokenOut?.closed ? 'Set the depth and click OK.' : 'Click points of the closed profile in the view; click the first point to close it.') : de?.mode === 'aux' ? (de.auxEdge ? 'Click to place the auxiliary view.' : 'Select a linear edge in a view.') : de?.mode === 'crop' ? (de.viewTool?.first ? 'Click the opposite corner of the crop rectangle.' : 'Click a corner of the crop rectangle in the view.') : de?.mode === 'break' ? (de.viewTool?.first ? 'Click the second break line.' : 'Click the first break line in the view.') : de?.mode === 'symbol' ? (de.symbolKind === 'centerline' ? (de.symbolLine ? 'Select the second edge.' : 'Select two parallel edges.') : de.symbolKind === 'autoBalloon' ? 'Click in a view to balloon its components.' : de.symbolAnchor ? 'Click to place the annotation.' : de.symbolKind === 'holeCallout' ? 'Select the edge of a hole.' : 'Click the geometry the leader points to.') : de?.mode === 'section' ? (de.sectionAt === undefined ? 'Click in a view to place the cutting line.' : 'Click to place the section view.') : de?.mode === 'detail' ? (!de.detailCenter ? 'Click the centre of the detail circle.' : !de.detailRadius ? 'Click to set the radius of the circle.' : 'Click to place the detail view.') : ''}</div>
    </div>
  );
}

/** the second arrowhead of a dimension: the document style (closed filled) or open / dot / slash */
function arrowHead(tip: [number, number], from: [number, number], mm: number, style?: 'closed' | 'open' | 'dot' | 'slash') {
  if (!style || style === 'closed') return arrow(tip, from, mm);
  const dx = tip[0] - from[0], dy = tip[1] - from[1], len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, L = 3 * mm, W = 1 * mm;
  const bx = tip[0] - ux * L, by = tip[1] - uy * L;
  if (style === 'dot') return <circle cx={tip[0]} cy={tip[1]} r={0.8 * mm} stroke="none" />;
  if (style === 'slash') return <line x1={tip[0] - (ux - uy) * 1.4 * mm} y1={tip[1] - (uy + ux) * 1.4 * mm} x2={tip[0] + (ux - uy) * 1.4 * mm} y2={tip[1] + (uy + ux) * 1.4 * mm} />;
  return <polyline points={`${bx - uy * W},${by + ux * W} ${tip[0]},${tip[1]} ${bx + uy * W},${by - ux * W}`} fill="none" />;
}

function arrow(tip: [number, number], from: [number, number], mm: number) {
  const dx = tip[0] - from[0], dy = tip[1] - from[1], len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, L = 3 * mm, W = 1 * mm;
  const bx = tip[0] - ux * L, by = tip[1] - uy * L;
  return <polygon points={`${tip[0]},${tip[1]} ${bx - uy * W},${by + ux * W} ${bx + uy * W},${by - ux * W}`} stroke="none" />;
}

function directionFrom(parent: DrawingView, p: [number, number]): 'up' | 'down' | 'left' | 'right' | null {
  const dx = p[0] - parent.position[0], dy = p[1] - parent.position[1];
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'up' : 'down';
}

function sheetToViewLocal(sheet: DrawingSheet, v: DrawingView, v2d: ReturnType<typeof projectedView>, p: [number, number]): [number, number] {
  const s = viewScale(sheet, v);
  const c: [number, number] = [(v2d.min[0] + v2d.max[0]) / 2, (v2d.min[1] + v2d.max[1]) / 2];
  return [c[0] + (p[0] - v.position[0]) / s, c[1] + (p[1] - v.position[1]) / s];
}

/** orientation of a linear dimension from where the label is placed (as the Smart Dimension of the intended design) */
export function orientationFor(a: [number, number], b: [number, number], label: [number, number]): 'h' | 'v' | 'aligned' {
  const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]);
  if (dx < 1e-6) return 'v';
  if (dy < 1e-6) return 'h';
  // label beyond the ends horizontally -> vertical dimension, above/below -> horizontal
  const minx = Math.min(a[0], b[0]), maxx = Math.max(a[0], b[0]), miny = Math.min(a[1], b[1]), maxy = Math.max(a[1], b[1]);
  if (label[0] < minx || label[0] > maxx) return 'v';
  if (label[1] < miny || label[1] > maxy) return 'h';
  return 'aligned';
}
