import { TEST_HOOKS } from '../testHooks';
import * as THREE from 'three';
import { appearanceMaterial } from './appearanceLook';
import { setStudioView, STUDIO, studioEnvironment, studioMaterial } from './studioLook';
import { depthPrepass, FLOOR, reflectionMaterial, softShadow } from './floorLook';
import type { AppearanceProps } from '../../core/document/types';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { SketchScene } from './sketchScene';
import { silhouette, smoothEdges, type SmoothEdges } from '../../core/features/silhouette';
import type { Body } from '../../core/features/rebuild';
import type { DisplayStyle } from '../store';
import { displayEdgeSets, featureEdgeSets, featureEdges, smoothNormals, type TangentMode } from '../../core/features/edges';
import { hiddenEdgesDashed, tangentEdgeMode } from '../prefsEffects';
import type { BodyEdge } from '../../core/features/edgesets';

export interface BodySceneInput {
  bodies: Body[];
  /** Edit Appearance ▸ image, mapping, illumination, finish: per body id, '' for the part (the document's own object) */
  appearanceProps?: Record<string, AppearanceProps>;
  displayStyle: DisplayStyle;
  hoverFace: { bodyId: string; faceId: string } | null;
  selectedFace: { bodyId: string; faceId: string } | null;
  selectedFaces?: { bodyId: string; faceId: string }[];
  /** yellow translucent preview of the feature being edited */
  preview: THREE.BufferGeometry | null;
  /** the preview is seen through the body (a fillet lies inside the sharp corner until OK) */
  previewOnTop?: boolean;
  /** while a handle is dragged the preview shows its edges only, by design */
  previewWire?: boolean;
  /** the faces of the feature selected in the tree (blue) and of the one pointed at (orange outline) */
  featureFaces?: { bodyId: string; faceId: string }[];
  /** the faces of the selected mate: light cyan, by design */
  mateFaces?: { bodyId: string; faceId: string }[];
  /** the selected feature is also pointed at in the tree */
  featureHot?: boolean;
  hoverFeatureFaces?: { bodyId: string; faceId: string }[];
  /** result preview that replaces the body (fillet / chamfer) */
  replaceBody: THREE.BufferGeometry | null;
  hoverEdge: string | null;
  selectedEdges: string[];
  /** colour of the body faces (material appearance) */
  bodyColor?: string;
  /** colour per body (Solid Bodies ▸ Material) */
  bodyColors?: Record<string, string>;
  /** Appearances per face: bodyId -> faceId -> colour */
  faceColors?: Record<string, Record<string, string>>;
  /** metal bodies (assembly components / part material): shiny highlights */
  shinyBodies?: string[];
  /** the part itself is metal */
  metallic?: boolean;
  /** View Settings ▸ Realistic Shading Graphics: physically based materials with environment reflections */
  realisticShading?: boolean;
  /** Evaluate ▸ Zebra Stripes: black and white stripes reflected in the surfaces (surface continuity check) */
  zebra?: boolean;
  /** View Settings ▸ Shadows In Shaded Mode: a soft shadow on a floor below the model */
  shadows?: boolean;
  /** Edit Scene ▸ Floor: reflections, alignment and offset */
  floor?: { reflections?: boolean; align?: 'bottom' | 'top'; offset?: number };
  /** wooden bodies (Realistic Shading: wood grain) */
  woodBodies?: string[];
  /** the part itself is wood */
  wooden?: boolean;
  /** bodies hidden in the Solid Bodies folder */
  hiddenBodies?: string[];
  /** Mate > Make first selection transparent: those bodies are drawn see-through */
  transparentBodies?: string[];
  /** Edit Decal: images on planar faces */
  decals?: { id: string; face: { normal: [number, number, number]; point: [number, number, number] }; image: string; width: number; rotation: number; height?: number; lighting?: 'appearance' | 'custom'; brightness?: number; shininess?: number; /** only on these bodies (a part's decal in an assembly) */ bodies?: string[] }[];
  /** reference curves (Helix/Spiral) */
  curves?: { id: string; points: THREE.Vector3[]; dashed?: boolean; color?: string }[];
  /** world units per pixel, for the thickness of highlighted edges */
  scale: number;
  /** push faces back a little so sketch lines on a face stay visible */
  colors: { hover: string; selected: string };
}

interface BodyEntry {
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  /** triangle index -> face id */
  triToFace: string[];
  geometry: THREE.BufferGeometry;
  /** hidden-line and phantom tangent line sets */
  extra?: THREE.Object3D[];
  /** silhouette lines of the curved surfaces, recomputed when the camera moves */
  sil?: { se: SmoothEdges; lines: THREE.LineSegments; key: string; fat?: LineSegments2 };
  /** the visible edges as 1.5 px anti-aliased black lines (a GL line is one grey device pixel), by design */
  fat?: LineSegments2;
}

/**
 * The graphics area's lights, fixed to the camera (view space: x right, y up, z towards the viewer): one key light
 * from the upper right in front of the model, and ambient (the fill is off by default).
 * Calibrated on an L-block in the default grey (e2e/tools/calib-light.mjs, isometric box): top face 254,
 * front face 180, right face 230 grey (2026-10-28). The faces turned to the
 * light read clearly apart, so the shape shows without edges.
 */
export const LIGHTING = { key: { dir: [0.266, 0.338, 0.903] as [number, number, number], intensity: 3.462 }, fill: { dir: [0.9, 0.1, 0.4] as [number, number, number], intensity: 0 }, ambient: 1.1 };

// test hook: the lighting can be tuned live
// the light calibration scripts read the lighting through the test hooks (one gate, F83)
if (TEST_HOOKS) (globalThis as unknown as { __phlippoLighting?: typeof LIGHTING }).__phlippoLighting = LIGHTING;

/** Owns the three.js objects for solid bodies: shaded faces, edges, hover/selection overlays, preview. */
export class BodyScene {
  /** WebGL drawn in software (no graphics card): plain edge lines instead of the anti-aliased wide ones */
  softwareGL = false;
  readonly group = new THREE.Group();
  private entries = new Map<string, BodyEntry>();
  private overlays = new THREE.Group();
  private previewMesh: THREE.Mesh | null = null;
  private previewEdges: THREE.LineSegments | null = null;
  private lastBodies: Body[] | null = null;
  private lastStyle: DisplayStyle | null = null;
  private lastPreview: THREE.BufferGeometry | null = null;
  readonly lights = new THREE.Group();
  private headlight = new THREE.DirectionalLight(0xffffff, 1.1);
  private ambient = new THREE.AmbientLight(0xffffff, 0.75);
  private fill = new THREE.DirectionalLight(0xffffff, 0);
  private realisticShading = false;

