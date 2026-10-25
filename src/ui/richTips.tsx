import type { ReactElement } from 'react';

/**
 * Rich tooltips of the CommandManager, as the original 2026 shows them: a bold title, an illustration of what the
 * command makes (here our own small isometric drawings, yellow for what the command adds) and a short explanation.
 */

type V3 = [number, number, number];
// isometric projection into a 220 x 130 picture, origin in the middle
const P = ([x, y, z]: V3): [number, number] => [110 + (x - z) * 0.866 * 3.2, 78 + ((x + z) * 0.5 - y) * 3.2];
const pts = (...ps: V3[]) => ps.map((p) => P(p).map((v) => v.toFixed(1)).join(',')).join(' ');

const BODY = { top: '#ececee', front: '#d7d9dd', side: '#bcc0c6', line: '#4a4f57' };
const YEL = { top: 'rgba(246,252,70,0.75)', front: 'rgba(232,240,60,0.75)', side: 'rgba(214,224,48,0.75)', line: '#a8b31c' };
type Look = typeof BODY;

/** an axis-aligned box from (x,y,z) with size (w,h,d): the three visible faces */
function box(x: number, y: number, z: number, w: number, h: number, d: number, c: Look = BODY, k = ''): ReactElement {
  return (
    <g key={k || `b${x}${y}${z}${w}${h}${d}`} stroke={c.line} strokeWidth={0.8} strokeLinejoin="round">
      <polygon points={pts([x, y + h, z], [x + w, y + h, z], [x + w, y + h, z + d], [x, y + h, z + d])} fill={c.top} />
      <polygon points={pts([x, y, z + d], [x + w, y, z + d], [x + w, y + h, z + d], [x, y + h, z + d])} fill={c.front} />
      <polygon points={pts([x + w, y, z], [x + w, y, z + d], [x + w, y + h, z + d], [x + w, y + h, z])} fill={c.side} />
    </g>
  );
}
/** a vertical cylinder standing on (x,y,z) */
function cyl(x: number, y: number, z: number, r: number, h: number, c: Look = BODY, k = ''): ReactElement {
  const [cx, cy] = P([x, y, z]), [, ty] = P([x, y + h, z]);
  const rx = r * 0.866 * 3.2 * 1.414, ry = r * 0.5 * 3.2 * 1.414;
  return (
    <g key={k || `c${x}${y}${z}`} stroke={c.line} strokeWidth={0.8}>
      <path d={`M${cx - rx},${cy}V${ty}A${rx},${ry} 0 0 0 ${cx + rx},${ty}V${cy}A${rx},${ry} 0 0 1 ${cx - rx},${cy}Z`} fill={c.front} />
      <ellipse cx={cx} cy={ty} rx={rx} ry={ry} fill={c.top} />
    </g>
  );
}
function arrow(a: V3, b: V3, k = 'ar'): ReactElement {
  const [x1, y1] = P(a), [x2, y2] = P(b);
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  return (
    <g key={k}>
      <line x1={x1} y1={y1} x2={x2 - ux * 9} y2={y2 - uy * 9} stroke="#8a8a8a" strokeWidth={3.2} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2 - ux * 9} y2={y2 - uy * 9} stroke="#f4f4f4" strokeWidth={1.2} />
      <path d={`M${x2},${y2}L${x2 - ux * 11 - uy * 5},${y2 - uy * 11 + ux * 5}L${x2 - ux * 11 + uy * 5},${y2 - uy * 11 - ux * 5}Z`} fill="#e6e6e6" stroke="#7a7a7a" strokeWidth={0.8} />
    </g>
  );
}
/** a flat sketch profile (dark shaded contour with blue lines) on the Top Plane */
function profile(x: number, z: number, w: number, d: number, y = 0, k = 'pf'): ReactElement {
  return <polygon key={k} points={pts([x, y, z], [x + w, y, z], [x + w, y, z + d], [x, y, z + d])} fill="#9a9da3" stroke="#1d3fd0" strokeWidth={1.2} />;
}
const sk = (d: string, k = 's') => <path key={k} d={d} fill="none" stroke="#1d3fd0" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />;
const dot = (x: number, y: number, k = 'd') => <rect key={k} x={x - 2} y={y - 2} width={4} height={4} fill="#1d3fd0" />;

