import { useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../ui/icons';
import type { AppearanceProps } from '../core/document/types';
import { DEFAULT_ILLUMINATION, DEFAULT_MAPPING } from './viewport/appearanceLook';

// the "standard" palette of the intended Color section: six rows from light to dark
const PALETTE = [
  '#ffffff', '#ffcccc', '#ffe5cc', '#ffffcc', '#ccffcc', '#ccffff', '#cce5ff', '#e5ccff',
  '#c9cbcf', '#ff6666', '#ffb366', '#ffff66', '#66ff66', '#66ffff', '#66b3ff', '#b366ff',
  '#969696', '#e60000', '#e67300', '#e6e600', '#00cc00', '#00cccc', '#0066cc', '#7300e6',
  '#5b5b5b', '#990000', '#994d00', '#999900', '#008000', '#008080', '#003d99', '#4d0099',
  '#000000', '#4d0000', '#4d2600', '#4d4d00', '#004000', '#004040', '#001f4d', '#26004d',
];

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

/**
 * Edit Appearance (Render Tools ▸ Edit Appearance, or a body's Appearance…), laid out like the intended Appearance
 * Property Panel: the appearance name with OK / Cancel; the Color/Image tab (Selected Geometry with Remove Appearance,
 * the image, the standard palette, a colour field and the red / green / blue values) and the Mapping tab; in Advanced
 * mode also Illumination and Surface Finish. Basic / Advanced at the bottom. Cancel puts everything back.
 */
export function AppearanceDialog() {
  const st = useStore(useShallow((s) => ({ materialTarget: s.materialTarget, selectedFace: s.selectedFace, rebuild: s.rebuild, doc: s.doc, setFaceAppearance: s.setFaceAppearance, setAppearance: s.setAppearance, setAppearanceProps: s.setAppearanceProps, setDialog: s.setDialog })));
  const target = st.materialTarget;
  // a face selected in the graphics area is the target (Selected Geometry: Face<n>), by design
  const [face] = useState(() => (!target ? st.selectedFace : null));
  const faceObj = face ? st.rebuild.bodies.find((b) => b.id === face.bodyId)?.faces.find((f) => f.id === face.faceId) : undefined;
  const faceIndex = face && faceObj ? (st.rebuild.bodies.find((b) => b.id === face.bodyId)?.faces.indexOf(faceObj) ?? 0) + 1 : 0;
  const faceCurrent = faceObj ? (st.doc.faceAppearances ?? []).find((a) => Math.hypot(a.point[0] - faceObj.centroid[0], a.point[1] - faceObj.centroid[1], a.point[2] - faceObj.centroid[2]) < 1e-3)?.color : undefined;
  const own = faceCurrent ?? (target ? st.doc.bodyAppearances?.[target] : st.doc.appearance);
  const current = own ?? st.doc.material?.color ?? '#c9cbcf';
  const [original] = useState(own ?? null);
  const [color, setColor] = useState(current);
  const apply = (c: string) => { setColor(c); if (face) st.setFaceAppearance(face, c); else st.setAppearance(c, target); };
  const bodyName = target ? (() => { const b = st.rebuild.bodies.find((x) => x.id === target); return b ? st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? target : target; })() : null;
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) || 0);
  const setChannel = (k: number, v: number) => { const c = [...rgb]; c[k] = v; apply(`#${c.map(hex2).join('')}`); };
  // image, mapping, illumination and finish belong to a body or the part (a face keeps its colour only)
  const propsKey = target ?? '';
  const [originalProps] = useState(() => st.doc.appearanceProps?.[propsKey] ?? null);
  const [props, setProps] = useState<AppearanceProps>(() => st.doc.appearanceProps?.[propsKey] ?? {});
  const applyProps = (p: AppearanceProps) => { setProps(p); st.setAppearanceProps(target, Object.keys(p).length ? p : null); };
  const [advanced, setAdvanced] = useState(() => !!(props.illumination || (props.finish && props.finish !== 'none')));
  const [tab, setTab] = useState<'color' | 'mapping' | 'illumination' | 'finish'>('color');
  const mapping = props.mapping ?? DEFAULT_MAPPING;
  const ill = props.illumination ?? DEFAULT_ILLUMINATION;
  const browse = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/gif,image/bmp,image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = () => applyProps({ ...props, image: String(r.result), imageName: file.name, mapping: props.mapping ?? DEFAULT_MAPPING });
      r.readAsDataURL(file);
    };
    input.click();
  };
  const cancel = () => {
    if (face) st.setFaceAppearance(face, original);
    else {
      st.setAppearance(original, target);
      st.setAppearanceProps(target, originalProps);
    }
    st.setDialog(null);
  };
  const tabs: { id: typeof tab; label: string }[] = [{ id: 'color', label: 'Color/Image' }, { id: 'mapping', label: 'Mapping' }, ...(advanced ? [{ id: 'illumination' as const, label: 'Illumination' }, { id: 'finish' as const, label: 'Surface Finish' }] : [])];
  const slider = (key: keyof typeof ill, label: string) => (
    <div key={key} className="k-field">
      <label>{label}</label>
      <input type="range" min={0} max={1} step={0.01} value={ill[key]} data-testid={`appearance-${key}`} onChange={(e) => applyProps({ ...props, illumination: { ...ill, [key]: Number(e.target.value) } })} />
      <span className="k-muted" style={{ width: 34, textAlign: 'right' }}>{Math.round(ill[key] * 100)}%</span>
    </div>
  );
  return (
    <div className="k-float-dialog k-appearance-dialog" data-testid="appearance-dialog">
      <div className="k-panel">
        <div className="k-panel-header">
          <Icon.Appearance /> <span data-testid="appearance-name">{props.imageName ?? 'color'}</span>
          <span className="grow" />
          <button className="k-btn ghost icon k-tip" data-tip="OK" data-testid="appearance-ok" onClick={() => st.setDialog(null)}><Icon.Check size={13} /></button>
          <button className="k-btn ghost icon k-tip" data-tip="Cancel" data-testid="appearance-cancel" onClick={cancel}><Icon.Close size={12} /></button>
        </div>
        <div className="k-panel-body" style={{ padding: 8, width: 270 }}>
          <div className="k-pm-tabs" role="tablist" data-testid="appearance-tabs">
            {tabs.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} className={`k-pm-tab ${tab === t.id ? 'active' : ''}`} data-testid={`appearance-tab-${t.id}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
          </div>
          {tab === 'color' && <>
          <div className="k-pm-label">Selected Geometry</div>
          <div className="k-selbox" style={{ minHeight: 40 }} data-testid="appearance-target">
            <div className="k-selbox-row">{face ? <><Icon.Sheet size={12} /> Face&lt;{faceIndex}&gt;</> : bodyName ? <><Icon.Part size={12} /> {bodyName}</> : <><Icon.Part size={12} /> {st.doc.name}</>}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 10px' }}>
            <button className="k-btn" data-testid="appearance-remove" onClick={() => { if (face) st.setFaceAppearance(face, null); else st.setAppearance(null, target); st.setDialog(null); }}>Remove Appearance</button>
          </div>
          <div className="k-pm-label">Color</div>
          <div className="k-appearance-palette" data-testid="appearance-palette">
            {PALETTE.map((c) => (
              <button key={c} className={`k-swatch ${color.toLowerCase() === c ? 'active' : ''}`} style={{ background: c }} title={c} onClick={() => apply(c)} />
            ))}
          </div>
          <div className="k-field" style={{ marginTop: 8 }}>
            <label>Color</label>
            <input type="color" value={color} onChange={(e) => apply(e.target.value)} data-testid="appearance-color" />
          </div>
          {(['Red', 'Green', 'Blue'] as const).map((name, k) => (
            <div key={name} className="k-field">
              <label><span className="k-appearance-chip" style={{ background: ['#d33', '#3b3', '#36d'][k] }} /> {name}</label>
              <input className="k-input" type="number" min={0} max={255} step={1} value={rgb[k]} data-testid={`appearance-${name.toLowerCase()}`} onChange={(e) => setChannel(k, Number(e.target.value))} onKeyDown={(e) => e.stopPropagation()} />
            </div>
          ))}
          {!face && (
            <>
              <div className="k-pm-label" style={{ marginTop: 8 }}>Image</div>
              <div className="k-appearance-image" data-testid="appearance-image">
                {props.image ? <img src={props.image} alt={props.imageName ?? 'image'} /> : <span className="k-muted">No image</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button className="k-btn" data-testid="appearance-browse" onClick={browse}>Browse…</button>
                <button className="k-btn" data-testid="appearance-clear-image" disabled={!props.image} onClick={() => { const rest = { ...props }; delete rest.image; delete rest.imageName; applyProps(rest); }}>Remove Image</button>
              </div>
            </>
          )}
          </>}
          {tab === 'mapping' && (face ? <p className="k-muted">Mapping applies to bodies and the part; a face keeps its colour.</p> : <>
            <div className="k-pm-label">Mapping</div>
            <select className="k-input" data-testid="appearance-mapping" value={mapping.style} onChange={(e) => applyProps({ ...props, mapping: { ...mapping, style: e.target.value as typeof mapping.style } })}>
              <option value="box">Box</option>
              <option value="planar">Projection</option>
              <option value="cylindrical">Cylindrical</option>
              <option value="spherical">Spherical</option>
            </select>
            {!props.image && <p className="k-muted">Without an image the mapping places the surface finish.</p>}
            <div className="k-pm-label" style={{ marginTop: 6 }}>Size/Orientation</div>
            <div className="k-field"><label>Width</label><input className="k-input" type="number" min={1} step={1} value={mapping.size} data-testid="appearance-map-size" onChange={(e) => applyProps({ ...props, mapping: { ...mapping, size: Math.max(1, Number(e.target.value) || 1) } })} onKeyDown={(e) => e.stopPropagation()} /><span className="k-muted">mm</span></div>
            <div className="k-field"><label>Rotation</label><input className="k-input" type="number" step={5} value={mapping.rotation} data-testid="appearance-map-rotation" onChange={(e) => applyProps({ ...props, mapping: { ...mapping, rotation: Number(e.target.value) || 0 } })} onKeyDown={(e) => e.stopPropagation()} /><span className="k-muted">deg</span></div>
            <label className="k-check"><input type="checkbox" checked={!!mapping.mirrorH} data-testid="appearance-mirror-h" onChange={(e) => applyProps({ ...props, mapping: { ...mapping, mirrorH: e.target.checked } })} /> Mirror horizontally</label>
            <label className="k-check"><input type="checkbox" checked={!!mapping.mirrorV} data-testid="appearance-mirror-v" onChange={(e) => applyProps({ ...props, mapping: { ...mapping, mirrorV: e.target.checked } })} /> Mirror vertically</label>
          </>)}
          {tab === 'illumination' && (face ? <p className="k-muted">Illumination applies to bodies and the part.</p> : <>
            {slider('diffuse', 'Diffuse amount')}
            {slider('specular', 'Specular amount')}
            {slider('spread', 'Specular spread')}
            {slider('reflectivity', 'Reflection amount')}
            {slider('transparency', 'Transparent amount')}
            {slider('luminous', 'Luminous intensity')}
          </>)}
          {tab === 'finish' && (face ? <p className="k-muted">Surface finish applies to bodies and the part.</p> : <div data-testid="appearance-finish">
            {(['none', 'polished', 'brushed', 'sandblasted', 'knurled'] as const).map((f) => (
              <label key={f} className="k-check"><input type="radio" name="appearance-finish" checked={(props.finish ?? 'none') === f} data-testid={`appearance-finish-${f}`} onChange={() => applyProps({ ...props, finish: f })} /> {f === 'none' ? 'None' : f[0].toUpperCase() + f.slice(1)}</label>
            ))}
          </div>)}
          <div className="k-pm-tabs bottom" role="tablist" data-testid="appearance-mode">
            <button role="tab" aria-selected={!advanced} className={`k-pm-tab ${!advanced ? 'active' : ''}`} data-testid="appearance-basic" onClick={() => { setAdvanced(false); if (tab === 'illumination' || tab === 'finish') setTab('color'); }}>Basic</button>
            <button role="tab" aria-selected={advanced} className={`k-pm-tab ${advanced ? 'active' : ''}`} data-testid="appearance-advanced" onClick={() => setAdvanced(true)}>Advanced</button>
          </div>
        </div>
      </div>
    </div>
  );
}
