// Het toestel in 3D voor de klant en de werkplaats (browser, three.js): elke balk van het model als koker, buis of
// plaat in de RAL-kleur, de kussens in de bekledingskleur, kooponderdelen in hun eigen kleur, de schijven en de stang
// als voorbeeld, de afscherming half doorzichtig, op een vloer met schaduw (en de muur waar het toestel aan hangt).
// Slepen = draaien, scrollen of knijpen = zoomen. 'three' en 'three/addons/' komen uit de importmap van de pagina of
// worden gebundeld (presentatie).
import { RAL_FITNESS, BEKLEDING } from './onderdelen.mjs';

const v3 = (p) => [p[0], p[2], -p[1]]; // model (z omhoog) -> three (y omhoog)

/** maakt de 3D in 'houder'; geeft { toon(o, { ral, leer }), herstel(), beeld() } */
export async function scene3d(houder) {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  houder.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#dcdad4');
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a8f94', 0.5));
  const zon = new THREE.DirectionalLight('#ffffff', 1.6); zon.castShadow = true; zon.shadow.mapSize.set(2048, 2048); scene.add(zon, zon.target);
  const camera = new THREE.PerspectiveCamera(32, 1, 10, 100000);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false; controls.maxPolarAngle = Math.PI * 0.495;
  houder.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) e.stopPropagation(); }, { capture: true });
  let groep = null, kijk = null, bewogen = false;
  const teken = () => renderer.render(scene, camera);
  controls.addEventListener('change', teken); controls.addEventListener('start', () => { bewogen = true; });
  const maat = () => { const w = houder.clientWidth || 600, h = houder.clientHeight || 400; renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = w / h; camera.updateProjectionMatrix(); if (!bewogen && kijk) herstel(); else teken(); };
  new ResizeObserver(maat).observe(houder);
  function herstel() { if (!kijk) return; camera.position.copy(kijk.pos); controls.target.copy(kijk.doel); controls.update(); teken(); }

  /** een balk uit het model als mesh */
  const mesh = (g, mat) => {
    const A = new THREE.Vector3(...v3(g.a)), B = new THREE.Vector3(...v3(g.b)), L = A.distanceTo(B);
    if (L < 0.3) return null;
    const x = new THREE.Vector3(...v3(g.u)), y = new THREE.Vector3(...v3(g.v)), z = new THREE.Vector3(...v3(g.w));
    let geo;
    if (g.rond) { geo = new THREE.CylinderGeometry(g.bw / 2, g.bw / 2, L, g.bw > 200 ? 40 : 18); geo.rotateZ(-Math.PI / 2); }
    else geo = new THREE.BoxGeometry(L, g.bw, g.bh);
    const m = new THREE.Mesh(geo, mat); m.castShadow = !mat.transparent; m.receiveShadow = true;
    m.matrix.makeBasis(x, y, z); m.matrix.setPosition(A.clone().add(B).multiplyScalar(0.5)); m.matrixAutoUpdate = false;
    return m;
  };
  function toon(o, keuzes = {}) {
    if (groep) { scene.remove(groep); groep.traverse((x) => { x.geometry?.dispose(); }); }
    groep = new THREE.Group();
    const ral = RAL_FITNESS.find((c) => c.code === keuzes.ral) ?? RAL_FITNESS[0], leer = BEKLEDING.find((c) => c.code === keuzes.leer) ?? BEKLEDING[0];
    const M = {
      frame: new THREE.MeshStandardMaterial({ color: ral.hex, roughness: 0.55, metalness: 0.15 }),
      leer: new THREE.MeshStandardMaterial({ color: leer.hex, roughness: 0.6, metalness: 0 }),
      hout: new THREE.MeshStandardMaterial({ color: '#c8a878', roughness: 0.8 }),
      zink: new THREE.MeshStandardMaterial({ color: '#c9ced3', roughness: 0.3, metalness: 0.85 }),
      chroom: new THREE.MeshStandardMaterial({ color: '#e3e7ea', roughness: 0.15, metalness: 0.95 }),
      rubber: new THREE.MeshStandardMaterial({ color: '#202124', roughness: 0.9 }),
      uhmw: new THREE.MeshStandardMaterial({ color: '#f0f0ee', roughness: 0.5 }),
      kabel: new THREE.MeshStandardMaterial({ color: '#151515', roughness: 0.6 }),
      katrol: new THREE.MeshStandardMaterial({ color: '#33363a', roughness: 0.5, metalness: 0.2 }),
      stapel: new THREE.MeshStandardMaterial({ color: '#2a2d31', roughness: 0.45, metalness: 0.5 }),
      schijf: new THREE.MeshStandardMaterial({ color: '#1d1f22', roughness: 0.85 }),
      kap: new THREE.MeshStandardMaterial({ color: ral.hex, roughness: 0.5, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
      context: new THREE.MeshStandardMaterial({ color: '#9a9a9a', roughness: 0.8, transparent: true, opacity: 0.35, depthWrite: false }),
    };
    const geo = [...o.delen.flatMap((d) => d.geo), ...o.kussens.flatMap((d) => d.geo), ...o.koop.flatMap((d) => d.geo), ...o.toon, ...(o.context ?? [])];
    for (const g of geo) { const m = mesh(g, M[g.kleur] ?? M.frame); if (m) groep.add(m); }
    // vloer en muur
    const [mn, mx] = o.box, cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2, R = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
    const vloer = new THREE.Mesh(new THREE.PlaneGeometry(R * 6, R * 6), new THREE.MeshStandardMaterial({ color: '#c9c3b8', roughness: 0.95 }));
    vloer.rotation.x = -Math.PI / 2; vloer.position.set(cx, -0.5, -cy); vloer.receiveShadow = true; groep.add(vloer);
    if (o.muur != null) { const muur = new THREE.Mesh(new THREE.BoxGeometry(R * 3, R * 1.6, 40), new THREE.MeshStandardMaterial({ color: '#e7e2d8', roughness: 0.95 })); muur.position.set(cx, R * 0.8, -(o.muur + 20)); muur.receiveShadow = true; groep.add(muur); }
    scene.add(groep);
    zon.position.set(cx - R * 1.2, R * 2.4, -cy + R * 1.6); zon.target.position.set(cx, 0, -cy);
    const s = zon.shadow.camera; s.left = -R * 1.5; s.right = R * 1.5; s.top = R * 1.5; s.bottom = -R * 1.5; s.near = 10; s.far = R * 8; s.updateProjectionMatrix();
    const c = new THREE.Vector3(cx, (mn[2] + mx[2]) / 2, -cy), afst = R / Math.sin((camera.fov * Math.PI) / 360) * 0.72;
    const dir = new THREE.Vector3(-0.62, 0.42, 0.72).normalize();
    kijk = { pos: c.clone().add(dir.multiplyScalar(afst)), doel: c };
    camera.near = R / 50; camera.far = R * 30; camera.updateProjectionMatrix();
    bewogen = false; herstel(); maat();
  }
  return { toon, herstel, beeld: () => { teken(); return renderer.domElement.toDataURL('image/jpeg', 0.9); } };
}
