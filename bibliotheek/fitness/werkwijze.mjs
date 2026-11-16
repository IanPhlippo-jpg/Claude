// De werkwijze van een fitnesstoestel: de stappen in de werkplaats met de uren, uitgerekend uit de stuklijst (aantal
// zaagsneden, gaten, laserdelen, laslengte, kussens, katrollen). De standaarduren staan in UREN en zijn instelbaar.
// AANNAME: richtwaarden voor een geoefende lasser met een lintzaag, kolomboor met boormal en MIG/MAG. Node en browser.
import { stuklijst, totalen } from './stuklijst.mjs';

export const UREN = {
  zaag: 0.07, // u per stuk (2 sneden, ontbramen, merken)
  verstek: 0.06, // extra per schuin gezaagd stuk
  gat: 0.025, // u per gat (koker: 2 wanden, met boormal)
  laser: 0.03, // u per laserdeel (ontbramen, sorteren)
  zet: 0.02, // u per zetting (uitbesteed bij de laser: nameten en sorteren; instellen per positie 0,15 u)
  bocht: 0.12, // u per bocht (gebogen buis uitbesteed: aftekenen, nameten in de mal, klemlengte afzagen)
  verbinding: 0.12, // u per lasverbinding (passen, heften, haaksheid; zonder lasmallen, P2-17)
  lasM: 0.35, // u per meter las
  afwerk: 0.35, // u per toestel (slijpen, randen r 2,5, ontvetten)
  coat: 0.3, // u per toestel (maskeren, ophangen, vervoer naar de lakkerij)
  kussen: 0.9, // u per kussen (zagen, lijmen, bekleden, nieten, inslagmoeren)
  kabel: 0.6, // u per kabel (persen, afstellen)
  katrol: 0.15, // u per katrol
  stapel: 0.06, // u per stapelplaat (zijgat, ontbramen)
  montage: 0.4, // u per toestel + bouten
  bout: 0.04,
  controle: 0.3, // u per toestel (proeflast, label, handleiding)
};
export const UREN_NAAM = { zet: 'Per zetting (gezette plaat)', zaag: 'Zagen per stuk', verstek: 'Extra per schuin stuk', gat: 'Boren per gat', laser: 'Laserdeel afwerken', bocht: 'Per bocht (nameten, klem afzagen)', verbinding: 'Per lasverbinding', lasM: 'Per meter las', afwerk: 'Afwerken per toestel', coat: 'Coat voorbereiden', kussen: 'Per kussen', kabel: 'Per kabel', katrol: 'Per katrol', stapel: 'Per stapelplaat', montage: 'Montage per toestel', bout: 'Per bout', controle: 'Controle en label' };

/** de stappen: [{ titel, uren, tekst, proces }] */
export function werkwijze(o, U = UREN, sl = stuklijst(o)) {
  const t = totalen(o, sl), st = [];
  const s = (titel, uren, tekst, proces = '') => { if (uren > 0) st.push({ titel, uren: Math.round(uren * 100) / 100, tekst, proces }); };
  s('Zagen', t.zagen * U.zaag + t.verstek * U.verstek, `${t.zagen} stukken van staven van 6 m volgens het zaagplan${t.verstek ? `, waarvan ${t.verstek} schuin` : ''}; braam eraf, positienummer erop.`, 'lintzaag');
  s('Boren', t.gaten * U.gat, `${t.gaten} gaten volgens de stukbladen${o.delen.some((d) => d.westside) ? '; de Westside-gaten met de boormal (25 mm in de bankzone, 50 mm erbuiten)' : ''}.`, 'kolomboor');
  if (t.bochten) s('Buigen', t.bochten * U.bocht, `${t.bochten} bochten in ${t.buigPos} gebogen buis${t.buigPos > 1 ? 'en' : ''} (buizenbuigerij, R ≥ 3 x buishoogte, volgens de buigtabel op het stukblad); terug in de werkplaats nameten in de mal en de klemlengte afzagen.`, 'uitbesteed (buigen)');
  if (t.zettingen) s('Zetten', t.zettingen * (U.zet ?? 0.02) + t.zetPos * 0.15, `${t.zettingen} zettingen in ${t.zetPos} gezette plaat${t.zetPos > 1 ? 'en' : ''} (uitbesteed met het lasersnijden: uitslag met zetlijnen, K-factor volgens de zetterij); hoek nameten op het eerste stuk.`, 'uitbesteed');
  s('Laserdelen', t.laser * U.laser, `${t.laser} laserdelen (${Math.round(t.kgPlaat)} kg) bestellen volgens de nesting; ontbramen en sorteren.`, 'uitbesteed');
  s('Lassen', t.verbindingen * U.verbinding + t.lasM * U.lasM, `${t.verbindingen} verbindingen, ${t.lasM.toFixed(1).replace('.', ',')} m hoeklas (a${o.V.las}) volgens de lasdetails; eerst heften en haaksheid nameten.`, 'MIG/MAG 135');
  s('Afwerken', U.afwerk + t.verbindingen * 0.01, 'Lassen glad waar het lichaam komt, alle randen braamvrij en r ≥ 2,5 mm, ontvetten.', 'haakse slijper');
  s('Poedercoaten', U.coat, `${t.opp.toFixed(1).replace('.', ',')} m² naar de lakkerij (stralen, poedercoat in de RAL-kleur); gaten en schroefdraad maskeren.`, 'uitbesteed');
  if (t.stapelplaten) s('Gewichtstapel', t.stapelplaten * U.stapel, `${t.stapelplaten} stapelplaten: zijgat Ø11 tot het middengat, nummeren (kg), lineaire lagers in de bovenplaat.`, 'kolomboor');
  if (t.kussens) s('Bekleding', t.kussens * U.kussen, `${t.kussens} kussen${t.kussens > 1 ? 's' : ''}: multiplex zagen, inslagmoeren, schuim lijmen, kunstleer spannen en nieten (zie het bekledingsblad).`, 'werkbank');
  if (t.kabels) s('Kabel en katrollen', t.kabels * U.kabel + t.katrollen * U.katrol, `${t.katrollen} katrollen met vingerbescherming, ${t.kabels} kabel${t.kabels > 1 ? 's' : ''} op lengte persen en afstellen (zie het kabelschema).`, 'perstang');
  s('Montage', U.montage + t.bouten * U.bout, `${t.bouten ? `Samenbouwen met ${t.bouten} bouten (montagebladen), ` : ''}kooponderdelen erop (montagebladen), eindkappen en voetjes.`, '');
  s('Controle', U.controle, 'Proeflast aanbrengen (zie de berekening), stabiliteit nakijken, label met de maximale gebruikersmassa en trainingslast, handleiding.', '');
  return st;
}
