import { useState } from 'react';
import { useStore } from '../store';
import { Button, Dialog } from '../../ui/components';
import { createDocument, SHEET_SIZES_MM, type SheetSize } from '../../core/document/types';
import { getPref } from '../prefs';
import { nextViewLabel } from '../../core/drawing/sheet';

const STANDARD: { id: SheetSize; label: string }[] = [
  { id: 'A', label: 'A (ANSI) Landscape' },
  { id: 'B', label: 'B (ANSI) Landscape' },
  { id: 'C', label: 'C (ANSI) Landscape' },
  { id: 'D', label: 'D (ANSI) Landscape' },
  { id: 'A0', label: 'A0 (ISO)' },
  { id: 'A1', label: 'A1 (ISO)' },
  { id: 'A2', label: 'A2 (ISO)' },
  { id: 'A3', label: 'A3 (ISO)' },
  { id: 'A4', label: 'A4 (ISO)' },
];

/** Sheet Format/Size dialog shown for a new drawing, as the original. */
export function SheetFormatDialog() {
  const st = useStore();
  const [size, setSize] = useState<SheetSize>('A4');
  const [landscape, setLandscape] = useState(true);
  const [showFormat, setShowFormat] = useState(true);
  const [custom, setCustom] = useState(false);
  const [onlyStd, setOnlyStd] = useState(true);
  const [cw, setCw] = useState(SHEET_SIZES_MM.A4[0]);
  const [ch, setCh] = useState(SHEET_SIZES_MM.A4[1]);
  const [w, h] = SHEET_SIZES_MM[size];
  const ok = () => {
    const d = createDocument('Draw1', 'drawing', { size, landscape, showFormat, scale: size === 'A4' || size === 'A' ? [1, 2] : [1, 1] });
    // Custom sheet size: the given width and height (the sheet format scales with it)
    if (custom && d.sheets) d.sheets[0] = { ...d.sheets[0], customSize: [Math.max(50, cw), Math.max(50, ch)] };
    st.openDocument(d);
    st.setDialog(null);
    // Start command when creating new drawing (Model View ▸ Options)
    if (getPref('drawing.startModelView') !== false) st.startModelView();
  };
  // Only show standard formats: the ISO list for an ISO / DIN standard, the ANSI list otherwise
  const iso = st.prefs['doc.standard'] === 'ISO' || st.prefs['doc.standard'] === 'DIN';
  const list = onlyStd ? STANDARD.filter((s) => (s.id.length > 1) === iso || s.id === size) : STANDARD;
  return (
    <Dialog
      title="Sheet Format/Size"
      onClose={() => st.setDialog(null)}
      actions={
        <>
          <Button variant="primary" onClick={ok}>OK</Button>
          <Button onClick={() => st.setDialog(null)}>Cancel</Button>
          <Button onClick={() => st.pushMessage('Choose a standard sheet size; the sheet format draws the border, zones and title block.')}>Help</Button>
        </>
      }
    >
      <div className="k-sheetfmt">
        <div className="k-sheetfmt-left">
          <label className="k-check"><input type="radio" name="sf" checked={!custom} onChange={() => setCustom(false)} /> Standard sheet size</label>
          <label className="k-check" style={{ marginLeft: 18 }}><input type="checkbox" data-testid="sf-onlystd" checked={onlyStd} onChange={(e) => setOnlyStd(e.target.checked)} /> Only show standard formats</label>
          <div className="k-sheetfmt-list">
            {list.map((s) => (
              <div key={s.id} className={`k-selbox-row ${size === s.id ? 'active' : ''}`} onClick={() => { setSize(s.id); setCustom(false); }}>{s.label}</div>
            ))}
          </div>
          <div className="k-field" style={{ marginTop: 6 }}><label>{size === 'A4' ? 'a4 - landscape.slddrt' : size.toLowerCase() + ' - landscape.slddrt'}</label><button className="k-btn" onClick={() => { setCustom(true); st.pushMessage('Custom sheet size: enter the width and height; the border and title block follow the size.'); }}>Browse...</button></div>
          <label className="k-check"><input type="checkbox" checked={showFormat} onChange={(e) => setShowFormat(e.target.checked)} /> Display sheet format</label>
          <label className="k-check" style={{ marginTop: 8 }}><input type="radio" name="sf" checked={custom} onChange={() => setCustom(true)} /> Custom sheet size</label>
          <div className="k-pm-valuerow" style={{ marginLeft: 18 }}>
            <label>Width:</label><input className="k-input" data-testid="sf-width" type="number" style={{ width: 70 }} disabled={!custom} value={custom ? cw : landscape ? w : h} onChange={(e) => setCw(Number(e.target.value))} onKeyDown={(e) => e.stopPropagation()} />
            <label>Height:</label><input className="k-input" data-testid="sf-height" type="number" style={{ width: 70 }} disabled={!custom} value={custom ? ch : landscape ? h : w} onChange={(e) => setCh(Number(e.target.value))} onKeyDown={(e) => e.stopPropagation()} />
          </div>
        </div>
        <div className="k-sheetfmt-preview">
          <div className="k-field"><label>Preview:</label></div>
          <div className="k-sheetfmt-paper" style={{ width: landscape ? 160 : 160 * (h / w), height: landscape ? 160 * (h / w) : 160 }}>
            {showFormat && <div className="k-sheetfmt-border"><div className="k-sheetfmt-tb" /></div>}
          </div>
          <div className="k-pm-radios" style={{ marginTop: 6 }}>
            <label className="k-check"><input type="radio" name="orient" checked={landscape} onChange={() => setLandscape(true)} /> Landscape</label>
            <label className="k-check"><input type="radio" name="orient" checked={!landscape} onChange={() => setLandscape(false)} /> Portrait</label>
          </div>
          <div className="k-muted" style={{ marginTop: 6 }}>Width: {(landscape ? w : h).toFixed(2)}mm Height: {(landscape ? h : w).toFixed(2)}mm</div>
        </div>
      </div>
    </Dialog>
  );
}

