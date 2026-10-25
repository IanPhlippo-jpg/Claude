/**
 * Material library as the original's "SOLIDWORKS Materials" tree (categories with materials),
 * with the properties shown on the Properties tab. Densities in kg/m³, moduli in N/m², strengths
 * in N/m², thermal expansion in /K, conductivity in W/(m·K), specific heat in J/(kg·K).
 */
export interface MaterialDef {
  name: string;
  density: number;
  elasticModulus?: number;
  poisson?: number;
  shearModulus?: number;
  tensile?: number;
  yield?: number;
  thermalExpansion?: number;
  conductivity?: number;
  specificHeat?: number;
  /** display colour in the graphics area */
  color: string;
}

export interface MaterialCategory {
  name: string;
  materials: MaterialDef[];
}

const m = (name: string, density: number, color: string, extra: Partial<MaterialDef> = {}): MaterialDef => ({ name, density, color, ...extra });

export const MATERIAL_LIBRARY: MaterialCategory[] = [
  {
    name: 'Steel',
    materials: [
      m('1023 Carbon Steel Sheet (SS)', 7858, '#b8bcc2', { elasticModulus: 2.05e11, poisson: 0.29, shearModulus: 8e10, tensile: 4.25e8, yield: 2.827e8, thermalExpansion: 1.2e-5, conductivity: 52, specificHeat: 486 }),
      m('AISI 1020', 7900, '#b8bcc2', { elasticModulus: 2e11, poisson: 0.29, shearModulus: 7.7e10, tensile: 4.2e8, yield: 3.5e8, thermalExpansion: 1.5e-5, conductivity: 47, specificHeat: 420 }),
      m('AISI 1045 Steel, cold drawn', 7850, '#b8bcc2', { elasticModulus: 2.05e11, poisson: 0.29, shearModulus: 8e10, tensile: 6.25e8, yield: 5.3e8, thermalExpansion: 1.15e-5, conductivity: 49.8, specificHeat: 486 }),
      m('AISI 304', 8000, '#c9ccd1', { elasticModulus: 1.9e11, poisson: 0.29, shearModulus: 7.5e10, tensile: 5.17e8, yield: 2.07e8, thermalExpansion: 1.8e-5, conductivity: 16, specificHeat: 500 }),
      m('AISI 316 Stainless Steel Sheet (SS)', 8000, '#c9ccd1', { elasticModulus: 1.93e11, poisson: 0.27, shearModulus: 8.2e10, tensile: 5.8e8, yield: 1.72e8, thermalExpansion: 1.6e-5, conductivity: 16.3, specificHeat: 500 }),
      m('Alloy Steel', 7700, '#b8bcc2', { elasticModulus: 2.1e11, poisson: 0.28, shearModulus: 7.9e10, tensile: 7.24e8, yield: 6.2e8, thermalExpansion: 1.3e-5, conductivity: 50, specificHeat: 460 }),
      m('Plain Carbon Steel', 7800, '#b8bcc2', { elasticModulus: 2.1e11, poisson: 0.28, shearModulus: 7.9e10, tensile: 3.99e8, yield: 2.2e8, thermalExpansion: 1.3e-5, conductivity: 43, specificHeat: 440 }),
      m('Stainless Steel (ferritic)', 7800, '#c9ccd1', { elasticModulus: 2e11, poisson: 0.28, shearModulus: 7.7e10, tensile: 5.1e8, yield: 1.7e8, thermalExpansion: 1.1e-5, conductivity: 18, specificHeat: 460 }),
    ],
  },
  {
    name: 'Iron',
    materials: [
      m('Ductile Iron', 7100, '#8e9298', { elasticModulus: 1.2e11, poisson: 0.31, shearModulus: 7.7e10, tensile: 8.6e8, yield: 5.5e8, thermalExpansion: 1.1e-5, conductivity: 47, specificHeat: 500 }),
      m('Gray Cast Iron', 7200, '#8e9298', { elasticModulus: 6.6e10, poisson: 0.27, shearModulus: 5e10, tensile: 1.5e8, thermalExpansion: 1.2e-5, conductivity: 45, specificHeat: 510 }),
      m('Malleable Cast Iron', 7300, '#8e9298', { elasticModulus: 1.9e11, poisson: 0.27, shearModulus: 8.6e10, tensile: 4.1e8, yield: 2.8e8, thermalExpansion: 1.2e-5, conductivity: 45, specificHeat: 510 }),
    ],
  },
  {
    name: 'Aluminium Alloys',
    materials: [
      m('1060 Alloy', 2700, '#d8dbe0', { elasticModulus: 6.9e10, poisson: 0.33, shearModulus: 2.7e10, tensile: 6.89e7, yield: 2.76e7, thermalExpansion: 2.4e-5, conductivity: 200, specificHeat: 900 }),
      m('1060-H12', 2700, '#d8dbe0', { elasticModulus: 6.9e10, poisson: 0.33, shearModulus: 2.6e10, tensile: 8.27e7, yield: 7.58e7, thermalExpansion: 2.4e-5, conductivity: 234, specificHeat: 900 }),
      m('2014 Alloy', 2800, '#d8dbe0', { elasticModulus: 7.3e10, poisson: 0.33, shearModulus: 2.8e10, tensile: 1.86e8, yield: 9.65e7, thermalExpansion: 2.3e-5, conductivity: 155, specificHeat: 900 }),
      m('5052-H32', 2680, '#d8dbe0', { elasticModulus: 7.03e10, poisson: 0.33, shearModulus: 2.6e10, tensile: 2.28e8, yield: 1.93e8, thermalExpansion: 2.38e-5, conductivity: 138, specificHeat: 880 }),
      m('6061 Alloy', 2700, '#d8dbe0', { elasticModulus: 6.9e10, poisson: 0.33, shearModulus: 2.6e10, tensile: 1.24e8, yield: 5.51e7, thermalExpansion: 2.4e-5, conductivity: 170, specificHeat: 1300 }),
      m('6061-T6 (SS)', 2700, '#d8dbe0', { elasticModulus: 6.9e10, poisson: 0.33, shearModulus: 2.6e10, tensile: 3.1e8, yield: 2.75e8, thermalExpansion: 2.4e-5, conductivity: 166.9, specificHeat: 896 }),
      m('7075-T6 (SN)', 2810, '#d8dbe0', { elasticModulus: 7.2e10, poisson: 0.33, shearModulus: 2.69e10, tensile: 5.7e8, yield: 5.05e8, thermalExpansion: 2.36e-5, conductivity: 130, specificHeat: 960 }),
    ],
  },
  {
    name: 'Copper Alloys',
    materials: [
      m('Brass', 8500, '#d4b15a', { elasticModulus: 1e11, poisson: 0.33, shearModulus: 3.7e10, tensile: 4.78e8, yield: 2.39e8, thermalExpansion: 1.8e-5, conductivity: 110, specificHeat: 390 }),
      m('Copper', 8900, '#c77c4f', { elasticModulus: 1.1e11, poisson: 0.37, shearModulus: 4e10, tensile: 3.94e8, yield: 2.59e8, thermalExpansion: 2.4e-5, conductivity: 390, specificHeat: 390 }),
      m('Tin Bearing Bronze', 8900, '#b9865b', { elasticModulus: 1e11, poisson: 0.33, shearModulus: 3.7e10, tensile: 3.1e8, yield: 1.4e8, thermalExpansion: 1.8e-5, conductivity: 70, specificHeat: 370 }),
    ],
  },
  {
    name: 'Titanium Alloys',
    materials: [m('Ti-6Al-4V (SS)', 4428, '#a7abb3', { elasticModulus: 1.048e11, poisson: 0.31, shearModulus: 4.1e10, tensile: 1.05e9, yield: 8.27e8, thermalExpansion: 9e-6, conductivity: 6.7, specificHeat: 526 }), m('Commercially Pure CP-Ti UNS R50400 (SS)', 4510, '#a7abb3', { elasticModulus: 1.05e11, poisson: 0.37, shearModulus: 4.5e10, tensile: 3.45e8, yield: 2.75e8, thermalExpansion: 8.6e-6, conductivity: 16.4, specificHeat: 523 })],
  },
  {
    name: 'Plastics',
    materials: [
      m('ABS', 1020, '#f2d16b', { elasticModulus: 2e9, poisson: 0.394, shearModulus: 3.189e8, tensile: 3e7, thermalExpansion: 7.5e-5, conductivity: 0.2256, specificHeat: 1386 }),
      m('ABS PC', 1070, '#f2d16b', { elasticModulus: 2.41e9, poisson: 0.3897, shearModulus: 8.6e8, tensile: 4e7, thermalExpansion: 7e-5, conductivity: 0.2618, specificHeat: 1900 }),
      m('Acrylic (Medium-high impact)', 1200, '#e8eef5', { elasticModulus: 3e9, poisson: 0.35, shearModulus: 9e8, tensile: 7.3e7, thermalExpansion: 5.2e-5, conductivity: 0.21, specificHeat: 1500 }),
      m('Nylon 6/10', 1400, '#f4f1e6', { elasticModulus: 8.3e9, poisson: 0.28, shearModulus: 3.2e9, tensile: 1.42e8, yield: 1.39e8, thermalExpansion: 3e-5, conductivity: 0.53, specificHeat: 1500 }),
      m('PC High Viscosity', 1200, '#dfe7f0', { elasticModulus: 2.2e9, poisson: 0.39, shearModulus: 7.9e8, tensile: 6.2e7, thermalExpansion: 6.8e-5, conductivity: 0.19, specificHeat: 1200 }),
      m('PE High Density', 952, '#f7f7f0', { elasticModulus: 1.07e9, poisson: 0.4101, shearModulus: 3.772e8, tensile: 2.21e7, thermalExpansion: 1.5e-4, conductivity: 0.461, specificHeat: 1796 }),
      m('PET', 1420, '#eef3f6', { elasticModulus: 2.96e9, poisson: 0.37, shearModulus: 1.1e9, tensile: 5.73e7, thermalExpansion: 7e-5, conductivity: 0.15, specificHeat: 1300 }),
      m('PP Copolymer', 890, '#f4f4ef', { elasticModulus: 8.96e8, poisson: 0.4103, shearModulus: 3.158e8, tensile: 2.76e7, thermalExpansion: 1.7e-4, conductivity: 0.1, specificHeat: 1881 }),
      m('PVC Rigid', 1300, '#e9ecef', { elasticModulus: 2.41e9, poisson: 0.3825, shearModulus: 8.667e8, tensile: 4.07e7, thermalExpansion: 7e-5, conductivity: 0.147, specificHeat: 900 }),
    ],
  },
  {
    name: 'Other Metals',
    materials: [m('Magnesium Alloy', 1800, '#c9ccd1', { elasticModulus: 4.2e10, poisson: 0.33, shearModulus: 1.6e10, tensile: 2.6e8, yield: 2e8, thermalExpansion: 2.5e-5, conductivity: 100, specificHeat: 1000 }), m('Zinc', 7100, '#c3c6cc', { elasticModulus: 1e11, poisson: 0.3, tensile: 1.2e8, thermalExpansion: 3e-5, conductivity: 110, specificHeat: 390 }), m('Nickel', 8900, '#c9ccd1', { elasticModulus: 2.1e11, poisson: 0.31, shearModulus: 8e10, tensile: 4e8, yield: 1.4e8, thermalExpansion: 1.3e-5, conductivity: 90, specificHeat: 460 })],
  },
  {
    name: 'Other Non-metals',
    materials: [m('Ceramic Porcelain', 2300, '#f3f1ea', { elasticModulus: 2.2e11, poisson: 0.19, tensile: 1.72e8, thermalExpansion: 6.5e-6, conductivity: 1.5, specificHeat: 880 }), m('Glass', 2457, '#dbe9f2', { elasticModulus: 6.89e10, poisson: 0.23, tensile: 4.8e7, thermalExpansion: 9e-6, conductivity: 0.75, specificHeat: 840 }), m('Rubber', 1000, '#3a3a3a', { elasticModulus: 6.1e6, poisson: 0.49, tensile: 1.38e7, thermalExpansion: 6.7e-4, conductivity: 0.14, specificHeat: 2010 })],
  },
  {
    name: 'Woods',
    materials: [m('Balsa', 160, '#e5d1a6', { elasticModulus: 3e9, poisson: 0.29, tensile: 2e7, conductivity: 0.05, specificHeat: 1700 }), m('Oak', 700, '#b98a4e', { elasticModulus: 9.3e9, poisson: 0.3, tensile: 1.9e7, conductivity: 0.17, specificHeat: 2000 }), m('Pine', 500, '#d9b57c', { elasticModulus: 8.5e9, poisson: 0.3, tensile: 1.5e7, conductivity: 0.12, specificHeat: 1800 }), m('Teak', 700, '#9e6e3a', { elasticModulus: 1.2e10, poisson: 0.3, tensile: 2e7, conductivity: 0.17, specificHeat: 1700 })],
  },
];

export function findMaterial(name: string): MaterialDef | undefined {
  for (const c of MATERIAL_LIBRARY) for (const mat of c.materials) if (mat.name === name) return mat;
  return undefined;
}

/** density in g/mm³ for Mass Properties (1000 kg/m³ = 0.001 g/mm³) */
export const densityGPerMm3 = (kgPerM3: number) => kgPerM3 / 1e6;
