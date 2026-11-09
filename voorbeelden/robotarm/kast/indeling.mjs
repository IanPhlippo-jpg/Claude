// Indeling van de schakelkast van de robotcel: één bron voor het 3D-model (maak-kast.mjs), de opstellingstekening van de
// montageplaat (schema, blad &ELU) en de stuklijst. Kast: Rittal VX25 8206.000 (B x H x D 1200 x 2000 x 600, 2 deuren,
// montageplaat 1099 x 1896; bron: Rittal-datasheet VX25). Aanduidingen volgens ISO/IEC 81346-2, plaats +KAST (=ROB).
// Maten van de toestellen: uit de datasheets waar bekend; `indicatief: true` = na te meten bij levering (de plaats op
// de montageplaat houdt 10 mm marge).
// Coördinaten op de montageplaat: x van links naar rechts, y van boven naar beneden (zoals de tekening), mm; d = diepte.

export const KAST = {
  type: 'Rittal VX25 8206.000', b: 1200, h: 2000, d: 600, sokkel: 100, plaat: { b: 1099, h: 1896, dikte: 3 },
  kleur: 'RAL 7035 lichtgrijs',
};
// goten (Rittal/Hager 60 x 80, grijs) en DIN-rails (35 x 7,5)
export const GOTEN = [
  { x: 20, y: 40, b: 1059, h: 60 },   // boven
  { x: 20, y: 380, b: 1059, h: 60 },  // onder de beveiligingen
  { x: 20, y: 880, b: 1059, h: 60 },  // onder de servoversterkers
  { x: 20, y: 1240, b: 1059, h: 60 }, // onder 24 V en besturing
  { x: 20, y: 1560, b: 1059, h: 60 }, // boven de klemmen
  { x: 20, y: 1800, b: 1059, h: 60 }, // onder de klemmen
  { x: 20, y: 100, b: 60, h: 1700 },  // links verticaal
  { x: 1019, y: 100, b: 60, h: 1700 }, // rechts verticaal
];
export const RAILS = [{ y: 240 }, { y: 1090 }, { y: 1400 }, { y: 1700 }].map((r) => ({ x: 90, b: 919, ...r }));

