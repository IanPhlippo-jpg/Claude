import { useMemo } from 'react';
import type { Sketch, SketchPoint } from '../../core/sketch/types';
import type { SolveResult } from '../../core/solver/solver';
import { dimensionDrawing, glyphDrawings } from './annotations';
import { RelationGlyph } from '../../ui/icons';
import type { ToolRender } from './tools';

export interface OverlayProps {
  sketch: Sketch | null;
  solve: SolveResult | null;
  unit: string;
  project: (p: SketchPoint) => { x: number; y: number };
  toolRender: ToolRender | null;
  showRelations: boolean;
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
  const dims = useMemo(() => {
    if (!sketch) return [];
    return sketch.constraintOrder
      .map((id) => sketch.constraints[id])
      .map((c) => dimensionDrawing(sketch, c, unit, !!c.driven))
      .filter((d): d is NonNullable<typeof d> => !!d);
  }, [sketch, unit]);
  const glyphs = useMemo(() => (sketch && props.showRelations ? glyphDrawings(sketch) : []), [sketch, props.showRelations]);

  const labelBoxes: { id: string; x: number; y: number; w: number; h: number }[] = [];

  const arrow = (tip: { x: number; y: number }, dir: { x: number; y: number }, color: string, key: string) => {
    const l = Math.hypot(dir.x, dir.y) || 1;
    const d = { x: dir.x / l, y: dir.y / l };
    const n = { x: -d.y, y: d.x };
    const p1 = { x: tip.x - d.x * ARROW + n.x * ARROW * 0.35, y: tip.y - d.y * ARROW + n.y * ARROW * 0.35 };
    const p2 = { x: tip.x - d.x * ARROW - n.x * ARROW * 0.35, y: tip.y - d.y * ARROW - n.y * ARROW * 0.35 };
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
        const w = d.text.length * 7 + 10, h = 16;
        labelBoxes.push({ id: d.id, x: label.x - w / 2, y: label.y - h / 2, w, h });
        return (
          <g key={d.id} className="k-dim" style={{ cursor: 'pointer' }} onMouseDown={(e) => { e.stopPropagation(); }} onClick={(e) => { e.stopPropagation(); props.onConstraintClick(d.id); }} onDoubleClick={(e) => { e.stopPropagation(); props.onConstraintDoubleClick(d.id); }}>
            {d.lines.map((l, i) => {
              const a = project(l.a), b = project(l.b);
              const dir = { x: b.x - a.x, y: b.y - a.y };
              return (
                <g key={i}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={1} />
                  {l.arrowA && arrow(a, { x: -dir.x, y: -dir.y }, color, `a${i}`)}
                  {l.arrowB && arrow(b, dir, color, `b${i}`)}
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
            <rect x={label.x - w / 2} y={label.y - h / 2} width={w} height={h} rx={3} fill="var(--sk-relation-bg)" stroke={props.selectedConstraint === d.id ? color : 'none'} />
            <text x={label.x} y={label.y + 4} textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)" fill={color}>
              {d.text}
            </text>
          </g>
        );
      })}
      {glyphs.map((g, i) => {
        const p = project(g.at);
        // stack glyphs that share an anchor
        const prior = glyphs.slice(0, i).filter((o) => Math.abs(o.at.x - g.at.x) < 1e-9 && Math.abs(o.at.y - g.at.y) < 1e-9).length;
        const x = p.x + 8 + prior * 16, y = p.y + 8;
        const Glyph = RelationGlyph[g.kind];
        const color = colorFor(g.constraintId) === 'var(--sk-dimension)' ? 'var(--text-muted)' : colorFor(g.constraintId);
        labelBoxes.push({ id: g.constraintId, x, y, w: 14, h: 14 });
        return (
          <g key={`${g.constraintId}-${i}`} transform={`translate(${x},${y})`} style={{ cursor: 'pointer', color }} onClick={(e) => { e.stopPropagation(); props.onConstraintClick(g.constraintId); }}>
            <rect width={14} height={14} rx={2} fill="var(--sk-relation-bg)" stroke={color} strokeWidth={0.75} />
            {Glyph && <g transform="translate(1,1)"><Glyph size={12} /></g>}
          </g>
        );
      })}
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
          </g>
        );
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
