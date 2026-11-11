import * as THREE from 'three';
import { TEST_HOOKS } from '../testHooks';
import { useStore } from '../store';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * View Settings ▸ Ambient Occlusion: the scene rendered through a GTAO pass, so inside corners and creases
 * darken softly, by design. The composer is rebuilt when the camera or size changes.
 */
/** GTAO without the overlays: decals (and anything marked noAO) do not take part in the occlusion */
class CadGTAOPass extends GTAOPass {
  _overrideVisibility(): void {
    const self = this as unknown as { scene: THREE.Scene; _visibilityCache: THREE.Object3D[] };
    (GTAOPass.prototype as unknown as { _overrideVisibility: () => void })._overrideVisibility.call(this);
    self.scene.traverse((o) => {
      // wide lines too: drawn with the pass's own materials their instanced quad is a small solid patch at the origin
      // (it entered the occlusion as a solid; see the depth pass below, QA F161)
      if (o.visible && (o.name.startsWith('decal:') || o.userData.noAO || (o as { isLineSegments2?: boolean }).isLineSegments2)) {
        o.visible = false;
        self._visibilityCache.push(o);
      }
    });
  }
}

/**
 * The occlusion's reach (share of the view height), strength and falloff, calibrated on an L-block
 * (e2e/tools/calib-ao.mjs): the inside corner darkens to about 150 grey right at the crease and fades out over a
 * fifth of the block, by design.
 */
export const AO = { radius: 0.3, thickness: 0.3, distanceExponent: 1, falloff: 0, scale: 3, intensity: 1 };
if (TEST_HOOKS) (globalThis as unknown as { __phlippoAO?: typeof AO }).__phlippoAO = AO;

let state: { composer: EffectComposer; gtao: GTAOPass; render: RenderPass; w: number; h: number; scene: THREE.Scene; camera: THREE.Camera; key: string } | null = null;

let idle: ReturnType<typeof setTimeout> | null = null;
const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });

/**
 * Draws the scene with ambient occlusion. On a processor-drawn screen (no usable graphics driver) the pass costs about
 * 0.2 s a frame: there the frame is drawn plain at once and the occlusion follows when the view has been still for
 * 250 ms, so turning and zooming stay fluid.
 */
export function renderWithAO(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, deferred = false): void {
  if (idle) clearTimeout(idle);
  idle = null;
  if (deferred) {
    renderer.render(scene, camera);
    // never while a rebuild runs in the worker: the window must keep drawing frames then (F46)
    const later = () => { idle = setTimeout(() => { if (useStore.getState().rebuild.pending) { later(); return; } idle = null; composeAO(renderer, scene, camera); }, 250); };
    later();
    return;
  }
  composeAO(renderer, scene, camera);
}

function composeAO(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  if (!state || state.w !== size.x || state.h !== size.y || state.scene !== scene || state.camera !== camera) {
    state?.composer.dispose();
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, samples: 4 });
    const composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(1);
    composer.setSize(size.x, size.y);
    const render = new RenderPass(scene, camera);
    render.clearAlpha = 0;
    const gtao = new CadGTAOPass(scene, camera, size.x, size.y);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.blendIntensity = 1;
    gtao.updateGtaoMaterial({ radius: 0.25, distanceExponent: 1, thickness: 1, scale: 1, samples: 16 });
    composer.addPass(render);
    composer.addPass(gtao);
    composer.addPass(new OutputPass());
    state = { composer, gtao, render, w: size.x, h: size.y, scene, camera, key: '' };
  }
  // the occlusion reaches a fixed share of the view (the model fills the view after Zoom to Fit), so a hand-sized
  // part and a machine frame darken their inside corners alike; tunable live through the test hooks
  const cam = camera as THREE.OrthographicCamera & THREE.PerspectiveCamera;
  const view = cam.isOrthographicCamera ? (cam.top - cam.bottom) / cam.zoom : 2 * Math.tan((cam.fov * Math.PI) / 360) * cam.position.length();
  const radius = AO.radius * view;
  const key = JSON.stringify(AO) + radius;
  if (key !== state.key) {
    state.gtao.updateGtaoMaterial({ radius, distanceExponent: AO.distanceExponent, distanceFallOff: AO.falloff, thickness: AO.thickness * view, scale: AO.scale, samples: 16 });
    state.gtao.blendIntensity = AO.intensity;
    state.key = key;
  }
  // what is drawn over the model (floor reflection, sketches, planes: marked afterAO) goes on layer 1 and is drawn after
  // the occlusion frame: through the composer, a see-through surface over the empty background would come out white
  scene.traverse((o) => {
    if (o.userData.afterAO) o.traverse((c) => c.layers.set(1));
    if ((o as THREE.Light).isLight) o.layers.enable(1);
  });
  const mask = camera.layers.mask;
  camera.layers.set(0);
  state.composer.render();
  // the frame on the screen has no usable depth: the model's depth is written again (no colour), then the overlay is
  // drawn against it, so a plane still goes behind the part
  const autoClear = renderer.autoClear;
  renderer.autoClear = false;
  renderer.clearDepth();
  const override = scene.overrideMaterial;
  scene.overrideMaterial = depthOnly;
  // not the wide lines: with a plain material their instanced quad wrote depth as a small patch at the origin, which
  // cut a light hole in the floor shadow seen through a hole at the origin (QA F161 "spikkels")
  const lines: THREE.Object3D[] = [];
  scene.traverse((o) => { if (o.visible && (o as { isLineSegments2?: boolean }).isLineSegments2) { o.visible = false; lines.push(o); } });
  renderer.render(scene, camera);
  for (const o of lines) o.visible = true;
  scene.overrideMaterial = override;
  camera.layers.set(1);
  renderer.render(scene, camera);
  renderer.autoClear = autoClear;
  camera.layers.mask = mask;
  camera.layers.enable(0);
  camera.layers.enable(1);
}

/** a plain frame was drawn (occlusion off, sketch, wireframe): a waiting occlusion frame must not paint over it */
export function cancelAO(): void {
  if (idle) clearTimeout(idle);
  idle = null;
}

export function disposeAO(): void {
  cancelAO();
  state?.composer.dispose();
  state = null;
}
