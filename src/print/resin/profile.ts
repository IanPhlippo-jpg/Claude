/**
 * Resin printers and resins from the database, default settings and the limits of the exposure settings
 * (docs/34 3.4: exposure times and lift distances within the limits of the printer; a negative test refuses beyond).
 */
import type { Printer } from '../types';
import type { Resin, ResinMachine, ResinSettings } from './types';

/** the LCD of a resin printer entry; null when the entry has no LCD data */
export function machineOf(p: Printer): ResinMachine | null {
  const r = p.resin as { lcdResolution?: [number, number]; lcdSizeMm?: [number, number]; xyResolutionUm?: number; mirror?: { x?: boolean; y?: boolean } } | undefined;
  const res = r?.lcdResolution, size = r?.lcdSizeMm ?? [p.buildVolume[0], p.buildVolume[1]];
  if (p.technology !== 'resin' || !res || res[0] <= 0 || res[1] <= 0) return null;
  const pitch: [number, number] = [size[0] / res[0], size[1] / res[1]];
  const assumptions = (p.assumptions ?? []).map((a) => (typeof a === 'string' ? a : `${a.field ?? ''}: ${a.note ?? ''}`));
  // a rounded LCD size gives a pixel pitch beside the published one (docs/35 R-6): said, the size wins
  const um = r?.xyResolutionUm;
  if (um && pitch.some((q) => Math.abs(q * 1000 - um) > 0.005)) {
    assumptions.push(`pixel pitch: ${(pitch[0] * 1000).toFixed(2)} x ${(pitch[1] * 1000).toFixed(2)} µm from the LCD size, the source says ${um} µm (AANNAME: the LCD size is used)`);
  }
  return {
    id: p.id, name: `${p.brand} ${p.model}`, resolution: res, size: [size[0], size[1]], height: p.buildVolume[2], pitch,
    origin: p.origin === 'front-left' ? 'front-left' : 'center', mirror: [!!r?.mirror?.x, !!r?.mirror?.y], status: p.status, assumptions,
  };
}

/** the resins of materialProfiles.json (the fixture when the file is missing) */
export const FIXTURE_RESINS: Resin[] = [
  { id: 'resin-standard', name: 'Standard resin', density: 1.1, pricePerKg: 30, exposure: { layerS: 2.5, bottomS: 25, bottomLayers: 5, liftMmPerMin: 60 } },
];
export function resinsOf(raw: unknown): Resin[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { resins?: unknown[] }).resins) ? (raw as { resins: Record<string, unknown>[] }).resins : [];
  const out = list.filter((r) => typeof r.id === 'string').map((r): Resin => {
    const e = (r.exposure ?? {}) as Record<string, number>;
    return { id: String(r.id), name: String(r.name ?? r.id), density: Number(r.density ?? 1.1), pricePerKg: Number(r.pricePerKg ?? 30),
      exposure: { layerS: Number(e.layerS ?? 2.5), bottomS: Number(e.bottomS ?? 25), bottomLayers: Number(e.bottomLayers ?? 5), liftMmPerMin: Number(e.liftMmPerMin ?? 60) } };
  });
  return out.length ? out : FIXTURE_RESINS;
}

/** settings from the resin profile (exposure times are per printer to calibrate: nog te printen) */
export function resinSettings(resin: Resin, layerHeight = 0.05): ResinSettings {
  return {
    resinId: resin.id, layerHeight, exposure: resin.exposure.layerS, bottomExposure: resin.exposure.bottomS, bottomLayers: resin.exposure.bottomLayers,
    transitionLayers: 4, lightOffDelay: 0.5, bottomLiftDistance: 6, bottomLiftSpeed: resin.exposure.liftMmPerMin, liftDistance: 5,
    liftSpeed: resin.exposure.liftMmPerMin, retractSpeed: 150, lightPwm: 255, bottomLightPwm: 255, antiAliasing: 1,
    hollow: false, wallThickness: 2, drainHoles: [], supports: 'normal', supportAngle: 40, supportSpacing: 3, tipDiameter: 0.4, supportDiameter: 1,
    liftHeight: 5, raft: true, raftThickness: 1, addedPoints: [], removedPoints: [],
  };
}

/**
 * The limits of every number of the settings (MSLA practice; per printer still to check: nog te printen). Negative
 * values and NaN are outside every range (docs/35 R-4). Per printer and resin on top (settingsProblems): the lift
 * within the build height, the exposure not below half of the resin profile (docs/35 R-5).
 */
export const LIMITS = {
  layerHeight: [0.01, 0.2], exposure: [0.1, 60], bottomExposure: [1, 300], bottomLayers: [1, 50], transitionLayers: [0, 30],
  liftDistance: [1, 20], liftSpeed: [10, 600], retractSpeed: [10, 600], lightPwm: [1, 255], wallThickness: [0.8, 10],
  lightOffDelay: [0, 30], supportAngle: [0, 89], supportSpacing: [0.5, 20], tipDiameter: [0.1, 2], supportDiameter: [0.3, 5], liftHeight: [0, 30],
  raftThickness: [0.2, 5],
} as const;
/** the anti-aliasing levels the file and the rasterizer take */
export const AA_LEVELS = [1, 2, 4, 8] as const;

