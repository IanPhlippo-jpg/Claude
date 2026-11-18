/**
 * Start and end G-code imported from the user's own Bambu Studio installation (Ian's decision 1, docs/34 R1 route 3).
 * The text is read from the machine profile the user picks on his own computer and kept only in his settings; it is
 * never part of the program or the repository.
 *
 * Bambu Studio writes placeholders as [name], {name}, {name[index]}, simple arithmetic ({name + 5}) and conditional
 * blocks ({if a == b} ... {elsif ...} ... {else} ... {endif}). This module evaluates that subset with the values of our
 * slice; anything else (an unknown name, a function call) makes the import or the export refuse with the reason, so no
 * placeholder ever reaches the printer as text.
 */
export type Vars = Record<string, string | number | boolean | (string | number)[]>;

/** the Bambu names we can fill, from our own variables */
export function bambuVars(v: { nozzle_temp: number; bed_temp: number; first_layer_height: number; max_z: number; bed_x: number; bed_y: number; nozzle: number; layer_height: number;
  filament_type: string; printer_model: string; bed_type?: string }): Vars {
  return {
    nozzle_temperature_initial_layer: [v.nozzle_temp], nozzle_temperature: [v.nozzle_temp], bed_temperature_initial_layer_single: v.bed_temp,
    bed_temperature_initial_layer: [v.bed_temp], bed_temperature: [v.bed_temp], hot_plate_temp_initial_layer: [v.bed_temp], hot_plate_temp: [v.bed_temp],
    textured_plate_temp_initial_layer: [v.bed_temp], textured_plate_temp: [v.bed_temp], cool_plate_temp_initial_layer: [v.bed_temp], eng_plate_temp_initial_layer: [v.bed_temp],
    initial_extruder: 0, initial_layer_print_height: v.first_layer_height, max_layer_z: v.max_z, layer_z: v.max_z, layer_height: v.layer_height,
    nozzle_diameter: [v.nozzle], filament_type: [v.filament_type], printer_model: v.printer_model, curr_bed_type: v.bed_type ?? 'Textured PEI Plate',
    total_layer_count: 0, timelapse_type: 0, outer_wall_volumetric_speed: 10, first_layer_print_min: [0, 0], first_layer_print_size: [v.bed_x, v.bed_y],
    bed_width: v.bed_x, bed_depth: v.bed_y,
  };
}

class Unsupported extends Error {}

function value(expr: string, vars: Vars): string | number | boolean {
  const e = expr.trim();
  if (/^-?\d+(\.\d+)?$/.test(e)) return Number(e);
  if (/^"[^"]*"$/.test(e)) return e.slice(1, -1);
  if (e === 'true' || e === 'false') return e === 'true';
  const idx = /^([a-z_][a-z0-9_]*)\s*\[\s*([^\]]+)\]$/i.exec(e);
  if (idx) {
    const v = vars[idx[1]];
    const i = Number(value(idx[2], vars));
    if (!Array.isArray(v) || !Number.isInteger(i)) throw new Unsupported(`{${e}}`);
    return v[Math.min(i, v.length - 1)];
  }
  const name = /^[a-z_][a-z0-9_]*$/i.exec(e);
  if (name) {
    const v = vars[e];
    if (v === undefined) throw new Unsupported(e);
    return Array.isArray(v) ? v[0] : v;
  }
  // arithmetic and comparisons, lowest precedence first
  for (const ops of [['||'], ['&&'], ['==', '!=', '<=', '>=', '<', '>'], ['+', '-'], ['*', '/']]) {
    let depth = 0;
    for (let i = e.length - 1; i > 0; i--) {
      const c = e[i];
      if (c === ')' || c === ']') depth++;
      else if (c === '(' || c === '[') depth--;
      if (depth) continue;
      for (const op of ops) {
        if (e.slice(i - op.length + 1, i + 1) !== op) continue;
        if ((op === '<' || op === '>') && e[i + 1] === '=') continue;
        const l = e.slice(0, i - op.length + 1), r = e.slice(i + 1);
        if (!l.trim() || /[=!<>]$/.test(l.trim()) && op.length === 1) continue;
        const a = value(l, vars), b = value(r, vars);
        switch (op) {
          case '||': return !!a || !!b;
          case '&&': return !!a && !!b;
          case '==': return String(a) === String(b);
          case '!=': return String(a) !== String(b);
          case '<=': return Number(a) <= Number(b);
          case '>=': return Number(a) >= Number(b);
          case '<': return Number(a) < Number(b);
          case '>': return Number(a) > Number(b);
          case '+': return Number(a) + Number(b);
          case '-': return Number(a) - Number(b);
          case '*': return Number(a) * Number(b);
          case '/': return Number(a) / Number(b);
        }
      }
    }
  }
  if (/^\(.*\)$/.test(e)) return value(e.slice(1, -1), vars);
  throw new Unsupported(`{${e}}`);
}

const show = (v: string | number | boolean) => (typeof v === 'number' ? String(Math.round(v * 1000) / 1000) : String(v));

/** fills a Bambu Studio template; throws an Error naming what it cannot fill */
export function fillBambuTemplate(text: string, vars: Vars): string {
  try {
    // conditional blocks, innermost first
    let t = text;
    for (let guard = 0; guard < 200 && /\{if\s/.test(t); guard++) {
      const m = /\{if\s+([^}]*)\}((?:(?!\{if\s)[\s\S])*?)\{endif\}/.exec(t);
      if (!m) throw new Unsupported('an {if} block without {endif}');
      const parts = m[2].split(/(\{elsif\s+[^}]*\}|\{else\})/);
      let chosen = '';
      if (value(m[1], vars)) chosen = parts[0];
      else {
        for (let i = 1; i < parts.length; i += 2) {
          const tag = parts[i];
          if (tag === '{else}' || value(tag.slice(7, -1), vars)) { chosen = parts[i + 1]; break; }
        }
      }
      t = t.slice(0, m.index) + chosen + t.slice(m.index + m[0].length);
    }
    // {expressions} first (they may index an array with [name]), then the [name] placeholders outside braces
    t = t.replace(/\{([^{}\n]+)\}/g, (_, e: string) => show(value(e, vars)));
    t = t.replace(/\[([a-z_][a-z0-9_]*)\]/gi, (_, n: string) => show(value(n, vars)));
    return t;
  } catch (err) {
    if (err instanceof Unsupported) throw new Error(`The imported start/end G-code uses ${err.message}, which Phlippo CAD cannot fill in yet.`);
    throw err;
  }
}

/** the start and end G-code of a Bambu Studio machine profile (JSON) or plain G-code text */
export function readMachineProfile(text: string): { start?: string; end?: string; name?: string } {
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    const s = j.machine_start_gcode, e = j.machine_end_gcode;
    return { start: typeof s === 'string' ? s : undefined, end: typeof e === 'string' ? e : undefined, name: typeof j.name === 'string' ? j.name : undefined };
  } catch {
    return { start: text };
  }
}
