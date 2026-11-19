/**
 * Fabrication Settings (docs/36 2.2): a dialog in the style of Tools ▸ Options, a list on the left and the page on the
 * right: Company, Rates, Materials, Machines, Finishing, Quote. Every value shows its source and a yellow AANNAME label
 * until Ian confirms it by typing his own value (then it carries today's date); a value older than the set number of
 * months is marked "check price". Export and import as JSON. Kept per user, never in the model.
 */
import { useRef, useState, type ReactNode } from 'react';
import { useFab, patchSettings, exportSettingsFile, importSettingsText, resetSettings, setSettings } from './fabStore';
import { companyMissing, confirmed, isOld, validEnterpriseNumber, validIban, type Company, type FabSettings } from '../../fab/settings';
import type { Sourced } from '../../fab/types';
import { CATALOG, profileById } from '../../fab/catalog';
import { date } from '../../fab/format';

const PAGES = ['Company', 'Rates', 'Materials', 'Machines', 'Finishing', 'Quote'] as const;
type Page = (typeof PAGES)[number];

function Val({ label, v, set, months, testId }: { label: string; v: Sourced<number> | null; set: (x: Sourced<number> | null) => void; months: number; testId?: string }) {
  return (
    <div className="k-fab-srow">
      <span className="k-fab-slabel">{label}</span>
      <input className="k-input k-fab-snum" type="number" data-testid={testId} value={v ? v.waarde : ''} placeholder="no price"
        onChange={(e) => { const x = e.target.value === '' ? null : Number(e.target.value); set(x === null ? null
          : confirmed(v ?? { waarde: 0, eenheid: '', bron: '', aanname: false, datum: '' }, x)); }} />
      <span className="k-fab-sunit">{v?.eenheid}</span>
      {v?.aanname ? <span className="k-fab-aanname">AANNAME</span> : v ? <span className="k-fab-date">{date(v.datum)}</span> : <span className="k-fab-date">empty</span>}
      {v && isOld(v, months) && <span className="k-fab-old">check price</span>}
      <span className="k-fab-ssrc" title={v?.bron}>{v?.bron}</span>
    </div>
  );
}
const Text = ({ label, value, set, bad, area }: { label: string; value: string; set: (v: string) => void; bad?: boolean; area?: boolean }) => (
  <div className="k-fab-srow"><span className="k-fab-slabel">{label}</span>{area ? <textarea className="k-input k-fab-stext" rows={6} value={value}
    onChange={(e) => set(e.target.value)} /> : <input className={`k-input k-fab-stext ${bad ? 'k-fab-bad' : ''}`} value={value} onChange={(e) => set(e.target.value)} />}</div>
);

