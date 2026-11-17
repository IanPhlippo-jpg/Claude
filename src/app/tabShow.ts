/**
 * Shift+Tab in an assembly (parity list point 11): shows the hidden component under the pointer, as in the reference
 * program; Tab hides the one under the pointer. A hidden component is not drawn, so it is found by casting the
 * pointer's ray against the bodies of the hidden components themselves (their part rebuilt and placed where the
 * component sits), the nearest hit wins.
 */
import * as THREE from 'three';
import { componentBody, componentMatrix, partRebuild } from '../core/assembly/assembly';
import { documentForConfiguration } from '../core/document/configurations';
import type { Component } from '../core/document/types';

/** the id of the nearest hidden component the ray meets, or null */
export function hiddenComponentAt(components: Component[], ray: THREE.Ray): string | null {
  const caster = new THREE.Raycaster(ray.origin, ray.direction);
  let best: { id: string; d: number } | null = null;
  for (const c of components) {
    if (!c.hidden || c.suppressed) continue;
    const body = componentBody(partRebuild(documentForConfiguration(c.part, c.configuration)));
    if (!body) continue;
    const mesh = new THREE.Mesh(body.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(componentMatrix(c));
    mesh.matrixWorld.copy(mesh.matrix);
    const hit = caster.intersectObject(mesh, false)[0];
    (mesh.material as THREE.Material).dispose();
    if (hit && (!best || hit.distance < best.d)) best = { id: c.id, d: hit.distance };
  }
  return best?.id ?? null;
}

/** the last pointer position over the page (client pixels): Tab and Shift+Tab act on what is under it */
export const pointer = { x: -1, y: -1 };
if (typeof window !== 'undefined') window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true, capture: true });
