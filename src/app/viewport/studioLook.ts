// The default look of a part, by design: a glossy blue-grey
// that reflects a studio, so a flat face is not one flat grey but runs from bright where it mirrors a light panel to
// darker where it mirrors the room, and round faces show the panels as bands. Physically based material, a studio
// environment, and a view direction taken from an eye in front of the screen (the graphics area has no perspective,
// so without it every flat face would mirror one single direction and stay one flat colour).
import * as THREE from 'three';
import { TEST_HOOKS } from '../testHooks';

/** the default part look; tunable live through the test hooks (e2e/tools/calib-studio.mjs) */
export const STUDIO = {
  color: '#c6ccd8',
  /** calibrated on a box (e2e/tools/calib-studio.mjs): top face 151 / 194 / 230 (min / mean / max) against
   * 138 / 195 / 240, front 126 against 135, right 165 against 165 (band: 127 / 188 / 246) */
  metalness: 0.85,
  roughness: 0.12,
  envIntensity: 0.75,
  /** a coloured part (an appearance, a plastic or wooden material) reads as glossy plastic, not as metal */
  plastic: { metalness: 0.12, roughness: 0.32 },
  /** the virtual eye: this many view heights in front of the screen */
  eye: 1.6,
  /** the studio (view space: x right, y up, z towards the viewer): sky, horizon and floor brightness */
  sky: 0.28,
  horizon: 0.5,
  floor: 0.42,
  /** light panels: direction (view space), half width and half height (radians), brightness. The first two make the
   * light band across a face that looks up, the third lights faces turned to the right */
  panels: [
    { dir: [0.02, 0.95, -0.3], w: 0.02, h: 0.6, power: 1.8 },
    { dir: [0.12, 0.93, -0.3], w: 0.09, h: 0.6, power: 0.5 },
    { dir: [0.95, -0.3, -0.3], w: 0.3, h: 0.3, power: 0.4 },
  ] as { dir: [number, number, number]; w: number; h: number; power: number }[],
  /** a cool tint of the room: the part reads blue-grey */
  tint: [0.92, 0.95, 1.0] as [number, number, number],
};
if (TEST_HOOKS) (globalThis as unknown as { __phlippoStudio?: typeof STUDIO }).__phlippoStudio = STUDIO;

/** shared by every studio material: the distance of the virtual eye (world units), set each frame from the view size */
const eyeUniform = { value: 1000 };
export function setStudioView(viewHeight: number): void {
  eyeUniform.value = Math.max(1, STUDIO.eye * viewHeight);
}

/** a studio material of the given colour (metal: brighter mirror, less colour) */
export function studioMaterial(color: THREE.ColorRepresentation = STUDIO.color, metal = false): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color,
    metalness: metal ? 0.9 : STUDIO.metalness,
    roughness: metal ? 0.18 : STUDIO.roughness,
    envMapIntensity: STUDIO.envIntensity,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  m.envMap = studioEnv;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uStudioEye = eyeUniform;
    // the studio stays put relative to the screen, as the lights do: reflections are looked up in view space
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <envmap_physical_pars_fragment>', THREE.ShaderChunk.envmap_physical_pars_fragment
        .replace('vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );', 'vec3 worldNormal = normal;')
        .replace('reflectVec = inverseTransformDirection( reflectVec, viewMatrix );', ''))
      .replace('void main() {', 'uniform float uStudioEye;\nvoid main() {')
      .replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.replace(
        'vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );',
        'vec3 geometryViewDir = ( isOrthographic ) ? normalize( vec3( 0.0, 0.0, uStudioEye ) + vViewPosition ) : normalize( vViewPosition );'));
  };
  m.customProgramCacheKey = () => 'studio';
  return m;
}

let studioEnv: THREE.Texture | null = null;
let envRenderer: THREE.WebGLRenderer | null = null;
let envKey = '';

/** the radiance of the studio in a view-space direction: sky over floor, soft light panels */
function radiance(x: number, y: number, z: number): [number, number, number] {
  const t = y >= 0 ? STUDIO.horizon + (STUDIO.sky - STUDIO.horizon) * Math.pow(y, 0.6) : STUDIO.horizon + (STUDIO.floor - STUDIO.horizon) * Math.pow(-y, 0.5);
  let L = t;
  for (const p of STUDIO.panels) {
    const d = new THREE.Vector3(...p.dir).normalize();
    // panel frame: across (horizontal) and along (vertical-ish)
    const across = new THREE.Vector3(0, 1, 0).cross(d).normalize();
    if (across.lengthSq() < 1e-6) across.set(1, 0, 0);
    const along = d.clone().cross(across).normalize();
    const v = new THREE.Vector3(x, y, z);
    const f = v.dot(d);
    if (f <= 0) continue;
    const a = Math.atan2(v.dot(across), f), b = Math.atan2(v.dot(along), f);
    // soft edges: smooth falloff over a quarter of the size
    const soft = (q: number, half: number) => { const e = Math.abs(q) - half; return e <= 0 ? 1 : Math.max(0, 1 - e / (half * 0.5)); };
    L += p.power * soft(a, p.w) * soft(b, p.h);
  }
  return [L * STUDIO.tint[0], L * STUDIO.tint[1], L * STUDIO.tint[2]];
}

/**
 * The studio the parts mirror, prefiltered for roughness. Made per renderer (a texture rendered by one renderer is
 * empty for another: the graphics area makes a new renderer after a lost context) and again when STUDIO changes.
 */
export function makeStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const key = JSON.stringify([STUDIO.sky, STUDIO.horizon, STUDIO.floor, STUDIO.panels, STUDIO.tint]);
  if (studioEnv && envRenderer === renderer && envKey === key) return studioEnv;
  studioEnv?.dispose();
  const W = 256, H = 128, data = new Float32Array(W * H * 4);
  for (let j = 0; j < H; j++) {
    const lat = ((j + 0.5) / H - 0.5) * Math.PI;
    for (let i = 0; i < W; i++) {
      const lon = ((i + 0.5) / W) * Math.PI * 2 - Math.PI;
      const x = Math.cos(lat) * Math.cos(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.sin(lon);
      const [r, g, b] = radiance(x, y, z);
      data.set([r, g, b, 1], (j * W + i) * 4);
    }
  }
  const eq = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
  eq.mapping = THREE.EquirectangularReflectionMapping;
  eq.magFilter = eq.minFilter = THREE.LinearFilter;
  eq.needsUpdate = true;
  const pm = new THREE.PMREMGenerator(renderer);
  studioEnv = pm.fromEquirectangular(eq).texture;
  pm.dispose();
  eq.dispose();
  envRenderer = renderer;
  envKey = key;
  return studioEnv;
}
/** the current studio (made again when STUDIO was changed, e.g. by the calibration) */
export const studioEnvironment = (): THREE.Texture | null => (envRenderer ? makeStudioEnvironment(envRenderer) : studioEnv);
