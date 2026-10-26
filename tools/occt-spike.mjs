// QA F51 spike: OpenCascade (replicad + its opencascade.js build) as a B-rep kernel next to the mesh kernel.
// Measures start-up, extrude, fillet on real topology, the exact volume against the mesh kernel, STEP out and back in.
// Usage: node tools/occt-spike.mjs  (writes e2e-out/occt-spike.json and e2e-out/occt-spike.step)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const t0 = performance.now();
const init = (await import('replicad-opencascadejs')).default;
const wasmPath = require.resolve('replicad-opencascadejs/wasm');
const OC = await init({ wasmBinary: readFileSync(wasmPath) });
const replicad = await import('replicad');
replicad.setOC(OC);
const tInit = performance.now() - t0;

const out = { initMs: Math.round(tInit), wasmBytes: readFileSync(wasmPath).length, cases: [] };
const time = (label, fn) => {
  const a = performance.now();
  const r = fn();
  out.cases.push({ label, ms: +(performance.now() - a).toFixed(1) });
  return r;
};

// 1. plate 80 x 80 x 10 from a sketch, fillet R3 on one top edge: exact volume 64000 - (1 - pi/4) * 9 * 80
const plate = time('extrude 80x80 sketch, 10 mm', () => replicad.drawRectangle(80, 80).translate(40, 40).sketchOnPlane('XY').extrude(10));
const edgeFilter = (e) => e.inDirection('Y').containsPoint([80, 40, 10]);
const filleted = time('fillet R3 on the top edge at x = 80', () => plate.fillet(3, edgeFilter));
const exact = 80 * 80 * 10 - (1 - Math.PI / 4) * 9 * 80;
const vol = replicad.measureVolume(filleted);
out.fillet = { volume: +vol.toFixed(4), exact: +exact.toFixed(4), error: +(vol - exact).toExponential(2) };

// 2. topology: faces and edges of the result, as a mesh kernel cannot give them
out.topology = { faces: filleted.faces.length, edges: filleted.edges.length };

// 3. the same edge after the plate gets thicker: OCCT finds it by a filter on geometry, not by position
const thick = replicad.drawRectangle(80, 80).translate(40, 40).sketchOnPlane('XY').extrude(25);
const thickFillet = time('fillet after the plate becomes 25 mm', () => thick.fillet(3, (e) => e.inDirection('Y').containsPoint([80, 40, 25])));
out.thick = { volume: +replicad.measureVolume(thickFillet).toFixed(4), exact: +(80 * 80 * 25 - (1 - Math.PI / 4) * 9 * 80).toFixed(4) };

// 4. boolean: a through hole of D35 and a shell of 2 mm
const holed = time('cut a D35 through hole', () => filleted.cut(replicad.drawCircle(17.5).translate(40, 40).sketchOnPlane('XY', -1).extrude(12)));
out.hole = { volume: +replicad.measureVolume(holed).toFixed(4), exact: +(exact - Math.PI * 17.5 * 17.5 * 10).toFixed(4) };
const shelled = time('shell 2 mm, top face open', () => replicad.drawRectangle(80, 80).translate(40, 40).sketchOnPlane('XY').extrude(30).shell(2, (f) => f.inPlane('XY', 30)));
out.shell = { volume: +replicad.measureVolume(shelled).toFixed(4), exact: 80 * 80 * 30 - 76 * 76 * 28 };

// 5. tessellation for the viewport (what three.js would draw)
const mesh = time('tessellate (tolerance 0.01)', () => holed.mesh({ tolerance: 0.01, angularTolerance: 0.1 }));
out.mesh = { triangles: mesh.triangles.length / 3, vertices: mesh.vertices.length / 3, faceGroups: mesh.faceGroups.length };

// 6. STEP out and back in
const blob = time('STEP export', () => holed.blobSTEP());
const stepText = Buffer.from(await blob.arrayBuffer());
mkdirSync('e2e-out', { recursive: true });
writeFileSync('e2e-out/occt-spike.step', stepText);
const back = time('STEP import', () => null);
const imported = await replicad.importSTEP(new Blob([stepText]));
out.cases[out.cases.length - 1].ms = undefined;
out.step = { bytes: stepText.length, reimportedVolume: +replicad.measureVolume(imported).toFixed(4) };
void back;

writeFileSync('e2e-out/occt-spike.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
