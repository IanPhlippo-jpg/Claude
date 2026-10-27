import type { Document, Feature } from './types';
import type { Id, Sketch } from '../sketch/types';

/**
 * Equations and global variables (Tools ▸ Equations), by design:
 *   "Width" = 80                       global variable
 *   "D1@Sketch1" = "Width" / 2         dimension driven by an expression
 *   "D1@Boss-Extrude1" = "Width" * 0.1 feature dimension
 * Names of dimensions and variables are written between double quotes; expressions use
 * + - * / ^ ( ), the functions sin cos tan asin acos atan sqrt abs int sgn (angles in degrees)
 * and the constants pi.
 */
export interface Equation {
  id: Id;
  /** target name: a global variable ("Width") or a dimension ("D1@Sketch1") */
  target: string;
  expression: string;
  comment?: string;
}

export type DimensionRef =
  | { kind: 'sketch'; sketchId: Id; constraintId: Id; angle: boolean }
  | { kind: 'feature'; featureId: Id; prop: string };

/** Dimension names of a sketch: D1@Sketch1, D2@Sketch1, … in constraint order. */
export function sketchDimensionNames(sketch: Sketch): { name: string; constraintId: Id; angle: boolean }[] {
  const out: { name: string; constraintId: Id; angle: boolean }[] = [];
  let n = 0;
  for (const id of sketch.constraintOrder) {
    const c = sketch.constraints[id];
    if (!c || c.value === undefined) continue;
    n++;
    out.push({ name: `${c.name || `D${n}`}@${sketch.name}`, constraintId: id, angle: c.kind === 'angle' });
  }
  return out;
}

/** the full name of one sketch dimension (its own name or D<n>, @ the sketch) */
export function sketchDimensionName(sketch: Sketch, constraintId: Id): string {
  return sketchDimensionNames(sketch).find((d) => d.constraintId === constraintId)?.name ?? `D1@${sketch.name}`;
}

/** Dimension names of a feature (D1@Boss-Extrude1 = depth, …) and the property they drive. */
export function featureDimensionNames(f: Feature): { name: string; prop: string; value: number }[] {
  const dims: [string, number | undefined][] = [];
  switch (f.type) {
    case 'extrude':
      dims.push(['depth', f.depth]);
      if (f.direction2) dims.push(['direction2.depth', f.direction2.depth]);
      if (f.draft) dims.push(['draft.angle', f.draft.angle]);
      break;
    case 'revolve':
      dims.push(['angle', f.angle]);
      break;
    case 'fillet':
    case 'chamfer':
      dims.push(['size', f.size]);
      break;
    case 'shell':
      dims.push(['thickness', f.thickness]);
      break;
    case 'rib':
      dims.push(['thickness', f.thickness], ['draft', f.draft]);
      break;
    case 'baseFlange':
      dims.push(['depth', f.depth]);
      break;
    case 'hem':
      dims.push(['length', f.length], ['gap', f.gap]);
      break;
    case 'helix':
      dims.push(['pitch', f.pitch], ['revolutions', f.revolutions], ['height', f.height], ['startAngle', f.startAngle]);
      break;
    case 'edgeFlange':
      dims.push(['length', f.length], ['angle', f.angle]);
      break;
    case 'hole':
      dims.push(['diameter', f.diameter], ['depth', f.depth], ['cbDiameter', f.cbDiameter], ['cbDepth', f.cbDepth], ['csDiameter', f.csDiameter], ['csAngle', f.csAngle]);
      break;
    case 'linearPattern':
      if (f.dir1) dims.push(['dir1.spacing', f.dir1.spacing], ['dir1.count', f.dir1.count]);
      if (f.dir2) dims.push(['dir2.spacing', f.dir2.spacing], ['dir2.count', f.dir2.count]);
      break;
    case 'circularPattern':
      dims.push(['angle', f.angle], ['count', f.count]);
      break;
    default:
      break;
  }
  return dims.filter((d): d is [string, number] => d[1] !== undefined).map(([prop, value], i) => ({ name: `D${i + 1}@${f.name}`, prop, value }));
}

