/**
 * The Property Panel of the fabrication tabs (docs/36 3.2, 4.2, 6.2): green check and red cross on top, collapsible
 * sections, one panel per command: Recognize Members/Plates, Bar Nesting, Export DXF, Nest, Bend Sequence, Weld Joints
 * (with the execution class), Cost (the Task Pane block), Customer and Quote.
 */
import { useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Section } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { useStore } from '../store';
import { FabIcon } from './fabIcons';
import { bendInfo, cancelCommand, closeCommand, draftQuote, exportDxf, exportQuote, isStale, patchFab, patchSettings, quotesOutOfDate, recompute, reviseQuote, runNest, useFab } from './fabStore';
import { CATALOG, profileById } from '../../fab/catalog';
import { euro, mm, num } from '../../fab/format';
import { perPiece } from '../../fab/cost';
import { plateChecks } from '../../fab/checks';
import { excDefaults, EXC_CHOICES, reorderWelds } from '../../fab/weld';
import { weldSymbolSvg } from '../../fab/weldSymbol';
import { weldPlanInput } from '../../fab/analyze';
import { lineTotal, salePerPiece, setRate, vatProblems, vatTotals } from '../../fab/quote';
import type { Customer, ExecutionClass, FabKind } from '../../fab/types';
import { defaultNestSettings } from '../../fab/nest';

const TITLES: Record<string, string> = { recognize: 'Recognize', barNest: 'Bar Nesting', exportDxf: 'Export DXF', nest: 'Nest',
  bendSeq: 'Bend Sequence', welds: 'Weld Joints', addLine: 'Add Line', cost: 'Cost', customer: 'Customer', quote: 'Quote' };
const Row = ({ label, children }: { label: string; children: ReactNode }) => <div className="k-pm-valuerow k-fab-row"><span className="k-fab-label">{label}</span>{children}</div>;
const Num = ({ v, on, step = 1, testId }: { v: number; on: (x: number) => void; step?: number; testId?: string }) => (
  <input className="k-input" type="number" step={step} value={v} data-testid={testId} onChange={(e) => { const x = Number(e.target.value); if (Number.isFinite(x)) on(x); }} />
);

const ICONS: Record<string, () => ReactNode> = {
  recognize: () => <FabIcon.Recognize />, barNest: () => <FabIcon.BarNest />, exportDxf: () => <FabIcon.Dxf />, nest: () => <FabIcon.Nest />, bendSeq: () => <FabIcon.BendSeq />,
  welds: () => <FabIcon.WeldJoint />, cost: () => <FabIcon.Cost />, customer: () => <FabIcon.Customer />, quote: () => <FabIcon.Quote />, addLine: () => <FabIcon.AddLine />,
};

export function FabPM() {
  const st = useFab(useShallow((s) => ({ command: s.command, result: s.result, stale: isStale(s), busy: s.busy })));
  const kind = useStore((s) => s.doc.kind);
  const cmd = st.command ?? 'cost';
  const r = st.result;
  return (
    <div className="k-pm k-fab-pm" data-testid="fab-pm">
      <div className="k-pm-head">
        <div className="k-pm-title">{(ICONS[cmd] ?? ICONS.cost)()} <b>{TITLES[cmd] ?? 'Fabrication'}</b><span className="grow" /><span className="k-pm-help" title="Help">?</span></div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" data-testid="fab-ok" onClick={closeCommand}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel (Esc): undo the changes of this command" data-testid="fab-cancel" onClick={cancelCommand}><Icon.Close /></button>
        </div>
      </div>
      {st.stale && <p className="k-pm-message k-fab-stale" data-testid="fab-stale">The model or the settings changed: the results are out of date and cannot be exported.
        <button className="k-btn" onClick={recompute}>Recalculate</button></p>}
      {!r && <p className="k-pm-message">Choose a command on the tab to analyse the {kind === 'assembly' ? 'assembly' : 'part'}.</p>}
      {r && cmd === 'recognize' && <RecognizePanel />}
      {r && cmd === 'barNest' && <BarNestPanel />}
      {r && cmd === 'exportDxf' && <DxfPanel />}
      {r && cmd === 'nest' && <NestPanel />}
      {r && cmd === 'bendSeq' && <BendPanel />}
      {r && cmd === 'welds' && <WeldPanel />}
      {r && cmd === 'cost' && <CostPanel />}
      {r && cmd === 'customer' && <CustomerPanel />}
      {r && cmd === 'quote' && <QuotePanel />}
      {r && cmd === 'addLine' && <AddLinePanel />}
    </div>
  );
}

