// De montagescènes (verbinding.mjs) in 3D met three.js: draaien, zoomen, en met een schuif van samen naar uit elkaar.
// Elk deel krijgt zijn nummer als label op het scherm (zoals de ballonnen op het montageblad). 'three' en
// 'three/addons/' komen uit de importmap van de pagina.
import { vlakken } from './verbinding.mjs';

/** maakt de 3D in 'houder'; geeft { toon(scène), zet(t), animeer(naar), herstel() } */
export async function verbinding3d(houder) {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  houder.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#eef0f2');
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.add(new THREE.HemisphereLight('#ffffff', '#9aa0a6', 0.6));
  const zon = new THREE.DirectionalLight('#ffffff', 1.6); zon.position.set(-1, 2, 1.5); scene.add(zon);
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 20000);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false;
  const labels = document.createElement('div'); labels.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
  houder.appendChild(labels);
  houder.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) e.stopPropagation(); }, { capture: true });
  let groep = null, delen = [], gatLabels = [], t = 1, anim = null, kijk = null;

  const geo = (s) => {
    const pos = [], nor = [];
    for (const v of vlakken(s)) for (let i = 1; i < v.pts.length - 1; i++) for (const p of [v.pts[0], v.pts[i], v.pts[i + 1]]) { pos.push(...p); nor.push(...v.n); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return g;
  };
  const teken = () => {
    renderer.render(scene, camera);
    // labels: het nummer bij het midden van elk deel
    const w = houder.clientWidth, h = houder.clientHeight;
    for (const d of delen) {
      if (!d.label) continue;
      const v = d.midden.clone().add(d.groep.position).project(camera), zicht = d.groep.visible && v.z < 1;
      d.label.style.display = zicht ? '' : 'none';
      if (zicht) d.label.style.transform = `translate(${((v.x + 1) / 2) * w - 11}px, ${((1 - v.y) / 2) * h - 11}px)`;
    }
    for (const g of gatLabels) {
      const v = g.p.clone().add(g.volg?.groep.position ?? new THREE.Vector3()).project(camera);
      g.el.style.display = v.z < 1 ? '' : 'none';
      g.el.style.transform = `translate(${((v.x + 1) / 2) * w + 4}px, ${((1 - v.y) / 2) * h - 22}px)`;
    }
  };
  controls.addEventListener('change', teken);

  function zet(nt) {
    t = Math.max(0, Math.min(1, nt));
    for (const d of delen) {
      const u = d.def.uit ?? [0, 0, 0];
      d.groep.position.set(u[0] * t, u[1] * t, u[2] * t);
      d.groep.visible = !((d.def.alleenSamen && t > 0.05) || (d.def.alleenUit && t < 0.05));
    }
    teken();
  }
  function herstel() {
    if (!kijk) return;
    camera.position.copy(kijk.pos); controls.target.copy(kijk.doel); controls.update(); teken();
  }
  const maat = () => { const w = houder.clientWidth || 600, h = houder.clientHeight || 400; renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = w / h; camera.updateProjectionMatrix(); teken(); };
  new ResizeObserver(maat).observe(houder);

  return {
    toon(sc) {
      if (groep) { scene.remove(groep); groep.traverse((x) => { x.geometry?.dispose(); x.material?.dispose?.(); }); }
      labels.innerHTML = ''; groep = new THREE.Group(); delen = [];
      const box = new THREE.Box3();
      for (const d of sc.delen) {
        const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: d.kleur, roughness: 0.45, metalness: /^#(c5|7d|8f|4b)/.test(d.kleur) ? 0.55 : 0.15, transparent: !!d.alpha, opacity: d.alpha ?? 1, depthWrite: !d.alpha, side: d.alpha ? THREE.DoubleSide : THREE.FrontSide });
        for (const s of d.solids) { const m = new THREE.Mesh(geo(s), mat); g.add(m); }
        // de randen donker, zoals op het blad
        for (const s of d.solids) { if (s.naad) continue; const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo(s), 25), new THREE.LineBasicMaterial({ color: '#1d2125', transparent: true, opacity: 0.35 })); g.add(e); }
        groep.add(g);
        const bb = new THREE.Box3().setFromObject(g), midden = bb.getCenter(new THREE.Vector3());
        if (!d.alleenSamen && !d.alleenUit) box.union(bb.clone().translate(new THREE.Vector3(...(d.uit ?? [0, 0, 0])))), box.union(bb);
        let label = null;
        if (d.nr) { label = document.createElement('span'); label.textContent = d.nr; label.title = d.naam; label.style.cssText = 'position:absolute;left:0;top:0;width:22px;height:22px;border-radius:50%;background:#fff;border:1.5px solid #14171a;font:700 12px/19px system-ui,sans-serif;text-align:center;color:#14171a;box-shadow:0 1px 3px rgba(0,0,0,.25)'; labels.appendChild(label); }
        delen.push({ def: d, groep: g, midden: d.solids.length ? new THREE.Box3().setFromObject(g.children[0]).getCenter(new THREE.Vector3()) : midden, label });
      }
      scene.add(groep);
      // de gaten: een rood vierkantje met een letter (zoals op het montageblad)
      gatLabels = (sc.gaten ?? []).map((g, i) => { const el = document.createElement('span'); el.textContent = 'abcdefgh'[i]; el.title = g.tekst; el.style.cssText = 'position:absolute;left:0;top:0;width:18px;height:18px;background:#fff;border:1.5px solid #b42318;color:#b42318;font:700 12px/15px system-ui,sans-serif;text-align:center'; labels.appendChild(el); return { el, p: new THREE.Vector3(...g.p), volg: delen.find((x) => x.def.naam === g.volg) }; });
      // camera: van rechts voor en iets van boven, zodat alles (uit elkaar) in beeld is
      const c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2, yaw = ((sc.kijk?.yaw ?? -32) * Math.PI) / 180;
      const dir = new THREE.Vector3(Math.sin(-yaw) * 0.85, 0.5, Math.cos(yaw) * 0.85).normalize(), afst = r / Math.sin((camera.fov * Math.PI) / 360) * 0.86;
      kijk = { pos: c.clone().add(dir.multiplyScalar(afst)), doel: c };
      herstel(); zet(t); maat();
    },
    zet,
    get t() { return t; },
    animeer(naar, ms = 900) {
      cancelAnimationFrame(anim); const van = t, t0 = performance.now();
      const stap = (nu) => { const k = Math.min(1, (nu - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; zet(van + (naar - van) * e); if (k < 1) anim = requestAnimationFrame(stap); };
      anim = requestAnimationFrame(stap);
    },
    herstel,
    beeld: () => { teken(); return renderer.domElement.toDataURL('image/jpeg', 0.92); },
  };
}
