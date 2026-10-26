import * as THREE from 'three';
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

let state: { composer: EffectComposer; gtao: GTAOPass; render: RenderPass; w: number; h: number; scene: THREE.Scene; camera: THREE.Camera } | null = null;

export function renderWithAO(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
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
    state = { composer, gtao, render, w: size.x, h: size.y, scene, camera };
  }
  // the AO radius follows the model size on screen
  state.composer.render();
}

export function disposeAO(): void {
  state?.composer.dispose();
  state = null;
}
