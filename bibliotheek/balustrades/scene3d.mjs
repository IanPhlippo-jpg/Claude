// De balustrade in 3D voor de klant (browser, three.js 0.160): de vloer of de trap met de vide ernaast, en elk stuk uit
// model.mjs: staanders, handregel, regels, spijlen, staven, platen (met hun patroon), glas en klemmen, U-profiel, voetplaten
// en consoles, in de gekozen RAL-kleur en structuur. Slepen = draaien, scrollen of knijpen = zoomen. 'three' en
// 'three/addons/' komen uit de importmap van de pagina, of worden gebundeld (presentatie).
import { PROFIEL, RAL, AFWERKINGEN, GLASTINT, PATROON } from './onderdelen.mjs';

const v3 = (p) => [p[0], p[2], -p[1]]; // model (z omhoog) -> three (y omhoog)
const doek = (n = 256) => { const c = document.createElement('canvas'); c.width = c.height = n; return [c, c.getContext('2d')]; };

/** maakt de 3D in 'houder'; geeft { toon(o, keuzes), herstel(), beeld() } */
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
  const zon = new THREE.DirectionalLight('#ffffff', 1.7); zon.castShadow = true; zon.shadow.mapSize.set(2048, 2048); scene.add(zon, zon.target);
  const camera = new THREE.PerspectiveCamera(35, 1, 10, 200000);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false; controls.maxPolarAngle = Math.PI * 0.495;
  houder.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) e.stopPropagation(); }, { capture: true });
  let groep = null, kijk = null;
  const teken = () => renderer.render(scene, camera);
  controls.addEventListener('change', teken);
  let bewogen = false; controls.addEventListener('start', () => { bewogen = true; });
  const maat = () => { const w = houder.clientWidth || 600, h = houder.clientHeight || 400; renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = w / h; camera.updateProjectionMatrix(); if (!bewogen && kijk) herstel(); else teken(); };
  new ResizeObserver(maat).observe(houder);

  // ---- texturen: korrel van de fijnstructuur, patronen van de platen (alphaMap), beton
  const korrel = (() => { const [c, g] = doek(256); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256); let r = 3; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647); for (let n = 0; n < 9000; n++) { const v = (90 + rnd() * 80) | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 30, 1 / 30); return t; })();
  const patroonTex = {};
  const patroon = (p) => {
    if (!p || p === 'vlak') return null;
    if (patroonTex[p]) return patroonTex[p];
    const [c, g] = doek(128); g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#000';
    let tegel = 60;
    if (p === 'perfo') { tegel = 15; g.beginPath(); g.arc(64, 64, 42, 0, 7); g.fill(); }
    else if (p === 'lamel') { tegel = 60; g.fillRect(46, 4, 36, 120); }
    else if (p === 'cirkel') { tegel = 100; g.beginPath(); g.arc(64, 64, 38, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / tegel, 1 / tegel);
    return (patroonTex[p] = t);
  };

  /** een balk langs a-b (modelcoördinaten), met de doorsnede: h dwars (N), b de andere richting */
  const balk = (a, b, Pf, N, mat) => {
    const A = new THREE.Vector3(...v3(a)), B = new THREE.Vector3(...v3(b)), L = A.distanceTo(B);
    if (L < 0.5) return null;
    const x = B.clone().sub(A).normalize(), n = new THREE.Vector3(...v3([N[0], N[1], 0])).normalize();
    let y = new THREE.Vector3().crossVectors(n, x).normalize(); if (y.lengthSq() < 0.5) y = new THREE.Vector3(0, 1, 0);
    const z = new THREE.Vector3().crossVectors(x, y).normalize();
    let geo;
    if (Pf.vorm === 'buis' || Pf.vorm === 'rond') { geo = new THREE.CylinderGeometry(Pf.b / 2, Pf.b / 2, L, 20); geo.rotateZ(-Math.PI / 2); }
    else geo = new THREE.BoxGeometry(L, Pf.b, Pf.h);
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
    m.matrix.makeBasis(x, y, z); m.matrix.setPosition(A.clone().add(B).multiplyScalar(0.5)); m.matrixAutoUpdate = false;
    return m;
  };
  /** een vlak paneel (4 punten) met dikte t, langs de normaal N */
  const paneel = (pts, t, N, mat) => {
    const P = pts.map((p) => new THREE.Vector3(...v3(p))), n = new THREE.Vector3(...v3([N[0], N[1], 0])).normalize().multiplyScalar(t / 2);
    const hoek = [...P.map((p) => p.clone().sub(n)), ...P.map((p) => p.clone().add(n))];
    const g = new THREE.BufferGeometry(), idx = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0];
    const pos = [], uv = [], u0 = P[1].clone().sub(P[0]).normalize();
    for (const i of idx) { const p = hoek[i]; pos.push(p.x, p.y, p.z); const d = p.clone().sub(P[0]); uv.push(d.dot(u0), p.y - P[0].y); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.castShadow = !mat.transparent; m.receiveShadow = true; return m;
  };

  function toon(o, keuzes = {}) {
    if (groep) { scene.remove(groep); groep.traverse((x) => { x.geometry?.dispose(); }); }
    groep = new THREE.Group();
    const k = o.k, kleur = RAL.find((c) => c.code === (keuzes.ral ?? k.ral)) ?? RAL[0], afw = AFWERKINGEN[keuzes.lak ?? k.lak] ?? AFWERKINGEN.fijnstructuur;
    const staal = new THREE.MeshStandardMaterial({ color: kleur.hex, roughness: afw.ruw, metalness: kleur.metallic ? 0.55 : 0.12, bumpMap: afw.korrel ? korrel : null, bumpScale: afw.korrel ? 0.6 : 0 });
    const inox = new THREE.MeshStandardMaterial({ color: '#cfd4d8', roughness: 0.28, metalness: 0.9 });
    const alu = new THREE.MeshStandardMaterial({ color: '#c3c8cd', roughness: 0.35, metalness: 0.75 });
    const tint = GLASTINT[keuzes.glasTint ?? k.glasTint] ?? GLASTINT.helder;
    const glas = new THREE.MeshStandardMaterial({ color: new THREE.Color(tint.tint).lerp(new THREE.Color('#7fa9b3'), tint.naam.startsWith('Grijs') ? 0 : 0.45), roughness: tint.naam.startsWith('Mat') ? 0.7 : 0.08, metalness: 0, envMapIntensity: 0.5, transparent: true, opacity: 0.16 + tint.dekking * 0.75, depthWrite: false, side: THREE.DoubleSide });
    const beton = new THREE.MeshStandardMaterial({ color: '#d4cfc5', roughness: 0.92 }), vloer = new THREE.MeshStandardMaterial({ color: k.plaats === 'buiten' ? '#8f8a80' : '#b9a58a', roughness: 0.8 });
    const add = (m) => m && groep.add(m);
    // ---- context: vloerplaat aan de loopkant, trap, en een lagere vloer
    const vd = k.vloerdikte, rand = k.bevestiging === 'zij' ? 0 : 100;
    const blok = (s, t0, t1, z0, z1, w0, w1, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(t1 - t0, z1 - z0, w1 - w0), mat), tm = (t0 + t1) / 2, wm = (w0 + w1) / 2;
      m.position.set(...v3([s.p0[0] + s.d[0] * tm + s.N[0] * wm, s.p0[1] + s.d[1] * tm + s.N[1] * wm, (z0 + z1) / 2])); m.rotation.y = Math.atan2(s.d[1], s.d[0]);
      m.receiveShadow = true; m.castShadow = true; return m;
    };
    for (const s of o.segs) {
      if (s.alfa) {
        const n = o.treden;
        for (let i = 0; i < n; i++) { const t0 = (s.Lh * i) / n, t1 = (s.Lh * (i + 1)) / n, z = s.p0[2] + t1 * Math.tan(s.alfa); add(blok(s, t0, t1, s.p0[2] - 200, z - 25, -1000, rand, beton)); add(blok(s, t0, t1 + 30, z - 25, z, -1000, rand + 20, vloer)); }
        add(blok(s, -1200, 0, s.p0[2] - 200, s.p0[2], -1800, 1800, beton));
      } else {
        const nx = o.segs[s.i + 1], t0 = s.i ? (s.draai ? rand : 0) : -300, t1 = s.Lh + (!nx ? 300 : nx.draai ? 1600 : 0);
        add(blok(s, t0, t1, s.p0[2] - vd, s.p0[2] - 8, -1600, rand, beton));
        add(blok(s, t0, t1, s.p0[2] - 8, s.p0[2], -1600, rand, vloer));
      }
    }
    // ---- de balustrade
    for (const d of o.delen) {
      const Pf = d.prof === 'koop' ? (d.koop === 'qrHandregel' ? { vorm: 'buis', b: 42.4, h: 42.4 } : d.koop === 'handregeldrager' ? { vorm: 'rond', b: 16, h: 16 } : { vorm: 'koker', b: 110, h: 100 }) : PROFIEL[d.prof];
      const mat = d.prof === 'koop' ? (d.rol === 'uprofiel' ? alu : inox) : Pf.koop ? inox : staal;
      if (d.rol === 'afstandhouder') { const m = balk(d.a, d.b, { vorm: 'koker', b: 40, h: 40 }, [d.N[1], -d.N[0]], staal); add(m); continue; }
      add(balk(d.a, d.b, Pf, d.N, mat));
    }
    for (const p of o.panelen) {
      if (p.rol === 'glas') { add(paneel(p.pts, p.dikte, p.N, glas)); continue; }
      const al = patroon(p.patroon), mat = al ? staal.clone() : staal;
      if (al) { mat.alphaMap = al; mat.alphaTest = 0.5; mat.side = THREE.DoubleSide; }
      add(paneel(p.pts, 3, p.N, mat));
    }
    for (const p of o.platen) {
      const c = p.rol === 'console' ? [p.p[0] + p.N[0] * 5, p.p[1] + p.N[1] * 5, (p.z[0] + p.z[1]) / 2] : [p.p[0], p.p[1], (p.z[0] + p.z[1]) / 2];
      const geo = p.rol === 'console' ? new THREE.BoxGeometry(p.w, p.z[1] - p.z[0], p.t) : new THREE.BoxGeometry(p.w, p.t, p.h);
      const m = new THREE.Mesh(geo, o.st?.staander === 'inox' ? inox : staal); m.position.set(...v3(c)); m.rotation.y = Math.atan2(p.d[1], p.d[0]); m.castShadow = true; add(m);
    }
    for (const kl of o.klemmen) { const m = new THREE.Mesh(new THREE.BoxGeometry(45, 50, 30), inox); const c = [kl.p[0] + kl.d[0] * 22, kl.p[1] + kl.d[1] * 22, kl.p[2]]; m.position.set(...v3(c)); m.rotation.y = Math.atan2(kl.d[1], kl.d[0]); add(m); }
    scene.add(groep);
    // ---- camera: van de loopkant, schuin van boven; zon erboven
    const box = new THREE.Box3(); for (const d of o.delen) { box.expandByPoint(new THREE.Vector3(...v3(d.a))); box.expandByPoint(new THREE.Vector3(...v3(d.b))); } for (const p of o.panelen) for (const q of p.pts) box.expandByPoint(new THREE.Vector3(...v3(q)));
    const c = box.getCenter(new THREE.Vector3()), r = Math.max(1200, box.getSize(new THREE.Vector3()).length() / 2);
    const s0 = o.segs[0], nWalk = new THREE.Vector3(...v3([-s0.N[0], -s0.N[1], 0])), dir = new THREE.Vector3(...v3([s0.d[0], s0.d[1], 0]));
    const kijkDir = nWalk.clone().multiplyScalar(0.85).add(dir.clone().multiplyScalar(-0.35)).add(new THREE.Vector3(0, 0.42, 0)).normalize();
    kijk = { c: c.clone().add(new THREE.Vector3(0, -r * 0.08, 0)), r, dir: kijkDir };
    zon.position.copy(c.clone().add(new THREE.Vector3(-r, 2.4 * r, r * 1.2))); zon.target.position.copy(c);
    const sc = zon.shadow.camera; sc.left = sc.bottom = -r * 1.4; sc.right = sc.top = r * 1.4; sc.near = 10; sc.far = r * 8; sc.updateProjectionMatrix();
    bewogen = false; maat(); herstel();
  }
  function herstel() {
    if (!kijk) return;
    // afstand zodat alles in beeld is, ook op een smal scherm (horizontale kijkhoek)
    const v = (camera.fov * Math.PI) / 360, h = Math.atan(Math.tan(v) * camera.aspect), afst = (kijk.r / Math.sin(Math.min(v, h))) * 0.9;
    camera.position.copy(kijk.c.clone().add(kijk.dir.clone().multiplyScalar(afst))); controls.target.copy(kijk.c); controls.update(); teken();
  }
  return { toon, herstel, beeld: () => { teken(); return renderer.domElement.toDataURL('image/jpeg', 0.92); } };
}