  // appearance of the intended design: light grey shaded faces, black edges
  // the default part look: glossy blue-grey reflecting a studio (studioLook.ts)
  private faceMat = studioMaterial();
  private occluderMat = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  private edgeMat = new THREE.LineBasicMaterial({ color: 0x1a1a1a });
  /** model edges in Shaded With Edges: black, 1.5 px, anti-aliased (RGB 22,20,21) */
  private edgeMat2 = new LineMaterial({ color: 0x000000, linewidth: 1.5, worldUnits: false, alphaToCoverage: true });
  // the yellow preview: light, slightly green-yellow faces and bright yellow edges
  private previewMat = new THREE.MeshPhongMaterial({ color: 0xbec66e, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  private previewEdgeMat = new THREE.LineBasicMaterial({ color: 0xd7e43c, transparent: true, opacity: 1 });
  private roundPreviewMat = new THREE.MeshBasicMaterial({ color: 0xf4fd1e, transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false, depthTest: false });

  private curveGroup = new THREE.Group();
  /** Insert Component: the part on the pointer, shaded as itself with its edges */
  private ghostGroup = new THREE.Group();
  private lastGhost: Body[] | null = null;
  private decalGroup = new THREE.Group();
  private lastDecals: unknown = null;
  private lastDecalBodies: unknown = null;
  private textures = new Map<string, THREE.Texture>();
  private lastCurves: { id: string; points: THREE.Vector3[]; dashed?: boolean }[] | undefined;
  /** geometry and own (non-shared) materials of a scene object */
  private disposeObject(o: THREE.Object3D): void {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) if (mat !== this.faceMat && mat !== this.zebraMat && mat !== this.edgeMat && mat !== this.edgeMat2 && mat !== this.occluderMat && mat !== this.previewMat && mat !== this.previewEdgeMat && mat !== this.roundPreviewMat) mat.dispose();
  }

  /** everything on the GPU goes when the graphics area unmounts */
  dispose(): void {
    for (const e of this.entries.values()) {
      this.disposeObject(e.mesh);
      this.disposeObject(e.edges);
      if (e.fat) this.disposeObject(e.fat);
      for (const x of e.extra ?? []) this.disposeObject(x);
    }
    this.entries.clear();
    for (const grp of [this.overlays, this.curveGroup, this.ghostGroup, this.decalGroup, this.reflectGroup]) {
      for (const o of [...grp.children]) {
        grp.remove(o);
        this.disposeObject(o);
      }
    }
    if (this.previewMesh) this.previewMesh.geometry.dispose();
    if (this.previewEdges) this.previewEdges.geometry.dispose();
    this.previewMesh = null;
    this.previewEdges = null;
    this.lastPreview = null;
    this.lastBodies = null;
    this.lastGhost = null;
    this.lastDecals = undefined;
    for (const m of this.retiredFloorMats) m.dispose();
    this.retiredFloorMats = [];
    this.floor.geometry.dispose();
    for (const t of this.textures.values()) t.dispose();
    this.textures.clear();
    for (const m of [this.faceMat, this.occluderMat, this.edgeMat, this.edgeMat2, this.previewMat, this.previewEdgeMat, this.roundPreviewMat]) m.dispose();
  }

  constructor() {
    this.group.add(this.overlays);
    this.floor.visible = false;
    this.group.add(this.floor);
    this.lights.add(this.headlight.target);
    this.group.add(this.curveGroup);
    this.ghostGroup.visible = false;
    this.group.add(this.ghostGroup);
    this.lights.add(this.ambient);
    this.lights.add(this.headlight);
    this.lights.add(this.fill.target);
    this.lights.add(this.fill);
  }

  /** Insert Component's graphics preview: the part's bodies at the pointer, turned as the Rotate context toolbar says */
  setGhost(bodies: Body[] | null, color: string | undefined, position: THREE.Vector3 | null, rotation: THREE.Quaternion): void {
    if (bodies !== this.lastGhost) {
      for (const o of [...this.ghostGroup.children]) {
        this.ghostGroup.remove(o);
        (o as THREE.Mesh).geometry.dispose();
        const m = (o as THREE.Mesh).material as THREE.Material;
        if (m !== this.edgeMat) m.dispose();
      }
      for (const b of bodies ?? []) {
        const g = smoothNormals(b.geometry, 30);
        const mat = this.faceMat.clone();
        if (color) mat.color.set(color);
        const mesh = new THREE.Mesh(g, mat);
        mesh.name = 'ghost:' + b.id;
        const edges = new THREE.LineSegments(featureEdgeSets(g, 20, 'visible').edges, this.edgeMat);
        this.ghostGroup.add(mesh, edges);
      }
      this.lastGhost = bodies;
    }
    this.ghostGroup.visible = !!bodies && !!position;
    if (position) this.ghostGroup.position.copy(position);
    this.ghostGroup.quaternion.copy(rotation);
  }

  /** keep the key light behind the camera */
  /** put the shadow floor under all bodies (world up = +y), sized to the model */
  private lastFloorKey = '';
  /** Floor reflections: the model mirrored in the floor, faint */
  private reflectGroup = new THREE.Group();
  /** the floor materials of the call before, disposed one call later (placeFloor) */
  private retiredFloorMats: THREE.Material[] = [];
  private placeFloor(bodies: Body[], on: boolean, opts: { reflections?: boolean; align?: 'bottom' | 'top'; offset?: number } = {}): void {
    this.floor.visible = false;
    this.headlight.castShadow = on;
    // Disposing a material frees its shader program once no other material uses it, and the new floor's materials
    // would compile the very same programs again: with software GL (a computer without graphics driver) that took
    // seconds after every rebuild. So the replaced materials go one call later, when the newer ones (drawn since) hold
    // the programs.
    for (const m of this.retiredFloorMats) m.dispose();
    this.retiredFloorMats = [];
    for (const o of [...this.reflectGroup.children]) {
      this.reflectGroup.remove(o);
      // the reflection shares the body's geometry; only its cloned material is its own (the shadow owns its quad)
      if (o.name === 'floor-shadow') (o as THREE.Mesh).geometry.dispose();
      const m = (o as THREE.Mesh).material as THREE.Material;
      if (m && m !== this.faceMat && m !== this.edgeMat && m !== depthPrepass) this.retiredFloorMats.push(m);
    }
    if (!this.reflectGroup.parent) this.group.add(this.reflectGroup);
    this.reflectGroup.userData.noAO = this.reflectGroup.userData.afterAO = true;
    // floor reflections are on unless the scene turns them off, as the reference's default scene
    const reflections = opts.reflections !== false;
    if ((!on && !reflections) || !bodies.length) return;
    const box = new THREE.Box3();
    for (const b of bodies) {
      b.geometry.computeBoundingBox();
      if (b.geometry.boundingBox) box.union(b.geometry.boundingBox);
    }
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z, size.y) * 3 + 10;
    const c = box.getCenter(new THREE.Vector3());
    // Align floor with: the bottom of the model (default) or the Top Plane, plus the offset
    const floorY = (opts.align === 'top' ? 0 : box.min.y - Math.max(0.5, size.y * 0.02)) + (opts.offset ?? 0);
    if (reflections) {
      // the part mirrored in the floor, fading out below it, and a soft shadow round its footprint (floorLook.ts)
      for (const e of this.entries.values()) {
        const m = e.mesh as THREE.Mesh;
        if (!m.visible) continue;
        const mat = reflectionMaterial(Array.isArray(m.material) ? m.material[0] : m.material, floorY, size.length() * FLOOR.fade);
        // first the mirror image's depth alone, then its colour on the nearest surface only (a real mirror shows no
        // inner faces), both among the see-through objects so they come after the part
        for (const [k, mt] of [[-3, depthPrepass], [-2, mat]] as [number, THREE.Material][]) {
          const r = new THREE.Mesh(m.geometry, mt);
          r.scale.set(1, -1, 1);
          r.position.set(0, 2 * floorY, 0);
          r.renderOrder = k;
          this.reflectGroup.add(r);
        }
      }
      this.reflectGroup.add(softShadow(box, floorY));
    }
    if (!on) return;
    this.floor.geometry.dispose();
    this.floor.geometry = new THREE.PlaneGeometry(span, span);
    this.floor.rotation.set(-Math.PI / 2, 0, 0);
    this.floor.position.set(c.x, floorY, c.z);
    this.floor.receiveShadow = true;
    this.floor.visible = true;
    // the shadow camera covers the model
    const cam = this.headlight.shadow.camera as THREE.OrthographicCamera;
    const r = span / 2;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.near = 1; cam.far = 5000;
    cam.updateProjectionMatrix();
    this.headlight.shadow.mapSize.set(2048, 2048);
    this.headlight.shadow.bias = -0.0005;
    this.headlight.target.position.copy(c);
    this.headlight.target.updateMatrixWorld();
  }

