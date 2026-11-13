// één revisie voor alle uitvoer van de afzuiging: tekeningen, bouwschema, aansluitschema, freesmallen en README.
// Verhoog dit bij elke wijziging van het ontwerp; de meetresultaten verwijzen naar deze revisie en de git-commit.
export const REVISIE = { versie: '7.3', datum: '2026-11-13' };
export const REVISIE_TEKST = `versie ${REVISIE.versie} · ${REVISIE.datum}`;

/** wat er per revisie veranderde (nieuwste eerst); de README en het meetplan verwijzen hiernaar */
export const CHANGELOG = [
  ['7.3', '2026-11-13', [
    'Schroeven van de klauwen beter geleid (vraag van Ian): module M5 x 70 (was 65) in een gat Ø5,4 over de hele toren, 9 mm geleiding boven het klauwkanaal en de punt 6,5 mm in een blind gat onderaan; knop M4 in Ø4,3 over 12 mm en Ø4,4 in het deksel. Zijdelingse speling hoogstens 0,2 mm.',
  ]],
  ['7.2', '2026-11-12', [
    'Advies Fable 5.2 verwerkt, zonder sterkere ventilator (San Ace C175 9TG24P0S01 blijft, keuze Ian).',
    'Vangst: werkhoogte eerlijk vastgelegd op 10 cm boven het rooster; 15 cm alleen in boost (rekenblad 1 en 3).',
    'Verdeelruimte onder het filter van 6,5 naar 15,5 mm (instroomplaat 12 mm lager): radiale snelheid 12,6 -> ca. 5 m/s.',
    'Filter 3 mm lager: 3 tot 5 mm lucht tussen de RVS-plaat en de plooien, zodat ook de gaten buiten het filter meedoen.',
    'Rooster opener: sleuven 5 mm (was 3,5), stegen 2 mm (was 3), overal minstens 1,6 mm staal; LB-monogram en stijl blijven.',
    'Ronde vormen onder het blad (wens Ian): de romp stopt 70 mm onder het bovenvlak, de ventilator zit in een ronde, bolle kuip (Ø189) met schuine lamellen opzij en ringsleuven in de bodem. Bovenframe, RVS-plaat en uitsparing blijven vierkant.',
    'Ventilator ontkoppeld op 4 rubberbuffers Ø15 x 10 M4 (Halder EH 25150, 55 Shore A) in plaats van star op de bodemplaat.',
    'Uitblaas opzij en naar onder, niet meer naar achteren langs de ventilatiesleuven van de voedingsbox; de "+"-poort van de drukmeter afgeschermd.',
    'Geen uitblaas naar buiten: bewuste keuze van Ian (2026-11-12). Fijn stof en dampen gaan terug in de salon; actieve-koolfilter alleen als optie vermeld.',
    'Vingerrooster in het oog: spleten 5,6 mm (was 10,4) en ribben 12 mm hoog, zodat het voldoet aan EN ISO 13857 tabel 4 (sleuf 4-6 mm: 10 mm afstand; hier 14 mm).',
    'RVS-plaat gecentreerd met 4 RVS-persbouten (PEM FH4-M3-6) tegen de rand van de frameopening: ze schuift niet weg onder een arm.',
    'Firmware: "filter vervangen" op het minimum over 5 minuten met hysterese; "eerste ijking wissen" als aparte handeling (ander merk filter); ventilator stopt na 3 s "filter ontbreekt" of "geen luchtstroom" op elke stand; watchdog op module en knop; tacho met ontdendering en periodemeting; terugvallen na 10 min zonder knop en automatisch uit na 4 uur zonder bediening; koppelsleutel via X25519 (niet meer onversleuteld rondgestuurd).',
    'Elektriek: ompolingsbeveiliging (Schottky-diode SB560 over de voeding achter de zekering, -R13), RC-filter op de tacho (-R14, -C3), draad naar de ventilator overal gelijk (0,5 mm² in de box, M8-kabel 4 x 0,25 mm²), opbouwtekening van de gaatjesprint (schema blad 11); -C1 staat naast de print (op de print paste hij niet meer); 0 % PWM = stil nagekeken in de datasheet (een losse PWM-draad geeft wel vol toerental).',
    'Dagstand 75 tot 80 %: 75 % is nu de laagste beschermende stand (vervangfactoren 1,18 / 1,40 / 1,70 op 75 / 85 / 100 %, nagerekend in het rekenblad).',
    'Tafelblad: houten latten tussen de huiden rond de uitsparingen, schroeven van de box in hout, MDF-freesmal met kopieerring Ø17 en frees Ø12, doorbuigberekening en doorbuigproef (M1).',
    'Documenten: risicoanalyse en CE (docs/Risicoanalyse-en-CE.md), meetplan met proefopstelling, L3 met PM2,5-criterium, L4 verplicht, acetonproef, "min aan aarde?"; Besparingen gecorrigeerd (adapter is klasse I).',
  ]],
  ['7.1', '2026-11-08', ['Eindverslag v4 verwerkt (siliconenlip, halve slag, -Q2, vervangfactoren uit het rekenblad).']],
];
