import { useMemo } from 'react';
import type { Sketch, SketchPoint } from '../../core/sketch/types';
import type { SolveResult } from '../../core/solver/solver';
import { dimensionDrawing, glyphDrawings } from './annotations';
import { useStore } from '../store';
import { dimensionTable, sketchDimensionName } from '../../core/document/equations';
import { RelationGlyph } from '../../ui/icons';
import type { ToolRender } from './tools';
import { arrowSize, dimFontFamily } from '../prefsFormat';

export interface OverlayProps {
  sketch: Sketch | null;
  solve: SolveResult | null;
  unit: string;
  project: (p: SketchPoint) => { x: number; y: number };
  toolRender: ToolRender | null;
  showRelations: boolean;
  /** only the dimensions (a feature selected in the tree), no relation glyphs */
  dimsOnly?: boolean;
  selectedConstraint: string | null;
  hoverConstraint: string | null;
  onConstraintClick: (id: string) => void;
  onConstraintDoubleClick: (id: string) => void;
  width: number;
  height: number;
  /** pixel size of a sketch unit (for arrow sizing) */
  pxPerUnit: number;
  /** register label bounding boxes for hit testing */
  registerLabels: (boxes: { id: string; x: number; y: number; w: number; h: number }[]) => void;
}

const ARROW = 8;