/** the illustrations, keyed by command label */
const ART: Record<string, () => ReactElement[]> = {
  'Extruded Boss/Base': () => [profile(-8, -8, 16, 16), box(-8, 0, -8, 16, 12, 16, YEL), arrow([0, 0, 0], [0, 22, 0])],
  'Extruded Cut': () => [box(-14, 0, -14, 28, 6, 28), box(-6, 0.2, -6, 12, 6, 12, YEL), arrow([0, 13, 0], [0, 2, 0])],
  'Revolved Boss/Base': () => [cyl(0, 0, 0, 9, 12, YEL), <line key="ax" x1={P([0, -4, 0])[0]} y1={P([0, -4, 0])[1]} x2={P([0, 18, 0])[0]} y2={P([0, 18, 0])[1]} stroke="#555" strokeDasharray="6 2 1 2" />],
  'Revolved Cut': () => [box(-14, 0, -14, 28, 8, 28), cyl(0, 0.3, 0, 8, 8, YEL)],
  'Swept Boss/Base': () => [<path key="sw" d="M40,96C70,40 120,110 180,40" fill="none" stroke={YEL.line} strokeWidth={15} strokeLinecap="round" opacity={0.85} />, <path key="sw2" d="M40,96C70,40 120,110 180,40" fill="none" stroke="rgba(246,252,70,0.9)" strokeWidth={12} strokeLinecap="round" />, <path key="sp" d="M40,96C70,40 120,110 180,40" fill="none" stroke="#1d3fd0" strokeWidth={1.2} strokeDasharray="4 2" />, <ellipse key="pr" cx={40} cy={96} rx={6} ry={7} fill="none" stroke="#1d3fd0" strokeWidth={1.4} />],
  'Swept Cut': () => [box(-16, 0, -12, 32, 8, 24), <path key="sw" d="M50,74C80,60 120,92 170,66" fill="none" stroke="rgba(246,252,70,0.9)" strokeWidth={9} strokeLinecap="round" />],
  'Lofted Boss/Base': () => [<polygon key="l" points={`${P([-9, 0, -9])} ${P([9, 0, -9])} ${P([9, 0, 9])} ${P([5, 16, 5])} ${P([-5, 16, -5])}`.replace(/,/g, ',')} fill="rgba(240,248,60,0.8)" stroke={YEL.line} />, profile(-9, -9, 18, 18, 0, 'p1'), <ellipse key="tp" cx={P([0, 16, 0])[0]} cy={P([0, 16, 0])[1]} rx={22} ry={12} fill="none" stroke="#1d3fd0" strokeWidth={1.4} />],
  'Lofted Cut': () => [box(-16, 0, -14, 32, 9, 28), cyl(0, 0.3, 0, 7, 9, YEL)],
  'Boundary Boss/Base': () => [<path key="b" d="M50,100Q110,20 170,90L150,110Q110,60 70,115Z" fill="rgba(240,248,60,0.8)" stroke={YEL.line} />, sk('M50,100Q110,20 170,90', 'c1'), sk('M70,115Q110,60 150,110', 'c2')],
  'Boundary Cut': () => [box(-16, 0, -14, 32, 9, 28), <path key="b" d="M70,70Q110,50 150,72L140,84Q110,70 80,84Z" fill="rgba(246,252,70,0.9)" stroke={YEL.line} />],
  'Hole Wizard': () => [box(-16, 0, -14, 32, 8, 28), cyl(0, 0.3, 0, 6, 8, YEL), cyl(0, 5, 0, 9, 3.3, YEL, 'cb')],
  Fillet: () => [box(-14, 0, -12, 28, 12, 24), <path key="f" d={`M${P([-14, 12, 12])}L${P([14, 12, 12])}L${P([14, 9, 15])}L${P([-14, 9, 15])}Z`} fill="rgba(246,252,40,0.9)" stroke={YEL.line} />],
  Chamfer: () => [box(-14, 0, -12, 28, 12, 24), <path key="f" d={`M${P([-14, 12, 9])}L${P([14, 12, 9])}L${P([14, 9, 12])}L${P([-14, 9, 12])}Z`} fill="rgba(246,252,40,0.9)" stroke={YEL.line} />],
  'Linear Pattern': () => [box(-20, 0, -8, 40, 3, 16), cyl(-12, 3, 0, 3.5, 6, BODY, 'c1'), cyl(0, 3, 0, 3.5, 6, YEL, 'c2'), cyl(12, 3, 0, 3.5, 6, YEL, 'c3'), arrow([-12, 12, 0], [14, 12, 0])],
  Mirror: () => [box(-18, 0, -6, 14, 10, 12), box(4, 0, -6, 14, 10, 12, YEL), <polygon key="pl" points={pts([0, -4, -12], [0, -4, 12], [0, 16, 12], [0, 16, -12])} fill="rgba(140,170,220,0.18)" stroke="#6b8cc4" strokeDasharray="4 2" />],
  Rib: () => [box(-14, 0, -10, 28, 3, 20), box(-14, 3, -10, 3, 16, 20), <polygon key="r" points={pts([-11, 3, -1.5], [10, 3, -1.5], [-11, 17, -1.5])} fill="rgba(246,252,40,0.9)" stroke={YEL.line} />],
  Draft: () => [box(-12, 0, -12, 24, 14, 24), <polygon key="d" points={pts([-12, 0, 12], [12, 0, 12], [12, 14, 8], [-12, 14, 8])} fill="rgba(246,252,40,0.85)" stroke={YEL.line} />],
  Shell: () => [box(-14, 0, -14, 28, 14, 28), <polygon key="s" points={pts([-11, 14.1, -11], [11, 14.1, -11], [11, 14.1, 11], [-11, 14.1, 11])} fill="rgba(246,252,40,0.9)" stroke={YEL.line} />],
  Wrap: () => [cyl(0, 0, 0, 12, 18), <rect key="w" x={92} y={58} width={36} height={22} fill="rgba(246,252,40,0.9)" stroke={YEL.line} />],
  Intersect: () => [box(-14, 0, -6, 18, 12, 12), cyl(6, 0, 0, 9, 12, YEL)],
  'Reference Geometry': () => [<polygon key="pl" points={pts([-18, 0, -18], [18, 0, -18], [18, 0, 18], [-18, 0, 18])} fill="rgba(160,190,235,0.35)" stroke="#5c7fc0" />, <polygon key="pl2" points={pts([-18, 0, 0], [18, 0, 0], [18, 22, 0], [-18, 22, 0])} fill="rgba(246,252,40,0.55)" stroke={YEL.line} />],
  Curves: () => [<path key="h" d={Array.from({ length: 49 }, (_, i) => { const t = (i / 48) * Math.PI * 8; const p = P([Math.cos(t) * 10, i * 0.45, Math.sin(t) * 10]); return `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`; }).join('')} fill="none" stroke="#c9b800" strokeWidth={2} />],
  Instant3D: () => [box(-12, 0, -12, 24, 10, 24), arrow([0, 10, 0], [0, 24, 0])],
  Sketch: () => [<polygon key="pl" points={pts([-20, 0, -20], [20, 0, -20], [20, 0, 20], [-20, 0, 20])} fill="rgba(160,190,235,0.25)" stroke="#5c7fc0" />, profile(-9, -9, 18, 18)],
  'Smart Dimension': () => [sk('M50,80H170', 'l'), dot(50, 80, 'd1'), dot(170, 80, 'd2'), <g key="dim" stroke="#000" strokeWidth={0.8}><line x1={50} y1={74} x2={50} y2={44} /><line x1={170} y1={74} x2={170} y2={44} /><line x1={56} y1={50} x2={164} y2={50} /><path d="M50,50l7,-3v6zM170,50l-7,-3v6z" fill="#000" /></g>, <text key="t" x={110} y={44} fontSize={12} textAnchor="middle" fill="#000">120.00</text>],
  'Exit Sketch': () => [profile(-12, -10, 24, 20)],
  Line: () => [sk('M50,100L170,40'), dot(50, 100, 'a'), dot(170, 40, 'b')],
  'Corner Rectangle': () => [sk('M55,40H165V100H55Z'), dot(55, 40, 'a'), dot(165, 100, 'b')],
  Circle: () => [sk('M150,70A40,40 0 1 1 70,70A40,40 0 1 1 150,70'), <path key="c" d="M106,70h8M110,66v8" stroke="#1d3fd0" />],
  'Centerpoint Arc': () => [sk('M70,95A45,45 0 0 1 150,95'), dot(70, 95, 'a'), dot(150, 95, 'b'), <path key="c" d="M106,95h8M110,91v8" stroke="#1d3fd0" />],
  'Straight Slot': () => [sk('M70,50H150A20,20 0 0 1 150,90H70A20,20 0 0 1 70,50Z')],
  Polygon: () => [sk(Array.from({ length: 7 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return `${i ? 'L' : 'M'}${(110 + Math.cos(a) * 40).toFixed(1)},${(70 + Math.sin(a) * 40).toFixed(1)}`; }).join(''))],
  Spline: () => [sk('M40,95C80,20 120,120 180,45'), dot(40, 95, 'a'), dot(180, 45, 'b')],
  Ellipse: () => [<ellipse key="e" cx={110} cy={70} rx={60} ry={32} fill="none" stroke="#1d3fd0" strokeWidth={1.6} />],
  Text: () => [<text key="t" x={110} y={88} fontSize={48} textAnchor="middle" fill="none" stroke="#1d3fd0" strokeWidth={1.4} fontFamily="Arial">Abc</text>],
  Point: () => [dot(110, 70, 'p')],
  'Trim Entities': () => [sk('M40,70H180', 'h'), sk('M90,30V110', 'v1'), sk('M130,30V110', 'v2'), <path key="cut" d="M92,70H128" stroke="#e8433a" strokeWidth={3} strokeDasharray="4 3" />],
  'Convert Entities': () => [box(-14, 0, -12, 28, 10, 24), <polygon key="c" points={pts([-14, 10, -12], [14, 10, -12], [14, 10, 12], [-14, 10, 12])} fill="none" stroke="#1d3fd0" strokeWidth={2} />],
  'Offset Entities': () => [sk('M50,95L95,45H170', 'a'), <path key="o" d="M62,103L102,59H170" fill="none" stroke="#e0a800" strokeWidth={1.6} strokeDasharray="5 3" />],
  'Mirror Entities': () => [sk('M60,95L95,40L100,95Z', 'a'), sk('M160,95L125,40L120,95Z', 'b'), <path key="c" d="M110,30V110" stroke="#555" strokeDasharray="8 3 2 3" />],
  'Linear Sketch Pattern': () => [0, 1, 2, 3].map((i) => <circle key={i} cx={50 + i * 40} cy={70} r={12} fill="none" stroke={i ? '#e0a800' : '#1d3fd0'} strokeWidth={1.6} />),
  'Move Entities': () => [sk('M50,80H100V110H50Z', 'a'), <path key="m" d="M120,50H170V80H120Z" fill="none" stroke="#e0a800" strokeWidth={1.6} strokeDasharray="5 3" />, <path key="ar" d="M100,80L120,58" stroke="#555" markerEnd="" />],
};

