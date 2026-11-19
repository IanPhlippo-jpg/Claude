/**
 * Resin printing (docs/33 phase 4, docs/34 2.10 and 3.4): the data model. Elegoo MSLA printers expose a whole layer at
 * once through a monochrome LCD; the slicer turns every layer into a pixel mask at the LCD resolution and writes the
 * masks run-length encoded into a .goo file. Nothing here has been printed: "nog te printen".
 */

/** the LCD of a resin printer, from printerDatabase.json (resin field) */
export interface ResinMachine {
  id: string;
  name: string;
  /** pixels in X and Y */
  resolution: [number, number];
  /** size of the exposed area, mm */
  size: [number, number];
  /** build height, mm */
  height: number;
  /** pixel pitch, mm (not always square: Saturn 4 Ultra 0.019 x 0.024) */
  pitch: [number, number];
  /** origin of the plate coordinates: the middle of the LCD (the database says "center" for resin) */
  origin: 'center' | 'front-left';
  status: string;
  assumptions: string[];
}

/** a resin from materialProfiles.json (resins) */
export interface Resin {
  id: string;
  name: string;
  /** g/cm³ */
  density: number;
  /** € per kg */
  pricePerKg: number;
  exposure: { layerS: number; bottomS: number; bottomLayers: number; liftMmPerMin: number };
}

export type ResinSupportKind = 'none' | 'normal' | 'tree';

/** the settings of a resin slice */
export interface ResinSettings {
  resinId: string;
  layerHeight: number;
  /** exposure of a normal layer, s */
  exposure: number;
  /** exposure of a bottom layer, s */
  bottomExposure: number;
  bottomLayers: number;
  /** layers whose exposure steps from the bottom to the normal value */
  transitionLayers: number;
  /** wait after the light goes out, s */
  lightOffDelay: number;
  bottomLiftDistance: number;
  bottomLiftSpeed: number;
  liftDistance: number;
  /** mm/min */
  liftSpeed: number;
  retractSpeed: number;
  /** 0..255 */
  lightPwm: number;
  bottomLightPwm: number;
  /** 1 = off; 2, 4 or 8 sub-rows per pixel row (grey edges) */
  antiAliasing: 1 | 2 | 4 | 8;
  hollow: boolean;
  wallThickness: number;
  /** drain holes: XY on the plate and radius (mm); they open the cavity through the bottom */
  drainHoles: { x: number; y: number; r: number }[];
  supports: ResinSupportKind;
  /** overhangs flatter than this angle from the horizontal get a support (degrees) */
  supportAngle: number;
  /** distance between support points under an overhang, mm */
  supportSpacing: number;
  tipDiameter: number;
  supportDiameter: number;
  /** the model lifted above the plate on its supports, mm */
  liftHeight: number;
  raft: boolean;
  raftThickness: number;
  /** support points the user added and removed by hand (plate coordinates, mm) */
  addedPoints: [number, number, number][];
  removedPoints: [number, number][];
}

/** one layer of the result: the encoded GOO image data (0x55 ... checksum) and what it holds */
export interface ResinLayer {
  z: number;
  /** encoded image data of the layer, as the .goo file holds it */
  data: Uint8Array;
  /** exposed area, mm² (grey pixels count by their value) */
  area: number;
  exposure: number;
}

export interface ResinIssue { kind: 'island' | 'suction' | 'cavity'; z: number; x: number; y: number; area: number; text: string }

export interface ResinStats {
  layers: number;
  /** seconds */
  printTime: number;
  /** exposed resin, mm³ (ml = mm³ / 1000) */
  volume: number;
  grams: number;
  cost: number;
  issues: ResinIssue[];
  warnings: string[];
  supportPoints: [number, number, number][];
}