/** Sheet Properties dialog: name, scale, projection type, size. */
export function SheetPropertiesDialog() {
  const st = useStore();
  const sheet = st.doc.sheets?.[0];
  const [name, setName] = useState(sheet?.name ?? 'Sheet1');
  const [scale, setScale] = useState(sheet ? `${sheet.scale[0]}:${sheet.scale[1]}` : '1:2');
  const [size, setSize] = useState<SheetSize>(sheet?.size ?? 'A4');
  const [landscape, setLandscape] = useState(sheet?.landscape ?? true);
  const firstAngle = st.prefs['doc.standard'] === 'ISO' || st.prefs['doc.standard'] === 'DIN';
  const [first, setFirst] = useState(firstAngle);
  const [viewLabel, setViewLabel] = useState(sheet ? sheet.nextViewLabel ?? nextViewLabel(sheet) : 'A');
  const [datumLabel, setDatumLabel] = useState(sheet?.nextDatumLabel ?? 'A');
  if (!sheet) return null;
  const ok = () => {
    const [n, d] = scale.split(':').map(Number);
    st.setSheet({ name, scale: [n || 1, d || 1], size, landscape, nextViewLabel: viewLabel.trim().toUpperCase() || undefined, nextDatumLabel: datumLabel.trim().toUpperCase() || undefined });
    st.setPrefs({ ...st.prefs, 'doc.standard': first ? 'ISO' : 'ANSI' });
    st.setDialog(null);
  };
  return (
    <Dialog title="Sheet Properties" onClose={() => st.setDialog(null)} actions={<><Button variant="primary" onClick={ok}>Apply Changes</Button><Button onClick={() => st.setDialog(null)}>Cancel</Button></>}>
      <div className="k-sheetfmt">
        <div className="k-sheetfmt-left">
          <div className="k-field"><label>Name:</label><input className="k-input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
          <div className="k-field"><label>Scale:</label><select className="k-input" value={scale} onChange={(e) => setScale(e.target.value)}>{['1:1', '1:2', '1:4', '1:5', '1:10', '2:1', '4:1', '5:1', '10:1'].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="k-field"><label>Type of projection:</label></div>
          <label className="k-check"><input type="radio" name="proj" checked={first} onChange={() => setFirst(true)} /> First angle</label>
          <label className="k-check"><input type="radio" name="proj" checked={!first} onChange={() => setFirst(false)} /> Third angle</label>
          <div className="k-field"><label>Next view label:</label><input className="k-input" data-testid="sp-viewlabel" maxLength={2} value={viewLabel} onChange={(e) => setViewLabel(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
          <div className="k-field"><label>Next datum label:</label><input className="k-input" data-testid="sp-datumlabel" maxLength={2} value={datumLabel} onChange={(e) => setDatumLabel(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
        </div>
        <div className="k-sheetfmt-preview">
          <div className="k-field"><label>Sheet Format/Size</label></div>
          <select className="k-input" value={size} onChange={(e) => setSize(e.target.value as SheetSize)}>{STANDARD.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
          <div className="k-pm-radios" style={{ marginTop: 6 }}>
            <label className="k-check"><input type="radio" name="orient2" checked={landscape} onChange={() => setLandscape(true)} /> Landscape</label>
            <label className="k-check"><input type="radio" name="orient2" checked={!landscape} onChange={() => setLandscape(false)} /> Portrait</label>
          </div>
          <label className="k-check" style={{ marginTop: 6 }}><input type="checkbox" checked={sheet.showFormat} onChange={(e) => st.setSheet({ showFormat: e.target.checked })} /> Display sheet format</label>
        </div>
      </div>
    </Dialog>
  );
}