/** the explanations (own wording), keyed by command label */
const DESC: Record<string, string> = {
  'Extruded Boss/Base': 'Extrudes a sketch or selected contours in one or two directions into a solid. The Property Panel sets where it starts and how far it goes; the drag arrow sets the depth directly.',
  'Extruded Cut': 'Removes material by extruding a sketched profile into the model, in one or two directions.',
  'Revolved Boss/Base': 'Revolves a sketch or selected contours around an axis into a solid.',
  'Revolved Cut': 'Removes material by revolving a sketched profile around an axis.',
  'Swept Boss/Base': 'Moves a profile along a path to create a solid, such as a tube or a spring.',
  'Swept Cut': 'Removes material by moving a profile along a path.',
  'Lofted Boss/Base': 'Adds material by blending between two or more profiles.',
  'Lofted Cut': 'Removes material by blending between two or more profiles.',
  'Boundary Boss/Base': 'Adds material between profiles in one or two directions with high-quality, smooth surfaces.',
  'Boundary Cut': 'Removes material between profiles in one or two directions.',
  'Hole Wizard': 'Places holes with a standard cross-section (counterbore, countersink, tapped, …) on a face, by standard and fastener size.',
  Fillet: 'Rounds one or more edges, or the edges between faces, of a solid or surface with a constant or variable radius.',
  Chamfer: 'Bevels the selected edges or vertices with distances or a distance and an angle.',
  'Linear Pattern': 'Repeats features, faces or bodies in one or two linear directions.',
  Mirror: 'Copies features, faces or bodies to the other side of a face or plane.',
  Rib: 'Adds a thin support between an open sketched contour and the body.',
  Draft: 'Tapers the selected faces by an angle relative to a neutral plane or parting line.',
  Shell: 'Hollows out a solid, leaving walls of a given thickness, with the selected faces open.',
  Wrap: 'Wraps a sketch onto a face, embossed, debossed or as a scribe line.',
  Intersect: 'Intersects solids, surfaces and planes to keep or remove the enclosed regions.',
  'Reference Geometry': 'Creates planes, axes, coordinate systems and points to build features from.',
  Curves: 'Creates curves: split lines, projected curves, helices and spirals, curves through points.',
  Instant3D: 'Drag handles and dimensions on the model to change features directly.',
  Sketch: 'Creates a new sketch on a plane or planar face, or edits the selected sketch.',
  'Smart Dimension': 'Adds a dimension to one or more selected entities; the kind follows from what is selected.',
  'Exit Sketch': 'Closes the sketch and keeps the changes.',
  Line: 'Sketches straight lines; click the start and end points, or drag.',
  'Corner Rectangle': 'Sketches a rectangle from two opposite corners.',
  Circle: 'Sketches a circle from its centre and a point on it.',
  'Centerpoint Arc': 'Sketches an arc from its centre, start point and end point.',
  'Straight Slot': 'Sketches a slot with two straight sides and round ends.',
  Polygon: 'Sketches a regular polygon with a chosen number of sides.',
  Spline: 'Sketches a smooth curve through the clicked points.',
  Ellipse: 'Sketches an ellipse from its centre and two radii.',
  Text: 'Adds text to the sketch, for embossing or cutting.',
  Point: 'Places a sketch point.',
  'Trim Entities': 'Trims or extends sketch entities to their intersections.',
  'Convert Entities': 'Projects model edges or sketch entities into the active sketch.',
  'Offset Entities': 'Adds entities at a constant distance from selected edges or sketch entities.',
  'Mirror Entities': 'Copies selected entities to the other side of a centerline.',
  'Linear Sketch Pattern': 'Repeats sketch entities in rows and columns.',
  'Move Entities': 'Moves sketch entities by a distance or from one point to another.',
};

export function richTipFor(label: string): { title: string; art?: ReactElement; desc: string } | null {
  const key = label.replace(/\s*\(.*\)$/, '').trim();
  const desc = DESC[key];
  if (!desc) return null;
  const art = ART[key];
  return { title: key, desc, art: art ? <svg width={220} height={130} viewBox="0 0 220 130">{art()}</svg> : undefined };
}