/** what is outside the limits (empty = fine) */
export function settingsProblems(s: ResinSettings, m: ResinMachine, resin?: Resin): string[] {
  const out: string[] = [];
  const check = (k: keyof typeof LIMITS, v: number, label: string, unit: string) => {
    const [lo, hi] = LIMITS[k];
    if (!(v >= lo && v <= hi)) out.push(`${label} ${v} ${unit} is outside ${lo} to ${hi} ${unit}.`);
  };
  check('layerHeight', s.layerHeight, 'Layer height', 'mm');
  check('exposure', s.exposure, 'Exposure', 's');
  check('bottomExposure', s.bottomExposure, 'Bottom exposure', 's');
  check('bottomLayers', s.bottomLayers, 'Bottom layers', '');
  check('transitionLayers', s.transitionLayers, 'Transition layers', '');
  check('liftDistance', s.liftDistance, 'Lift distance', 'mm');
  check('liftDistance', s.bottomLiftDistance, 'Bottom lift distance', 'mm');
  check('liftSpeed', s.liftSpeed, 'Lift speed', 'mm/min');
  check('liftSpeed', s.bottomLiftSpeed, 'Bottom lift speed', 'mm/min');
  check('retractSpeed', s.retractSpeed, 'Retract speed', 'mm/min');
  check('lightPwm', s.lightPwm, 'Light power', '');
  check('lightPwm', s.bottomLightPwm, 'Bottom light power', '');
  if (s.hollow) check('wallThickness', s.wallThickness, 'Wall thickness', 'mm');
  check('lightOffDelay', s.lightOffDelay, 'Light-off delay', 's');
  if (!(AA_LEVELS as readonly number[]).includes(s.antiAliasing)) out.push(`Anti-aliasing ${s.antiAliasing} is not one of ${AA_LEVELS.join(', ')}.`);
  if (s.supports !== 'none') {
    check('supportAngle', s.supportAngle, 'Support threshold angle', '°');
    check('supportSpacing', s.supportSpacing, 'Support spacing', 'mm');
    check('tipDiameter', s.tipDiameter, 'Contact tip', 'mm');
    check('supportDiameter', s.supportDiameter, 'Strut', 'mm');
    check('liftHeight', s.liftHeight, 'Lift part', 'mm');
    if (s.tipDiameter > s.supportDiameter) out.push(`The contact tip (${s.tipDiameter} mm) is thicker than the strut (${s.supportDiameter} mm).`);
  }
  if (s.raft) check('raftThickness', s.raftThickness, 'Raft', 'mm');
  if (s.liftDistance > m.height) out.push(`Lift distance ${s.liftDistance} mm is more than the build height.`);
  if (s.bottomLiftDistance > m.height) out.push(`Bottom lift distance ${s.bottomLiftDistance} mm is more than the build height.`);
  // below half the exposure of the resin profile a layer does not cure (docs/35 R-5)
  if (resin && s.exposure < resin.exposure.layerS / 2) out.push(`Exposure ${s.exposure} s is below half of the ${resin.exposure.layerS} s of ${resin.name}: the layers would not cure.`);
  if (resin && s.bottomExposure < resin.exposure.bottomS / 2) {
    out.push(`Bottom exposure ${s.bottomExposure} s is below half of the ${resin.exposure.bottomS} s of ${resin.name}: the part would not stick.`);
  }
  return out;
}

/** the exposure of layer i: bottom, then a linear step over the transition layers, then normal */
export function exposureOf(s: ResinSettings, i: number): number {
  if (i < s.bottomLayers) return s.bottomExposure;
  const t = i - s.bottomLayers;
  if (t < s.transitionLayers) return s.bottomExposure + ((s.exposure - s.bottomExposure) * (t + 1)) / (s.transitionLayers + 1);
  return s.exposure;
}

/** the print time of one layer (s): exposure, wait, lift and retract at their speeds */
export function layerTime(s: ResinSettings, i: number): number {
  const bottom = i < s.bottomLayers;
  const lift = bottom ? s.bottomLiftDistance : s.liftDistance, speed = bottom ? s.bottomLiftSpeed : s.liftSpeed;
  return exposureOf(s, i) + s.lightOffDelay + (lift / speed) * 60 + (lift / s.retractSpeed) * 60;
}

/**
 * A resin printer as the plate of the 3D Print tab sees it: the LCD from its front left corner (0 .. size), no
 * printable-area polygon around the centre; the .goo image covers the whole LCD anyway.
 */
export function platePrinter(p: Printer): Printer {
  const m = machineOf(p);
  if (!m) return p;
  return { ...p, buildVolume: [m.size[0], m.size[1], p.buildVolume[2]], printableArea: undefined, excludeAreas: [], travelLimits: undefined, origin: 'front-left' };
}

/**
 * The fields of a resin printer that rest on an assumption and decide what comes out of the printer (the LCD, the
 * mirroring, the file format): the export names them before it writes (docs/35 R-6).
 */
export function resinAssumptions(m: ResinMachine): string[] {
  const fields = ['lcdSizeMm', 'lcdResolution', 'buildVolume', 'mirror', 'pixel pitch', 'formatVersion', 'fileFormat', 'thumbnailFormat'];
  const out: string[] = [];
  for (const a of m.assumptions) {
    const f = fields.find((x) => a.startsWith(x));
    if (f && !out.includes(f)) out.push(f);
  }
  return out;
}