/** Add Line: a free line of the quote (placing, transport, a discount as a negative amount), and the lines added so far */
function AddLinePanel() {
  const vrij = useStore((s) => s.doc.fab?.vrij) ?? [];
  const [text, setText] = useState('Plaatsing ter plaatse');
  const [bedrag, setBedrag] = useState('250');
  const add = () => {
    const cent = Math.round(Number(bedrag.replace(',', '.')) * 100);
    if (!text.trim() || !Number.isFinite(cent) || cent === 0) return;
    patchFab('Add Line', (f) => ({ ...f, vrij: [...(f.vrij ?? []), { omschrijving: text.trim(), bedragCent: cent }] }));
    recompute();
  };
  return (
    <>
      <Section title="New line">
        <Row label="Description"><input className="k-input" data-testid="fab-line-text" value={text} onChange={(e) => setText(e.target.value)} /></Row>
        <Row label="Amount € excl. VAT"><input className="k-input" data-testid="fab-line-amount" value={bedrag} onChange={(e) => setBedrag(e.target.value)} /></Row>
        <button className="k-btn" data-testid="fab-line-add" onClick={add}>Add</button>
        <p className="k-pm-message">A negative amount is a discount. The amount goes on the quote as typed, without markup.</p>
      </Section>
      <Section title={`Free lines (${vrij.length})`}>
        {vrij.map((v, i) => (
          <div key={i} className="k-fab-item">
            <span className="k-fab-name">{v.omschrijving}</span><span className="k-fab-what">{euro(v.bedragCent)}</span>
            <button className="k-btn ghost" onClick={() => { patchFab('Remove Line', (f) => ({ ...f, vrij: (f.vrij ?? []).filter((_, k) => k !== i) })); recompute(); }}>×</button>
          </div>
        ))}
      </Section>
    </>
  );
}

