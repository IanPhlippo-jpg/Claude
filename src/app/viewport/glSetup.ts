import * as THREE from 'three';
import type { BodyScene } from './bodyScene';

/**
 * The renderer of the graphics area. Without a graphics card (a PC without driver, a remote desktop, the CI runner)
 * Chromium draws WebGL in software: then the edges are plain lines instead of the anti-aliased wide lines, which alone
 * made every frame of a big part take half a second (QA v0.5.1 F125). Without WebGL at all: null, and the app says so
 * instead of breaking (F115).
 */
export function createRenderer(canvas: HTMLCanvasElement, bodies: BodyScene): THREE.WebGLRenderer | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  bodies.softwareGL = isSoftwareRenderer(renderer.getContext());
  return renderer;
}

/** SwiftShader, llvmpipe and the Windows basic driver draw on the processor */
export function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
}