  /** Edit Scene ▸ Illumination ▸ rendering brightness (1 = default) */
  brightness = 1;
  updateLight(cameraQuaternion: THREE.Quaternion): void {
    const dir = new THREE.Vector3(...LIGHTING.key.dir).applyQuaternion(cameraQuaternion);
    if (!this.realisticShading) {
      this.headlight.intensity = LIGHTING.key.intensity * this.brightness;
      this.ambient.intensity = LIGHTING.ambient * this.brightness;
      this.fill.intensity = LIGHTING.fill.intensity * this.brightness;
    }
    this.fill.position.copy(this.fill.target.position.clone().add(new THREE.Vector3(...LIGHTING.fill.dir).applyQuaternion(cameraQuaternion).multiplyScalar(1000)));
    // with shadows on, the key light stays above the model so the shadow falls on the floor
    if (this.headlight.castShadow) dir.set(dir.x * 0.4, Math.max(0.9, Math.abs(dir.y)), dir.z * 0.4).normalize();
    this.headlight.position.copy(this.headlight.target.position.clone().add(dir.multiplyScalar(1000)));
  }

  /** floor that only receives the shadow (Shadows In Shaded Mode) */
  private floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.22 }));

  /** Zebra Stripes: a matcap with 12 stripes; the stripes follow the view-space normal, as the intended zebra */
  private zebraMat: THREE.MeshMatcapMaterial | null = null;
  private zebra(): THREE.MeshMatcapMaterial {
    if (this.zebraMat) return this.zebraMat;
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const g = c.getContext('2d')!;
    for (let i = 0; i < 12; i++) {
      g.fillStyle = i % 2 ? '#111111' : '#f4f4f4';
      g.fillRect(0, (i * 256) / 12, 256, 256 / 12 + 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.zebraMat = new THREE.MeshMatcapMaterial({ matcap: tex, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    return this.zebraMat;
  }
  private rebuildBodies(bodies: Body[], style: DisplayStyle, colors: Record<string, string> = {}, shiny: Set<string> = new Set(), look: { zebra?: boolean; realisticShading: boolean; shadows: boolean; metallic: boolean; base: string; wood?: Set<string>; wooden?: boolean; faceColors?: Record<string, Record<string, string>>; transparent?: Set<string>; props?: Record<string, AppearanceProps> } = { realisticShading: false, shadows: false, metallic: false, base: '#e8e8ea' }) {
    for (const e of this.entries.values()) {
      this.group.remove(e.mesh, e.edges, ...(e.extra ?? []));
      if (e.fat) { this.group.remove(e.fat); this.disposeObject(e.fat); }
      // every rebuild makes new geometry (smoothed normals, edge sets) and often cloned materials: all of it goes
      this.disposeObject(e.mesh);
      this.disposeObject(e.edges);
      for (const x of e.extra ?? []) this.disposeObject(x);
    }
    this.entries.clear();
    for (const b of bodies) {
      // the worker's display when it made one (QA 0.5.11 F46), else worked out here
      const display = b.display?.of === b.geometry ? b.display : undefined;
      const g = display?.geometry ?? smoothNormals(b.geometry, 30);
      const triToFace: string[] = [];
      for (const f of b.faces) for (const t of f.triangles) triToFace[t] = f.id;
      let faceMat: THREE.Material = this.faceMat;
      if (colors[b.id] || shiny.has(b.id)) {
        faceMat = this.faceMat.clone();
        if (colors[b.id]) (Object.assign(faceMat, STUDIO.plastic) as THREE.MeshStandardMaterial).color.set(colors[b.id]);
        if (shiny.has(b.id)) Object.assign(faceMat, { metalness: 0.9, roughness: 0.18 });
      }
      if (look.zebra && style !== 'hiddenRemoved' && style !== 'hiddenVisible' && style !== 'wireframe') faceMat = this.zebra();
      else if (look.realisticShading && style !== 'hiddenRemoved' && style !== 'hiddenVisible') {
        // Realistic Shading: metal reflects the environment, other materials stay matte
        const metal = shiny.has(b.id) || (look.metallic && !colors[b.id]);
        const wood = look.wood?.has(b.id) || (look.wooden && !colors[b.id]);
        faceMat = new THREE.MeshStandardMaterial({ color: colors[b.id] ?? look.base, metalness: metal ? 1 : 0, roughness: metal ? 0.2 : 0.78, envMapIntensity: metal ? 1.1 : 0.3, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
        if (wood) {
          boxUVs(g, 1 / 160);
          (faceMat as THREE.MeshStandardMaterial).map = woodTexture();
        }
      }
      // Edit Appearance ▸ image, mapping, illumination and finish (the body's own, else the part's)
      const ap = look.props?.[b.id] ?? look.props?.[''];
      if (ap && !look.zebra && style !== 'hiddenRemoved' && style !== 'hiddenVisible' && style !== 'wireframe') faceMat = appearanceMaterial(faceMat, g, ap, (url) => this.imageTexture(url));
      // Appearances on faces: vertex colours on the triangles of those faces, the body colour elsewhere
      const fc = look.faceColors?.[b.id];
      if (fc && Object.keys(fc).length && style !== 'hiddenRemoved' && style !== 'hiddenVisible') {
        const base = ((faceMat as THREE.MeshPhongMaterial).color ?? new THREE.Color(colors[b.id] ?? look.base)).clone();
        const n = g.getAttribute('position').count;
        const col = new Float32Array(n * 3);
        const tmp = new THREE.Color();
        for (let t = 0; t < n / 3; t++) {
          const c = fc[triToFace[t]];
          const cc = c ? tmp.set(c) : base;
          for (let k = 0; k < 3; k++) col.set([cc.r, cc.g, cc.b], (t * 3 + k) * 3);
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        faceMat = faceMat.clone();
        (faceMat as THREE.MeshPhongMaterial).vertexColors = true;
        (faceMat as THREE.MeshPhongMaterial).color.set(0xffffff);
      }
      // Mate > Make first selection transparent (the intended default): the first part is see-through while mating
      if (look.transparent?.has(b.id) && style !== 'hiddenRemoved' && style !== 'hiddenVisible') {
        faceMat = faceMat.clone();
        Object.assign(faceMat, { transparent: true, opacity: 0.4, depthWrite: false });
      }
      const mesh = new THREE.Mesh(g, style === 'hiddenRemoved' || style === 'hiddenVisible' ? this.occluderMat : faceMat);
      mesh.castShadow = look.shadows;
      mesh.visible = style !== 'wireframe';
      mesh.name = b.id;
      const tangentMode: TangentMode = tangentEdgeMode();
      const sets = display ? displayEdgeSets(display, tangentMode) : featureEdgeSets(g, 20, tangentMode);
      // imprinted edges (Split Line) lie between coplanar faces: not creases, drawn from the body's edge list
      const imprint = (b.edges ?? []).filter((e) => e.segments.length && e.segments.every((sg) => sg.n1.dot(sg.n2) > 0.9999));
      if (imprint.length) {
        const base = sets.edges.getAttribute('position');
        const extraPos: number[] = [];
        for (const e of imprint) for (const sg of e.segments) extraPos.push(sg.a.x, sg.a.y, sg.a.z, sg.b.x, sg.b.y, sg.b.z);
        const all = new Float32Array(base.array.length + extraPos.length);
        all.set(base.array as Float32Array, 0);
        all.set(extraPos, base.array.length);
        sets.edges.setAttribute('position', new THREE.BufferAttribute(all, 3));
      }
      const edges = new THREE.LineSegments(sets.edges, this.edgeMat);
      edges.visible = style !== 'shaded';
      edges.renderOrder = 2;
      // Shaded With Edges: the edges as 1.5 px black anti-aliased lines; the GL lines carry the HLR styles
      let fat: LineSegments2 | undefined;
      if (style === 'shadedEdges' && !this.softwareGL) {
        const fg = new LineSegmentsGeometry();
        fg.setPositions(Array.from(sets.edges.getAttribute('position').array as Float32Array));
        fat = new LineSegments2(fg, this.edgeMat2);
        fat.renderOrder = 2;
        fat.frustumCulled = false;
        fat.name = 'edges';
        edges.visible = false;
      }
      const extra: THREE.Object3D[] = [];
      if (style === 'hiddenVisible' || style === 'wireframe') {
        // Hidden Lines Visible: hidden parts solid or dashed (Display option), by design
        const dashed = hiddenEdgesDashed() && style === 'hiddenVisible';
        edges.material = new THREE.LineBasicMaterial({ color: 0x1a1a1a });
        const hiddenMat = dashed ? new THREE.LineDashedMaterial({ color: 0x5a5a5a, dashSize: 2, gapSize: 1.5, depthFunc: THREE.GreaterDepth, depthWrite: false }) : new THREE.LineBasicMaterial({ color: style === 'wireframe' ? 0x1a1a1a : 0x6a6a6a, depthFunc: THREE.GreaterDepth, depthWrite: false });
        const hidden = new THREE.LineSegments(sets.edges, hiddenMat);
        if (dashed) hidden.computeLineDistances();
        hidden.renderOrder = 2;
        if (style === 'wireframe') edges.material = new THREE.LineBasicMaterial({ color: 0x1a1a1a, depthTest: false });
        else extra.push(hidden);
      }
      if (tangentMode === 'phantom' && sets.tangentEdges.getAttribute('position').count) {
        const phantom = new THREE.LineSegments(sets.tangentEdges, new THREE.LineDashedMaterial({ color: 0x1a1a1a, dashSize: 3, gapSize: 1, scale: 1 }));
        phantom.computeLineDistances();
        phantom.visible = style !== 'shaded';
        phantom.renderOrder = 2;
        extra.push(phantom);
      }
      // silhouettes of curved faces (a cylinder's outline), drawn like the edges, by design
      const se = display?.smooth ?? smoothEdges(g);
      let sil: BodyEntry['sil'];
      if (se.count) {
        const sg = new THREE.BufferGeometry();
        sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(se.count * 6), 3));
        sg.setDrawRange(0, 0);
        const lines = new THREE.LineSegments(sg, edges.material);
        lines.visible = edges.visible;
        lines.renderOrder = 2;
        lines.frustumCulled = false;
        lines.name = 'silhouette';
        extra.push(lines);
        sil = { se, lines, key: '' };
        if (fat) {
          const sf = new LineSegments2(new LineSegmentsGeometry(), this.edgeMat2);
          sf.renderOrder = 2;
          sf.frustumCulled = false;
          sf.name = 'silhouette';
          extra.push(sf);
          sil.fat = sf;
        }
      }
      this.group.add(mesh, edges, ...extra);
      if (fat) this.group.add(fat);
      this.entries.set(b.id, { mesh, edges, triToFace, geometry: g, extra, sil, fat });
    }
  }

  /** the hovered face of the intended design: only its boundary lights up (orange), no fill */
  private faceOutline(input: BodySceneInput, ref: { bodyId: string; faceId: string }, color: string): void {
    const body = input.bodies.find((b) => b.id === ref.bodyId);
    const face = body?.faces.find((f) => f.id === ref.faceId);
    if (!body || !face) return;
    const src = body.geometry.index ? body.geometry.toNonIndexed() : body.geometry;
    const pos = src.getAttribute('position');
    const key = (i: number) => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    // the boundary of the face's triangle set: edges used by one triangle only
    const count = new Map<string, { a: number; b: number; n: number }>();
    for (const t of face.triangles) {
      for (let k = 0; k < 3; k++) {
        const a = t * 3 + k, b = t * 3 + ((k + 1) % 3);
        const ka = key(a), kb = key(b);
        const id = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
        const e = count.get(id);
        if (e) e.n++;
        else count.set(id, { a, b, n: 1 });
      }
    }
    const arr: number[] = [];
    for (const e of count.values()) if (e.n === 1) arr.push(pos.getX(e.a), pos.getY(e.a), pos.getZ(e.a), pos.getX(e.b), pos.getY(e.b), pos.getZ(e.b));
    if (!arr.length) return;
    const g = new LineSegmentsGeometry();
    g.setPositions(arr);
    // drawn over the black edges it replaces (an equal depth would make it look dashed)
    const m = new LineMaterial({ color: new THREE.Color(color).getHex(), linewidth: 2, worldUnits: false, depthTest: false });
    m.resolution.copy(SketchScene.resolution);
    const ls = new LineSegments2(g, m);
    ls.renderOrder = 5;
    ls.frustumCulled = false;
    this.overlays.add(ls);
  }

  /** silhouette lines follow the camera: recomputed only when the view (or the body's placement) changed */
  updateSilhouettes(camera: THREE.Camera): void {
    const inv = new THREE.Matrix4();
    for (const e of this.entries.values()) {
      if (!e.sil || !(e.edges.visible || e.fat?.visible)) continue;
      const lines = e.sil.lines;
      lines.updateMatrixWorld();
      inv.copy(lines.matrixWorld).invert();
      const persp = (camera as THREE.PerspectiveCamera).isPerspectiveCamera;
      const view: { dir?: THREE.Vector3; eye?: THREE.Vector3 } = {};
      if (persp) view.eye = camera.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
      else view.dir = camera.getWorldDirection(new THREE.Vector3()).transformDirection(inv);
      const v = view.eye ?? view.dir!;
      const key = `${persp ? 'p' : 'o'}${v.x.toFixed(5)},${v.y.toFixed(5)},${v.z.toFixed(5)}`;
      if (key === e.sil.key) continue;
      e.sil.key = key;
      const attr = lines.geometry.getAttribute('position') as THREE.BufferAttribute;
      const n = silhouette(e.sil.se, view, attr.array as Float32Array);
      attr.needsUpdate = true;
      lines.geometry.setDrawRange(0, n * 2);
      if (e.sil.fat) {
        // the fat copy takes the same segments
        e.sil.fat.geometry.dispose();
        const fg = new LineSegmentsGeometry();
        if (n) fg.setPositions(Array.from((attr.array as Float32Array).subarray(0, n * 6)));
        e.sil.fat.geometry = fg;
        e.sil.fat.visible = n > 0;
      }
    }
  }

  /** Motion Study playback: world-space transforms of the moving bodies (null = all at rest) */
  setMotion(transforms: Map<string, THREE.Matrix4> | null): void {
    for (const [id, e] of this.entries) {
      const m = transforms?.get(id) ?? null;
      for (const o of [e.mesh, e.edges, ...(e.extra ?? [])]) {
        o.matrixAutoUpdate = !m;
        if (m) { o.matrix.copy(m); o.matrixWorldNeedsUpdate = true; }
        else { o.position.set(0, 0, 0); o.quaternion.identity(); o.scale.set(1, 1, 1); o.updateMatrix(); }
      }
    }
  }

  private lastReplace: THREE.BufferGeometry | null = null;
  private lastKey = '';
  private lastProps: Record<string, AppearanceProps> | undefined = undefined;
  /** an appearance image as a repeating texture (loaded once) */
  private imageTexture(url: string): THREE.Texture {
    const key = 'appearance:' + url;
    const hit = this.textures.get(key);
    if (hit) return hit;
    const t = new THREE.TextureLoader().load(url, () => this.onDecalLoaded?.());
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    this.textures.set(key, t);
    return t;
  }

  /** set by the viewport: redraw when a decal image has loaded */
  onDecalLoaded: (() => void) | null = null;

  update(input: BodySceneInput): void {
    // fat lines need the viewport size in pixels
    this.edgeMat2.resolution.copy(SketchScene.resolution);
    const wanted = new THREE.Color(input.bodyColor ?? STUDIO.color);
    if (!this.faceMat.color.equals(wanted)) this.faceMat.color.copy(wanted);
    // Realistic Shading: the environment lights the model; the lamps are turned down
    this.realisticShading = !!input.realisticShading;
    this.ambient.intensity = input.realisticShading ? 0.1 : LIGHTING.ambient;
    this.headlight.intensity = input.realisticShading ? 0.9 : LIGHTING.key.intensity;
    this.fill.intensity = input.realisticShading ? 0 : LIGHTING.fill.intensity;
    // metal (a dense material) mirrors more; the studio's settings follow STUDIO (live-tunable for the calibration)
    const plastic = !!input.bodyColor && !input.metallic;
    Object.assign(this.faceMat, { metalness: input.metallic ? 0.9 : plastic ? STUDIO.plastic.metalness : STUDIO.metalness, roughness: input.metallic ? 0.18 : plastic ? STUDIO.plastic.roughness : STUDIO.roughness, envMapIntensity: STUDIO.envIntensity });
    // every studio material follows the current studio (a new renderer or a recalibrated studio makes a new one)
    const env = studioEnvironment();
    for (const m of [this.faceMat, ...[...this.entries.values()].map((e) => e.mesh.material as THREE.Material)]) {
      const sm = m as THREE.MeshStandardMaterial;
      if (sm.isMeshStandardMaterial && (sm === this.faceMat || sm.envMap) && sm.envMap !== env) { sm.envMap = env; sm.needsUpdate = true; }
    }
    setStudioView(input.scale * SketchScene.resolution.y);
    const key = (input.hiddenBodies ?? []).join(',') + '|' + JSON.stringify(input.bodyColors ?? {}) + '|' + (input.shinyBodies ?? []).join(',') + '|' + (input.realisticShading ? 'rv' : '') + (input.zebra ? 'zb' : '') + (input.metallic ? 'm' : '') + (input.shadows ? 's' : '') + (input.wooden ? 'w' : '') + (input.bodyColor ?? '') + '|' + (input.woodBodies ?? []).join(',') + '|' + JSON.stringify(input.faceColors ?? {}) + '|' + (input.transparentBodies ?? []).join(',');
    if (input.bodies !== this.lastBodies || input.displayStyle !== this.lastStyle || input.replaceBody !== this.lastReplace || key !== this.lastKey || input.appearanceProps !== this.lastProps) {
      const hidden = new Set(input.hiddenBodies ?? []);
      const visible = input.bodies.filter((b) => !hidden.has(b.id));
      const shown = input.replaceBody && visible.length ? [{ ...visible[0], geometry: input.replaceBody }, ...visible.slice(1)] : visible;
      this.rebuildBodies(shown, input.displayStyle, input.bodyColors ?? {}, new Set(input.shinyBodies ?? []), { zebra: !!input.zebra, realisticShading: !!input.realisticShading, shadows: !!input.shadows, metallic: !!input.metallic, base: input.bodyColor ?? STUDIO.color, wood: new Set(input.woodBodies ?? []), wooden: !!input.wooden, faceColors: input.faceColors ?? {}, transparent: new Set(input.transparentBodies ?? []), props: input.appearanceProps });
      this.lastProps = input.appearanceProps;
      this.lastBodies = input.bodies;
      this.lastStyle = input.displayStyle;
      this.lastReplace = input.replaceBody;
      this.lastKey = key;
      this.placeFloor(shown, !!input.shadows && input.displayStyle !== 'wireframe', input.floor);
      this.lastFloorKey = JSON.stringify(input.floor ?? {});
    } else if (JSON.stringify(input.floor ?? {}) !== this.lastFloorKey) {
      const hidden = new Set(input.hiddenBodies ?? []);
      this.placeFloor(input.bodies.filter((b) => !hidden.has(b.id)), !!input.shadows && input.displayStyle !== 'wireframe', input.floor);
      this.lastFloorKey = JSON.stringify(input.floor ?? {});
    }
    // decals: the triangles of the face they sit on, with UVs from the decal frame, slightly in front
    if (input.decals !== this.lastDecals || input.bodies !== this.lastDecalBodies) {
      if (!this.decalGroup.parent) this.group.add(this.decalGroup);
      for (const o of [...this.decalGroup.children]) {
        this.decalGroup.remove(o);
        (o as THREE.Mesh).geometry.dispose();
        ((o as THREE.Mesh).material as THREE.Material).dispose();
      }
      for (const d of input.decals ?? []) {
        // only embedded images: a file:// or http URL would read other files or call home
        if (!/^data:image\//i.test(d.image)) continue;
        const n = new THREE.Vector3(...d.face.normal).normalize();
        const p0 = new THREE.Vector3(...d.face.point);
        for (const b of input.bodies) {
          if (d.bodies && !d.bodies.includes(b.id)) continue;
          // every face of the body in the decal's plane (a row of chips: one decal over all their tops)
          const faces = b.faces.filter((f) => !f.curved && new THREE.Vector3(...f.normal).dot(n) > 0.999 && Math.abs(n.dot(new THREE.Vector3(...f.centroid)) - n.dot(p0)) < 1e-3);
          if (!faces.length) continue;
          const src = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry;
          const pos = src.getAttribute('position');
          // image right along world X (or -Z on faces facing X), image up = normal x right: readable from outside
          const ref = Math.abs(n.x) > 0.9 ? new THREE.Vector3(0, 0, -Math.sign(n.x)) : new THREE.Vector3(1, 0, 0);
          const u0 = ref.addScaledVector(n, -ref.dot(n)).normalize();
          const v0 = n.clone().cross(u0).normalize();
          const rot = (d.rotation * Math.PI) / 180;
          const u = u0.clone().multiplyScalar(Math.cos(rot)).addScaledVector(v0, Math.sin(rot));
          const v = n.clone().cross(u).normalize();
          const tex = this.textures.get(d.image) ?? (() => { const t = new THREE.TextureLoader().load(d.image, () => this.onDecalLoaded?.()); t.colorSpace = THREE.SRGBColorSpace; this.textures.set(d.image, t); return t; })();
          const img = tex.image as { width?: number; height?: number } | undefined;
          const aspect = img?.width && img?.height ? img.height / img.width : 1;
          const w = d.width, h = d.height ?? d.width * aspect;
          const out: number[] = [], uv: number[] = [];
          for (const face of faces) for (const t of face.triangles) for (let k = 0; k < 3; k++) {
            const q = new THREE.Vector3().fromBufferAttribute(pos, t * 3 + k);
            const r = q.clone().sub(p0);
            out.push(q.x + n.x * 0.03, q.y + n.y * 0.03, q.z + n.z * 0.03);
            uv.push(r.dot(u) / w + 0.5, r.dot(v) / h + 0.5);
          }
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
          g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
          tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
          // Illumination: lit like the face (underlying appearance) or with its own brightness and shininess
          g.setAttribute('normal', new THREE.Float32BufferAttribute(out.map((_, i) => [n.x, n.y, n.z][i % 3]), 3));
          const custom = d.lighting === 'custom';
          const mat = new THREE.MeshPhongMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, alphaTest: 0.01, shininess: custom ? 4 + (d.shininess ?? 0.2) * 150 : 20, specular: new THREE.Color(custom ? 0x333333 : 0x222222).multiplyScalar(custom ? 1 + (d.shininess ?? 0.2) * 3 : 1), emissive: new THREE.Color(0xffffff), emissiveMap: tex, emissiveIntensity: custom ? Math.max(0, (d.brightness ?? 0.5) - 0.3) : 0.25 });
          const mesh = new THREE.Mesh(g, mat);
          mat.map!.needsUpdate = true;
          // only inside the decal rectangle: outside it the clamped edge pixels would smear over the face
          mat.onBeforeCompile = (sh) => {
            sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', 'if (vMapUv.x < 0.0 || vMapUv.x > 1.0 || vMapUv.y < 0.0 || vMapUv.y > 1.0) discard;' + String.fromCharCode(10) + '#include <map_fragment>');
          };
          mesh.renderOrder = 4;
          mesh.name = 'decal:' + d.id;
          this.decalGroup.add(mesh);
        }
      }
      this.lastDecals = input.decals;
      this.lastDecalBodies = input.bodies;
    }
    // reference curves (helix): dark blue polylines
    if (input.curves !== this.lastCurves) {
      for (const o of [...this.curveGroup.children]) {
        this.curveGroup.remove(o);
        (o as THREE.Line).geometry.dispose();
        ((o as THREE.Line).material as THREE.Material).dispose();
        ((o as THREE.Line).material as THREE.Material).dispose();
      }
      for (const c of input.curves ?? []) {
        if ((c.id.startsWith('round-pv-') || c.id.startsWith('thread-pv-')) && c.points.length > 1) {
          // the fillet / chamfer preview of the intended design: thick bright yellow lines, seen through the sharp corner
          const lg = new LineGeometry();
          lg.setPositions(c.points.flatMap((p) => [p.x, p.y, p.z]));
          const lm = new LineMaterial({ color: new THREE.Color(c.color ?? '#eef51c').getHex(), linewidth: c.id.startsWith('thread-pv-') ? 2.5 : 3, worldUnits: false, depthTest: false });
          lm.resolution.copy(SketchScene.resolution);
          const fat = new Line2(lg, lm);
          fat.name = c.id;
          fat.renderOrder = 4;
          fat.frustumCulled = false;
          this.curveGroup.add(fat);
          continue;
        }
        const g = new THREE.BufferGeometry().setFromPoints(c.points);
        // the yellow fillet preview lines show through the sharp corner, by design
        const line = new THREE.Line(g, c.dashed ? new THREE.LineDashedMaterial({ color: c.color ?? 0x5a5a5a, dashSize: 6, gapSize: 4 }) : new THREE.LineBasicMaterial({ color: c.color ?? 0x1e4fd8, depthTest: !c.id.startsWith('round-pv-') && !c.id.startsWith('com-') && !c.id.startsWith('explode-ring-') }));
        if (c.dashed) line.computeLineDistances();
        line.name = c.id;
        // the Center of Mass marker and the explode rotation rings show through the model, by design
        line.renderOrder = c.id.startsWith('com-') || c.id.startsWith('explode-ring-') ? 5 : 3;
        this.curveGroup.add(line);
      }
      this.lastCurves = input.curves;
    }
    // overlays for the hovered / selected face
    for (const o of [...this.overlays.children]) {
      this.overlays.remove(o);
      (o as THREE.Mesh).geometry.dispose();
      ((o as THREE.Mesh).material as THREE.Material).dispose();
    }
    // the selection: an opaque cyan that is only mildly shaded (target colours: a face turned to the light 64,240,250,
    // a face turned away 30,200,251): part of it is its own glow, the rest is lit as the model
    const SEL_BLUE = 0x45b100, SEL_GLOW = 0x009cfc;
    const overlay = (ref: { bodyId: string; faceId: string }, color: string, opacity: number, shaded = false) => {
      const body = input.bodies.find((b) => b.id === ref.bodyId);
      const face = body?.faces.find((f) => f.id === ref.faceId);
      const entry = this.entries.get(ref.bodyId);
      if (!body || !face || !entry) return;
      // the face triangles index the body's own geometry, also while a preview result replaces the mesh
      const src = body.geometry.index ? body.geometry.toNonIndexed() : body.geometry;
      const pos = src.getAttribute('position');
      const arr: number[] = [];
      const nrm = src.getAttribute('normal');
      const narr: number[] = [];
      for (const t of face.triangles) for (let k = 0; k < 3; k++) {
        arr.push(pos.getX(t * 3 + k), pos.getY(t * 3 + k), pos.getZ(t * 3 + k));
        if (nrm) narr.push(nrm.getX(t * 3 + k), nrm.getY(t * 3 + k), nrm.getZ(t * 3 + k));
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      if (shaded) {
        if (narr.length === arr.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(narr, 3));
        else g.computeVertexNormals();
      }
      // depth-tested and pulled slightly forward: only the visible part of the face lights up, by design
      // between the face (pushed back by 1) and its edges (not pushed): the black edges stay on top, by design
      const common = { transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 0.5, polygonOffsetUnits: 0.5 };
      const m = new THREE.Mesh(g, shaded ? new THREE.MeshPhongMaterial({ color: SEL_BLUE, emissive: SEL_GLOW, specular: 0x222222, shininess: 20, ...common }) : new THREE.MeshBasicMaterial({ color: new THREE.Color(color), ...common }));
      m.renderOrder = 3;
      this.overlays.add(m);
    };
    // highlighted edges as thin tubes (orange hover, blue selection)
    const edgeTube = (edge: BodyEdge, color: string) => {
      const r = Math.max(0.3, 1.6 * input.scale);
      const pts = edge.points;
      if (pts.length < 2) return;
      const curve = new THREE.CatmullRomCurve3(pts, edge.closed, 'catmullrom', 0);
      const g = new THREE.TubeGeometry(curve, Math.max(4, pts.length * 2), r, 6, edge.closed);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(color), polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
      m.renderOrder = 4;
      this.overlays.add(m);
    };
    // while the rounded result is previewed the original sharp edges no longer exist: no edge highlights then
    const allEdges = input.replaceBody ? [] : input.bodies.flatMap((b) => b.edges);
    for (const id of input.selectedEdges) {
      const e = allEdges.find((x) => x.id === id);
      if (e) edgeTube(e, input.colors.selected);
    }
    if (input.hoverEdge && !input.selectedEdges.includes(input.hoverEdge)) {
      const e = allEdges.find((x) => x.id === input.hoverEdge);
      if (e) edgeTube(e, input.colors.hover);
    }
    for (const f of input.selectedFaces ?? []) if (f.faceId !== input.selectedFace?.faceId) overlay(f, input.colors.selected, 1, true);
    if (input.selectedFace) overlay(input.selectedFace, input.colors.selected, 1, true);
    if (input.hoverFace && !(input.selectedFace && input.hoverFace.faceId === input.selectedFace.faceId)) this.faceOutline(input, input.hoverFace, input.colors.hover);
    // a selected feature pointed at in the tree shows the full selection blue, else half over the part
    for (const f of input.featureFaces ?? []) overlay(f, input.colors.selected, input.featureHot ? 1 : 0.5, true);
    for (const f of input.mateFaces ?? []) overlay(f, '#8ffffc', 0.95);
    for (const f of input.hoverFeatureFaces ?? []) this.faceOutline(input, f, input.colors.hover);
    // preview
    if (input.preview !== this.lastPreview) {
      if (this.previewMesh) {
        this.group.remove(this.previewMesh);
        this.previewMesh.geometry.dispose();
        this.previewMesh = null;
      }
      if (this.previewEdges) {
        this.group.remove(this.previewEdges);
        this.previewEdges.geometry.dispose();
        this.previewEdges = null;
      }
      if (input.preview) {
        this.previewEdgeMat.depthTest = !input.previewOnTop;
        // a fillet / chamfer preview is the intended strong yellow (measured 250,255,20), an extrusion the light one
        this.previewMesh = new THREE.Mesh(smoothNormals(input.preview, 30), input.previewOnTop ? this.roundPreviewMat : this.previewMat);
        this.previewMesh.renderOrder = 1;
        this.previewEdges = new THREE.LineSegments(featureEdges(input.preview, 20), this.previewEdgeMat);
        this.previewEdges.renderOrder = 2;
        this.group.add(this.previewMesh, this.previewEdges);
      }
      this.lastPreview = input.preview;
    }
    if (this.previewMesh) this.previewMesh.visible = !input.previewWire;
  }

  /** the face under a ray, nearest first */
  pick(ray: THREE.Ray): { bodyId: string; faceId: string; point: THREE.Vector3 } | null {
    const rc = new THREE.Raycaster();
    rc.ray.copy(ray);
    rc.near = -1e6;
    rc.far = 1e6;
    let best: { bodyId: string; faceId: string; point: THREE.Vector3; d: number } | null = null;
    for (const [id, e] of this.entries) {
      if (!e.mesh.visible && this.lastStyle !== 'wireframe') continue;
      const hits = rc.intersectObject(e.mesh, false);
      for (const h of hits) {
        const faceId = h.faceIndex !== undefined && h.faceIndex !== null ? e.triToFace[h.faceIndex] : undefined;
        if (!faceId) continue;
        if (!best || h.distance < best.d) best = { bodyId: id, faceId, point: h.point, d: h.distance };
        break;
      }
    }
    return best ? { bodyId: best.bodyId, faceId: best.faceId, point: best.point } : null;
  }

  /** every face under the ray, nearest first (Select Other) */
  pickAll(ray: THREE.Ray): { bodyId: string; faceId: string; d: number }[] {
    const rc = new THREE.Raycaster();
    rc.ray.copy(ray);
    rc.near = -1e6;
    rc.far = 1e6;
    const out: { bodyId: string; faceId: string; d: number }[] = [];
    for (const [id, e] of this.entries) {
      if (!e.mesh.visible) continue;
      for (const h of rc.intersectObject(e.mesh, false)) {
        const faceId = h.faceIndex !== undefined && h.faceIndex !== null ? e.triToFace[h.faceIndex] : undefined;
        if (faceId && !out.some((o) => o.bodyId === id && o.faceId === faceId)) out.push({ bodyId: id, faceId, d: h.distance });
      }
    }
    return out.sort((a, b) => a.d - b.d);
  }

  /** world bounding box of all bodies */
  bounds(): THREE.Box3 | null {
    const box = new THREE.Box3();
    for (const e of this.entries.values()) {
      e.geometry.computeBoundingBox();
      if (e.geometry.boundingBox) box.union(e.geometry.boundingBox);
    }
    return box.isEmpty() ? null : box;
  }
}

let woodTex: THREE.CanvasTexture | null = null;
/** procedural wood grain (greyscale, tinted by the material colour) */
function woodTexture(): THREE.CanvasTexture {
  if (woodTex) return woodTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#d8d8d8';
  g.fillRect(0, 0, 512, 512);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // long grain lines along v with slow waves and darker bands
  for (let i = 0; i < 140; i++) {
    const x0 = rnd() * 512, w = 0.6 + rnd() * 2.2, shade = 150 + Math.floor(rnd() * 70), amp = 2 + rnd() * 8, ph = rnd() * 6.28;
    g.strokeStyle = `rgba(${shade - 30},${shade - 30},${shade - 30},${0.25 + rnd() * 0.35})`;
    g.lineWidth = w;
    // periodic in y (integer frequencies) and drawn three times across x, so the texture tiles without seams
    const f1 = 1 + Math.floor(rnd() * 2), f2 = 4 + Math.floor(rnd() * 3);
    for (const dx of [-512, 0, 512]) {
      g.beginPath();
      for (let y = 0; y <= 512; y += 4) {
        const t = (y / 512) * Math.PI * 2;
        const x = x0 + dx + Math.sin(t * f1 + ph) * amp + Math.sin(t * f2 + ph * 2) * amp * 0.25;
        if (y === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  woodTex = new THREE.CanvasTexture(c);
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.colorSpace = THREE.SRGBColorSpace;
  woodTex.anisotropy = 4;
  return woodTex;
}

/** box-projected texture coordinates: each triangle uses the two axes across its dominant normal */
function boxUVs(g: THREE.BufferGeometry, scale: number): void {
  const pos = g.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  const idx = g.getIndex();
  const tri = idx ? idx.count / 3 : pos.count / 3;
  for (let t = 0; t < tri; t++) {
    const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    n.subVectors(b, a).cross(c.clone().sub(a));
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (const i of [i0, i1, i2]) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      // grain runs along the world y axis (door height) where possible
      const [u, v] = az >= ax && az >= ay ? [x, y] : ax >= ay ? [z, y] : [x, z];
      uv[i * 2] = u * scale;
      uv[i * 2 + 1] = v * scale;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