export function Overlay(props: OverlayProps) {
  const { sketch, solve, project, toolRender, width, height, unit } = props;
  const doc = useStore((s) => s.doc);
  const dims = useMemo(() => {
    if (!sketch) return [];
    const linked = new Set(dimensionTable(doc).filter((d) => d.ref.kind === 'sketch' && d.ref.sketchId === sketch.id && doc.equations.some((e) => e.target === d.name)).map((d) => (d.ref as { constraintId: string }).constraintId));
    return sketch.constraintOrder
      .map((id) => sketch.constraints[id])
      .map((c) => dimensionDrawing(sketch, c, unit, !!c.driven, linked.has(c.id)))
      .filter((d): d is NonNullable<typeof d> => !!d);
  }, [sketch, unit, doc]);
  const glyphs = useMemo(() => (sketch && props.showRelations && !props.dimsOnly ? glyphDrawings(sketch) : []), [sketch, props.showRelations, props.dimsOnly]);

  const labelBoxes: { id: string; x: number; y: number; w: number; h: number }[] = [];

  const arrow = (tip: { x: number; y: number }, dir: { x: number; y: number }, color: string, key: string, style: 'filled' | 'open' | 'dot' | 'slash' = 'filled') => {
    const l = Math.hypot(dir.x, dir.y) || 1;
    const d = { x: dir.x / l, y: dir.y / l };
    const n = { x: -d.y, y: d.x };
    // Document Properties ▸ Dimensions ▸ Arrows: the head length and width
    const { length: AL, halfWidth: AW } = arrowSize(ARROW);
    const p1 = { x: tip.x - d.x * AL + n.x * AW, y: tip.y - d.y * AL + n.y * AW };
    const p2 = { x: tip.x - d.x * AL - n.x * AW, y: tip.y - d.y * AL - n.y * AW };
    // Leaders > arrow style: filled (default), open, dot or architectural slash
    if (style === 'dot') return <circle key={key} cx={tip.x} cy={tip.y} r={ARROW * 0.3} fill={color} />;
    if (style === 'slash') return <line key={key} x1={tip.x - (d.x + n.x) * ARROW * 0.45} y1={tip.y - (d.y + n.y) * ARROW * 0.45} x2={tip.x + (d.x + n.x) * ARROW * 0.45} y2={tip.y + (d.y + n.y) * ARROW * 0.45} stroke={color} strokeWidth={1.5} />;
    if (style === 'open') return <polyline key={key} points={`${p1.x},${p1.y} ${tip.x},${tip.y} ${p2.x},${p2.y}`} fill="none" stroke={color} strokeWidth={1} />;
    return <polygon key={key} points={`${tip.x},${tip.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`} fill={color} />;
  };

  const colorFor = (id: string): string => {
    const st = solve?.constraintStatus[id];
    if (props.selectedConstraint === id) return 'var(--sk-selected)';
    if (props.hoverConstraint === id) return 'var(--sk-hover)';
    if (st === 'conflicting' || st === 'redundant' || st === 'invalid') return 'var(--sk-over)';
    if (st === 'driven') return 'var(--text-muted)';
    return 'var(--sk-dimension)';
  };

  const content = (
    <>
      {dims.map((d) => {
        const color = colorFor(d.id);
        const label = project(d.label);
        // by design (ISO): no frame, the text above the dimension line and turned with it (a vertical
        // dimension reads from bottom to top); a radius / diameter text lies on the end of its leader
        const FS = d.fontSize ?? 15;
        // the widest line of the text (several lines: a dimension text with line breaks), the stacked tolerance beside it
        const lines = d.text.split('\n');
        const tolW = d.tol ? Math.max(d.tol.upper.length, d.tol.lower.length) * FS * 0.42 + 4 : 0;
        const tw = Math.max(...lines.map((l) => l.length)) * FS * 0.56 + 4 + tolW, th = FS * lines.length + 2;
        const main = d.leader ? d.lines[d.lines.length - 1] : d.lines.find((l) => l.arrowA && l.arrowB);
        let ang = 0;
        if (main) { const a = project(main.a), b = project(main.b); ang = Math.atan2(b.y - a.y, b.x - a.x); }
        if (d.leader && main) { const a = project(main.a), b = project(main.b); ang = Math.atan2(a.y - b.y, a.x - b.x); }
        let deg = (ang * 180) / Math.PI;
        while (deg >= 90) deg -= 180;
        while (deg < -90) deg += 180;
        const t = (deg * Math.PI) / 180;
        const up = { x: Math.sin(t), y: -Math.cos(t) };
        const along = { x: Math.cos(t), y: Math.sin(t) };
        let c = { x: label.x + up.x * (FS * 0.5 + 2), y: label.y + up.y * (FS * 0.5 + 2) };
        let leaderEnd: { x: number; y: number } | null = null;
        if (d.leader && main) {
          // the leader runs on under the text; the text sits on its outer end
          const a = project(main.a), b = project(main.b);
          const L = Math.hypot(a.x - b.x, a.y - b.y) || 1, ux = (a.x - b.x) / L, uy = (a.y - b.y) / L;
          const s = ux * along.x + uy * along.y >= 0 ? 1 : -1;
          leaderEnd = { x: a.x + ux * tw, y: a.y + uy * tw };
          const mid = { x: a.x + (ux * tw) / 2, y: a.y + (uy * tw) / 2 };
          c = { x: mid.x + up.x * (FS * 0.5 + 2), y: mid.y + up.y * (FS * 0.5 + 2) };
          void s;
        }
        const hl = props.selectedConstraint === d.id || props.hoverConstraint === d.id;
        const bw = Math.abs(along.x) * tw + Math.abs(up.x) * th, bh = Math.abs(along.y) * tw + Math.abs(up.y) * th;
        labelBoxes.push({ id: d.id, x: c.x - bw / 2, y: c.y - bh / 2, w: bw, h: bh });
        const w = tw, h = th;
        return (
          <g key={d.id} className="k-dim" style={{ cursor: 'pointer' }} onMouseDown={(e) => { e.stopPropagation(); }} onClick={(e) => { e.stopPropagation(); if (!props.dimsOnly) props.onConstraintClick(d.id); }} onDoubleClick={(e) => { e.stopPropagation(); if (!props.dimsOnly) props.onConstraintDoubleClick(d.id); }}>
            {/* the dimension's name as its tooltip, as the intended design (D3@Sketch6) */}
            {props.sketch && <title>{sketchDimensionName(props.sketch, d.id)}</title>}
            {d.lines.map((l, i) => {
              const a = project(l.a), b = project(l.b);
              const dir = { x: b.x - a.x, y: b.y - a.y };
              return (
                <g key={i}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={1} />
                  {l.arrowA && arrow(a, { x: -dir.x, y: -dir.y }, color, `a${i}`, d.arrowStyle)}
                  {l.arrowB && arrow(b, dir, color, `b${i}`, d.arrowStyle)}
                  {/* the dimensions of a feature selected in the tree carry the intended blue end handles */}
                  {props.dimsOnly && l.arrowA && <circle cx={a.x} cy={a.y} r={4.5} fill="#2814d2" data-testid="dim-handle" />}
                  {props.dimsOnly && l.arrowB && <circle cx={b.x} cy={b.y} r={4.5} fill="#2814d2" data-testid="dim-handle" />}
                </g>
              );
            })}
            {d.arc && (() => {
              const c = project(d.arc.c);
              const rpx = d.arc.r * props.pxPerUnit;
              // screen y is flipped: angles negate
              let a0 = -d.arc.a0, a1 = -d.arc.a1;
              let sweep = a1 - a0;
              while (sweep > Math.PI) sweep -= 2 * Math.PI;
              while (sweep < -Math.PI) sweep += 2 * Math.PI;
              const p0 = { x: c.x + rpx * Math.cos(a0), y: c.y + rpx * Math.sin(a0) };
              const p1 = { x: c.x + rpx * Math.cos(a0 + sweep), y: c.y + rpx * Math.sin(a0 + sweep) };
              const large = Math.abs(sweep) > Math.PI ? 1 : 0;
              const sf = sweep > 0 ? 1 : 0;
              return <path d={`M${p0.x},${p0.y} A${rpx},${rpx} 0 ${large} ${sf} ${p1.x},${p1.y}`} fill="none" stroke={color} />;
            })()}
            {leaderEnd && main && (() => { const a = project(main.a); return <line x1={a.x} y1={a.y} x2={leaderEnd.x} y2={leaderEnd.y} stroke={color} strokeWidth={1} />; })()}
            <g transform={`rotate(${deg} ${c.x} ${c.y})`}>
              {/* the text is picked through its box; it shows a frame only while hovered / selected */}
              {/* Basic tolerance: the value in a frame, by design */}
              <rect x={c.x - w / 2} y={c.y - h / 2} width={w} height={h} fill="transparent" stroke={hl || d.basic ? color : 'none'} strokeWidth={d.basic ? 1 : 0.75} data-testid={d.basic ? 'dim-basic' : undefined} />
              <text x={d.justify === 'left' ? c.x - w / 2 + 2 : d.justify === 'right' ? c.x + w / 2 - 2 - tolW : c.x - tolW / 2} y={c.y + FS * 0.36 - ((lines.length - 1) * FS) / 2} textAnchor={d.justify === 'left' ? 'start' : d.justify === 'right' ? 'end' : 'middle'} fontSize={FS} fontFamily={dimFontFamily()} fill={color} data-testid="sketch-dim-text">
                {lines.length > 1 ? lines.map((l, i) => <tspan key={i} x={d.justify === 'left' ? c.x - w / 2 + 2 : d.justify === 'right' ? c.x + w / 2 - 2 - tolW : c.x - tolW / 2} dy={i ? FS : 0}>{l}</tspan>) : d.text}
              </text>
              {d.tol && (
                <text x={d.tol.limit ? c.x : c.x + w / 2 - tolW + 2} textAnchor={d.tol.limit ? 'middle' : 'start'} fontSize={d.tol.limit ? FS * 0.8 : FS * 0.62} fontFamily={dimFontFamily()} fill={color} data-testid="dim-tol">
                  <tspan x={d.tol.limit ? c.x : c.x + w / 2 - tolW + 2} y={c.y - FS * 0.08}>{d.tol.upper}</tspan>
                  <tspan x={d.tol.limit ? c.x : c.x + w / 2 - tolW + 2} y={c.y + FS * (d.tol.limit ? 0.72 : 0.52)}>{d.tol.lower}</tspan>
                </text>
              )}
            </g>
          </g>
        );
      })}
      {toolRender?.readout && toolRender.cursorAt && (() => {
        const q = project(toolRender.cursorAt);
        return <text x={q.x + 14} y={q.y - 10} fontSize={12} fontFamily="'Segoe UI', Arial, sans-serif" fill="#000" stroke="#fff" strokeWidth={3} paintOrder="stroke" data-testid="draw-readout">{toolRender.readout}</text>;
      })()}
      {glyphs.map((g, i) => {
        const p = project(g.at);
        // stack glyphs that share an anchor: in a row along the entity, offset to its outer side
        const group = glyphs.filter((o) => Math.abs(o.at.x - g.at.x) < 1e-9 && Math.abs(o.at.y - g.at.y) < 1e-9);
        const idx = group.indexOf(g);
        const count = group.length;
        const S = 13, GAP = 2;
        // screen-space direction/normal (y flipped)
        const d = g.dir ?? { x: 1, y: 0 };
        const n = g.normal ?? { x: 0, y: -1 };
        const sd = { x: d.x, y: -d.y }, sn = { x: n.x, y: -n.y };
        const nl = Math.hypot(sn.x, sn.y) || 1;
        const off = g.isPoint ? 9 : 11;
        const along = (idx - (count - 1) / 2) * (S + GAP);
        const cx = p.x + (sn.x / nl) * off + sd.x * along;
        const cy = p.y + (sn.y / nl) * off + sd.y * along;
        const x = Math.round(cx - S / 2), y = Math.round(cy - S / 2);
        const Glyph = RelationGlyph[g.kind];
        const st = solve?.constraintStatus[g.constraintId];
        const bad = st === 'conflicting' || st === 'redundant' || st === 'invalid';
        const hl = props.selectedConstraint === g.constraintId || props.hoverConstraint === g.constraintId;
        // bright green filled squares with a dark glyph, by design (red when over defined, orange on hover)
        const box = bad ? 'var(--sk-over)' : hl ? 'var(--sk-hover)' : 'var(--sk-relation-box)';
        labelBoxes.push({ id: g.constraintId, x, y, w: S, h: S });
        return (
          <g key={`${g.constraintId}-${i}`} transform={`translate(${x},${y})`} style={{ cursor: 'pointer', color: '#0a2a0a' }} onClick={(e) => { e.stopPropagation(); props.onConstraintClick(g.constraintId); }}>
            <rect width={S} height={S} fill={box} />
            {Glyph && <g transform="translate(1.5,1.5)"><Glyph size={10} /></g>}
          </g>
        );
      })}
      {toolRender?.dimPreview && sketch && (() => {
        const pv = toolRender.dimPreview;
        const d = dimensionDrawing(sketch, { id: '__preview', kind: pv.kind, refs: pv.refs, value: pv.value, labelOffset: pv.label } as unknown as Parameters<typeof dimensionDrawing>[1], unit, false);
        if (!d) return null;
        const color = 'var(--sk-dimension)';
        const label = project(d.label);
        return (
          <g opacity={0.85} pointerEvents="none">
            {d.lines.map((l, i) => {
              const a = project(l.a), b = project(l.b);
              const dir = { x: b.x - a.x, y: b.y - a.y };
              return (
                <g key={i}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={1} />
                  {l.arrowA && arrow(a, { x: -dir.x, y: -dir.y }, color, `pa${i}`)}
                  {l.arrowB && arrow(b, dir, color, `pb${i}`)}
                </g>
              );
            })}
            {d.arc && (() => {
              const c = project(d.arc.c);
              const rpx = d.arc.r * props.pxPerUnit;
              const a0 = -d.arc.a0, a1 = -d.arc.a1;
              let sweep = a1 - a0;
              while (sweep > Math.PI) sweep -= 2 * Math.PI;
              while (sweep < -Math.PI) sweep += 2 * Math.PI;
              const p0 = { x: c.x + rpx * Math.cos(a0), y: c.y + rpx * Math.sin(a0) };
              const p1 = { x: c.x + rpx * Math.cos(a0 + sweep), y: c.y + rpx * Math.sin(a0 + sweep) };
              return <path d={`M${p0.x},${p0.y} A${rpx},${rpx} 0 0 ${sweep > 0 ? 1 : 0} ${p1.x},${p1.y}`} fill="none" stroke={color} />;
            })()}
            <text x={label.x} y={label.y + 4.5} textAnchor="middle" fontSize={12.5} fontFamily="var(--font-ui)" fill={color}>
              {d.text}
            </text>
          </g>
        );
      })()}
      {toolRender?.snap?.align?.map((q, i) => {
        // dotted inference line from the point the cursor lines up with
        const a = project(q), p = project(toolRender.snap!.point);
        return <line key={'al' + i} data-testid="inference-line" x1={a.x} y1={a.y} x2={p.x} y2={p.y} stroke="var(--sk-hover)" strokeWidth={1} strokeDasharray="2 3" />;
      })}
      {toolRender?.snap?.from && (() => {
        // angle / parallel / perpendicular inference: a dotted line along the inferred direction
        const a = project(toolRender.snap.from), p = project(toolRender.snap.point);
        return <line data-testid="direction-inference" x1={a.x} y1={a.y} x2={p.x} y2={p.y} stroke="var(--sk-hover)" strokeWidth={1} strokeDasharray="2 3" />;
      })()}
      {toolRender?.snap && (() => {
        const p = project(toolRender.snap.point);
        const k = toolRender.snap.kind;
        return (
          <g transform={`translate(${p.x},${p.y})`} stroke="var(--sk-hover)" fill="none" strokeWidth={1.5}>
            {k === 'endpoint' || k === 'origin' ? <rect x={-5} y={-5} width={10} height={10} /> : null}
            {k === 'midpoint' ? <polygon points="0,-6 6,5 -6,5" /> : null}
            {k === 'center' ? <circle r={6} /> : null}
            {k === 'on' ? <path d="M-5,-5L5,5M-5,5L5,-5" /> : null}
            {k === 'horizontal' ? <path d="M-14,0H14" strokeDasharray="3 3" /> : null}
            {k === 'vertical' ? <path d="M0,-14V14" strokeDasharray="3 3" /> : null}
            {k === 'quadrant' ? <polygon points="0,-6 6,0 0,6 -6,0" /> : null}
            {k === 'intersection' ? <><circle r={6} /><path d="M-4,-4L4,4M-4,4L4,-4" /></> : null}
            {k === 'tangent' ? <g data-testid="snap-tangent"><circle cy={-5} r={5} /><path d="M-8,0H8" /></g> : null}
          </g>
        );
      })()}
      {toolRender?.lasso && (() => {
        const pts = toolRender.lasso.map((q) => project(q));
        return <polygon data-testid="lasso" points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(80,140,220,0.12)" stroke="#3a7bd5" strokeDasharray="5 3" strokeWidth={1} />;
      })()}
      {toolRender?.box && (() => {
        const a = project(toolRender.box.a), b = project(toolRender.box.b);
        const crossing = toolRender.box.b.x < toolRender.box.a.x;
        return <rect x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(a.x - b.x)} height={Math.abs(a.y - b.y)} fill={crossing ? 'rgba(34,197,94,0.12)' : 'rgba(31,111,235,0.12)'} stroke={crossing ? 'var(--ok)' : 'var(--accent)'} strokeDasharray={crossing ? '4 3' : undefined} />;
      })()}
    </>
  );
  props.registerLabels(labelBoxes);
  return (
    <svg className="k-overlay" width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      <g style={{ pointerEvents: 'auto' }}>{content}</g>
    </svg>
  );
}
