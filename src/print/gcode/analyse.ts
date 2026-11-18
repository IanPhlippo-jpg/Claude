/**
 * G-code analyser (docs/34 2.7): reads G-code of any of the three dialects back and reports layers, extrusion, bounds,
 * temperatures, retractions, forbidden commands and an own time estimate. It shares no code with the writer or with
 * motion.ts, so the tests that compare both prove something.
 */
export interface Analysis {
  layers: number;
  /** net filament extruded (mm) */
  extruded: number;
  retractions: number;
  /** bounds of extruding moves */
  extrudeMin: [number, number, number]; extrudeMax: [number, number, number];
  /** bounds of every move */
  moveMin: [number, number, number]; moveMax: [number, number, number];
  /** temperature set or waited for before the first extrusion */
  nozzleWaitedBeforeExtrusion: boolean;
  bedSetBeforeExtrusion: boolean;
  maxNozzleTemp: number; maxBedTemp: number;
  forbidden: string[];
  nonAscii: number;
  badNumbers: number;
  longestLine: number;
  /** seconds, own estimate */
  time: number;
  endsWithNewline: boolean;
  heatersOffAtEnd: boolean;
  toolChanges: number;
}

const word = (line: string, letter: string): number | undefined => {
  const m = new RegExp(`(?:^|\\s)${letter}(-?\\d+(?:\\.\\d+)?)`).exec(line);
  return m ? Number(m[1]) : undefined;
};

export function analyseGcode(text: string, accel = 10000): Analysis {
  const a: Analysis = {
    layers: 0, extruded: 0, retractions: 0,
    extrudeMin: [Infinity, Infinity, Infinity], extrudeMax: [-Infinity, -Infinity, -Infinity],
    moveMin: [Infinity, Infinity, Infinity], moveMax: [-Infinity, -Infinity, -Infinity],
    nozzleWaitedBeforeExtrusion: false, bedSetBeforeExtrusion: false, maxNozzleTemp: 0, maxBedTemp: 0,
    forbidden: [], nonAscii: 0, badNumbers: 0, longestLine: 0, time: 0, endsWithNewline: text.endsWith('\n'), heatersOffAtEnd: false, toolChanges: 0,
  };
  let x = 0, y = 0, z = 0, f = 1200, rel = true, absXYZ = true, extruding = false, waited = false, bed = false;
  let acc = accel;
  // own time model: every move accelerates from and brakes to the corner speed it shares with its neighbours,
  // taken as the smaller requested speed times how straight the path goes on (a simpler model than motion.ts)
  let prevDir: [number, number] | null = null, prevV = 0;
  const lines = text.split('\n');
  const zSeen = new Set<number>();
  let lastHeat = { nozzle: -1, bed: -1 };
  for (const raw of lines) {
    a.longestLine = Math.max(a.longestLine, raw.length);
    if (/[^\x20-\x7e\t\r]/.test(raw)) a.nonAscii++;
    const line = raw.replace(/;.*$/, '').trim();
    if (!line) continue;
    if (/\d[eE][+-]?\d|NaN|Infinity|\d,\d/.test(line)) a.badNumbers++;
    const cmd = line.split(/\s+/)[0].toUpperCase();
    if (cmd === 'M302' || (cmd === 'M211' && word(line, 'S') === 0) || cmd === 'M500' || cmd === 'M502') a.forbidden.push(line);
    if (cmd === 'M83') rel = true;
    else if (cmd === 'M82') rel = false;
    else if (cmd === 'G90') absXYZ = true;
    else if (cmd === 'G91') absXYZ = false;
    else if (cmd === 'M104' || cmd === 'M109') { const s = word(line, 'S') ?? 0; a.maxNozzleTemp = Math.max(a.maxNozzleTemp, s); if (cmd === 'M109' && s > 150) waited = true; lastHeat.nozzle = s; }
    else if (cmd === 'M140' || cmd === 'M190') { const s = word(line, 'S') ?? 0; a.maxBedTemp = Math.max(a.maxBedTemp, s); bed = true; lastHeat.bed = s; }
    else if (cmd === 'M204') { acc = word(line, 'S') ?? word(line, 'P') ?? acc; }
    else if (cmd.startsWith('SET_VELOCITY_LIMIT')) { const m = /ACCEL=(\d+)/.exec(line); if (m) acc = Number(m[1]); }
    else if (/^T\d+$/.test(cmd)) a.toolChanges++;
    else if (cmd === 'G28') { x = 0; y = 0; z = 0; }
    else if (cmd === 'G0' || cmd === 'G1') {
      const nx = word(line, 'X'), ny = word(line, 'Y'), nz = word(line, 'Z'), e = word(line, 'E'), nf = word(line, 'F');
      if (nf !== undefined) f = nf;
      const tx = nx === undefined ? x : absXYZ ? nx : x + nx, ty = ny === undefined ? y : absXYZ ? ny : y + ny, tz = nz === undefined ? z : absXYZ ? nz : z + nz;
      const de = e === undefined ? 0 : rel ? e : e;
      const v = f / 60;
      const d = Math.hypot(tx - x, ty - y, tz - z);
      for (const [k, val] of [[0, tx], [1, ty], [2, tz]] as const) { a.moveMin[k] = Math.min(a.moveMin[k], val); a.moveMax[k] = Math.max(a.moveMax[k], val); }
      if (de > 0 && d > 0) {
        if (!extruding) { extruding = true; a.nozzleWaitedBeforeExtrusion = waited; a.bedSetBeforeExtrusion = bed; }
        for (const [k, val] of [[0, tx], [1, ty], [2, tz]] as const) { a.extrudeMin[k] = Math.min(a.extrudeMin[k], val); a.extrudeMax[k] = Math.max(a.extrudeMax[k], val); }
        if (!zSeen.has(Math.round(tz * 1000))) { zSeen.add(Math.round(tz * 1000)); a.layers++; }
      }
      if (de < 0 && d === 0) a.retractions++;
      a.extruded += de;
      // time: the corner speed is the smaller speed scaled by the cosine of the turn (0 for a reversal, at least 5 mm/s)
      if (d > 0) {
        const dir: [number, number] = [(tx - x) / d, (ty - y) / d];
        const cos = prevDir ? dir[0] * prevDir[0] + dir[1] * prevDir[1] : -1;
        const vin = prevDir ? Math.min(v, prevV, Math.max(Math.min(5, v, prevV), Math.min(v, prevV) * Math.max(0, cos))) : 0;
        const accD = Math.max(0, (v * v - vin * vin) / (2 * acc));
        const decD = (v * v) / (2 * acc);
        // braking to zero is undone at the next move's start: count half of it (the next corner speed is unknown here)
        if (accD + decD / 2 <= d) a.time += (v - vin) / acc + (d - accD - decD / 2) / v + v / acc / 2;
        else a.time += 2 * Math.sqrt(d / acc);
        prevDir = dir; prevV = v;
      } else if (de !== 0) { a.time += Math.abs(de) / v; prevDir = null; }
      x = tx; y = ty; z = tz;
    }
  }
  a.heatersOffAtEnd = lastHeat.nozzle === 0 && lastHeat.bed === 0;
  return a;
}