const T = (code, naam, type, x, y, b, h, d, extra = {}) => ({ code, naam, type, x, y, b, h, d, ...extra });
// rij 1 (y 140..340): voeding 400 V
export const TOESTELLEN = [
  T('-Q1', 'Hoofdschakelaar 40 A, 3-polig, afsluitbaar (bediening door de deur)', 'ABB OT40FT3 + OHB65J6 + OXP6X290', 100, 150, 70, 120, 100, { kleur: '#3b3d40', indicatief: true }),
  T('-F1', 'Overspanningsbeveiliging type 2, 3+N', 'Phoenix VAL-MS 230/3+1', 185, 195, 72, 90, 70, { kleur: '#e9e9e4', indicatief: true }),
  T('-R1', 'Netfilter (EMC) 3 x 400 V, 36 A', 'Schaffner FN3258-35-33', 275, 110, 95, 260, 120, { kleur: '#9aa0a6', indicatief: true }),
  T('-Q2', 'Netmagneetschakelaar 18,5 kW (stopcategorie 1, via -K2)', 'Siemens 3RT2026-1BB40 (24 V DC)', 390, 190, 45, 102, 97, { kleur: '#4a5a6a', indicatief: true }),
  ...[1, 2, 3].map((i) => T(`-F1${i}`, `Installatieautomaat servoversterker A${i}`, 'ABB S203-C16 (3P, C16)', 450 + (i - 1) * 60, 195, 54, 90, 70, { kleur: '#f2f2ee' })),
  ...[4, 5, 6].map((i) => T(`-F1${i}`, `Installatieautomaat servoversterker A${i}`, 'ABB S203-C10 (3P, C10)', 450 + (i - 1) * 60, 195, 54, 90, 70, { kleur: '#f2f2ee' })),
  T('-F2', 'Installatieautomaat voeding 24 V (primair)', 'ABB S201-C6 (1P)', 820, 195, 18, 90, 70, { kleur: '#f2f2ee' }),
  T('-F3', 'Installatieautomaat kastventilatie en verlichting', 'ABB S201-C6 (1P)', 845, 195, 18, 90, 70, { kleur: '#f2f2ee' }),
  T('-F4', 'Aardlekautomaat servicestopcontact 30 mA', 'ABB DS201 C10 A30', 870, 195, 36, 90, 70, { kleur: '#f2f2ee' }),
  T('-X9', 'Servicestopcontact 230 V (DIN-rail)', 'Phoenix EM-DUO 120/16/F', 920, 190, 45, 100, 60, { kleur: '#3b3d40', indicatief: true }),
  // rij 2 (y 470..860): 6 servoversterkers Inovance SV660N (EtherCAT, STO), naast elkaar met 20 mm luchtruimte
  ...[['1', 'SV660NT017I', 2.9, 90, 330], ['2', 'SV660NT017I', 2.9, 90, 330], ['3', 'SV660NT021I', 4.4, 100, 350], ['4', 'SV660NT5R4I', 1.3, 55, 250], ['5', 'SV660NT5R4I', 1.3, 55, 250], ['6', 'SV660NT5R4I', 1.3, 55, 250]]
    .map(([a, t, kw, b, h], k, lijst) => {
      const x = 100 + lijst.slice(0, k).reduce((s, r) => s + r[3] + 35, 0);
      return T(`-T1${a}`, `Servoversterker A${a} (${String(kw).replace('.', ',')} kW, EtherCAT, STO)`, `Inovance ${t}-FS-INT`, x, 480, b, h, 220, { kleur: '#2d2f33', indicatief: true });
    }),
  T('-R11', 'Remweerstand (gedeeld via DC-bus A1-A3)', 'Inovance MDBUN-60 + 1 kW 32 Ω', 760, 480, 80, 330, 140, { kleur: '#8e9399', indicatief: true }),
  // rij 3 (y 980..1220): 24 V, veiligheid, EtherCAT-I/O, netwerk
  T('-T1', 'Voeding 24 V DC, 20 A', 'Mean Well SDR-480-24', 100, 990, 86, 125, 129, { kleur: '#c0c3c6' }),
  T('-G1', 'Buffermodule 24 V (stroomonderbreking tot 1 s)', 'Mean Well DRB-480-24 + 4 x 18650', 200, 990, 86, 125, 129, { kleur: '#c0c3c6', indicatief: true }),
  ...[1, 2, 3, 4, 5, 6].map((i) => T(`-F2${i}`, ['24 V IPC', '24 V veiligheid', '24 V I/O en sensoren', '24 V ventielen', '24 V camera en PoE-switch', '24 V HMI en kastlicht'][i - 1], 'Phoenix CBM E4 24DC/0.5-10A (1 kanaal)', 300 + (i - 1) * 14, 1030, 12.3, 90, 75, { kleur: '#5a7d3a', indicatief: true })),
  T('-K2', 'Veiligheidsbesturing (noodstop, deur, lichtschermen, STO, PL d)', 'Pilz PNOZmulti 2 base 772100 + PNOZ m EF 16DI 772140', 400, 1000, 90, 100, 115, { kleur: '#f2c400', indicatief: true }),
  T('-K3', 'EtherCAT-koppelaar + I/O (16 DI, 16 DO, 2 AI, eindklem)', 'Beckhoff EK1100 + EL1809 + EL2809 + EL3002 + EL9011', 510, 1000, 100, 100, 70, { kleur: '#9ba4ad', indicatief: true }),
  T('-K4', 'Industriële switch 5 poorten (2 x PoE+ voor de camera)', 'Phoenix FL SWITCH 1001T-4POE-GT', 630, 1000, 45, 120, 110, { kleur: '#3b6ea8', indicatief: true }),
  T('-K1', 'Industriële PC (LinuxCNC + EtherCAT-master, HMI-server)', 'fanloos, Intel Core i5, 2 x Intel i210 LAN, 16 GB, 256 GB SSD', 700, 990, 200, 160, 70, { kleur: '#202226', indicatief: true }),
  // rij 4 (y 1320..1540): relais en signaal
  ...[1, 2, 3, 4].map((i) => T(`-K${10 + i}`, ['Koppelrelais toren rood', 'Koppelrelais toren oranje', 'Koppelrelais toren groen', 'Koppelrelais band stop (naar de bandbesturing)'][i - 1], 'Phoenix PLC-RSC-24DC/21', 100 + (i - 1) * 8, 1340, 6.2, 80, 94, { kleur: '#4a5a6a' })),
  T('-T2', 'Voeding 24 V voor de remmen (gescheiden van de besturing)', 'Mean Well SDR-240-24', 160, 1330, 63, 125, 114, { kleur: '#c0c3c6', indicatief: true }),
  // rij 5 (y 1630..1790): klemmen
  T('-X1', 'Klemmen voeding 400 V (L1 L2 L3 N PE)', 'Phoenix UT 16 + PE', 100, 1640, 5 * 12.2, 60, 50, { kleur: '#606a73' }),
  T('-X2', 'Klemmen 24 V verdeling', 'Phoenix PT 2,5 (40 x)', 180, 1640, 40 * 5.2, 60, 50, { kleur: '#606a73' }),
  T('-X3', 'Klemmen veiligheid (noodstop, deur, lichtschermen)', 'Phoenix PT 2,5 (32 x)', 400, 1640, 32 * 5.2, 60, 50, { kleur: '#f2c400' }),
  T('-X4', 'Klemmen I/O (sensoren, ventielen, toren)', 'Phoenix PT 2,5 (48 x)', 580, 1640, 48 * 5.2, 60, 50, { kleur: '#606a73' }),
  T('-X10', 'Robotkabels (Harting Han, op de kastwand onderaan)', 'Harting Han 24E (motoren), Han 16E (encoders)', 850, 1640, 160, 60, 50, { kleur: '#3b3d40', indicatief: true }),
  T('-PE', 'PE-rail', 'Cu-rail 10 x 3, 1000 mm', 100, 1720, 900, 10, 20, { kleur: '#d1a243' }),
];
// deur (vooraanzicht, linker- en rechterdeur elk 600 breed): HMI, noodstop, bediening, signaallampen, ventilatie
export const DEUR = [
  { code: '-P10', naam: 'HMI-aanraakscherm 15,6"', type: 'Advantech FPM-215W-P4BE (PCAP, IP66 voorkant)', deur: 'links', x: 300, y: 650, b: 410, h: 270, uitbouw: 50, kleur: '#16181a' },
  { code: '-S2', naam: 'Noodstop (rood op geel, 2 NC)', type: 'Schneider XB5AS8445 + ZBY9140', deur: 'links', x: 165, y: 960, b: 40, h: 40, uitbouw: 40, kleur: '#d01818', rond: true },
  { code: '-S3', naam: 'Reset veiligheid (blauw, verlicht)', type: 'Schneider XB5AW36B5', deur: 'links', x: 255, y: 960, b: 30, h: 30, uitbouw: 25, kleur: '#2457b8', rond: true },
  { code: '-S4', naam: 'Keuzeschakelaar automaat / hand (sleutel)', type: 'Schneider XB5AG33', deur: 'links', x: 345, y: 960, b: 30, h: 30, uitbouw: 30, kleur: '#2a2c2f', rond: true },
  { code: '-S5', naam: 'Start cyclus (groen, verlicht)', type: 'Schneider XB5AW33B5', deur: 'links', x: 435, y: 960, b: 30, h: 30, uitbouw: 25, kleur: '#1f9d4b', rond: true },
  { code: '-S6', naam: 'Stop cyclus (wit)', type: 'Schneider XB5AA31', deur: 'links', x: 525, y: 960, b: 30, h: 30, uitbouw: 25, kleur: '#eeeeea', rond: true },
  { code: '-Q1', naam: 'Hoofdschakelaar, handgreep rood/geel, afsluitbaar', type: 'ABB OHY65J6 (deurgreep)', deur: 'rechts', x: 300, y: 650, b: 90, h: 90, uitbouw: 60, kleur: '#d01818' },
  { code: '-E1', naam: 'Filterventilator 2 x 500 m³/h (instroom onder)', type: 'Rittal TopTherm SK 3243 (indicatief)', deur: 'rechts', x: 300, y: 1650, b: 323, h: 323, uitbouw: 15, kleur: '#cfd1cb' },
  { code: '-E2', naam: 'Uitblaasfilter (boven)', type: 'Rittal TopTherm SK 3243.200 (indicatief)', deur: 'rechts', x: 300, y: 300, b: 323, h: 323, uitbouw: 15, kleur: '#cfd1cb' },
];
// warmte in de kast (W): servoversterkers ±4 % van het asvermogen bij volle belasting, voeding, PC, rest
export const WARMTE = { servo: 0.04 * (2.9 + 2.9 + 4.4 + 1.3 * 3) * 1000, voeding: 70, pc: 45, io: 20, filter: 30, rest: 40 };
export const warmteTotaal = () => Object.values(WARMTE).reduce((a, b) => a + b, 0);
