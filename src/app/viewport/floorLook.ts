// The floor under the part in the default scene, by design: the part mirrored in the
// floor, fading out within a short distance below it, and a soft shadow around its footprint. Both are cheap enough
// for a computer without a graphics driver (no shadow map, no extra render pass).
import * as THREE from 'three';

export const FLOOR = {
  /** how much of the mirrored part shows right at the floor, and over how much of the part's height it fades out */
  reflection: 0.38,
  /** fade-out length as a share of the model's diagonal (a tall door does not mirror its whole height) */
  fade: 0.16,
  /** the soft shadow: darkness at its centre and blur as a share of the footprint */
  shadow: 0.32,
  blur: 0.18,
  /** the shadow falls away from the light (the light comes from the upper right): shift as a share of the footprint */
  shift: [-0.12, -0.08] as [number, number],
};

/** a copy of a body material for its mirror image: transparent, fading out with the distance below the floor */
export function reflectionMaterial(src: THREE.Material, floorY: number, fadeLength: number): THREE.Material {
  const m = src.clone();
  // drawn after its own depth (depthPrepass): only the nearest mirrored surface shows
  Object.assign(m, { transparent: true, opacity: FLOOR.reflection, depthWrite: false, depthFunc: THREE.LessEqualDepth });
  // a clone does not take the source material's shader changes (the studio look): they come first, the fade on top
  const base = src.onBeforeCompile.bind(src);
  m.onBeforeCompile = (shader, renderer) => {
    base(shader, renderer);
    shader.uniforms.uFloorY = { value: floorY };
    shader.uniforms.uFade = { value: Math.max(1e-3, fadeLength) };
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying float vReflY;\nvoid main() {')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvReflY = (modelMatrix * vec4(transformed, 1.0)).y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform float uFloorY;\nuniform float uFade;\nvarying float vReflY;\nvoid main() {')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a *= clamp(1.0 - (uFloorY - vReflY) / uFade, 0.0, 1.0);');
  };
  m.customProgramCacheKey = () => 'floor-reflection|' + src.customProgramCacheKey();
  return m;
}

/** the mirror image's depth, drawn before its colour (shared, never disposed) */
export const depthPrepass = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true, depthWrite: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });

let shadowTex: THREE.CanvasTexture | null = null;
/** a soft dark blot (a rounded square, blurred), stretched over the footprint */
function shadowTexture(): THREE.CanvasTexture {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.filter = 'blur(14px)';
  g.fillStyle = 'rgba(40, 46, 58, 1)';
  g.beginPath();
  g.roundRect(26, 26, 76, 76, 14);
  g.fill();
  shadowTex = new THREE.CanvasTexture(c);
  shadowTex.colorSpace = THREE.SRGBColorSpace;
  return shadowTex;
}

/** the soft shadow on the floor under a footprint (world box of the bodies) */
export function softShadow(box: THREE.Box3, floorY: number): THREE.Mesh {
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  // the texture's blot covers its middle 60 %: the quad is that much larger than the footprint, plus the blur
  const k = 1 / 0.6 + FLOOR.blur;
  const g = new THREE.PlaneGeometry(Math.max(size.x, 1) * k, Math.max(size.z, 1) * k);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: FLOOR.shadow, depthWrite: false }));
  m.position.set(c.x + FLOOR.shift[0] * size.x, floorY + 1e-3, c.z + FLOOR.shift[1] * size.z);
  m.renderOrder = -2;
  m.name = 'floor-shadow';
  return m;
}
