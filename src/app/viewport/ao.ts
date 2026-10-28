import * as THREE from 'three';
import { TEST_HOOKS } from '../testHooks';
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
      if (o.visible && (o.name.startsWith('decal:') || o.userData.noAO)) {
        o.visible = false;
        self._visibilityCache.push(o);
      }
    });
  }
}

/**
 * The occlusion's reach (share of the view height), strength and falloff, calibrated on the reference part
 * (e2e/tools/calib-ao.mjs): the inside corner darkens to about 150 grey right at the crease and fades out over a
 * fifth of the block, as in the reference frames.
 */
export const AO = { radius: 0.3, thickness: 0.3, distanceExponent: 1, falloff: 0, scale: 3, intensity: 1 };
if (TEST_HOOKS) (globalThis as unknown as { __phlippoAO?: typeof AO }).__phlippoAO = AO;

let state: { composer: EffectComposer; gtao: GTAOPass; render: RenderPass; w: number; h: number; scene: THREE.Scene; camera: THREE.Camera; key: string } | null = null;

let idle: ReturnType<typeof setTimeout> | null = null;

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
    idle = setTimeout(() => { idle = null; composeAO(renderer, scene, camera); }, 250);
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
  state.composer.render();
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
