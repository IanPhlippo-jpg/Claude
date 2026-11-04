import * as THREE from 'three';
import type { BodyScene } from './bodyScene';
import { makeStudioEnvironment } from './studioLook';
import { rendererAntialias } from '../prefsEffects';

/**
 * The renderer of the graphics area. Without a graphics card (a PC without driver, a remote desktop, the CI runner)
 * Chromium draws WebGL in software: then the edges are plain lines instead of the anti-aliased wide lines, which alone
 * made every frame of a big part take half a second (QA v0.5.1 F125). Without WebGL at all: null, and the app says so
 * instead of breaking (F115).
 */
export function createRenderer(canvas: HTMLCanvasElement, bodies: BodyScene): THREE.WebGLRenderer | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: rendererAntialias(), alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  bodies.softwareGL = isSoftwareRenderer(renderer.getContext());
  // the studio the parts reflect (studioLook.ts)
  makeStudioEnvironment(renderer);
  return renderer;
}

/** SwiftShader, llvmpipe and the Windows basic driver draw on the processor */
export function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
}

/** whether this browser can make a WebGL context at all (asked once, on a throwaway canvas that is released again) */
let webglAvailable: boolean | null = null;
export function hasWebGL(): boolean {
  if (webglAvailable !== null) return webglAvailable;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    webglAvailable = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglAvailable = false;
  }
  return webglAvailable;
}

const paneTargets = new WeakMap<HTMLCanvasElement, THREE.WebGLRenderTarget>();

/**
 * Draws a scene with the graphics area's renderer into a plain 2D canvas (the Two View / Four View panes, QA 0.5.10
 * F143/F157). One WebGL context serves every view: the studio environment, the compiled shaders and the model's GPU
 * buffers belong to the renderer that made them (for another renderer the studio is black and the parts turn into dark
 * silhouettes), and a page gets only a few contexts. The target stores sRGB, so the colours equal the graphics area's
 * (tone mapping, used only by Realistic Shading, applies to the screen alone). Returns false when nothing was drawn.
 */
export function renderToCanvas(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement, w: number, h: number): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const ratio = renderer.getPixelRatio();
  const W = Math.max(1, Math.round(w * ratio)), H = Math.max(1, Math.round(h * ratio));
  let rt = paneTargets.get(canvas);
  if (!rt) {
    rt = new THREE.WebGLRenderTarget(W, H, { samples: Math.min(4, renderer.capabilities.maxSamples), colorSpace: THREE.SRGBColorSpace });
    paneTargets.set(canvas, rt);
  } else if (rt.width !== W || rt.height !== H) rt.setSize(W, H);
  const previous = renderer.getRenderTarget();
  const px = new Uint8Array(W * H * 4);
  try {
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
  } finally {
    renderer.setRenderTarget(previous);
  }
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  // rows come bottom-up and the colour is multiplied by the coverage (blended onto a clear background): flip, divide
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const src = (H - 1 - y) * W * 4, dst = y * W * 4;
    for (let i = 0; i < W * 4; i += 4) {
      const a = px[src + i + 3];
      if (!a) continue;
      const k = a === 255 ? 1 : 255 / a;
      img.data[dst + i] = Math.min(255, px[src + i] * k);
      img.data[dst + i + 1] = Math.min(255, px[src + i + 1] * k);
      img.data[dst + i + 2] = Math.min(255, px[src + i + 2] * k);
      img.data[dst + i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  return true;
}

/** frees the GPU target of a pane canvas */
export function disposeCanvasTarget(canvas: HTMLCanvasElement): void {
  paneTargets.get(canvas)?.dispose();
  paneTargets.delete(canvas);
}