const NO_OVERRIDES = {} as Record<string, { soort: FabKind; profielId?: string }>;
const KIND_ICON: Record<FabKind, string> = { profiel: '▭', plaat: '▬', 'gezette plaat': '⌐', koop: '🛒', onbekend: '?' };
function RecognizePanel() {
  const r = useFab((s) => s.result)!;
  const overrides = useStore((s) => s.doc.fab?.overrides) ?? NO_OVERRIDES;
  const count = (k: FabKind) => r.recs.filter((x) => x.soort === k).length;
  const setOverride = (key: string, v: string) => patchFab('Recognize: override', (f) => {
    const o = { ...(f.overrides ?? {}) };
    if (v === '') delete o[key];
    else if (v.startsWith('profiel:')) o[key] = { soort: 'profiel', profielId: v.slice(8) };
    else o[key] = { soort: v as FabKind };
    return { ...f, overrides: o };
  });
  return (
    <>
      <Section title="Result">
        <p className="k-pm-message" data-testid="fab-recognize-sum">
          {r.recs.length} bodies: {count('profiel')} profiles, {count('plaat') + count('gezette plaat')} plates, {count('koop')} purchased, {count('onbekend')} unknown.</p>
      </Section>
      <Section title="Bodies">
        <div className="k-fab-list" data-testid="fab-recognize-list">
          {r.recs.map((x) => (
            <div key={x.key} className={`k-fab-item ${x.soort}`} title={x.reden}>
              <span className="k-fab-kind">{KIND_ICON[x.soort]}</span>
              <span className="k-fab-name">{x.aantal > 1 ? `${x.aantal} x ` : ''}{x.naam}</span>
              <span className="k-fab-what">{x.soort === 'profiel' ? `${profileById(x.profielId)?.naam ?? ''} ${mm(x.lengte ?? 0)}` : x.t ? `${num(x.t, x.t % 1 ? 1 : 0)} mm` : x.soort}</span>
              <select className="k-fab-select" value={overrides[x.key] ? (overrides[x.key].soort === 'profiel' ? `profiel:${overrides[x.key].profielId}` : overrides[x.key].soort) : ''}
                onChange={(e) => setOverride(x.key, e.target.value)}>
                <option value="">{x.herkomst === 'handmatig' ? 'manual' : x.herkomst === 'feature' ? 'from feature' : 'recognized'}</option>
                <option value="plaat">plate</option><option value="koop">purchased</option><option value="onbekend">unknown</option>
                {(x.kandidaten?.length ? x.kandidaten.map(profileById).filter(Boolean) : CATALOG.filter((p) => p.vorm === (profileById(x.profielId)?.vorm ?? 'koker'))).map((p) => <option
                  key={p!.id} value={`profiel:${p!.id}`}>{p!.naam}</option>)}
              </select>
              <div className="k-fab-reason">{x.reden}{x.warning ? ` · ${x.warning}` : ''}{x.kandidaten && x.kandidaten.length > 1 ? ` · ${x.kandidaten.length} candidates: choose` : ''}</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function BarNestPanel() {
  const r = useFab((s) => s.result)!;
  const s = useFab((x) => x.settings);
  const z = s.machines.zagen;
  return (
    <>
      <Section title="Stock">
        <Row label="Bar length"><Num v={s.materials.staafLengte} on={(v) => { patchSettings((x) => { x.materials.staafLengte = v; }); recompute(); }} /></Row>
        <p className="k-pm-message">Remnants in stock are used first ({s.materials.voorraad.filter((b) => b.restant).length} in the Stock Library).</p>
      </Section>
      <Section title="Saw">
        <Row label="Saw cut"><Num v={z.zaagsnede} on={(v) => { patchSettings((x) => { x.machines.zagen.zaagsnede = v; }); recompute(); }} testId="fab-kerf" /></Row>
        <Row label="Trim at start"><Num v={z.afkorten} on={(v) => { patchSettings((x) => { x.machines.zagen.afkorten = v; }); recompute(); }} /></Row>
        <Row label="Clamp length"><Num v={z.klem} on={(v) => { patchSettings((x) => { x.machines.zagen.klem = v; }); recompute(); }} /></Row>
      </Section>
      <Section title="Result">
        {r.plans.map((p) => (
          <div key={p.profielId} className="k-fab-facts" data-testid="fab-barplan">
            <b>{profileById(p.profielId)?.naam}</b>: {p.staven.length} bar{p.staven.length === 1 ? '' : 's'} ({p.teBestellen} to order), use {num(p.benutting * 100, 0)} %, lower bound {p.ondergrens}
            {p.fouten.map((f) => <div key={f.pos} className="k-fab-error">Pos {f.pos}: {f.tekst}</div>)}
          </div>
        ))}
        {!r.plans.length && <p className="k-pm-message">No profiles in this model.</p>}
      </Section>
    </>
  );
}

function DxfPanel() {
  const r = useFab((s) => s.result)!;
  const dxf = useFab((s) => s.dxf);
  const set = (p: Partial<typeof dxf>) => useFab.setState({ dxf: { ...dxf, ...p } });
  const box = (label: string, k: 'geometry' | 'bendLines' | 'bbox' | 'partText') => <label className="k-check"><input type="checkbox" checked={dxf[k]}
    onChange={(e) => set({ [k]: e.target.checked })} /> {label}</label>;
  return (
    <>
      <Section title="Entities to Export">{box('Geometry', 'geometry')}{box('Bend lines', 'bendLines')}{box('Bounding box', 'bbox')}{box('Part number text', 'partText')}</Section>
      <Section title="Layers" defaultOpen={false}>
        {(Object.keys(dxf.layers) as (keyof typeof dxf.layers)[]).map((k) => <Row key={k} label={k}><input className="k-input" value={dxf.layers[k]}
          onChange={(e) => set({ layers: { ...dxf.layers, [k]: e.target.value } })} /></Row>)}
      </Section>
      <Section title="Options">
        <Row label="Version"><select className="k-input" value="R12" disabled><option>R12</option></select></Row>
        <Row label="Arcs"><select className="k-input" value={dxf.arcs} onChange={(e) => set({ arcs: e.target.value as 'boog' | 'polylijn' })}><option value="boog">as arcs</option><option
          value="polylijn">as short lines</option></select></Row>
        <p className="k-pm-message">The kerf is not taken into account: the cutter's machine does that. Status: still to be opened by the laser cutter.</p>
      </Section>
      <Section title="Plates">
        {r.flats.map((f, i) => {
          const checks = plateChecks(f);
          return (
            <div key={f.key} className="k-fab-item" data-testid="fab-plate">
              <span className="k-fab-name">P{i + 1} {f.naam} ({f.n}x)</span>
              <span className="k-fab-what">{f.materiaal} {num(f.t, f.t % 1 ? 1 : 0)} mm</span>
              <button className="k-btn" disabled={f.betrouwbaar === 'geen' || checks.some((c) => c.blokkeert)} onClick={() => void exportDxf(i)}>DXF</button>
              <div className={f.betrouwbaar === 'geen' ? 'k-fab-error' : 'k-fab-reason'}>{f.betrouwbaar === 'geen' ? `No DXF: ${f.fout}` : checks.map((c) => c.tekst).join(' · ')
                || 'checks passed'}</div>
            </div>
          );
        })}
        <button className="k-btn" data-testid="fab-dxf-all" onClick={() => void exportDxf('all')}>All plates as ZIP</button>
      </Section>
    </>
  );
}

function NestPanel() {
  const st = useFab(useShallow((s) => ({ nests: s.nests, ns: s.nestSettings })));
  const ns = st.ns ?? defaultNestSettings(3);
  const set = (p: Partial<typeof ns>) => useFab.setState({ nestSettings: { ...ns, ...p } });
  const sheets = useFab((s) => s.settings.materials.platen);
  return (
    <>
      <Section title="Sheet">
        <Row label="Size"><select className="k-input" data-testid="fab-nest-sheet" value={`${ns.vlakken[0].l}x${ns.vlakken[0].b}`}
          onChange={(e) => { const [l, b] = e.target.value.split('x').map(Number); set({ vlakken: [{ id: e.target.value, l, b }] }); }}>
          {sheets.map((p) => <option key={p.id} value={`${p.l}x${p.b}`}>{p.b} x {p.l}{p.restplaat ? ' (remnant)' : ''}</option>)}
        </select></Row>
      </Section>
      <Section title="Spacing">
        <Row label="Between parts"><Num v={ns.afstand} on={(v) => set({ afstand: v })} /></Row>
        <Row label="Sheet border"><Num v={ns.rand} on={(v) => set({ rand: v })} /></Row>
      </Section>
      <Section title="Rotation"><label className="k-check"><input type="checkbox" checked={ns.draaien} onChange={(e) => set({ draaien: e.target.checked })} /> Allow 90°</label></Section>
      <Section title="Result">
        <button className="k-btn" onClick={runNest}>Nest again</button>
        {st.nests.map((n) => (
          <div key={`${n.materiaal}${n.t}`} className="k-fab-facts" data-testid="fab-nest-result">
            <b>{n.materiaal} {num(n.t, n.t % 1 ? 1 : 0)} mm</b>: {n.bladen.length} sheet{n.bladen.length === 1 ? ''
              : 's'} (lower bound {n.ondergrens}), {n.bladen.map((b) => `${num(b.benutting * 100, 0)} %`).join(', ')} · rectangles
            {n.fouten.map((f, i) => <div key={i} className="k-fab-error">{f.tekst}</div>)}
          </div>
        ))}
      </Section>
    </>
  );
}

function BendPanel() {
  const r = useFab((s) => s.result)!;
  const idx = useFab((s) => s.bendIndex);
  const bent = r.flats.map((f, i) => ({ f, i })).filter((x) => x.f.plooien.length);
  const cur = bent.find((x) => x.i === idx) ?? bent[0];
  const info = cur ? bendInfo(r, cur.i) : null;
  if (!bent.length) return <p className="k-pm-message">No bent plate in this model.</p>;
  return (
    <>
      <Section title="Part">
        <select className="k-input" value={cur?.i} onChange={(e) => useFab.setState({ bendIndex: Number(e.target.value) })}>{bent.map((x) => <option key={x.i}
          value={x.i}>P{x.i + 1} {x.f.naam}</option>)}</select>
      </Section>
      {info ? (
        <>
          <Section title="Sequence">
            {info.seq.steps.map((s) => { const b = info.bends.find((x) => x.id === s.plooi)!; return <div key={s.stap} className="k-fab-item" data-testid="fab-bend-step"><span
              className="k-fab-name">{s.stap}. bend {s.plooi}</span><span
                className="k-fab-what">{b.richting === 'op' ? 'up' : 'down'} {num(b.hoek, 0)}° · V{num(s.vOpening, 0)} · stop {num(s.aanslag, 1)} · {num(s.perskracht, 1)} kN{s.omkeren
                  ? ' · turn over' : ''}</span></div>; })}
            {!info.seq.gecontroleerd && <p className="k-pm-message">Sequence not checked for collisions (not all bend lines parallel).</p>}
            {info.seq.botsing.length > 0 && <p className="k-fab-error">Collision in step {info.seq.botsing.join(', ')}.</p>}
          </Section>
          <Section title="Bend Check">{info.checks.length ? info.checks.map((c, i) => <div key={i} className="k-fab-error">{c}</div>) : <p className="k-pm-message">No findings.</p>}</Section>
        </>
      ) : <p className="k-pm-message">This plate does not come from a base flange chain: the sequence is not proposed.</p>}
    </>
  );
}

function WeldPanel() {
  const r = useFab((s) => s.result)!;
  const focus = useFab((s) => s.weldFocus);
  const exc = useStore((s) => s.doc.fab?.exc ?? 'geen') as ExecutionClass;
  const kept = useStore((s) => s.doc.fab?.welds);
  const pos = weldPlanInput(r).naam, names = { get: (k: string) => pos(k) };
  const d = excDefaults(exc);
  const ordered = [...r.joints].filter((j) => j.status !== 'vervallen').sort((a, b) => a.stap - b.stap);
  // L3.5: moving a step renumbers the finishing steps (2 …) and keeps the order as Ian's (a new proposal never overwrites it)
  const move = (id: string, dir: -1 | 1) => moveTo(id, ordered.findIndex((j) => j.id === id) + dir);
  // dragging a step onto another puts it in that place (L3.5), as dragging in the tree of SOLIDWORKS
  const moveTo = (id: string, to: number) => {
    const welds = reorderWelds(r.joints, ordered.map((j) => j.id), id, to);
    if (!welds) return;
    patchFab('Weld Sequence', (f) => ({ ...f, lasvolgordeHandmatig: true, welds }));
    recompute();
  };
  const [drag, setDrag] = useState<string | null>(null);
  return (
    <>
      <Section title="Execution Class" defaultOpen={focus !== 'seq'}>
        <select className="k-input" data-testid="fab-exc" value={exc} onChange={(e) => { patchFab('Execution Class', (f) => ({ ...f, exc: e.target.value as ExecutionClass })); recompute(); }}>
          {EXC_CHOICES.map((c) => <option key={c} value={c}>{c === 'geen' ? 'None' : c}</option>)}
        </select>
        <p className="k-pm-message">Quality level {d.niveau} (ISO 5817){exc !== 'geen' ? `, EN ISO 3834 ${d.iso3834}` : ''}.</p>
        {d.waarschuwing && <p className="k-fab-error" data-testid="fab-exc-warning">{d.waarschuwing}</p>}
      </Section>
      <Section title={`Weld Joints (${r.joints.length})`} defaultOpen={focus === 'joints'}>
        {r.joints.some((j) => j.kort) && <p className="k-pm-message" data-testid="fab-short-welds">{r.joints.filter((j) => j.kort).length} short welds (under 30 mm or 6a): not load-bearing
          (EN 1993-1-8, 4.5.1), counted only when ticked.</p>}
        {r.joints.map((j) => (
          <div key={j.id} className={`k-fab-item ${j.status === 'vervallen' ? 'onbekend' : ''}`} data-testid="fab-weld">
            <span className="k-fab-symbol" dangerouslySetInnerHTML={{ __html: weldSymbolSvg(j) }} />
            <span className="k-fab-name">{j.id} {j.maat.letter}{num(j.maat.mm, j.maat.mm % 1 ? 1 : 0)} x {mm(j.lengte)}</span>
            <span className="k-fab-what">{names.get(j.bodies[0])} / {names.get(j.bodies[1])}{j.bevestigd ? '' : ' · proposal'}{j.status ? ` · ${j.status}` : ''}</span>
            {j.kort && <label className="k-fab-what" title="korte las, niet dragend (EN 1993-1-8, 4.5.1)"><input type="checkbox" data-testid="fab-short-weld" checked={!!j.meetellen}
              onChange={(e) => {
                const on = e.target.checked;
                patchFab('Short Weld', (f) => ({ ...f, welds: r.joints.map((x) => ({ ...x, bevestigd: true, ...(x.id === j.id ? { meetellen: on } : {}) })) }));
                recompute(); }} /> short weld, count</label>}
          </div>
        ))}
        <button className="k-btn"
          onClick={() => patchFab('Confirm Weld Joints', (f) => ({ ...f, welds: r.joints.filter((j) => j.status !== 'vervallen').map((j) => ({ ...j, bevestigd: true, status: undefined })) }))}>
          Confirm all</button>
      </Section>
      <Section title="Weld Sequence" defaultOpen={focus === 'seq'}>
        <div className="k-fab-item"><span className="k-fab-name">1. tack all joints</span></div>
        {ordered.map((j, i) => (
          <div key={j.id} className={`k-fab-item k-fab-drag ${drag === j.id ? 'dragging' : ''}`} data-testid="fab-weld-step" draggable
            onDragStart={(e) => { setDrag(j.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', j.id); }}
            onDragOver={(e) => { if (drag) e.preventDefault(); }} onDragEnd={() => setDrag(null)}
            onDrop={(e) => { e.preventDefault(); const id = drag ?? e.dataTransfer.getData('text/plain'); setDrag(null); if (id && id !== j.id) moveTo(id, i); }}>
            <span className="k-fab-name">{j.stap}. {j.id}</span><span className="k-fab-what">{names.get(j.bodies[0])} / {names.get(j.bodies[1])}</span>
            <button className="k-btn ghost" data-testid="fab-weld-up" disabled={i === 0} onClick={() => move(j.id, -1)}>▲</button>
            <button className="k-btn ghost" disabled={i === ordered.length - 1} onClick={() => move(j.id, 1)}>▼</button>
          </div>
        ))}
        <p className="k-pm-message">{kept?.length ? 'The order is kept in the model.'
          : 'A proposal by rules of thumb (tack first, middle outwards, alternate sides), not a calculation of distortion.'}</p>
      </Section>
    </>
  );
}

function CostPanel() {
  const st = useFab(useShallow((s) => ({ r: s.result!, s: s.settings, prev: s.vorigeCent })));
  const reeks = useStore((s) => s.doc.fab?.reeks ?? 1);
  const m = st.r.cost;
  const marge = st.r.settings.rates.marge.waarde;
  const regime = st.r.settings.rates.btwRegime;
  // the same numbers as the quote: the sale price per piece of the series, rounded once (docs/37 B-5, P3 money)
  const grouping = useFab((s) => s.grouping);
  const sale = salePerPiece(m, marge, reeks, grouping);
  const diff = st.prev === null ? 0 : m.totaalCent - st.prev;
  return (
    <>
      <Section title="Estimated Cost per Part">
        <table className="k-fab-summary" data-testid="fab-cost-summary"><tbody>
          {[1, 5, 20].map((q) => <tr key={q}><td>Cost per piece ({q})</td><td>{euro(Math.round(perPiece(m, q)))}</td></tr>)}
          <tr><td>Sale excl. VAT per piece ({reeks})</td><td data-testid="fab-sale-piece">{euro(sale)}</td></tr>
          <tr><td>Sale excl. VAT for {reeks}</td><td data-testid="fab-sale-series">{euro(sale * reeks)}</td></tr>
          {regime === 'normaal' ? <tr><td>Sale incl. 21 % VAT for {reeks}</td><td>{euro(Math.round(sale * reeks * 1.21))}</td></tr>
            : <tr><td>{regime === 'verlegd' ? 'VAT reverse charged' : 'No VAT (exemption)'}</td><td>{euro(sale * reeks)}</td></tr>}
          {st.prev !== null && diff !== 0 && <tr><td>Since the last calculation</td><td className={diff > 0 ? 'k-fab-up' : 'k-fab-down'}>{diff > 0 ? '▲' : '▼'} {euro(Math.abs(diff))}</td></tr>}
        </tbody></table>
        <p className="k-pm-message" data-testid="fab-aannames">{m.aannames} of {m.regels.length} lines rest on assumptions{m.onvolledig ? `; ${m.geenPrijs} without a price: incomplete` : ''}.</p>
      </Section>
      <Section title="Quote">
        <Row label="Quantity"><Num v={reeks} on={(v) => patchFab('Quantity', (f) => ({ ...f, reeks: Math.max(1, Math.round(v)) }))} testId="fab-reeks" /></Row>
        <Row label="Markup %">
          <Num v={st.s.rates.marge.waarde} on={(v) => patchSettings((x) => { x.rates.marge = { ...x.rates.marge, waarde: v, aanname: false, bron: 'ingevuld door de gebruiker' }; })} />
        </Row>
        <Row label="VAT regime">
          <select className="k-input" value={st.s.rates.btwRegime} onChange={(e) => patchSettings((x) => { x.rates.btwRegime = e.target.value as typeof x.rates.btwRegime; })}>
            <option value="normaal">normal</option><option value="verlegd">reverse charge</option><option value="vrijgesteld">small business exemption</option>
          </select>
        </Row>
      </Section>
    </>
  );
}

function CustomerPanel() {
  const klant = useStore((s) => s.doc.fab?.klant) ?? { naam: '', adres: '', soort: 'particulier' as const };
  const [c, setC] = useState<Customer>(klant);
  const save = (n: Customer) => { setC(n); patchFab('Customer', (f) => ({ ...f, klant: n })); };
  const six = c.zesProcent ?? { woningOuderDan10: false, prive: false, geplaatstEindgebruiker: false };
  return (
    <>
      <Section title="Customer">
        <Row label="Name"><input className="k-input" data-testid="fab-klant-naam" value={c.naam} onChange={(e) => save({ ...c, naam: e.target.value })} /></Row>
        <Row label="Address"><textarea className="k-input" rows={2} value={c.adres} onChange={(e) => save({ ...c, adres: e.target.value })} /></Row>
        <Row label="Type"><select className="k-input" value={c.soort} onChange={(e) => save({ ...c, soort: e.target.value as Customer['soort'] })}><option value="particulier">private</option>
          <option value="bedrijf">company</option></select></Row>
        {c.soort === 'bedrijf' && <Row label="VAT number"><input className="k-input" value={c.btwNummer ?? ''} onChange={(e) => save({ ...c, btwNummer: e.target.value })} /></Row>}
        <Row label="Site address"><textarea className="k-input" rows={2} value={c.werfadres ?? ''} onChange={(e) => save({ ...c, werfadres: e.target.value })} /></Row>
      </Section>
      <Section title="6 % VAT conditions">
        {([['woningOuderDan10', 'House at least 10 years in use'], ['prive', 'Private dwelling'], ['geplaatstEindgebruiker', 'Placed and invoiced to the end user']] as const).map(([k, t]) => (
          <label key={k} className="k-check"><input type="checkbox" checked={six[k]} onChange={(e) => save({ ...c, zesProcent: { ...six, [k]: e.target.checked } })} /> {t}</label>
        ))}
        <p className="k-pm-message">The program never decides the rate. Check with the accountant before the first real quote.</p>
      </Section>
    </>
  );
}

function QuotePanel() {
  const grouping = useFab((s) => s.grouping);
  const regelBtw = useStore((s) => s.doc.fab?.regelBtw);
  const q = draftQuote();
  if (!q) return null;
  const t = vatTotals(q.regels, q.btwRegime);
  const out = quotesOutOfDate(useFab.getState().result, useStore.getState().doc);
  const frozen = [...new Map((useStore.getState().doc.fab?.quotes ?? []).map((x) => [x.nummer, x])).values()];
  // the rate per line: 6 % only with the three conditions of the customer (setRate refuses otherwise, docs/37 B-13)
  const setLine = (omschrijving: string, p: { btw?: 21 | 6 | 0; plaatsing?: boolean }) => {
    if (p.btw !== undefined) {
      const i = q.regels.findIndex((l) => l.omschrijving === omschrijving);
      const r = setRate(q, i, p.btw);
      if ('fout' in r) { useStore.getState().pushMessage(r.fout, 'warn'); return; }
    }
    patchFab('Quote line', (f) => ({ ...f, regelBtw: { ...(f.regelBtw ?? {}), [omschrijving]: { ...(f.regelBtw?.[omschrijving] ?? {}), ...p } } }));
  };
  return (
    <>
      <Section title="Quote">
        <Row label="Lines">
          <select className="k-input" data-testid="fab-grouping" value={grouping} onChange={(e) => useFab.setState({ grouping: e.target.value as typeof grouping })}>
            <option value="een">one line</option><option value="categorie">per group</option><option value="detail">in detail</option>
          </select>
        </Row>
        <table className="k-fab-summary" data-testid="fab-quote-lines"><tbody>
          {q.regels.map((l, i) => (
            <tr key={i}>
              <td>{l.omschrijving}{l.hoeveelheid !== 1 ? ` (${l.hoeveelheid} x ${euro(l.prijsCent)})` : ''}</td>
              <td>
                {q.btwRegime === 'normaal' && (
                  <select className="k-fab-select" data-testid="fab-line-vat" value={l.btw} onChange={(e) => setLine(l.omschrijving, { btw: Number(e.target.value) as 21 | 6 | 0 })}>
                    <option value={21}>21 %</option><option value={6}>6 %</option>
                  </select>
                )}
                <label className="k-check" title="Placing on site (needed for 6 %)">
                  <input type="checkbox" checked={!!regelBtw?.[l.omschrijving]?.plaatsing} onChange={(e) => setLine(l.omschrijving, { plaatsing: e.target.checked })} /> placing
                </label>
              </td>
              <td>{euro(lineTotal(l))}</td>
            </tr>
          ))}
          <tr><td><b>Total excl. VAT</b></td><td /><td data-testid="fab-quote-excl"><b>{euro(t.exclCent)}</b></td></tr>
          <tr><td><b>Total incl. VAT</b></td><td /><td><b>{euro(t.inclCent)}</b></td></tr>
        </tbody></table>
        {vatProblems(q).map((p, i) => <p key={i} className="k-fab-error">{p.tekst}</p>)}
      </Section>
      <Section title="Export">
        <button className="k-btn" data-testid="fab-quote-pdf" onClick={() => exportQuote('pdf')}>Quote PDF</button> <button className="k-btn" onClick={() => exportQuote('xlsx')}>XLSX</button>
        <p className="k-pm-message">The number is taken when the file is written; the PDF and the XLSX of one quote share it. Nothing is sent.</p>
      </Section>
      <Section title={`Quotes (${frozen.length})`}>
        {out.map((x) => <p key={x.nummer} className="k-fab-error" data-testid="fab-quote-outdated">model gewijzigd sinds offerte {x.nummer}</p>)}
        {frozen.map((x) => (
          <div key={x.nummer} className="k-fab-item" data-testid="fab-quote-frozen">
            <span className="k-fab-name">{x.nummer} rev. {x.revisie}</span>
            <span className="k-fab-what">{x.bevroren?.op} · {euro(vatTotals(x.regels, x.btwRegime).inclCent)}</span>
            <button className="k-btn" data-testid="fab-quote-revise" onClick={() => reviseQuote(x.nummer)}>New revision</button>
          </div>
        ))}
      </Section>
    </>
  );
}