/** All dimension names of a document with their current values. */
export function dimensionTable(doc: Document): { name: string; value: number; ref: DimensionRef }[] {
  const out: { name: string; value: number; ref: DimensionRef }[] = [];
  for (const f of doc.features) {
    if (f.type === 'sketch') {
      const s = doc.sketches[f.sketchId];
      if (!s) continue;
      for (const d of sketchDimensionNames(s)) out.push({ name: d.name, value: s.constraints[d.constraintId].value ?? 0, ref: { kind: 'sketch', sketchId: s.id, constraintId: d.constraintId, angle: d.angle } });
    } else {
      for (const d of featureDimensionNames(f)) out.push({ name: d.name, value: d.value, ref: { kind: 'feature', featureId: f.id, prop: d.prop } });
    }
  }
  // sketches that are not (yet) in the feature list
  for (const s of Object.values(doc.sketches)) {
    if (doc.features.some((f) => f.type === 'sketch' && f.sketchId === s.id)) continue;
    for (const d of sketchDimensionNames(s)) out.push({ name: d.name, value: s.constraints[d.constraintId].value ?? 0, ref: { kind: 'sketch', sketchId: s.id, constraintId: d.constraintId, angle: d.angle } });
  }
  return out;
}

// ---------- expression parser ----------

type Tok = { t: 'num'; v: number } | { t: 'name'; v: string } | { t: 'op'; v: string } | { t: 'fn'; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      const m = /^[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?|^[0-9]+\./.exec(src.slice(i));
      if (!m) throw new Error(`Unexpected number at ${i}`);
      out.push({ t: 'num', v: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    if (ch === '"') {
      const j = src.indexOf('"', i + 1);
      if (j < 0) throw new Error('Unclosed quote');
      out.push({ t: 'name', v: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = /^[A-Za-z_][A-Za-z0-9_@.-]*/.exec(src.slice(i))!;
      const word = m[0];
      i += word.length;
      let k = i;
      while (k < src.length && /\s/.test(src[k])) k++;
      if (src[k] === '(' && /^(sin|cos|tan|asin|acos|atan|sqrt|abs|int|sgn|exp|log|min|max)$/i.test(word)) out.push({ t: 'fn', v: word.toLowerCase() });
      else if (/^pi$/i.test(word)) out.push({ t: 'num', v: Math.PI });
      else out.push({ t: 'name', v: word });
      continue;
    }
    if ('+-*/^(),'.includes(ch)) {
      out.push({ t: 'op', v: ch });
      i++;
      continue;
    }
    throw new Error(`Unexpected character '${ch}'`);
  }
  return out;
}

const DEG = Math.PI / 180;

/** Evaluate an expression with a lookup for names; throws on errors. */
export function evaluateExpression(src: string, lookup: (name: string) => number | undefined, opts: { radians?: boolean } = {}): number {
  // equations use degrees (by design); an Equation Driven Curve uses radians
  const U = opts.radians ? 1 : DEG;
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const expr = (): number => {
    let v = term();
    while (peek()?.t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = next().v;
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const term = (): number => {
    let v = power();
    while (peek()?.t === 'op' && (peek().v === '*' || peek().v === '/')) {
      const op = next().v;
      const r = power();
      if (op === '/' && r === 0) throw new Error('Division by zero');
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const power = (): number => {
    const base = unary();
    if (peek()?.t === 'op' && peek().v === '^') {
      next();
      return Math.pow(base, power());
    }
    return base;
  };
  const unary = (): number => {
    if (peek()?.t === 'op' && peek().v === '-') { next(); return -unary(); }
    if (peek()?.t === 'op' && peek().v === '+') { next(); return unary(); }
    return atom();
  };
  const atom = (): number => {
    const t = next();
    if (!t) throw new Error('Unexpected end of expression');
    if (t.t === 'num') return t.v;
    if (t.t === 'name') {
      const v = lookup(t.v);
      if (v === undefined) throw new Error(`Unknown name "${t.v}"`);
      return v;
    }
    if (t.t === 'fn') {
      const open = next();
      if (!open || open.t !== 'op' || open.v !== '(') throw new Error(`Expected ( after ${t.v}`);
      const args: number[] = [expr()];
      while (peek()?.t === 'op' && peek().v === ',') { next(); args.push(expr()); }
      const close = next();
      if (!close || close.t !== 'op' || close.v !== ')') throw new Error('Expected )');
      const a = args[0];
      switch (t.v) {
        case 'sin': return Math.sin(a * U);
        case 'cos': return Math.cos(a * U);
        case 'tan': return Math.tan(a * U);
        case 'asin': return Math.asin(a) / U;
        case 'acos': return Math.acos(a) / U;
        case 'atan': return Math.atan(a) / U;
        case 'sqrt': if (a < 0) throw new Error('sqrt of a negative number'); return Math.sqrt(a);
        case 'abs': return Math.abs(a);
        case 'int': return Math.trunc(a);
        case 'sgn': return Math.sign(a);
        case 'exp': return Math.exp(a);
        case 'log': return Math.log(a);
        case 'min': return Math.min(...args);
        case 'max': return Math.max(...args);
      }
    }
    if (t.t === 'op' && t.v === '(') {
      const v = expr();
      const close = next();
      if (!close || close.t !== 'op' || close.v !== ')') throw new Error('Expected )');
      return v;
    }
    throw new Error(`Unexpected '${t.v}'`);
  };
  const v = expr();
  if (p < toks.length) throw new Error(`Unexpected '${toks[p].v}'`);
  if (!Number.isFinite(v)) throw new Error('The result is not a number');
  return v;
}

export interface EquationResult {
  /** evaluated value per equation id */
  values: Record<Id, number>;
  /** error text per equation id */
  errors: Record<Id, string>;
  /** global variable values by name */
  variables: Record<string, number>;
}

/** File Properties in an equation ("Density@Part1"): the density of the part material in g/mm³ (as MMGS) */
export const FILE_PROPERTIES = ['Density'];
export function fileProperty(doc: Pick<Document, 'material'>, name: string): number | undefined {
  const base = name.replace(/@.*$/, '');
  // (files of 0.5.1 wrote it with a vendor prefix: still read)
  if (/^(?:SW-)?Density$/.test(base) && doc.material) return doc.material.density / 1e6;
  return undefined;
}

/** The value of an expression typed in a value field: global variables, dimensions and file properties by name. */
export function evaluateFieldExpression(doc: Document, expression: string): number {
  const { variables } = evaluateEquations(doc);
  const dims = new Map(dimensionTable(doc).map((d) => [d.name, d.value]));
  return evaluateExpression(expression, (n) => variables[n] ?? dims.get(n) ?? fileProperty(doc, n), { radians: doc.equationAngleUnits === 'rad' });
}

/** Evaluate all equations of a document (global variables first, dimensions may reference each other). */
export function evaluateEquations(doc: Document): EquationResult {
  const equations = doc.equations ?? [];
  const dims = dimensionTable(doc);
  const dimValue = new Map(dims.map((d) => [d.name, d.value]));
  const byTarget = new Map(equations.map((e) => [e.target, e]));
  // Features: an equation on a feature name sets its suppression ("suppressed" / "unsuppressed", or a number: not 0 = suppressed)
  const featureNames = new Set(doc.features.map((f) => f.name));
  const values: Record<Id, number> = {};
  const errors: Record<Id, string> = {};
  const variables: Record<string, number> = {};
  const visiting = new Set<string>();
  const resolve = (name: string): number | undefined => {
    const eq = byTarget.get(name);
    if (eq) {
      if (eq.id in values) return values[eq.id];
      if (eq.id in errors) throw new Error(`"${name}" has an error`);
      if (visiting.has(name)) throw new Error(`Circular reference through "${name}"`);
      visiting.add(name);
      try {
        const word = featureNames.has(name) && !dimValue.has(name) ? /^\s*"?(un)?suppressed"?\s*$/i.exec(eq.expression) : null;
        const v = word ? (word[1] ? 0 : 1) : evaluateExpression(eq.expression, resolve, { radians: doc.equationAngleUnits === 'rad' });
        values[eq.id] = v;
        if (!dimValue.has(name) && !featureNames.has(name)) variables[name] = v;
        return v;
      } catch (err) {
        errors[eq.id] = (err as Error).message;
        return undefined;
      } finally {
        visiting.delete(name);
      }
    }
    return dimValue.get(name) ?? fileProperty(doc, name);
  };
  for (const eq of equations) {
    try {
      resolve(eq.target);
    } catch {
      /* already recorded on the equation that failed */
    }
  }
  return { values, errors, variables };
}

/** Write the evaluated dimension equations into the document (constraint values, feature properties). */
export function applyEquations(doc: Document): { doc: Document; result: EquationResult } {
  const result = evaluateEquations(doc);
  const equations = doc.equations ?? [];
  if (!equations.length) return { doc, result };
  const values: Record<string, number> = {};
  for (const eq of equations) if (eq.id in result.values) values[eq.target] = result.values[eq.id];
  let d = setDimensionValues(doc, values);
  // feature suppression equations
  const dimNames = new Set(dimensionTable(doc).map((x) => x.name));
  const suppress = new Map(equations.filter((eq) => eq.id in result.values && !dimNames.has(eq.target)).map((eq) => [eq.target, result.values[eq.id] !== 0] as const));
  if (d.features.some((f) => suppress.has(f.name) && suppress.get(f.name) !== f.suppressed)) {
    d = { ...d, features: d.features.map((f) => (suppress.has(f.name) && suppress.get(f.name) !== f.suppressed ? { ...f, suppressed: suppress.get(f.name)! } : f)) };
  }
  return { doc: d, result };
}

/** Set dimension values by name (D1@Sketch1, D1@Boss-Extrude1 ...); unknown names are ignored, unchanged values keep the objects. */
export function setDimensionValues(doc: Document, values: Record<string, number>): Document {
  const dims = dimensionTable(doc);
  const byName = new Map(dims.map((d) => [d.name, d]));
  let sketches = doc.sketches;
  let features = doc.features;
  for (const [name, v] of Object.entries(values)) {
    const d = byName.get(name);
    if (!d || !Number.isFinite(v)) continue;
    if (d.ref.kind === 'sketch') {
      const s = sketches[d.ref.sketchId];
      const c = s.constraints[d.ref.constraintId];
      if (!c || c.value === v) continue;
      sketches = { ...sketches, [s.id]: { ...s, constraints: { ...s.constraints, [c.id]: { ...c, value: v } } } };
    } else {
      const ref = d.ref;
      features = features.map((f) => {
        if (f.id !== ref.featureId) return f;
        const [a, b] = ref.prop.split('.');
        const rec = f as unknown as Record<string, unknown>;
        if (b) {
          const cur = rec[a] as Record<string, unknown>;
          if (cur[b] === v) return f;
          return { ...f, [a]: { ...cur, [b]: v } } as Feature;
        }
        if (rec[a] === v) return f;
        return { ...f, [a]: v } as Feature;
      });
    }
  }
  if (sketches === doc.sketches && features === doc.features) return doc;
  return { ...doc, sketches, features };
}

/** The equation that drives a dimension name, if any. */
export function equationFor(doc: Document, name: string): Equation | undefined {
  return (doc.equations ?? []).find((e) => e.target === name);
}

/** Equations as a text file, one per line: "Name" = expression  'comment (as the intended export) */
export function equationsToText(list: Equation[]): string {
  return list.map((e) => `"${e.target}" = ${e.expression}`).join('\r\n') + '\r\n';
}

/** Read equations from a text file ("Name" = expression per line; lines starting with ' are comments) */
export function equationsFromText(text: string, newId: () => string): Equation[] {
  const out: Equation[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/'.*$/, '').trim();
    const m = /^"([^"]+)"\s*=\s*(.+)$/.exec(line);
    if (m) out.push({ id: newId(), target: m[1], expression: m[2].trim() });
  }
  return out;
}