export function FabSettingsDialog() {
  const s = useFab((x) => x.settings);
  const result = useFab((x) => x.result);
  const page = useFab((x) => x.settingsPage) as Page;
  const setPage = (p: Page) => useFab.setState({ settingsPage: p });
  // Cancel puts back the settings of when the dialog opened (docs/37 P3)
  const [opened] = useState(() => structuredClone(useFab.getState().settings));
  const cancel = () => { setSettings(opened); useFab.setState({ settingsOpen: false }); };
  const file = useRef<HTMLInputElement>(null);
  const m = s.rates.prijsOuderMaanden;
  const P = (f: (x: FabSettings) => void) => patchSettings(f);
  const company = (k: keyof Company) => (v: string) => P((x) => { (x.company[k] as string) = v; });
  let body: ReactNode = null;
  if (page === 'Company') {
    const missing = companyMissing(s.company);
    body = (
      <>
        <p className="k-fab-warn">To be checked with the accountant before the first real quote goes out. While a mandatory field is empty, every quote carries ONTWERP.</p>
        <Text label="Name" value={s.company.naam} set={company('naam')} />
        <Text label="Legal form" value={s.company.rechtsvorm} set={company('rechtsvorm')} />
        <Text label="Address" value={s.company.adres} set={company('adres')} />
        <Text label="Enterprise number"
          value={s.company.ondernemingsnummer} set={company('ondernemingsnummer')} bad={!!s.company.ondernemingsnummer && !validEnterpriseNumber(s.company.ondernemingsnummer)} />
        <label className="k-check"><input type="checkbox" checked={s.company.btwPlichtig} onChange={(e) => P((x) => { x.company.btwPlichtig = e.target.checked; })} /> Liable to VAT</label>
        <Text label="RPR (company)" value={s.company.rpr} set={company('rpr')} />
        <Text label="IBAN" value={s.company.iban} set={company('iban')} bad={!!s.company.iban && !validIban(s.company.iban)} />
        <Text label="Phone" value={s.company.telefoon} set={company('telefoon')} />
        <Text label="E-mail" value={s.company.email} set={company('email')} />
        <p className="k-fab-muted" data-testid="fab-company-missing">{missing.length ? `Missing: ${missing.join(', ')}`
          : 'Complete.'} Only the form of the numbers is checked; nothing is looked up.</p>
      </>
    );
  } else if (page === 'Rates') {
    body = (
      <>
        <Val label="Hourly rate" v={s.rates.uurloon} set={(v) => v && P((x) => { x.rates.uurloon = v; })} months={m} testId="fab-uurloon" />
        <p className="k-fab-muted">A rate that covers the costs of a self-employed person in Belgium is rather € 55 to 70/h (bibliotheek/balustrades).</p>
        <Val label="Markup" v={s.rates.marge} set={(v) => v && P((x) => { x.rates.marge = v; })} months={m} />
        <Val label="Waste profiles" v={s.rates.afvalProfiel} set={(v) => v && P((x) => { x.rates.afvalProfiel = v; })} months={m} />
        <Val label="Waste plate" v={s.rates.afvalPlaat} set={(v) => v && P((x) => { x.rates.afvalPlaat = v; })} months={m} />
        <div className="k-fab-srow"><span className="k-fab-slabel">Profiles costed</span><select className="k-input" value={s.rates.materiaalModus}
          onChange={(e) => P((x) => { x.rates.materiaalModus = e.target.value as 'verbruikt'; })}><option value="verbruikt">metres used + waste</option><option
            value="aangekocht">whole bars bought</option></select></div>
        <div className="k-fab-srow"><span className="k-fab-slabel">Plates costed</span><select className="k-input" data-testid="fab-plate-mode" value={s.rates.plaatModus}
          onChange={(e) => P((x) => { x.rates.plaatModus = e.target.value as 'rechthoek'; })}><option value="rechthoek">bounding rectangle + waste</option><option
            value="nest">share of the nested sheets</option></select></div>
        <div className="k-fab-srow"><span className="k-fab-slabel">VAT regime</span><select className="k-input" value={s.rates.btwRegime}
          onChange={(e) => P((x) => { x.rates.btwRegime = e.target.value as 'normaal'; })}><option value="normaal">normal</option><option value="verlegd">reverse charge</option><option
            value="vrijgesteld">small business exemption</option></select></div>
        <div className="k-fab-srow"><span className="k-fab-slabel">Check prices after (months)</span><input className="k-input k-fab-snum" type="number" value={m}
          onChange={(e) => P((x) => { x.rates.prijsOuderMaanden = Number(e.target.value) || 6; })} /></div>
      </>
    );
  } else if (page === 'Materials') {
    const used = [...new Set(result?.saw.map((l) => l.profielId) ?? [])];
    const koop = [...new Set(result?.recs.filter((r) => r.soort === 'koop').map((r) => r.bron.part) ?? [])];
    body = (
      <>
        <Val label="Steel bars per kg" v={s.materials.profielKg} set={(v) => v && P((x) => { x.materials.profielKg = v; })} months={m} />
        <h4>Profiles of this model (price per metre)</h4>
        {used.map((id) => <Val key={id}
          label={profileById(id)?.naam ?? id} v={s.materials.profielM[id] ?? null}
            set={(v) => P((x) => { if (v) x.materials.profielM[id] = { ...v, eenheid: '€/m' }; else delete x.materials.profielM[id]; })} months={m} />)}
        <h4>Plate per kg</h4>
        {Object.keys(s.materials.plaatKg).map((k) => <Val key={k}
          label={k} v={s.materials.plaatKg[k]} set={(v) => P((x) => { x.materials.plaatKg[k] = v ? { ...v, eenheid: '€/kg' } : null; })} months={m} />)}
        <h4>Purchased parts (per piece)</h4>
        {koop.length ? koop.map((k) => <Val key={k}
          label={k} v={s.materials.koop[k] ?? null} set={(v) => P((x) => { if (v) x.materials.koop[k] = { ...v, eenheid: '€/st' }; else delete x.materials.koop[k]; })} months={m} />) : <p
            className="k-fab-muted">No purchased parts in this model.</p>}
        <h4>Sheets for nesting (standard sheets and remnant sheets)</h4>
        <table className="k-fab-table" data-testid="fab-sheets"><tbody>
          {s.materials.platen.map((b, i) => <tr key={b.id}><td>{b.b} x {b.l}</td><td>{b.materiaal === '*' ? 'every material' : `${b.materiaal} ${b.t} mm`}</td><td>{b.restplaat ? 'remnant'
            : 'standard'}</td>
            <td><button className="k-btn ghost" onClick={() => P((x) => { x.materials.platen.splice(i, 1); })}>×</button></td></tr>)}
        </tbody></table>
        <RowAdd fields={['width', 'length', 'material (* = any)', 't mm']} onAdd={([b, l, mat, t]) => P((x) => { x.materials.platen.push({ id: `blad-${Date.now()}`, b: Number(b), l: Number(l),
          materiaal: mat || '*', t: Number(t) || 0, voorraad: 0, restplaat: mat !== '*' && !!mat }); })} />
        <h4>Stock and remnants</h4>
        <table className="k-fab-table" data-testid="fab-stock"><tbody>
          {s.materials.voorraad.map((b, i) => <tr key={i}><td>{profileById(b.profielId)?.naam}</td><td>{b.lengte} mm</td><td>{b.aantal}x</td><td>{b.restant ? 'remnant' : 'bar'}</td><td><button
            className="k-btn ghost" onClick={() => P((x) => { x.materials.voorraad.splice(i, 1); })}>×</button></td></tr>)}
        </tbody></table>
        <StockAdd />
      </>
    );
  } else if (page === 'Machines') {
    const M = s.machines;
    body = (
      <>
        <h4>Sawing (own)</h4>
        <Val label="Per piece" v={M.zagen.perStuk} set={(v) => v && P((x) => { x.machines.zagen.perStuk = v; })} months={m} />
        <Val label="Extra per miter" v={M.zagen.perSchuin} set={(v) => v && P((x) => { x.machines.zagen.perSchuin = v; })} months={m} />
        <Val label="Drilling per hole" v={M.boren.perGat} set={(v) => v && P((x) => { x.machines.boren.perGat = v; })} months={m} />
        <h4>Laser cutting ({M.laser.modus === 'uitbesteed' ? 'outsourced' : 'own'})</h4>
        <div className="k-fab-srow"><span className="k-fab-slabel">Laser</span><select className="k-input" value={M.laser.modus}
          onChange={(e) => P((x) => { x.machines.laser.modus = e.target.value as 'eigen'; })}><option value="uitbesteed">outsourced</option><option value="eigen">own machine</option></select></div>
        {M.laser.snijM.map((b, i) => <Val key={b.tot} label={`Per metre up to ${b.tot} mm`} v={b.prijs} set={(v) => v && P((x) => { x.machines.laser.snijM[i].prijs = v; })} months={m} />)}
        <Val label="Per pierce" v={M.laser.insteek} set={(v) => v && P((x) => { x.machines.laser.insteek = v; })} months={m} />
        <Val label="Start cost per order" v={M.laser.startkost} set={(v) => P((x) => { x.machines.laser.startkost = v ? { ...v, eenheid: '€/order' } : null; })} months={m} />
        <Val label="Pierce time (own)" v={M.laser.insteekTijd} set={(v) => P((x) => { x.machines.laser.insteekTijd = v ? { ...v, eenheid: 's/insteek' } : null; })} months={m} />
        <h4>Cutting speeds of the own laser (mm/min)</h4>
        <table className="k-fab-table" data-testid="fab-speeds"><tbody>
          {M.laser.snelheid.map((v, i) => <tr key={i}><td>{v.materiaal}</td><td>{v.t} mm</td><td>{v.mmPerMin} mm/min</td>
            <td><button className="k-btn ghost" onClick={() => P((x) => { x.machines.laser.snelheid.splice(i, 1); })}>×</button></td></tr>)}
        </tbody></table>
        <RowAdd fields={['material', 't mm', 'mm/min']} onAdd={([a, b, c]) => P((x) => { x.machines.laser.snelheid.push({ materiaal: a, t: Number(b), mmPerMin: Number(c) }); })} />
        <Val label="Set-up per position (outsourced)" v={M.plooien.instelUit} set={(v) => P((x) => { x.machines.plooien.instelUit = v ? { ...v, eenheid: '€/positie' } : null; })} months={m} />
        <Val label="Set-up per position (own)" v={M.plooien.instelEigen} set={(v) => v && P((x) => { x.machines.plooien.instelEigen = v; })} months={m} />
        <Val label="Machine rate (own)" v={M.laser.machineUur} set={(v) => P((x) => { x.machines.laser.machineUur = v ? { ...v, eenheid: '€/u' } : null; })} months={m} />
        <h4>Bending ({M.plooien.modus === 'uitbesteed' ? 'outsourced' : 'own'})</h4>
        <div className="k-fab-srow"><span className="k-fab-slabel">Press brake</span><select className="k-input" value={M.plooien.modus}
          onChange={(e) => P((x) => { x.machines.plooien.modus = e.target.value as 'eigen'; })}><option value="uitbesteed">outsourced</option><option value="eigen">own</option></select></div>
        <Val label="Per bend (outsourced)" v={M.plooien.perZettingUit} set={(v) => P((x) => { x.machines.plooien.perZettingUit = v ? { ...v, eenheid: '€/zetting' } : null; })} months={m} />
        <Val label="Per bend (own)" v={M.plooien.perZettingEigen} set={(v) => v && P((x) => { x.machines.plooien.perZettingEigen = v; })} months={m} />
        <h4>Welding</h4>
        <Val label="Tack per joint" v={M.lassen.perVerbinding} set={(v) => v && P((x) => { x.machines.lassen.perVerbinding = v; })} months={m} />
        <Val label="Weld per metre" v={M.lassen.perMeter} set={(v) => v && P((x) => { x.machines.lassen.perMeter = v; })} months={m} />
        <Val label="Finishing per construction" v={M.afwerken.perConstructie} set={(v) => v && P((x) => { x.machines.afwerken.perConstructie = v; })} months={m} />
      </>
    );
  } else if (page === 'Finishing') {
    const F = s.finishing;
    body = (
      <>
        <div className="k-fab-srow"><span className="k-fab-slabel">Finish</span><select className="k-input" value={F.afwerking}
          onChange={(e) => P((x) => { x.finishing.afwerking = e.target.value as 'geen'; })}><option value="geen">none</option><option value="poedercoat">powder coating</option><option
            value="verzinken">hot-dip galvanising</option></select></div>
        <Val label="Powder coating" v={F.poedercoatM2} set={(v) => v && P((x) => { x.finishing.poedercoatM2 = v; })} months={m} />
        <Val label="Galvanising" v={F.verzinkenKg} set={(v) => v && P((x) => { x.finishing.verzinkenKg = v; })} months={m} />
        <Val label="Trip to the coater" v={F.ritLakkerij} set={(v) => v && P((x) => { x.finishing.ritLakkerij = v; })} months={m} />
        <Val label="Transport" v={F.transport} set={(v) => v && P((x) => { x.finishing.transport = v; })} months={m} />
        <Val label="Packing" v={F.verpakking} set={(v) => v && P((x) => { x.finishing.verpakking = v; })} months={m} />
        <Val label="Warranty %" v={F.garantiePct} set={(v) => v && P((x) => { x.finishing.garantiePct = v; })} months={m} />
        <Val label="Insurance %" v={F.verzekeringPct} set={(v) => v && P((x) => { x.finishing.verzekeringPct = v; })} months={m} />
      </>
    );
  } else {
    const Q = s.quote;
    body = (
      <>
        <Text label="Number prefix" value={Q.voorvoegsel} set={(v) => P((x) => { x.quote.voorvoegsel = v; })} />
        <div className="k-fab-srow"><span className="k-fab-slabel">Valid for (days)</span><input className="k-input k-fab-snum" type="number" value={Q.geldigDagen}
          onChange={(e) => P((x) => { x.quote.geldigDagen = Math.max(1, Number(e.target.value) || 30); })} /></div>
        <p className="k-fab-muted">Last number: {Q.teller.jaar ? `${Q.teller.jaar}-${String(Q.teller.laatste).padStart(3, '0')}` : 'none yet'}.</p>
        <Text label="Payment" value={Q.betaling} set={(v) => P((x) => { x.quote.betaling = v; })} />
        <Text label="Lead time" value={Q.levertermijn} set={(v) => P((x) => { x.quote.levertermijn = v; })} />
        <Text label="Terms (sample text)" value={Q.voorwaarden} set={(v) => P((x) => { x.quote.voorwaarden = v; })} area />
        <Text label="Reverse charge note" value={Q.verlegdTekst} set={(v) => P((x) => { x.quote.verlegdTekst = v; })} />
        <Text label="Exemption note" value={Q.vrijgesteldTekst} set={(v) => P((x) => { x.quote.vrijgesteldTekst = v; })} />
      </>
    );
  }
  return (
    <div className="k-fab-dialogback" data-testid="fab-settings">
      <div className="k-fab-dialog">
        <div className="k-fab-dialoghead"><b>Fabrication Settings</b><span className="grow" /><button className="k-btn ghost" data-testid="fab-settings-close"
          onClick={() => useFab.setState({ settingsOpen: false })}>×</button></div>
        <div className="k-fab-dialogbody">
          <div className="k-fab-pages-list">{PAGES.map((p) => <button key={p} className={`k-fab-pagebtn ${p === page ? 'active' : ''}`} data-testid={`fab-settings-${p}`}
            onClick={() => setPage(p)}>{p}</button>)}</div>
          <div className="k-fab-pagebody">{body}</div>
        </div>
        <div className="k-fab-dialogfoot">
          <button className="k-btn" onClick={exportSettingsFile}>Export…</button>
          <button className="k-btn" onClick={() => file.current?.click()}>Import…</button>
          <button className="k-btn" onClick={resetSettings}>Reset</button>
          <input ref={file} type="file" accept=".json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) importSettingsText(await f.text()); e.target.value = ''; }} />
          <span className="grow" />
          <button className="k-btn primary" onClick={() => useFab.setState({ settingsOpen: false })}>OK</button>
          <button className="k-btn" data-testid="fab-settings-cancel" onClick={cancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function StockAdd() {
  const [id, setId] = useState(CATALOG[1].id);
  const [len, setLen] = useState(1840);
  const [rest, setRest] = useState(true);
  return (
    <div className="k-fab-srow" data-testid="fab-stock-add">
      <select className="k-input" value={id} onChange={(e) => setId(e.target.value)}>{CATALOG.map((p) => <option key={p.id} value={p.id}>{p.naam}</option>)}</select>
      <input className="k-input k-fab-snum" type="number" value={len} onChange={(e) => setLen(Number(e.target.value))} />
      <label className="k-check"><input type="checkbox" checked={rest} onChange={(e) => setRest(e.target.checked)} /> remnant</label>
      <button className="k-btn" onClick={() => patchSettings((x) => { x.materials.voorraad.push({ profielId: id, lengte: len, aantal: 1, restant: rest }); })}>Add</button>
    </div>
  );
}

/** a row of small fields with an Add button (speed table, sheet list) */
function RowAdd({ fields, onAdd }: { fields: string[]; onAdd: (v: string[]) => void }) {
  const [v, setV] = useState(fields.map(() => ''));
  return (
    <div className="k-fab-srow">
      {fields.map((f, i) => <input key={f} className="k-input k-fab-snum" placeholder={f} value={v[i]} onChange={(e) => setV(v.map((x, k) => (k === i ? e.target.value : x)))} />)}
      <button className="k-btn" onClick={() => { if (v.every((x, i) => x.trim() || fields[i].includes('*'))) { onAdd(v); setV(fields.map(() => '')); } }}>Add</button>
    </div>
  );
}
