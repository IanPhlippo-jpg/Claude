# Review Fable 5.2: Lasconstructies+, Lasersnijden/plooien en Offerte uit model (eerste versie, f9a4f8a)

Datum: 2026-11-19. Beoordeeld: een schone `git archive` van commit f9a4f8a in de scratchpad (`review-fab`), niet de werkmap. Geen code gewijzigd, niets gecommit. Eisen en criteria: `docs/36-eisen-en-supervisie-extensies.md`.

## 1. Wat ik gedaan heb

| Stap | Resultaat |
|---|---|
| `vitest run src/fab` + `persistence3.test.ts` | 75 van 75 groen |
| `VOORBEELDEN=1 vitest run src/qa/fabVoorbeelden.test.ts` | 5 van 5 groen |
| `tsc -b` | schoon |
| `vite build` met testhooks, `tools/bundle-budget.cjs`, `tools/line-budget.cjs` | build goed; bundel 833,10 kB tegen 800 kB (faalt); regelbudget goed |
| `e2e/fab.mjs` tegen die build (Edge, Windows 11) | exit 0 |
| Eigen meetscript (vitest, 11 proeven) en eigen e2e-script (4 proeven) | uitkomsten in hoofdstuk 3; ruwe uitvoer in `scratchpad/rlog.txt`, `rlog2.txt` |
| Eigen DXF- en PDF-lezer (`scratchpad/review-fab-x/chk.cjs`) op de geleverde bestanden in `scratchpad/extensies/` | zie 3.1 en 4 |
| Geleverde PDF-beelden en schermafbeeldingen bekeken | zie 4 en 5 |

Niet gedaan: de vorige commit gebouwd om het bundelgetal van voor dit werk (831,7 kB volgens de bouwer) na te meten; `examples.check.test.ts` gedraaid (L1.6); een DXF in een viewer van een lasersnijder geopend; iets gezaagd, gesneden of geplooid. De meetscripts stonden tijdelijk in de reviewkopie en zijn daar weer weg; de uitvoer is bewaard.

## 2. Criteria

Telling over de 92 genummerde criteria: **44 gehaald, 27 deels, 20 niet gehaald, 1 niet nagemeten.**

### F0 werkplaatskern (eisen, geen genummerde criteria)

| Eis | Oordeel | Bewijs |
|---|---|---|
| F0-1 eigen map, eigen chunks | gehaald | `fabStore` 101,7 kB, `FabView` 28,6 kB, `FabPM` 17,4 kB als eigen chunks; hoofdchunk 833,10 kB |
| F0-2 instellingen per gebruiker, JSON heen en terug | gehaald | test L1.5; opslag in `localStorage`, niet in het model |
| F0-3 bron, aanname, datum, "prijs nakijken" | gehaald | `settings.ts:195-202`, scherm 09 |
| F0-4 herkenning met reden en overschrijven | deels | zie B-9 |
| F0-5 kostenregel in eurocent, één afronding | gehaald | `toCent`: 0,005 → 1, 1,005 → 101, 2,675 → 268, −1,005 → −101 (gemeten) |
| F0-6 verouderd blokkeert export | deels | modelwijziging: ja (e2e). Instellingen, eigenschap `fab.soort`, configuratie: nee (B-1, B-10) |
| F0-7 `doc.fab`, formaat 5, migratie | deels | formaat 5 alleen met `fab`; geen stap in `migrate.ts`; inhoud nauwelijks gevalideerd (B-15) |
| F0-8 uitvoer Nederlands | gehaald | alle PDF's |
| F0-9 Belgische notatie | gehaald | `€ 1.234,56`, `€ 0,50`, `19/11/2026`; DXF met punt, geen exponent, geen NaN |
| F0-10 geen nieuwe pakketten | gehaald | `package.json` niet in de commit |
| F0-11 niets verstuurd | gehaald | e2e met onderschepte verzoeken |

### Lasconstructies+

| Nr | Oordeel | Bewijs en opmerking |
|---|---|---|
| L1.1 | gehaald | test; scherm 02 |
| L1.2 | deels | lastafel: profielen herkend waar de buitenmaat past, rest "onbekend" met reden; LF3 (afzuiging) niet getest |
| L1.3 | gehaald | test + e2e deurkruk |
| L1.4 | deels | holle profielen: de "tabelwaarde" is dezelfde formule als de controle; geen tabel met bron. Gewalste profielen staan als AANNAME; ze komen overeen met wat ik uit het hoofd ken (UPN 100 = 10,6; IPE 120 = 10,4; L50x5 = 3,77), niet nagekeken tegen de norm |
| L1.5 | deels | JSON heen en terug getest; herstart van de app niet |
| L1.6 | niet nagemeten | `examples.check.test.ts` niet gedraaid; een bestand zonder `fab` blijft formaat 4 (gemeten) |
| L1.7 | gehaald | test |
| L2.1 | gehaald | zaagstaat-PDF: 2 x 1000, 2 x 600, 1 x 520; 3,72 m; 12,3 kg (3,72 x 3,303) |
| L2.2 | gehaald | rest 2260 op de PDF |
| L2.3 | gehaald | eigen proef: 400 lijsten tegen het echte optimum (uitputtend): 14 keer 1 staaf slechter, gemiddeld +0,035 staaf, nooit overvol. Wel B-16 |
| L2.4 | gehaald | test |
| L2.5 | gehaald | test |
| L2.6 | niet gehaald | niet gebouwd als test |
| L2.7 | deels | kenmerk bestaat, geen test; kolom "Verstek" is altijd "zelfde vlak" (B-16) |
| L2.8 | niet gehaald | geen tabel op het tekenblad |
| L2.9 | gehaald | PDF-tekst en XLSX nagelezen |
| L2.10 | deels | modelwijziging: verouderd (e2e). Zaagsnede in de PM herrekent. Andere instellingen: niet |
| L3.1 | gehaald | 6 verbindingen |
| L3.2 | gehaald | 149,6 mm tegen 4 x 40 − (8 − 2π) x 6 = 149,7 |
| L3.3 | niet gehaald | geen symbolen; het teken voor de hoeklas komt in de PDF als "?" (B-14) |
| L3.4 | gehaald | test |
| L3.5 | niet gehaald | geen verslepen |
| L3.6 | gehaald | lasplan-PDF: de vaste regel staat er, "conform" in geen enkele PDF. Wel B-8 |
| L3.7 | niet gehaald | `jointFromBead` wordt nergens aangeroepen |
| L4.1 | gehaald | handberekening 21 029 cent, programma 21 028; het verschil komt van kg/m afgerond op 3 decimalen (3,303 tegen 3,3035) |
| L4.2 | deels | "aangekocht" met een staaf uit voorraad geeft € 0,00 zonder markering (B-12) |
| L4.3 | gehaald | "9 of 9 lines rest on assumptions" |
| L4.4 | niet gehaald | geen vergelijking met de bibliotheek |
| L4.5 | deels | in de kern exact; in de app verandert er niets na een ander uurloon (B-1) |

### Lasersnijden/plooien

| Nr | Oordeel | Bewijs en opmerking |
|---|---|---|
| P1.1 | gehaald | eigen DXF-lezer: netto 19 659,6905 mm² tegen 19 659,6903; omtrek 582,8319 tegen 582,8319 |
| P1.2 | gehaald | 145,069 (K = 0,5), 144,244 (K = 0,325 en DIN) tegen 145,0686 en 144,2439 met de hand. `uitslagStrook()` niet vergeleken |
| P1.3 | gehaald | test |
| P1.4 | deels | weigering werkt; geen ontvouwer |
| P1.5 | gehaald | test |
| P1.6 | deels | platen van 8,5 / 3,5 / 7,5 mm in de lastafel blijven "onbekend" |
| P1.7 | gehaald | r = 4,499999 als CIRCLE |
| P2.1 | gehaald | 1 polylijn, 4 bulges 0,414214, 4 cirkels op GATEN |
| P2.2 | gehaald | AC1009, punt, geen NaN, geen exponent, ASCII |
| P2.3 | gehaald | test |
| P2.4 | **niet gehaald** | Z-profiel: 2 lijnen op ZETLIJN_OP, 0 op ZETLIJN_NEER. Hoed: 4 op OP, 0 op NEER (B-3). De test slaagt omdat PP2 één plooi "op" heeft |
| P2.5 | gehaald | test; "open" komt alleen via een parameter, de echte weg laat open ketens stil vallen |
| P2.6 | deels | rooster: 195 contouren, < 0,5 %; PP5 niet |
| P2.7 | niet gehaald | niet gebouwd |
| P2.8 | niet gehaald | status "nog te openen bij de lasersnijder" staat op de uitvoer |
| P2.9 | deels | ZIP met lijst; één geweigerde plaat houdt de hele ZIP tegen (B-18) |
| P3.1 | gehaald | test |
| P3.2 | gehaald | test |
| P3.3 | niet gehaald | |
| P3.4 | niet gehaald | geen vormnesting |
| P3.5 | gehaald | test |
| P3.6 | deels | rechthoek < 1 s; geen worker, "Cancel Nesting" staat altijd uit |
| P3.7 | gehaald | test |
| P3.8 | gehaald | test |
| P3.9 | niet gehaald | |
| P3.10 | gehaald | test; ook hier alle zetlijnen op OP |
| P4.1 | gehaald | PP2 |
| P4.2 | deels | één keer omkeren klopt; de plaats van de tweede plooi is 3 mm fout (B-2) |
| P4.3 | deels | zie 6: het criterium was fout geformuleerd, de bouwer heeft gelijk over de volgorde. De aanslagmaten van de binnenste plooien zijn fout (B-2) |
| P4.4 | gehaald | test |
| P4.5 | gehaald | plooiblad hoed: "flens 12.1 mm korter dan 0,7 x V" |
| P4.6 | deels | melding in de kern; PP6 niet getest |
| P4.7 | niet gehaald | |
| P4.8 | niet gehaald | |
| P5.1 | deels | formule gelezen en volgt 5.2; geen test op de cent |
| P5.2 | niet gehaald | `plaatModus: 'nest'` bestaat in de instellingen en wordt nergens gebruikt |
| P5.3 | deels | geen verplaatsen, geen invoer voor snelheden, geen test |
| P5.4 | gehaald | "geen prijs" en onvolledig. Wel B-9 (RVS met een Nederlandse naam) |
| P5.5 | niet gehaald | |

### Offerte uit model

| Nr | Oordeel | Bewijs en opmerking |
|---|---|---|
| O1.1 | gehaald | zelfde model |
| O1.2 | niet gehaald | niet getest |
| O1.3 | gehaald | test + e2e |
| O1.4 | deels | kern ja; geen invoer in de app; garantie en verzekering volgen de override niet |
| O1.5 | deels | kostprijs per stuk klopt; de offerte rekent anders (B-5) |
| O1.6 | niet gehaald | |
| O1.7 | deels | modelwijziging ja; instellingen nee |
| O1.8 | gehaald | test |
| O2.1 | gehaald | PDF bekeken: ONTWERP op beide pagina's, rode regel, invulvelden letterlijk |
| O2.2 | gehaald | eigen proef met Testbedrijf BV: geen watermerk |
| O2.3 | gehaald | 13 334 / 2 800 / 25 000 / 1 500 / 42 634 cent |
| O2.4 | deels | in de kern; in de app is er geen keuze van het tarief per regel en geen plaatsingsregel, dus 6 % is niet te kiezen. Op de PDF staan de voorwaarden van 6 % nergens |
| O2.5 | deels | uitvoer klopt; "verlegd" voor een particulier of zonder btw-nummer geeft geen melding |
| O2.6 | gehaald | geen verboden woord. In "in detail" ziet de klant wel "Garantie 3,0 %", "Verzekering 1,5 %", "Zagen: 5 stuks, waarvan 4 schuin" |
| O2.7 | gehaald | tekens buiten WinAnsi (Ł, Č, ∅, ≥) worden "?" |
| O2.8 | gehaald | wel: een offerte van 4 regels is 2 pagina's, met alleen "Voor akkoord" op pagina 2 |
| O2.9 | deels | voorbeeld en PDF komen uit dezelfde pagina's; geen beeldvergelijking |
| O2.10 | gehaald | e2e |
| O3.1 | deels | B-6 |
| O3.2 | niet gehaald | bevroren regels worden bewaard, niet heropend; geen revisie |
| O3.3 | niet gehaald | |
| O3.4 | deels | heen en terug getest; zwakke validatie (B-15) |
| O3.5 | deels | drie bladen, getallen als getal; geen totalen; de XLSX krijgt een eigen nummer |
| O3.6 | deels | part: schoon. Assembly: de klantnaam blijft erin (B-4) |

## 3. Bevindingen

### P1: moet weg voor iets hiervan naar een klant of een werkplaats gaat

**B-1. Na een andere prijs of een ander uurloon blijft de kostprijs oud, zonder waarschuwing, en de offerte gaat zo de deur uit.**
`src/app/fab/fabStore.ts:73` (`isStale`), `:75-78` (`setSettings`), `:119-124` (`exportable`).
Gemeten in de app: LF1, Cost € 210,28. Uurloon 45 → 90 in Fabrication Settings. Cost blijft € 210,28, geen "out of date". Export geeft Offerte-2026-001 met € 330,78. In het bestand staat daarna `bevroren.uurloon = 90` naast zaagkosten van 2655 cent (0,59 u x 45).
Waarom: de sleutel voor "verouderd" bevat alleen het model; `setSettings` herrekent niet.
Oplossing: de instellingen meenemen in de sleutel (of `recompute()` in `setSettings`), en `exportable()` laten weigeren als de instellingen na de berekening gewijzigd zijn. Test in e2e: uurloon wijzigen, totaal moet volgen.

**B-2. Het plooiblad geeft een foute aanslag voor elke plooi in de tegenrichting.**
`src/fab/bend.ts:149-167` (`chainBends`, regel 156).
Gemeten, hoedprofiel 15/40/60/40/15, t = 3, r = 3: plooilijnen in de uitslag op 12,12 / 49,37 / 109,61 / 146,85, breedte 158,98. De plooitabel rekent met 12,12 / 46,37 / 100,61 / 134,85, breedte 146,98. Het geleverde plooiblad zegt voor plooi 2 en 3 aanslag 46,4 mm; uit de uitslag volgt 49,4. Z-profiel: 111,37 tegen 114,37.
Waarom: `chainBends` trekt bij elke plooi de buitenverkorting (r + t) af. De schetslijn ligt op één zijde van de plaat; bij een plooi de andere kant op is dat de binnenzijde en is de verkorting r. De uitslag van de kern doet dat goed (handberekening 158,98).
Oplossing: de plooiposities niet opnieuw uitrekenen maar uit de plooilijnen van de uitslag halen (`FlatPart.plooien`), en hoek en richting uit de keten erbij zoeken. Test: voor Z en hoed de positie in de tabel gelijk aan de plooilijn in de uitslag binnen 0,05 mm. De botsingscontrole rekent met dezelfde foute maten.

**B-3. In de DXF staan alle zetlijnen op ZETLIJN_OP.**
`src/fab/flat.ts:299-300` (richting vast `'op'`, hoek vast 90), `src/app/fab/fabStore.ts:152-154` en `src/fab/nest.ts:128` (schrijven `r.flats` zonder `withBends`).
Gemeten: Z-profiel 2 lijnen op OP, 0 op NEER; hoed 4 op OP, 0 op NEER. Het plooiblad van dezelfde stukken toont wel 2 groen en 2 rood.
Waarom: de richting wordt alleen voor het plooiblad en het schermbeeld toegepast.
Oplossing: richting en hoek in `flatOfSheet` zelf zetten (samen met B-2), zodat DXF, nest en plooiblad uit één bron komen. Test P2.4 op een Z-profiel in plaats van PP2.

**B-4. "Save a Copy without Customer Data" laat de klant staan in een assembly.**
`src/fab/privacy.ts:10` (`if (!doc.fab) return doc;`).
Gemeten: assembly zonder eigen `fab` met een component waarvan het part een offerte heeft: de kopie bevat de klantnaam nog. Daarnaast schrijft `serializeDocument` zo'n bestand als formaat 4 (`persistence.ts:54` kijkt alleen bovenaan). Pack and Go (`src/app/assemblyCommands.ts:176-181`) schrijft elk part met zijn offertes, klant en bevroren kostenregels (met uurloon) mee.
Waarom: de vroege terugkeer staat voor de afdaling in de componenten.
Oplossing: eerst de componenten aflopen, dan pas het eigen `fab`. Pack and Go: vragen of klantgegevens en prijzen mee moeten, standaard nee. Test met een assembly.

**B-5. De offerte voor een reeks rekent het aantal maal de volle prijs van één stuk.**
`src/app/fab/fabStore.ts:225`, `src/fab/quote.ts:67-76`.
Gemeten, LF1, reeks 5, marge 30 %: offerte 5 x € 273,36 = € 1.366,80. Het Cost-paneel toont voor dezelfde reeks € 168,58 per stuk (5 x = € 842,90).
Waarom: `quoteLines` zet `hoeveelheid = reeks` en `prijsCent` op de som van alle regels, instelkosten inbegrepen; `perPiece` wordt alleen in het paneel gebruikt.
Oplossing: één functie die de regels voor een reeks maakt (instelregels gedeeld of als eigen regel met aantal 1), gebruikt door paneel en offerte. Test: paneel x reeks = subtotaal van de offerte.

### P2

**B-6. Offertenummers zijn niet uniek.** `fabStore.ts:242-258`, `:274`; `src/fab/quote.ts:85-90`; Reset-knop in `FabSettings.tsx`.
Gemeten in de app: PDF en daarna XLSX van dezelfde offerte geven 2026-001 en 2026-002. "Reset" vraagt niets en de volgende offerte heet weer 2026-001. Een geïmporteerd ouder instellingenbestand zet de teller terug. Gelezen: `go()` wacht niet op de opslagdialoog, dus annuleren in die dialoog verbruikt het nummer wel (criterium O3.1).
Oplossing: nummer nemen na een geslaagde opslag; XLSX van dezelfde offerte hergebruikt het nummer; de teller buiten Reset en import houden en het hoogste nummer uit `doc.fab.quotes` meenemen; Reset met een bevestiging.

**B-7. Een vrije regel met een negatief bedrag verdwijnt van de offerte.** `src/fab/quote.ts:69` (`bedragCent > 0`).
Gemeten: korting −€ 50: kostprijs € 160,28, offerte € 210,28. Oplossing: vrije regels altijd doorgeven; alleen regels zonder prijs weglaten.

**B-8. Bevestigde lasnaden volgen het model en de uitvoeringsklasse niet meer.** `src/fab/analyze.ts:57`, `src/app/fab/FabPM.tsx:250`.
Gemeten: na "Confirm all" en EXC3 blijft het niveau C (EXC3 vraagt B) terwijl het lasplan "Uitvoeringsklasse EXC3" zegt. Tussenstijl verwijderd: nog steeds 6 lasnaden en 1,02 m las in de kostprijs bij 4 bodies.
Oplossing: bij elke analyse de bewaarde naden tegen de bodies leggen (weg, nieuw, lengte gewijzigd) en dat tonen; het niveau volgt EXC tenzij Ian het zelf zette.

**B-9. Herkenning die stil kiest.** `src/fab/recognize.ts:230-240`, `:244-255`; `src/fab/catalog.ts:149-154`.
Gemeten:
- strook 400 x 100 x 5 met twee gaten Ø9: "Platstaal 100 x 5" op de zaagstaat met 2 boorgaten, geen uitslag, geen DXF, geen keuze. Elke plaat langer dan 3 x haar breedte met een maat uit de platstaaltabel gaat zo.
- massief 41 x 41 met "koker 40 x 40" in de naam: Koker 40 x 40 x 2, de dunste van 3 kandidaten, met waarschuwing "472 %".
- materiaal "Roestvast staal 304" of "Roestvrij staal": geprijsd als S235 aan € 1,60/kg. Geen materiaal: ook S235, zonder melding.
Oplossing: plaat en platstaal beide als kandidaat tonen (met gaten of afgeronde hoeken eerst plaat); bij een naamtreffer zonder wanddikte geen profiel kiezen maar "onbekend, kandidaten"; `ROEST`, `RVS`, `INOX` voor `STAAL` testen; een leeg materiaal als eigen melding.

**B-10. "Verouderd" mist wijzigingen die de uitkomst veranderen.** `fabStore.ts:68-72`; `src/fab/bodies.ts:47-49`, `:80-90`.
Gemeten: eigenschap `fab.soort = koop` verandert de herkenning van plaat naar koopdeel, de sleutel blijft gelijk. Gelezen, niet gemeten: `configurations`, `activeConfiguration`, `equations` en `properties` zitten niet in de sleutel; componenten worden herbouwd zonder hun configuratie (`applyConfiguration` wordt niet gebruikt, er wordt wel op configuratie gegroepeerd); fouten van de herbouw met gesplitste bodies (`r.errors`) worden niet gelezen.
Oplossing: de sleutel uit het hele document zonder `fab.quotes` en `fab.klant`; component in zijn configuratie herbouwen; herbouwfouten als waarschuwing op het body.

**B-11. De K op het plooiblad klopt niet altijd met de uitslag.** `src/fab/flat.ts:258`, `:268`; `fabStore.ts:196-200`.
Gemeten: model met buigaftrek 5 mm: het label zegt "DIN 6935, K = 0.500", de uitslag is met de buigaftrek gemaakt. Gelezen: de keten voor de plooitabel neemt de schetslijnen in tekenvolgorde en gaat ervan uit dat elke lijn begint waar de vorige eindigt.
Oplossing: het label uit de werkelijk gebruikte toeslag; de keten uit de verbonden punten; vervalt grotendeels met B-2.

**B-12. "Aangekocht" met materiaal uit voorraad kost € 0,00.** `src/fab/cost.ts:72-77`. Gemeten: "0 hele staven", € 0,00, niet onvolledig. Oplossing: voorraad aan de ingestelde prijs rekenen en de regel zo noemen.

**B-13. Btw.** `src/fab/quote.ts:37-48`, `src/fab/quotePdf.ts`.
"Verlegd" voor een particulier of zonder btw-nummer van de klant: geen melding (gemeten). De PDF vermeldt bij 6 % de voorwaarden niet (gemeten; 6.4 van docs/36 vraagt dat). 6 % zonder plaatsingsregel is een melding, geen blokkade; 6.4 zegt "laat niet toe". In de app is het tarief per regel niet te kiezen. Oplossing: tarief en plaatsing per regel in de Quote-PM; de vermelding op de PDF; verlegd alleen met een geldig btw-nummer. Te verifiëren met de boekhouder, zoals alles in 6.4.

**B-14. De werkplaatsbladen zijn geen tekeningen volgens ISO 7200 en ISO 128.** `src/fab/sheets.ts:27-32` (kop), `:155-189` (plooiblad), `:192-214` (lasplan); `src/fab/weld.ts:98`; `src/fab/pdf.ts:18-24`.
Gezien: geen titelblok (eigenaar, documentnummer, blad, schaal, datum van uitgifte, opsteller); het plooiblad heeft geen schaal, geen maten, geen legenda voor groen en rood en geen aanduiding welke rand "a" of "b" is; zetlijnen als gekleurde streeplijn. Het lasplan heeft geen aanzicht, noemt elke verbinding "Structural Member1 / Structural Member1" zonder positienummer van de zaagstaat, en drukt het hoeklassymbool als "?" ("a3 ? 181 (rondom)").
Oplossing: het titelblok van de tekenbladen hergebruiken; positienummers in de kolom "Tussen"; het symbool als lijntjes tekenen in plaats van een teken dat Helvetica niet heeft.

**B-15. `doc.fab` wordt nauwelijks gecontroleerd bij het openen.** `src/core/document/persistence.ts:250-251`.
Gemeten: `kosten.zagen.bedragCent = "abc"` wordt aanvaard en het totaal wordt de tekst "2543abc3240…"; `vrij: "x"` laat de analyse struikelen. Oplossing: een `validateFab` zoals `validatePrint3d` (getallen, lijsten, btw-tarieven), en formaat 5 ook wanneer een component `fab` draagt.

**B-16. Zaagplan en zaagstaat.** `src/fab/sawList.ts:49`, `:66`; `src/fab/barNest.ts:23-26`, `:37`.
Gemeten: staaflengte 6100 of 12000 instellen doet niets voor een koker (6000 blijft). Eén stuk van 5998: 1 staaf, "ondergrens 2". Twee stukken van 2998: 2 staven, terwijl 2998 + 4 + 2998 = 6000 past. Gelezen: `verstekGedraaid` wordt nergens gezet, dus een verstek in twee vlakken staat als "zelfde vlak" op de zaagstaat.
Oplossing: de ingestelde lengte gebruiken of zeggen waarom niet; de laatste snede niet meetellen (capaciteit + zaagsnede); de stand van het verstek uit de twee eindnormalen, of de kolom leeg laten tot dat er is.

**B-17. Legplan en ZIP.** `fabStore.ts:150-151`, `:182`. Gelezen: het legplan-PDF bevat alleen de eerste groep (materiaal en dikte); één geweigerde plaat houdt de hele ZIP tegen. Oplossing: alle groepen in de PDF; de goede platen exporteren en de geweigerde in de lijst zetten (de plaatlijst heeft die regel al).

### P3

- Geld: `perPiece` geeft halve centen (20 stuks: 11 456,75); het paneel toont € 273,36 waar de offerte € 273,37 zegt; op 2 van 9 kostenregels is hoeveelheid x getoonde eenheidsprijs niet het bedrag; garantie en verzekering volgen een override niet (`cost.ts:163-173`, `:189-191`; `FabPM.tsx:262-270`). Het paneel toont altijd "incl. 21 %", ook bij verlegd of vrijgesteld.
- Botsingscontrole (`bend.ts:74-99`): alleen de eindstand, geen matrijs, tafel of aanslag; bij een scherpe plooi ligt het been zelf in de wig. Het plooiblad zegt niet dat de controle zo beperkt is. Meer dan 7 plooien geeft de tekst "niet alle plooilijnen evenwijdig".
- `weld.ts:77`: het laspunt is het zwaartepunt van het hele vlak van het eerste body, niet van het contact; op LF1 valt dat toevallig goed.
- `dxf.ts:70`: de vervanging van ° door `%%d` komt na `ascii()` en doet dus nooit iets.
- `settings.ts:228`: een geïmporteerde lijst wordt ongezien overgenomen. `companyMissing` vraagt RPR voor een VZW, de PDF drukt het dan niet af. `nextRevision` na Z geeft "[". `fab: {}` maakt van het bestand formaat 5.
- Interface: het pictogram in de kop van elke PM is het euroteken; het kruis doet hetzelfde als de vink; "Stock Library", "Sheet Library", "Purchased Parts", "Finishing", "Company" openen alle dezelfde dialoog op de pagina Company; "Weld Joint", "Weld Sequence" en "Execution Class" openen hetzelfde paneel; "Order List XLSX" is de zaagstaat; "Add Line" vraagt "omschrijving;bedrag" in één tekstveld; de dialoog Fabrication Settings heeft geen Cancel; de kop van de Quote Preview valt achter de tabbladen (scherm 09); lasersnelheden, startkost, insteltijden en de platenlijst zijn niet in te vullen.
- Het geleverde beeld `pdf-plooiblad-hoed-p1.png` toont vier groene lijnen; de huidige build maakt er 2 groen en 2 rood. Het beeld is van een eerdere stand.
- De hoofdchunk is 833,10 kB. Als 831,7 kB van voor dit werk klopt, kwam er 1,4 kB bij.

## 4. PDF's en DXF's met de hand

| Punt | Uitkomst |
|---|---|
| "conform" | in geen van de 8 geleverde PDF's, niet in de code-uitvoer |
| EXC2-regel | op het lasplan: "EXC2 vraagt een gecertificeerde FPC, WPS en lascoördinatie. Dit programma controleert dat niet." |
| Watermerk | ONTWERP op beide pagina's van Offerte-2026-001, plus "Geen geldige offerte: ondernemingsgegevens ontbreken" |
| Status | "nog te zagen", "nog te openen bij de lasersnijder", "nog te plooien" op elk blad |
| Offerte, Belgische vermeldingen | naam en rechtsvorm, adres, BTW BE 0xxx.xxx.xxx, RPR, IBAN, contact in kop en voet; klantblok; nummer, datum, geldig tot; tabel met btw %; maatstaf en btw per tarief; totaal incl.; termijn, betaling, geldigheid, voorwaarden met "Voorbeeldtekst, na te lezen voor gebruik."; voor akkoord. Ontbreekt: vermelding bij 6 % (B-13) |
| Mod-97 | geldig, één cijfer fout, verwisseling, 9 cijfers, rest 0 → 97: alle juist. IBAN: BE68 5390 0754 7034 geldig, laatste cijfer fout geweigerd, te kort geweigerd |
| ISO 7200 / ISO 128 | niet gevolgd op de werkplaatsbladen (B-14). EN ISO 13920-BF en ISO 2768-m staan als tekstregel op zaagstaat en lasplan |
| DXF | R12, lagen CONTOUR / GATEN / TEKST, geen `$INSUNITS`, maten in mm |

## 5. Interface naast SOLIDWORKS

Goed: groene vink en rood kruis bovenaan, inklapbare secties, eigen tabbladen, groep op Frames in een part en "Weld Shop" in een assembly, gele AANNAME-labels met bron. Afwijkend: de resultaten staan in een eigen strook onder het model in plaats van in het Task Pane en een CostingManager-tab (6.2); keuzes per body zijn gewone keuzelijsten; een dialoog van eigen makelij voor de instellingen. Zie verder de lijst onder P3.

## 6. Correctie op mijn eigen criterium P4.3

P4.3 zei "binnenste plooien eerst". Dat is voor een hoedprofiel fout: met de binnenste plooien eerst sluit het stuk zich rond de stempel, en op de kantbank plooit men de flenzen eerst. De bouwer heeft dat juist gemeld. P4.3 wordt: "de volgorde plooit de flenzen eerst; de controle keurt binnenste-eerst af; de aanslagmaten komen overeen met de plooilijnen in de uitslag binnen 0,05 mm". Het laatste deel is nu niet gehaald (B-2). Regel 1 in 4.5 wordt "korte flenzen eerst, daarna naar binnen".

## 7. Oordeel per extensie en fase

| Fase | Oordeel | Voorwaarde |
|---|---|---|
| F0 | verder bouwen mag; niet af | B-1, B-10, B-15 |
| L1 voorraad en herkenning | vrijgegeven als voorstel dat Ian naleest | B-9 voor herkende (niet-feature) stukken |
| L2 zaagstaat en zaagplan | **vrijgegeven voor het proefstuk LF1**, status "nog te zagen" | B-16 voor iets met een verstek in twee vlakken |
| L3 lasnaden en lasvolgorde | niet vrijgegeven | B-8, B-14; L3.3, L3.5, L3.7 |
| L4 kostprijs per stuk | niet vrijgegeven | B-1, B-12 |
| P1 uitslag | vrijgegeven voor vlakke platen en voor ketens uit de basisflens; de rest wordt terecht geweigerd | |
| P2 DXF | **vlakke platen vrijgegeven**, status "nog te openen bij de lasersnijder"; gezette platen niet | B-3 |
| P3 nesting | vrijgegeven als hulpmiddel voor een prijs (rechthoek) | B-17 |
| P4 plooivolgorde | niet vrijgegeven; het plooiblad mag niet naar een kantbank | B-2, B-11 |
| P5 prijs per plaat | niet vrijgegeven | B-1; P5.1 zonder test, P5.2 niet gebouwd |
| O1 kostprijsmodel | niet vrijgegeven | B-1, B-5 |
| O2 offerte en PDF | niet vrijgegeven; blijft hoe dan ook ONTWERP tot de bedrijfsgegevens er zijn en de boekhouder de sjabloon las | B-5, B-7, B-13 |
| O3 offertebeheer | niet vrijgegeven | B-4, B-6; O3.2, O3.3 |

Volgorde van herstellen: B-1, B-4, B-5 (klein en met het grootste gevolg), dan B-2 met B-3 en B-11 samen (één bron voor plooilijn, richting en hoek), dan B-6 tot B-9.

## 8. Status na herstel (bouwer, 2026-11-19, niet gecommit)

Gemeten op de werkmap na het herstel: `tsc -b` schoon, `vitest run` 184 bestanden / 1297 tests groen, `VOORBEELDEN=1` fab-groep groen (O1.2 lastafel als assembly erbij), `e2e/fab.mjs` tegen een `VITE_TEST_HOOKS=1`-build zonder fout, line-budget en line-length groen, hoofdchunk 794,54 kB (budget 800). Beelden in `scratchpad/extensies-v2/` (21 schermbeelden, PDF-renders van zaagstaat, lasplan, lassymbolen, plaatlijst, plooiblad hoed en Z, legplan driehoeken, offerte).
De tests in `src/fab/review37.test.ts` en `src/app/fab/fabStore.test.ts` gebruiken de gemeten waarden uit hoofdstuk 3 (46,4 tegen 49,4; € 1.366,80 tegen 5 x de stukprijs; 2026-001/002; enz.). Ze zijn geschreven om op f9a4f8a te falen; ik heb ze niet elk afzonderlijk tegen f9a4f8a teruggedraaid.

### Bevindingen

| Nr | Status | Wat er nu is | Test |
|---|---|---|---|
| B-1 | opgelost | instellingen-sleutel (`settingsKey`) in het resultaat; `setSettings` herprijst meteen (`price()` los van `analyzeGeometry()`); ander resultaat = verouderd = export geblokkeerd; offerte neemt `r.settings` | fabStore.test B-1 (2), e2e uurloon 45 → 90 |
| B-2 | opgelost | aanslagen uit de plooilijnen van de uitslag; `chainBends` rekent buiten (r + t) naar het materiaal en binnen (r) de andere kant; botsing met dezelfde maten | review37 hoed 12,12 / 49,37 / 109,61 / 146,85, breedte 158,98; Z 12,1 / 114,4 |
| B-3 | opgelost | richting en hoek in `flatOfSheet` zelf (één bron voor uitslag, DXF, nest, plooiblad) | review37 Z: 1 OP + 1 NEER op de DXF-lagen; hoed 2 + 2 |
| B-4 | opgelost | `withoutCustomerData` loopt eerst de componenten af; formaat 5 ook als alleen een component `fab` heeft; Pack and Go vraagt (standaard nee); Share-kopie zonder klant | review37 assembly, fabStore.test Pack and Go |
| B-5 | opgelost | `quoteLines` per stuk van de reeks, instelregels gedeeld; paneel en offerte uit `salePerPiece` | review37 (2), e2e paneel x 5 = offerte |
| B-6 | opgelost | nummer pas na geslaagde opslag; XLSX van dezelfde offerte hergebruikt het nummer; teller apart (niet in Reset/import) en boven elk nummer in het document; Reset vraagt | review37, fabStore.test Reset, e2e PDF+XLSX één nummer |
| B-7 | opgelost | vrije regels altijd mee, zonder marge, negatief mag; "Add Line" met eigen velden | review37, e2e korting |
| B-8 | opgelost | `reconcileJoints`: vervallen / nieuw / lengte gewijzigd, getoond in de PM; niveau volgt EXC tenzij met de hand gezet; vervallen naden niet in de kostprijs | review37 (2) |
| B-9 | opgelost | strook met gaten = plaat (platstaal als kandidaat), zonder gaten platstaal met plaat als keuze; naamtreffer zonder wand = onbekend met kandidaten; RVS/inox/roestvast vóór staal; geen materiaal = AANNAME; niet-metaal = onbekend | review37 (4) |
| B-10 | opgelost | sleutel uit het hele document zonder offertes/klant/reeks; componenten in hun configuratie; herbouwfouten als waarschuwing | fabStore.test B-10 |
| B-11 | opgelost | label uit de werkelijk gebruikte toeslag; keten uit verbonden punten | review37 |
| B-12 | opgelost | voorraad bij "aangekocht" aan de ingestelde prijs, regel zegt "voorraad" | review37 |
| B-13 | opgelost | tarief en plaatsing per regel in de Quote-PM; verlegd alleen met geldig btw-nummer (blokkeert anders); 6 % zonder plaatsing blokkeert; vermelding 6 % op de PDF. Te verifiëren met de boekhouder | review37 (2), quote.test O2.4 |
| B-14 | grotendeels | titelblok ISO 7200 op alle werkplaatsbladen; plooiblad met schaal, streep-punt zetlijnen, maten vanaf rand a, a/b, legenda; lasplan met aanzicht (body-kaders, ballonnen), positienummers en getekende symbolen. Het aanzicht is geen echte 2D-projectie van het model (kaders) | review37 B-14, beelden pdf-* |
| B-15 | opgelost | `validateFab` bij openen (getallen, lijsten, btw) | review37 |
| B-16 | opgelost | ingestelde staaflengte; laatste snede telt niet mee; ondergrens juist; verstek in twee vlakken uit de eindnormalen | review37 (3), frames.test L2.3 |
| B-17 | opgelost | legplan-PDF alle groepen; ZIP met de goede platen, geweigerde in de lijst | review37 |
| P3 geld | opgelost | hele centen per stuk; aantal x eenheidsprijs = bedrag; garantie/verzekering volgen override; paneel toont het btw-regime | review37, frames.test O1.5 |
| P3 botsing | deels | wig van de stempel, tekst zegt dat de controle beperkt is; > 7 plooien eigen tekst. Geen matrijs, tafel, aanslag | nestbend.test |
| P3 laspunt | opgelost | zwaartepunt van het contactvlak | review37 |
| P3 dxf ° | opgelost | `%%d` vóór `ascii()` | review37 |
| P3 instellingen | opgelost | import per lijst gecontroleerd; VZW zonder RPR; revisie na Z = AA; `fab: {}` blijft formaat 4 | review37 |
| P3 interface | opgelost | eigen pictogram per PM; kruis = Cancel met terugzetten; elke knop opent zijn eigen pagina; Weld Sequence met ▲▼; Order List eigen XLSX; Cancel in de dialoog; kop Quote Preview onder de tabs; snelheden, startkost, insteltijd, platenlijst in te vullen | e2e instellingenpagina's |
| P3 bundel | opgelost | 794,54 kB (TaskPane, ShortcutBar, lifecycle-dialogen, ManagerPane-extra's lazy) | bundle-budget |

### Criteria die niet of deels gehaald waren

| Criterium | Nu | Opmerking |
|---|---|---|
| F0-4, F0-6, F0-7, L2.10, O1.7, O3.4 | gehaald | via B-1, B-9, B-10, B-15. Geen aparte stap in `migrate.ts` (formaat 5 wordt alleen geschreven met inhoud) |
| L2.7 | deels | verstek in twee vlakken getest; spiegelstukken met gaten niet apart getest |
| L3.3 | gehaald | ISO 2553 systeem A als lijnen (8 voorbeelden op een eigen blad), ook in de PM. Nog niet op de tekenbladen van de CAD zelf |
| L3.5 | deels | volgorde met ▲▼ in de PM, bewaard in het document; geen slepen in de boom |
| L3.7 | gehaald | `jointFromBead` in de analyse |
| L4.2, L4.5, O1.4, O1.5 | gehaald | B-12, B-1, B-5, invoer in de app |
| P2.9 | gehaald | B-17 |
| P3.4 | deels | vormnesting in paren (tweede stuk 180° langs de NFP, Clipper2 Minkowski); geen vrije vormnesting van verschillende stukken |
| P4.2, P4.3 | gehaald | B-2; P4.3 volgens de correctie in 6 |
| P5.1, P5.2, P5.3 | gehaald | op de cent getest; plaatmodus "nest" rekent het aandeel van het geneste blad; snelheden in te vullen |
| O1.2 | gehaald | lastafel als assembly in de voorbeeldengroep |
| O2.4, O2.5 | gehaald | B-13 |
| O3.1, O3.5, O3.6 | gehaald | B-6, totalen in de XLSX, B-4 |
| O3.2 | gehaald | bevroren offertes in de PM met "New revision" (A, B, …) |
| O3.3 | deels | melding "model gewijzigd sinds offerte …" in de Quote-PM, niet in de FeatureManager-boom |
| Costing op Evaluate, Add-In-schakelaars | gehaald | knop Costing op Evaluate; Weld Shop, Laser & Bend en Quote aan/uit via Phlippo Add-Ins |
| P1.4 | niet | geen algemene ontvouwer; randflenzen worden nog met reden geweigerd |
| P1.6, P4.6, P2.6 (PP5), L1.2 (LF3), L1.4, L1.5, L1.6 | niet nagemeten | niet opnieuw gemeten in deze ronde |
| L2.6, L4.4, O1.6, P3.3, P2.7, P5.5 | niet | vergelijking met het orakel uit de bibliotheek (`kostprijs()`, `nesting()`, `dxfBestanden()`) niet gebouwd. LF4/LF5: de deurprofielen van TD-01 zijn massief getekend en worden als "Vierkant 40" herkend, dus vergelijken met het orakel heeft nog geen zin |
| L2.8, P4.8 | niet | geen zaag- of plooitabel op een tekenblad van de CAD |
| P2.8 | niet | DXF nog niet geopend in een externe viewer; status blijft "nog te openen bij de lasersnijder" |
| P3.6 | deels | rechthoek en paren < 1 s; geen worker, Cancel Nesting blijft uit |
| P3.9 | niet | geen handmatig verschuiven |
| P4.7 | niet | geen tussenstanden van het model per plooistap |
| O2.9 | deels | voorbeeld en PDF uit dezelfde pagina's; geen beeldvergelijking |
| FeatureManager-mappen | niet | resultaten blijven in de eigen strook en de PM |

### Oordeel volgens de bouwer (ter controle door Fable)

L3, L4, P4, P5 en O1 tot O3 hebben geen open P1 of P2 meer. De offerte blijft ONTWERP tot de bedrijfsgegevens er zijn en de boekhouder de btw-regels las; de DXF blijft "nog te openen" tot P2.8; het plooiblad is nagerekend op hoed, Z en L, nog niet op een echte kantbank.

## 9. Herbeoordeling (Fable 5.2, 2026-11-19, commit 43f042e)

Beoordeeld op een schone `git archive` van 43f042e (`scratchpad/review-fab2`). Geen code gewijzigd, niets gecommit.

### 9.1 Wat ik gedraaid heb

| Stap | Resultaat |
|---|---|
| `vitest run src/fab src/app/fab` + `persistence3.test.ts` | 115 van 115 groen |
| `VOORBEELDEN=1 vitest run src/qa/fabVoorbeelden.test.ts` | 6 van 6 groen |
| `tsc -b` | schoon |
| build met testhooks, bundel- en regelbudget | hoofdchunk 794,42 kB (budget 800), beide groen |
| `e2e/fab.mjs` tegen die build | exit 0 |
| eigen meetscript opnieuw geschreven en uitgebreid (`scratchpad/review-fab-x/scripts2/zzReview.test.ts`), uitvoer in `scratchpad/rlog3.txt` en `rlog4.txt` | zie 9.2 |
| eigen e2e-script in de app (`scripts2/zzReview.mjs`) | zie 9.2 en 9.3 |
| geleverde PDF's en DXF in `scratchpad/extensies-v2/` met de eigen lezer; beelden plooiblad, lasplan, lassymbolen bekeken | zie 9.2 |

Niet gedaan: de volledige `vitest run` (1297 tests volgens de bouwer), vormnesting in paren nagemeten, de invoer voor override, tarief per regel en "New revision" in de app doorgeklikt, een DXF in een externe viewer geopend.

### 9.2 De bevindingen uit hoofdstuk 3

| Nr | Oordeel | Gemeten |
|---|---|---|
| B-1 | **opgelost** | in de app: uurloon 45 → 90 zet Cost van € 210,29 op € 305,17, niets verouderd; offerte € 480,03 incl.; bevroren record uurloon 90 met zagen 5310 cent |
| B-2 | **opgelost** | hoed 12,12 / 49,37 / 109,61 / 146,85, breedte 158,98: tabel = plooilijnen. Ook de hoed in omgekeerde tekenrichting, Z, gespiegelde Z, 60° en 120°: telkens gelijk |
| B-3 | **opgelost** | Z: 1 lijn op ZETLIJN_OP, 1 op ZETLIJN_NEER; hoed 2 + 2; plooiblad hoed 2 groen, 2 rood |
| B-4 | **opgelost** | assembly in een assembly met de offerte in het part: kopie zonder klantnaam, zonder bedragen, zonder uurloon; het volle bestand is formaat 5. Pack and Go: gelezen, niet doorgeklikt |
| B-5 | **opgelost** | reeks 5: paneel € 168,60 per stuk, offerte "één regel" € 843,00. Per groep € 843,05, in detail € 843,10 (zie N-4) |
| B-6 | **opgelost**, op N-1 na | XLSX na PDF: zelfde nummer; Reset vraagt en houdt de teller (volgende offerte in een ander document: 2026-003); nummers uit het document tellen mee (001 en 007 → 008) |
| B-7 | **opgelost** | "Korting: 1 x € -50,00" en "Plaatsing: 1 x € 250,00" op de offerte |
| B-8 | **opgelost** | EXC3 na bevestigen: niveau B; stijl weg: W3 en W6 "vervallen", kostprijs 4 verbindingen en 0,72 m |
| B-9 | **deels** | strook met gaten: plaat met platstaal als kandidaat; naam zonder wand: onbekend met 3 kandidaten; "Roestvast staal 304" → RVS 304, geen prijs, onvolledig; eiken en PLA: onbekend. Nieuw: N-3 |
| B-10 | **opgelost** | sleutel uit het hele document (gelezen); test van de bouwer groen. Configuratie van een component niet zelf gemeten |
| B-11 | **opgelost** | buigaftrek 5: label "model, buigaftrek 5", uitslag 145,000, plooi op 97,500; twee losse lijnen in omgekeerde volgorde: juiste keten |
| B-12 | **opgelost** | "0 hele staven nieuw, 1 uit voorraad (… aan de ingestelde prijs) € 35,70" |
| B-13 | **opgelost** | verlegd voor een particulier blokkeert; 6 % zonder plaatsingsregel blokkeert; de vermelding staat op de PDF en ontbreekt bij 21 %. Te verifiëren met de boekhouder |
| B-14 | **opgelost voor de bladen, deels voor het lasplan** | titelblok op elk blad (eigenaar, documentsoort, titel, documentnummer, blad, revisie, uitgifte, toleranties); plooiblad met schaal, streep-punt, maten vanaf rand a, legenda en de zin over de beperkte botsingscontrole; lasplan met "pos 1 / pos 2", getekende symbolen en een aanzicht van kaders met ballonnen ("schets, niet op schaal") |
| B-15 | **opgelost** | tekst als bedrag, halve cent, `vrij` als tekst, `reeks: "vijf"`, offerte zonder regels: geweigerd met reden. Een lasnaad zonder soort en proces en de inhoud van `bevroren` gaan nog door (P3) |
| B-16 | **opgelost** | 5998: 1 staaf, ondergrens 1; 2 x 2998: 1 staaf; 3000 + 2998: 2 staven; 400 lijsten: 11 keer 1 staaf boven het optimum, nooit eronder, nooit overvol; staaflengte 6100 wordt gebruikt |
| B-17 | **opgelost** | gelezen in `fabStore.ts`; test van de bouwer groen |
| P3 geld | opgelost, op N-4 en N-5 na | hele centen; hoeveelheid x eenheidsprijs = bedrag op 9 van 9 regels; garantie volgt een override (€ 8,25) |
| P3 overige | opgelost | Cancel in de instellingen zet 77 terug naar 90 (gemeten); DXF en PDF's: geen "conform", geen "?", EXC2-regel aanwezig |

De lassymbolen (blad met 8 voorbeelden) heb ik naast mijn kennis van ISO 2553 systeem A gelegd, niet naast een afbeelding uit de norm: symbool op de doorgetrokken lijn voor de pijlzijde, op de streeplijn voor de tegenzijde, geen streeplijn bij tweezijdig, cirkel voor rondom, vlag voor montage, `3 x 50 (100)`, de letter a, z of s er altijd bij, staart met proces / positie / niveau. Ik zie geen fout.

### 9.3 Nieuwe bevindingen

**N-1 (P2). Het rode kruis van de Quote-PM wist de zojuist geëxporteerde offerte uit het document.** `src/app/fab/fabStore.ts:139-149` (`snapshot`, `cancelCommand`).
Gemeten in de app: Quote openen, Export (Offerte-2026-001.pdf, in het document), kruis: `doc.fab.quotes` is leeg. Dezelfde offerte opnieuw exporteren geeft 2026-002. De klant heeft dan 2026-001 zonder dat het bestand dat weet (O3.2, O3.3), en één offerte heeft twee nummers.
Waarom: Cancel zet `doc.fab` terug naar de toestand bij het openen van de PM; de bevroren offerte is daarna toegevoegd.
Oplossing: een export is geen wijziging van het commando; bij Cancel `quotes` uit de huidige toestand houden (of het snapshot verversen na elke export).

**N-2 (P2). Hetzelfde kruis wist instellingen die in de dialoog met OK bevestigd zijn.** Zelfde plaats.
Gemeten: Quote-PM open, Company, naam "Testbedrijf", OK; kruis van de PM: de naam is weer leeg.
Oplossing: alleen terugzetten wat de PM zelf wijzigde (marge, btw-regime, reeks); wat in Fabrication Settings met OK bevestigd is, blijft.

**N-3 (P2). Een gewone platstaaf langer dan ongeveer 800 mm wordt "plaat met gaten of afgeronde hoeken".** `src/fab/recognize.ts:263`.
Gemeten zonder gaten: 40 x 8 x 400 en 100 x 5 x 400 → platstaal (juist); 40 x 8 x 900, 40 x 8 x 2000, 50 x 6 x 800, 60 x 10 x 1200, 100 x 5 x 2000 → plaat, van de zaagstaat af en naar de laser.
Waarom: `b.faces.some((f) => f.curved)`; de kern markeert de kleine kopvlakken van een lange staaf als gebogen (de twee vlakken van 320 mm² bij 40 x 8). Het commentaar in `geom.ts` bij `planeGroups` waarschuwt daar al voor.
Oplossing: "gevormd" afleiden uit de contour (`plateOutline`: bogen of binnencontouren), niet uit `faces.curved`. Test met een staaf van 2000 mm.

**P3**
- N-4: paneel x reeks is alleen in "één regel" gelijk aan de offerte; per groep en in detail scheelt het centen door afronden per regel (reeks 5: € 843,00 / € 843,05 / € 843,10). Het paneel zou de som van de gekozen weergave moeten tonen.
- N-5: garantie en verzekering zijn nu "3 x 1 % afgerond" (`src/fab/cost.ts:193`): € 6,03 waar 3 % van € 201,22 € 6,04 is. Het bedrag is aangepast om de vermenigvuldiging te laten kloppen; beter het bedrag juist en de eenheidsprijs als percentage tonen.
- N-6: plaatmodus "nest" rekent voor één plaatje van 200 x 100 een heel blad (€ 125,60); de restplaat telt niet als voorraad (P5.2 vraagt dat). De standaardmodus (rechthoek) is niet geraakt: PP1 € 1,62 materiaal, € 0,97 snijden, € 1,25 insteken, gelijk aan de handberekening.
- N-7: één plooi van 120° geeft "botsing in stap 1: kies een andere volgorde"; het been ligt zelf in de wig.
- N-8: `isMetal` kent St37, brons, titaan en "1060 Alloy" niet (worden "onbekend", dus veilig); gietstaal en verenstaal worden S235; "verlegd" weigert een buitenlands btw-nummer; een offerte van 4 regels is nog 2 pagina's; `patchFab` na de opslagdialoog schrijft in het document dat dan open is.

### 9.4 Criteria

Telling over de 92 criteria: **63 gehaald, 17 deels, 11 niet gehaald, 1 niet nagemeten** (was 44 / 27 / 20 / 1).

| Criterium | Nu | Opmerking |
|---|---|---|
| L2.10, L4.2, L4.5, P2.4, P4.2, P4.3, P5.1, O1.5, O1.7, O2.5, O3.4, O3.6 | gehaald | zelf gemeten (9.2) |
| L3.3 | gehaald | acht symbolen bekeken; nog niet op de tekenbladen van de CAD |
| L3.7, P2.9, O1.2, O1.4, O2.4, O3.5 | gehaald | code gelezen en test van de bouwer groen; invoer in de app niet doorgeklikt |
| L2.7, L3.5, P3.4, P3.6, P5.3 | deels | zoals de bouwer meldt; P3.4 en P5.3 niet zelf gemeten |
| P5.2 | deels | N-6 |
| O3.1 | deels | N-1: één offerte kan twee nummers krijgen |
| O3.2, O3.3 | deels | bevriezen en revisie bestaan; het record verdwijnt bij Cancel (N-1); melding alleen in de PM |
| L1.2, L1.4, L1.5, P1.4, P1.6, P2.6, P4.6, O2.9 | deels | ongewijzigd |
| L2.6, L2.8, L4.4, P2.7, P2.8, P3.3, P3.9, P4.7, P4.8, P5.5, O1.6 | niet gehaald | ongewijzigd; de bouwer meldt ze zelf als open |
| L1.6 | niet nagemeten | |

### 9.5 Oordeel per fase

| Fase | Oordeel | Open |
|---|---|---|
| F0 | vrijgegeven | N-3 |
| L1 voorraad en herkenning | vrijgegeven als voorstel dat Ian naleest | N-3; LF3 tot LF5 |
| L2 zaagstaat en zaagplan | **vrijgegeven voor het proefstuk LF1**, status "nog te zagen" | L2.8 |
| L3 lasnaden en lasvolgorde | **vrijgegeven als voorstel voor LF1**; het lasplan zegt zelf dat het een vuistregel is en dat EXC2 niet gecontroleerd wordt | aanzicht is een schets; L3.5 |
| L4 kostprijs per stuk | **vrijgegeven** (alle prijzen blijven AANNAME tot Ian ze invult) | L4.4 |
| P1 uitslag | vrijgegeven voor vlakke platen en ketens uit de basisflens | geen ontvouwer |
| P2 DXF | **vrijgegeven voor vlakke platen en gezette platen uit een basisflensketen**, status "nog te openen bij de lasersnijder" | P2.8 |
| P3 nesting | vrijgegeven als hulpmiddel voor een prijs | P3.9, worker |
| P4 plooivolgorde | **vrijgegeven voor een proefstrook** (L, Z, hoed), status "nog te plooien"; de botsingscontrole is beperkt en het blad zegt dat | N-7, P4.7, P4.8 |
| P5 prijs per plaat | vrijgegeven in de modus "rechthoek"; modus "nest" niet | N-6 |
| O1 kostprijsmodel | **vrijgegeven** | N-4, N-5 |
| O2 offerte en PDF | vrijgegeven als ONTWERP; een echte offerte pas na de bedrijfsgegevens en na de boekhouder (btw-regels, vermeldingen) | |
| O3 offertebeheer | **niet vrijgegeven** tot N-1 en N-2 weg zijn | N-1, N-2 |

Herstelvolgorde: N-1 en N-2 (één plaats, klein), N-3 (één regel plus een test), daarna de P3-lijst.

## 10. Status na hoofdstuk 9 (bouwer, 2026-11-19, niet gecommit)

Gemeten op de werkmap: `tsc` (app) schoon, `vitest run` 186 bestanden / 1330 tests groen, `VOORBEELDEN=1` voor fabVoorbeelden en fabOrakel 15 van 15 groen, `e2e/fab.mjs` zonder fout (nieuw: worker, slepen naar rood en terug, 5 plooistanden), line-budget en line-length groen, hoofdchunk 796,44 kB (budget 800), de nest-worker een eigen chunk van 69 kB. Beelden in `scratchpad/extensies-v3/` (24 schermbeelden, PDF-renders). Elke nieuwe test faalt zonder de wijziging; bij N-1, N-2, N-3, N-7 en N-8 (opslagdialoog) heb ik dat nagegaan door de oude code tijdelijk terug te zetten.

### Nieuwe bevindingen

| Nr | Status | Wat er nu is | Test |
|---|---|---|---|
| N-1 | opgelost | Cancel zet `doc.fab` terug maar houdt `quotes` uit de huidige toestand; nummers zitten in een eigen teller | fabStore.test N-1 (export, Cancel, opnieuw: één nummer) |
| N-2 | opgelost | OK in Fabrication Settings verschuift het snapshot (`confirmSettings`); Cancel van de PM zet alleen marge, btw-regime, staaflengte en zaaginstellingen terug | fabStore.test N-2 |
| N-3 | opgelost | "gevormd" uit de contour op halve dikte (binnencontour of geen rechthoek), niet uit `faces.curved` | review37: 40x8 x 400/900/2000, 50x6x800, 60x10x1200, 100x5x2000 platstaal; 2000 met gaten plaat |
| N-4 | opgelost | het paneel toont de som van de gekozen weergave (één regel, per groep, detail), elk afgerond als op de offerte | review37 N-4 (paneel x 5 = offerte, alle drie) |
| N-5 | opgelost | garantie en verzekering: 1 post, bedrag = % van het subtotaal één keer afgerond, het % in de tekst | review37 N-5 |
| N-6 | opgelost | plaatmodus "nest" rekent het gebruikte deel van elk blad (strook tot het laatste stuk + rand); de rest staat als "restplaat L x B terug naar voorraad" | review37 P5.2/N-6 |
| N-7 | opgelost | de benen van de plooi zelf zijn geen botsing (alleen wat na een eerdere plooi komt); een binnenhoek < 84 graden geeft de melding "spitse stempel en matrijs" | nestbend N-7 |
| N-8 | opgelost | isMetal kent St37/St52, brons, titaan, "1060 Alloy"; gietstaal, verenstaal, alloy steel, Hardox, C45, 42CrMo4 zijn geen S235; validateFab weigert een lasnaad zonder soort/proces/positie/niveau en een beschadigd bevroren record; verlegd met een EU-btw-nummer is een waarschuwing (VIES), geen weigering; een offerte van 4 regels met modelbeeld is 1 pagina (totalen naast "voor akkoord", drie korte blokken naast elkaar, voorwaarden 7,5 pt); na de opslagdialoog gaat het record niet in een ander model dat intussen open is | review37 N-8 (2), quote.test N-8 (2), fabStore.test N-8 |

### Open criteria

| Criterium | Nu | Opmerking |
|---|---|---|
| P1.4 algemene ontvouwer | gehaald voor de geteste gevallen | `unfoldMesh.ts`: huid met dikte t, regio's per vlak, uitvouwen om de kreukels, plooistroken op de neutrale vezel. Tray uit tab + 2 randflenzen: 133,418 tegen hand 133,425 (facetten); L + randflens + gat: gat behouden. Controle: oppervlak x t met K = 0,5 tegen het volume (0,5 %) en het aantal gaten uit de wandringen. Het gat komt als veelhoek van de facetten, niet als cirkel. Zomen, jogs, gebogen flenzen niet getest |
| L2.8, P4.8 tabellen op tekenbladen | grotendeels | Annotation ▸ Tables: "Frame Cut List" en "Bend Table" (de naam "Weldment" verbiedt de uiTekst-toets); rijen = zaagstaat en plooitabel van de PDF; bewaard met de tekening. Niet: ballonnen met positienummers, verversen bij een modelwijziging (opnieuw invoegen ververst), keuze van het plooistuk |
| L3.5 slepen | gehaald | slepen in de PM en in de FeatureManager-map "Weld Joints"; volgorde blijft na opslaan en openen |
| FeatureManager-mappen | gehaald | "Weld Joints(n)" en "Quotes(n)" uit `doc.fab` (geen fab-code in de hoofdchunk); dubbelklik opent de view |
| Lasplan-aanzicht | gehaald | echte projectie van de scherpe en silhouetranden van elk lichaam, schaal 1:N; draadmodel, verborgen lijnen niet weggelaten |
| P3.6 worker + Cancel | gehaald | nesten in een Web Worker; Cancel Nesting aan zolang hij loopt, stopt hem |
| P3.9 verschuiven | gehaald | stuk slepen op het blad; overlap of over de rand: rood, export geblokkeerd; status "moved by hand" |
| P4.7 plooistappen | gehaald | doorsnede na elke stap, gevouwen op de neutrale vezel; oppervlak gelijk binnen 0,06 % (hoed, Z) |
| L2.6 LF4/LF5 | gehaald | staven per profiel gelijk aan het orakel (TD-01 met holle kokers via een extra generatoroptie `werkplaats`, standaarduitvoer byte-gelijk; FR-13) |
| L4.4 | gehaald | staal -0,5 % (zaagsnede), zagen gelijk, lassen +0,9 %: de kern vindt nu ook lijncontacten (`weldEdge.ts`, tweezijdig, hechtlassen 50 om 200 op dunne platen); 4 puntcontacten van 3 mm zijn geen naad |
| O1.6 | deels | staal gelijk, glas/beslag/plaatsen als koop- en vrije regels; arbeid 6,89 u tegen 8,54 u: opspannen, taatsplaten, richten, coater, glazen hebben geen regel in het algemene model |
| P2.7 | gehaald | 12 van 12 posities gelijk (de achthoek werd een cirkel: `fitArcs` controleert nu de knik) |
| P3.3, P5.5 | gehaald | 1 blad = orakel; laser +1,2 % (met afstand 0; met de standaardafstand +8,5 %) |
| P2.8 | niet | DXF nog niet in een externe viewer geopend |
| O2.9 | deels | geen beeldvergelijking |
| L1.2, L1.4, L1.5, L1.6, P1.6, P2.6, P4.6 | niet nagemeten | |

Bekend en niet opgelost: lijncontacten korter dan 30 mm worden niet gelast (EN 1993-1-8, 4.5.1), ook waar Ian dat wel zou doen; de ontvouwer neemt de straal uit `doc.sheetMetal`, niet per randflens.

## 11. Derde beoordeling (Fable 5.2, 2026-11-19, commit dd2ab32)

Beoordeeld op een schone `git archive` van dd2ab32 (`scratchpad/review-fab3`). Geen code gewijzigd, niets gecommit.

### 11.1 Wat ik gedraaid heb

| Stap | Resultaat |
|---|---|
| `vitest run src/fab src/app/fab src/app/drawing/fabTables.test.ts` + `persistence3.test.ts` | 145 van 146; de ene (`fabStore.test.ts`, "a new hourly rate reprices…") viel uit terwijl ik tegelijk andere tests draaide (17,7 s); alleen gedraaid 11 van 11 groen |
| `VOORBEELDEN=1` `fabVoorbeelden.test.ts` / `fabOrakel.test.ts` | 6 van 6 / 9 van 9 groen |
| `examples.check.test.ts` (L1.6) | 98 van 98 groen |
| `tsc -b`, build, bundel- en regelbudget | schoon; hoofdchunk 796,33 kB (budget 800); nest-worker 68,9 kB |
| `e2e/fab.mjs` | exit 0 |
| meetscript van ronde 2 opnieuw (`rlog7.txt`), nieuw script voor ontvouwer, lijncontacten en voorbeelden (`scripts3/zzRound3.test.ts`, `zzHole.test.ts`; `rlog5.txt`, `rlog6.txt`), eigen e2e-script | zie hieronder |

Niet gedaan: de bibliotheekgroep (liep te lang, afgebroken), de volledige `vitest run`, een DXF in een externe viewer, slepen in de boom en op het legplan met de hand doorgeklikt (wel gedekt door `e2e/fab.mjs` van de bouwer), L1.5 in de app (mijn eigen stap liep vast op een selector).

### 11.2 N-1 tot N-8

| Nr | Oordeel | Gemeten |
|---|---|---|
| N-1 | **opgelost** | in de app: export, kruis, opnieuw exporteren: `2026-001A` blijft in het document en het bestand heet weer Offerte-2026-001 |
| N-2 | **opgelost** | bedrijfsnaam met OK bevestigd blijft "Testbedrijf" na het kruis van de Quote-PM |
| N-3 | **opgelost** | 40 x 8 x 2000 zonder gaten: platstaal; strook met gaten: plaat |
| N-4 | opgelost | volgens de test van de bouwer; in de kern: één regel € 843,05 = 5 x € 168,61 |
| N-5 | **opgelost** | garantie € 6,04 |
| N-6 | **opgelost** | PP1 in modus "nest": € 7,54 met "restplaat 1880 x 1000 terug naar voorraad" (was € 125,60). De strook naast het stuk telt nog als verbruikt |
| N-7 | **opgelost** | één plooi van 120°: geen botsing |
| N-8 | **opgelost** | lasnaad zonder soort geweigerd; offerte van 4 regels is 1 pagina |

### 11.3 De nieuwe onderdelen

**Ontvouwer (`src/fab/unfoldMesh.ts`, `flatMesh.ts`).** Tab 120 x 80 met één randflens van 30:

| Geval | Uitslag | Met de hand | Oordeel |
|---|---|---|---|
| t 2, r 2, K 0,5 | 106,709 | 106,712 | goed (0,003) |
| t 2, r 2, DIN 6935 | 106,160 | 106,163 | goed |
| t 3, r 1, K 0,5 | 105,924 | 105,927 | goed |
| flens omgekeerd; 60°; 120° | 106,709; 108,522; 102,419 | 106,712; –; – | goed; oppervlak x t / volume 1,0000 tot 1,0002 |
| flens met eigen straal 5 (standaard 2) | 104,470 | 105,425 | fout, **geweigerd** (volume −0,88 %) |
| flens met eigen straal 0,5 | 107,943 | 107,356 | fout, **geweigerd** (0,55 %) |
| tab 400 x 600, flens met eigen straal 6 | 623,680 | 624,996 | **1,3 mm fout en toch "exact"** (volume 0,21 %); plooihoek 86,2° in plaats van 90° |
| zoom gesloten, druppel, gerold | – | – | geweigerd ("meer dan twee zijden") |
| zoom open | 93,374 | – | geweigerd (volume 1,32 %) |
| jog | – | – | geweigerd ("meer dan twee zijden") |

Met de standaardstraal is de ontvouwer nauwkeurig. Zomen en jogs worden geweigerd, niet ontvouwen: dat is veilig, maar "algemeen" is hij dus niet.

**Gat als veelhoek.** L met gat en randflens (ontvouwer): Ø8 komt als polylijn van 22 segmenten (10 bogen), Ø9 van 22, Ø20 van 12; geen CIRCLE in de DXF. De vorm klopt: straal 3,993 tot 4,004, oppervlak 50,25 tegen 50,27. Het is niet alleen de ontvouwer: dezelfde L zonder randflens (de uitslag van het model zelf) geeft voor Ø9 een polylijn van 107 segmenten en voor Ø20 van 100; alleen Ø8 kwam als cirkel (r = 3,9952). Ook het hijsoog van de lastafel (gewone plaat van 16 mm) heeft zijn gat als veelhoek. P1.7 haalde ik in ronde 1 op PP1; op deze stukken niet.

**Lasregels (`src/fab/weldEdge.ts`, `weld.ts`).** Lijncontact 20 en 29 mm: geen naad; 31 en 60 mm: naad van die lengte, tweezijdig. Dunne plaat met meer dan 400 mm naad: hechtlassen 50 om 200 (AANNAME, staat zo in de code). Orakel L4.4: groen.

**Tabellen, mappen, worker, slepen, plooistanden, lasaanzicht.** Gedekt door de tests van de bouwer en `e2e/fab.mjs` (exit 0); het lasplan-beeld bekeken: echte projectie als draadmodel, schaal 1:10, de verstekken zijn er niet in te zien. Niet zelf doorgemeten.

### 11.4 De twee besluiten van de bouwer

**1. Lijncontacten korter dan 30 mm krijgen geen las (EN 1993-1-8, 4.5.1).** Uit mijn geheugen, de norm is betalend en dus te verifiëren: 4.5.1(2) zegt dat een hoeklas met een effectieve lengte kleiner dan 30 mm of 6 maal de keeldikte, de grootste van de twee, niet als krachtdragend gerekend mag worden. Dat is een rekenregel, geen verbod om te lassen. Oordeel:
- de grens van 30 mm is verdedigbaar als drempel; de 6a staat in het commentaar maar niet in de code (bij a ≥ 5,5 is 6a groter dan 30);
- stil weglaten is niet goed: de verbinding ontbreekt dan in lasplan, hechttijd en kostprijs, en een korte las die wel nodig is verdwijnt zonder melding. Beter: tonen als voorstel "korte las, niet dragend (EN 1993-1-8 4.5.1)", standaard uitgevinkt, met de telling in de PM;
- de regel geldt nu alleen voor lijncontacten, niet voor vlakcontacten. Dat is goed zo (een kokereind is altijd langer).

**2. De ontvouwer neemt de straal uit `doc.sheetMetal`, niet per randflens.** Niet aanvaardbaar zoals het nu is: zie de tabel, 1,3 mm fout op een groot stuk met het oordeel "exact". De controle op het volume vangt het alleen op kleine stukken. De straal is uit de mesh zelf te halen (koorde en knikhoek van de facetten van de plooistrook: ρ = koorde / (2 sin(δ/2))); tot dan moet een stuk met een eigen straal op een flens, zoom of jog geweigerd worden.

### 11.5 Nieuwe bevindingen

**N-9 (P1). Fout ontvouwen stuk met het oordeel "exact" bij een flens met eigen straal.** `src/fab/flat.ts:183` (geeft `sm.bendRadius` door), `src/fab/unfoldMesh.ts` (`rho`, `neutral`).
Gemeten: 623,680 tegen 624,996 mm. Oplossing: 11.4 punt 2. Test: de tab van 400 x 600 met straal 6.

**N-10 (P2). Gaten in gezette stukken en in sommige vlakke platen komen als polylijn van 12 tot 107 stukjes in de DXF, niet als CIRCLE.** `src/fab/loops.ts` (`fitArcs`: cirkel door drie punten, tolerantie 0,005 mm).
De hoekpunten van een CSG-mesh wijken tot ongeveer 0,01 mm af (gemeten 3,993 tot 4,004). Oplossing: cirkel met kleinste kwadraten en een tolerantie van 0,02 mm, en de knikcontrole die de achthoek tegenhoudt behouden. Test: Ø9 en Ø20 in de L, met en zonder randflens, en het hijsoog.

**N-11 (P2). Een model met een mislukte feature krijgt een uitslag "exact" van de geometrie zonder die feature.** `src/fab/flat.ts` (`flatOfSheet`), `src/fab/bodies.ts`.
Gemeten: tab met een jog die niet bouwt (1 herbouwfout): uitslag 120 x 80, "exact", DXF mogelijk. Oplossing: bij een herbouwfout in het part geen uitslag (`betrouwbaar: 'geen'` met de foutmelding van de feature).

**P3**
- N-12: de aanduiding van hechtlassen `n x 50 (200)`: in ISO 2553 is het getal tussen haakjes de tussenruimte; "50 om 200" hart op hart is `(150)`.
- N-13: `fabStore.test.ts` "a new hourly rate reprices…" duurt onder belasting 17,7 s en valt dan uit; een ruimere tijdslimiet of een lichter model.
- N-14: lastafel: de vier "Oog cilinder"-platen worden geweigerd (oppervlak x dikte 0,79 % naast het volume, 0 gaten gevonden) en de lipplaat heeft geen gat waar `LIP_12mm_4st.dxf` er een heeft. Niet verklaard; kan aan het vereenvoudigde model liggen.
- N-15: "Frame Cut List" en "Bend Table" verversen niet bij een modelwijziging en hebben geen ballonnen (meldt de bouwer zelf).

### 11.6 Criteria die de bouwer niet nagemeten had

| Criterium | Oordeel | Gemeten |
|---|---|---|
| L1.2 | deels | LF2 (lastafel Onderframe): 8 van 14 bodies herkend (2 UPN 100, 2 platstaal 40 x 20, 4 platen 16), 6 "onbekend" met reden. LF3 was een fout proefstuk van mij: het Bovenframe van de afzuiging is PETG en wordt terecht "geen metaal" |
| L1.4 | gehaald | 12 kokers tegen de tabelwaarden die ik ken (40x40x3 = 3,30 … 120x80x5 = 14,4): alle binnen 0,2 %. De tabel zelf blijft te verifiëren |
| L1.5 | deels | JSON heen en terug getest; herstart in de app niet gemeten |
| L1.6 | gehaald | `examples.check.test.ts` 98 van 98 |
| P1.6 | deels | lastafel: lipplaat 12, hijsoog 16, kapdak 6, kapzijde 8, bodem 3 als plaat van de juiste dikte; oog cilinder geweigerd; platen van 3,5 / 6,5 / 7,5 / 8,5 / 9,5 mm en de armen "onbekend". Geen profiel als plaat geteld |
| P2.6 | deels | rooster: gelijk (test). Lastafel tegen `Laserwerk-DXF-lastafel.zip`: KAPZ gelijk (503 x 127,5; snijlengte 1506,7 tegen 1506,7), HIJS gelijk (361,0 tegen 360,9); LIP verschilt (N-14); de andere zes posities staan niet als plaat in de modellen |
| P4.6 | deels | niet te meten op PP6: de opvanglade is uit extrusies getekend, geen plaatwerk; de melding zelf is in de kern getest |

### 11.7 Criteria

Telling over de 92 criteria: **76 gehaald, 15 deels, 1 niet gehaald** (was 63 / 17 / 11 / 1).

| Criterium | Nu | Opmerking |
|---|---|---|
| O3.1, P5.2, L1.4, L1.6 | gehaald | zelf gemeten |
| L2.6, L4.4, P2.7, P3.3, P5.5 | gehaald | `fabOrakel.test.ts` 9 van 9; niet elk getal zelf nagerekend |
| L3.5, P3.6, P3.9, P4.7, O3.2 | gehaald | tests en e2e van de bouwer groen; niet met de hand doorgeklikt |
| P1.7 | **deels** (was gehaald) | N-10 |
| P1.4 | deels | N-9; zomen en jogs geweigerd |
| L2.8, P4.8 | deels (was niet) | tabellen bestaan; N-15 |
| O1.6 | deels (was niet) | arbeid 6,89 u tegen 8,54 u, zoals de bouwer meldt |
| L1.2, L1.5, L2.7, P1.6, P2.6, P3.4, P4.6, P5.3, O2.9, O3.3 | deels | |
| P2.8 | niet gehaald | DXF nog niet buiten de app geopend |

### 11.8 Oordeel per fase

| Fase | Oordeel | Open |
|---|---|---|
| F0 | vrijgegeven | |
| L1 voorraad en herkenning | vrijgegeven als voorstel dat Ian naleest | |
| L2 zaagstaat en zaagplan | **vrijgegeven voor LF1**, status "nog te zagen" | N-15 |
| L3 lasnaden en lasvolgorde | **vrijgegeven als voorstel**; korte lijncontacten tonen in plaats van weglaten | 11.4 punt 1, N-12 |
| L4 kostprijs per stuk | **vrijgegeven** | |
| P1 uitslag | **vrijgegeven** voor vlakke platen, ketens uit de basisflens en randflenzen met de standaardstraal. **Niet** voor een flens, zoom of jog met eigen straal | N-9, N-11 |
| P2 DXF | vrijgegeven voor dezelfde stukken, status "nog te openen bij de lasersnijder"; voor een echte bestelling van een stuk met gaten eerst N-10 | N-10, P2.8 |
| P3 nesting | **vrijgegeven** (rechthoek en paren; worker, annuleren, verschuiven) | |
| P4 plooivolgorde | **vrijgegeven voor een proefstrook**, status "nog te plooien" | N-15 |
| P5 prijs per plaat | **vrijgegeven** | |
| O1 kostprijsmodel | **vrijgegeven** | O1.6 |
| O2 offerte en PDF | vrijgegeven als ONTWERP; een echte offerte na de bedrijfsgegevens en de boekhouder | O2.9 |
| O3 offertebeheer | **vrijgegeven** | |

Herstelvolgorde: N-9 (of tijdelijk weigeren), N-11, N-10, dan de korte lassen en de P3-lijst.

## 12. Status na hoofdstuk 11 (bouwer, 2026-11-19, niet gecommit)

Gemeten op de werkmap: `tsc` (app) schoon; `vitest run` 187 bestanden, 1347 tests, waarvan 1 time-out van 120 s in `qaBrep.test.ts` (loft op de B-rep-kern, geen fab-code) onder volle belasting; die file alleen: 37 van 37 groen. `VOORBEELDEN=1` fabVoorbeelden + fabOrakel 16 van 16; `e2e/fab.mjs` zonder fout; line-budget en line-length groen; hoofdchunk 796,44 kB. Beelden en PDF-renders in `scratchpad/extensies-v4/`. Nieuwe tests in `src/fab/unfold37.test.ts` (16), `fabTables.test.ts` (N-15), `fabVoorbeelden.test.ts` (N-10/N-14).

| Nr | Status | Wat er nu is | Test |
|---|---|---|---|
| N-9 | opgelost | de ontvouwer vouwt twee keer uit: eerst om de plooizones te vinden (de facetten die de kern als gebogen markeert), dan met per zone de straal uit de koorden: W = n 2 rho sin(Theta / 2n); binnenstraal = rho (binnenkant) of rho - t (buitenkant); K per plooi (DIN 6935 voor die straal, of de K van het model). Ongelijke koorden (> 15 %) of een negatieve straal: geweigerd. Plooilijn met hoek en gemeten straal | unfold37: tab 400 x 600 met flens r 6: 624,996 met de hand, binnen 0,05, 90 graden, r 6; flens r 5 en r 0,5 (waren geweigerd); standaardstraal ongewijzigd |
| N-11 | opgelost | een herbouwfout of een waarschuwing "not closed / opening" in het part geeft geen uitslag (`betrouwbaar: 'geen'`, "geen uitslag: herbouw met fouten: …"), ook niet voor een vlakke plaat | unfold37 N-11 (randflens die niet bouwt) |
| N-10 | opgelost | `fitArcs`: cirkel met kleinste kwadraten door alle punten, tolerantie 0,02 mm, de knikcontrole (30 graden) op punten minstens 0,05 mm uit elkaar (zigzag van naden). Een gepaste lus die gemiddeld meer dan 0,05 mm van de veelhoek ligt (oppervlakteverschil / omtrek), blijft de veelhoek | unfold37: Ø8, Ø9, Ø20 in de L met en zonder randflens: één CIRCLE in de DXF; voorbeelden: hijsoog Ø30 één cirkel |
| korte lassen | opgelost | een lijncontact korter dan max(30 mm, 6a) (in de code, `shortWeld`) wordt voorgesteld als "korte las, niet dragend (EN 1993-1-8, 4.5.1)", uitgevinkt; telling en vinkje in de PM; op het lasplan met de opmerking "korte las, niet dragend, niet meegeteld"; in de kostprijs alleen aangevinkt. Puntcontacten onder 5 mm blijven geen naad | unfold37: 20 mm kort, 60 mm normaal; 6a: a 7 geeft 40 kort, 50 niet; kost alleen aangevinkt |
| N-12 | opgelost | hechtlas 50 om 200 hart op hart: `n x 50 (150)` (tussenruimte) | unfold37 N-12 |
| N-13 | opgelost | de `beforeEach` van `fabStore.test.ts` opent LF1 en kreeg de standaard 10 s van een hook; nu 120 s. De test zelf rekent deterministisch (geen tijd in de uitkomst) | |
| N-14 | verklaard en deels opgelost | oog cilinder: de generator tekent de kop R34 als 8 koorden van 22,5 graden; `fitArcs` maakte er een boog van (0,8 % meer oppervlak) en de volumecontrole weigerde. Nu blijft zo'n grove veelhoek zoals getekend: 4 stuks, exact. Lipplaat: de generator tekent de plaat zonder boring, de pen Ø40 loopt erdoor (`maak-lastafel.mjs` cilinderbok); het model mist het gat, niet de kern | voorbeelden N-10/N-14 (overlap pen en lipplaat gemeten) |
| N-15 | opgelost | een Frame Cut List of Bend Table bewaart de sleutel van het model van zijn view (`bron`); na elke wijziging van de tekening krijgen de tabellen met een andere sleutel nieuwe cellen. Ballonnen met positienummers: niet gebouwd | fabTables.test N-15 |
| zomen en jogs | deels | open zoom: ontvouwen en exact, binnenstraal gap / 2 = 0,5 gemeten, 80 + pi (r + K t) + (10 - (r + t)) = 92,212 met de hand tegen 92,199 (facetten van 180 graden). Gesloten, druppel en gerold zoom en de jog: geweigerd ("meer dan twee zijden"): bij een gesloten zoom raken de twee lagen elkaar, en de jog van de kern geeft een derde zijde die ik niet heb kunnen verklaren | unfold37 hems en jogs |

Nog open: P2.8 (DXF buiten de app), ballonnen bij de cut list, gesloten zomen en jogs, O1.6 arbeid.

## 13. Vierde controle (Fable 5.2, 2026-11-19, commit 997f3a5)

Beoordeeld op een schone `git archive` van 997f3a5 (`scratchpad/review-fab4`). Geen code gewijzigd, niets gecommit.

### 13.1 Wat ik gedraaid heb

| Stap | Resultaat |
|---|---|
| `vitest run src/fab src/app/fab src/app/drawing/fabTables.test.ts` | 150 van 150 groen (de tijdgevoelige test van N-13 ook) |
| `VOORBEELDEN=1` `fabVoorbeelden.test.ts` + `fabOrakel.test.ts` | 16 van 16 groen |
| `tsc -b`, build, bundel- en regelbudget | schoon; hoofdchunk 796,33 kB (budget 800) |
| `e2e/fab.mjs` | exit 0 |
| mijn scripts van ronde 3 ongewijzigd opnieuw (`scripts3/zzRound3.test.ts`, `zzHole.test.ts`), uitvoer in `scratchpad/rlog8.txt` | zie 13.2 |

Niet gedaan: de volledige `vitest run`, mijn eigen e2e-script van ronde 2 en 3 (de offertestroom is in deze commit niet geraakt), de tabellen op een tekenblad en de korte lassen in de app met de hand doorgeklikt.

### 13.2 De bevindingen uit hoofdstuk 11

| Nr | Oordeel | Gemeten |
|---|---|---|
| N-9 | **opgelost** | tab 400 x 600 met flensstraal 6: 624,988 tegen 624,996 met de hand (0,008), plooihoek 90°, "exact". Flensstraal 5: 105,418 tegen 105,425; flensstraal 0,5: 107,355 tegen 107,356 (waren geweigerd). Standaardstraal ongewijzigd: 106,709 / 106,160 / 105,924 |
| N-10 | **opgelost** | Ø8, Ø9, Ø20 in de L: één CIRCLE in de DXF, via de ontvouwer r = 3,9994 / 4,4997 / 9,9993, via de uitslag van het model 3,9969 / 4,4966 / 9,9932. Hijsoog lastafel: 1 cirkel, snijlengte 360,9 (bestaande DXF 360,9) |
| N-11 | **opgelost** | jog die niet bouwt: "geen uitslag: herbouw met fouten: The jog line does not cross the sheet." |
| korte lassen | **opgelost** | lijncontact van 20 en 29 mm komt nu terug als contact (was: geen naad); de markering "kort, niet meegeteld" en max(30, 6a) gelezen in `weld.ts` en `weldEdge.ts`, test van de bouwer groen. Niet in de app bekeken |
| N-12 | opgelost | `e: 150` in `weld.ts` (gelezen); test groen |
| N-13 | **opgelost** | de test slaagt in de volledige fab-run |
| N-14 | **verklaard** | oog cilinder: nu 4 stuks, exact, als veelhoek zoals getekend (snijlengte 294,1). Lipplaat: het model heeft geen boring; dat is een zaak van de generator van de lastafel, niet van de extensies |
| N-15 | opgelost voor het verversen | test groen; ballonnen niet gebouwd |
| zomen en jogs | zoals gemeld | open zoom: 92,199, exact (hand van de bouwer 92,212). Gesloten, druppel, gerold en jog: geweigerd met reden |

De radius uit de uitslag van het model ligt tot 0,007 mm onder de nominale (9,9932 voor r 10): de cirkel gaat door de hoekpunten van de facetten van de kern. Binnen elke snijtolerantie; ik meld het alleen.

### 13.3 Opmerkingen (P3)

- De weigering bij een open mesh hangt aan de Engelse tekst van de waarschuwing (`/not closed|opening/` in `src/fab/bodies.ts`). Wijzigt die tekst, dan valt de controle stil weg. Beter een code op de waarschuwing.
- De cirkelpassing (0,02 mm) maakt ook van een zeer fijn getekende veelhoek een cirkel. De rem (gemiddeld meer dan 0,05 mm naast de veelhoek blijft veelhoek) werkt op de achtkoorde R34; een bewust getekende fijne veelhoek in een klein gat wordt een cirkel. Dat is voor een laser wat je wilt.
- Gesloten zomen en jogs blijven geweigerd; de ontvouwer dekt randflenzen (ook met eigen straal) en open zomen.

### 13.4 Criteria

Telling over de 92 criteria: **79 gehaald, 12 deels, 1 niet gehaald** (was 76 / 15 / 1).

| Criterium | Nu | Opmerking |
|---|---|---|
| P1.7 | gehaald (terug) | N-10 |
| P1.4 | gehaald | het criterium vraagt PP3 (randflenzen, gat): uitslag binnen 0,01, gat behouden als cirkel; wat niet kan wordt geweigerd |
| P4.8 | gehaald | tabel met dezelfde plooien, ververst mee (test van de bouwer) |
| L2.8 | deels | tabel staat op het blad en ververst; geen ballonnen |
| L1.2, L1.5, L2.7, P1.6, P2.6, P3.4, P4.6, P5.3, O1.6, O2.9, O3.3 | deels | ongewijzigd |
| P2.8 | niet gehaald | DXF nog niet buiten de app geopend |

### 13.5 Oordeel per fase

Er staat geen P1 of P2 meer open.

| Fase | Oordeel | Open |
|---|---|---|
| F0 | vrijgegeven | |
| L1 voorraad en herkenning | vrijgegeven als voorstel dat Ian naleest | LF4/LF5 alleen via het orakel |
| L2 zaagstaat en zaagplan | **vrijgegeven**, status "nog te zagen" tot LF1 gezaagd en nagemeten is | ballonnen (L2.8) |
| L3 lasnaden en lasvolgorde | **vrijgegeven als voorstel**; het lasplan zegt dat het een vuistregel is en dat EXC2 niet gecontroleerd wordt | |
| L4 kostprijs per stuk | **vrijgegeven**; alle prijzen blijven AANNAME tot Ian ze invult | |
| P1 uitslag | **vrijgegeven** voor vlakke platen, ketens uit de basisflens, randflenzen (ook met eigen straal) en open zomen; gesloten zomen en jogs worden geweigerd | |
| P2 DXF | **vrijgegeven**, status "nog te openen bij de lasersnijder" tot P2.8 | P2.8 |
| P3 nesting | **vrijgegeven** | vrije vormnesting (P3.4) |
| P4 plooivolgorde | **vrijgegeven voor een proefstrook**, status "nog te plooien"; de botsingscontrole is beperkt en het blad zegt dat | |
| P5 prijs per plaat | **vrijgegeven** | |
| O1 kostprijsmodel | **vrijgegeven** | O1.6: arbeid 6,89 u tegen 8,54 u bij de taatsdeur |
| O2 offerte en PDF | vrijgegeven als ONTWERP; een echte offerte na de bedrijfsgegevens en nadat de boekhouder de btw-regels en vermeldingen las | O2.9 |
| O3 offertebeheer | **vrijgegeven** | |

Wat nu nog tussen "vrijgegeven" en "in gebruik" staat, is werk van Ian en niet van de bouwer: een DXF openen bij een lasersnijder (P2.8), LF1 zagen en nameten, een proefstrook plooien, eigen prijzen en bedrijfsgegevens invullen, de offertesjabloon laten nalezen door de boekhouder.

## 14. Restpunten na de vrijgave (bouwer, 2026-11-19, niet gecommit)

Gemeten op de werkmap: `tsc` (app) schoon, `vitest run` 188 bestanden / 1355 tests groen, `VOORBEELDEN=1` fabVoorbeelden + fabOrakel 16 van 16, `e2e/fab.mjs` zonder fout, line-budget en line-length groen, hoofdchunk 796,44 kB. Beelden in `scratchpad/extensies-v5/`.

| Punt | Status | Wat er nu is | Test |
|---|---|---|---|
| open mesh | opgelost | `bodies.ts` leest de vlag die de manifold-poort van de kern op het lichaam zet (`geometry.userData.openArea`, `solid.ts`), niet de tekst van de waarschuwing. De melding noemt de opening in mm² | unfold37: lichaam met de vlag en zonder waarschuwing: geen uitslag; waarschuwingstekst zonder de vlag: niets |
| L2.8 ballonnen | opgelost | de Frame Cut List zet één ballon per zaagstaatpositie op zijn view (ITEM NO. van de tabel, aan het midden van het eerste stuk van die positie, rond de view gelegd zoals Auto Balloon); bij verversen worden de eigen ballonnen vervangen, andere blijven | fabTables.test L2.8 |
| O1.6 | **verklaard, Ian beslist** (+7,0 %; zonder de twee verklaarde posten 0,0 %) | (1) een lat (strip van ten hoogste 6 mm, contact een gevulde rechthoek minstens 10 x zo lang als breed) wordt een hechtlas om de 150 en per meter lat gerekend (`latPerM`, 0,12 u/m uit de werkwijze van de bibliotheek, AANNAME); de koppen van een lat tegen het kader horen bij die lat; (2) werkstappen van de werkplaats in Fabrication Settings ▸ Machines: naam, uren, per order / per gelast geheel / per koopdeel waarvan de naam de filter bevat; gecontroleerd bij import. Taatsdeur TD-01 met de stappen van de deur (ook "latten achter passen en schroeven, M4 tappen": de latten achter zijn in dit model een eigen, geschroefd onderdeel): 9,14 u tegen 8,54 u van `kostprijs()` (+7,0 %). Twee verschillen blijven en zijn gemeten: de kern zaagt de 8 glaslatten als stukken (0,48 u; het orakel zaagt ze bij het glazen) en rekent de 4 greepvoeten die het model als laserdeel tekent (0,12 u; het orakel heeft ze niet). Zonder die twee: 8,54 u (0,0 %). Binnen 5 % als totaal: niet | fabOrakel O1.6; unfold37 lat en werkstappen |
| zomen en jogs | geweigerd, oorzaak vastgelegd | gemeten: de kern bouwt een gesloten, druppel- en gerolde zoom als hetzelfde lichaam (124 driehoeken, gelijk volume): een scherpe vouw van 180 graden zonder buigcilinder, zodat de zoomlaag een derde huid is; druppel en rol zijn dus niet als zodanig gemodelleerd. De jog bestaat uit blokken die op samenvallende vlakken zijn samengevoegd (6 huidstukken). Uitvouwen zou een straal verzinnen die het model niet heeft. De open zoom wordt wel ontvouwen (hoofdstuk 12) | unfold37 hems en jogs |
| P2.8 | structureel gehaald | een eigen strenge R12-lezer (`dxfR12.test.ts`), los van de schrijver en van de DXF-import van de CAD: groepparen, gehele codes, getallen zonder komma of exponent, alleen R12-entiteiten (geen LWPOLYLINE), elke laag en lijnsoort in de tabellen, POLYLINE met VERTEX en SEQEND, bulge ten hoogste een halve cirkel, EOF; de snijlengte uit het bestand gelijk aan de uitslag (0,01 mm). Op PP1, het hoedprofiel (ZETLIJN_OP/NEER) en een legplanblad; vier negatieve gevallen. Het bestand openen bij de lasersnijder blijft de stap van Ian; tot dan blijft de status "nog te openen bij de lasersnijder" | dxfR12.test (4) |

## 15. Zomen en jog met echte plooien (bouwer, 2026-11-20, niet gecommit)

De oorzaak lag in de kern, niet in de ontvouwer. Zomen en jog worden nu gebouwd zoals in SOLIDWORKS, en de algemene ontvouwer vouwt ze alle exact uit.

| Onderdeel | Was | Nu | Test |
|---|---|---|---|
| Gesloten zoom | scherpe vouw van 180 graden met straal 0,01; de twee lagen raken en worden één blok | de minimale spleet van SW (`closedHemGap` = max(0,02; 0,05 t)), binnenstraal spleet / 2; twee lagen | unfold37: 80 - (r + t) + pi (r + K t) + 10 met de hand, exact |
| Open zoom | spleet = Gap Distance | ongewijzigd | idem, 92,212 met de hand |
| Druppelzoom | hetzelfde lichaam als gesloten | Angle (181-359) en Radius zoals in de SW-PM; de krul over die hoek, dan een recht been tot de spleet boven de plaat | unfold37 (225 graden, R 2), flangeExact: beide kernels tegen de formule |
| Gerolde zoom | hetzelfde lichaam als gesloten | Angle en Radius; alleen de krul | unfold37 (270 graden, R 4, ook DIN 6935 voor die straal), flangeExact, sheetmetal.test |
| Jog | blokken die elkaar overlappen (6 huidstukken) | twee echte plooien met de straal; Offset Outside / Inside / Overall Dimension, Fix projected length aan/uit, Jog Position, Jog Angle, Custom Bend Allowance; één gesloten plaat (de drie stukken op hun twee gedeelde vlakken samengevoegd) | unfoldJog (9 gevallen tegen de hand, K 0,5, DIN 6935, K 0,4), jogBends (8, gesloten, plooistralen, volume = oppervlak x t), brep.test jog |
| PM | Tear Drop en Rolled uitgeschakeld | Closed/Open: Length (+ Gap Distance); Tear Drop/Rolled: Angle en Radius; Jog: "Outside Offset / Inside Offset / Overall Dimension" en Custom Bend Allowance | hem.mjs (10/10), jogmiter.mjs (7/7) |

De ontvouwer: een krul voorbij 180 graden krijgt evenveel facetten per graad als een plooi van 90 graden (de kern markeert ze gebogen); de plooihoek is de som van de knikken van de facetten (de hoek tussen twee flensnormalen stopt bij 180 graden, een gerolde zoom heeft geen flens erna); naburige randen moeten ook met hun eindpunten op elkaars lijn liggen (de diagonaal van een lang smal facet liep anders over twee stroken). Oude bestanden laden: een zoom zonder Angle of Radius krijgt de SW-standaard (druppel 225 graden / 1 t, gerold 270 graden / 2 t); een oude jog wordt met de nieuwe, juiste meetkunde herbouwd. Een jog op het geboorde lipje bouwt nu in minder dan een seconde (was 332 s).

Gemeten: `tsc` (app) schoon; `vitest run` 190 bestanden / 1377 tests groen (`compat0510`: plaatwerk.kcad met een gesloten zoom +0,12 %, bewust, vastgelegd); `VOORBEELDEN=1` 16 van 16; e2e `hem.mjs` 10/10, `sheetmetal.mjs` 14/14, `sheetmetal2.mjs` 7/7, `jogmiter.mjs` 7/7; `e2e/fab.mjs` zonder fout; line-budget en line-length groen; hoofdchunk 796,48 kB.

Nog open uit de SW Jog-PM: eindcondities "Up To Surface" en "Offset From Surface", een Fixed Face-keuzevak (nu een vinkje), Use gauge table en "Override value" bij de hoek. Raaklijnranden worden in `bodyEdges` tot één rand geketend (SW houdt ze apart), zodat na een plooi het rechte deel van een zijrand niet apart te kiezen is; niet gewijzigd omdat bewaarde randverwijzingen daarop steunen.

### 15.1 Randen, Jog-PM en zoomstandaarden (2026-11-20, niet gecommit)

- **Randen zoals SW:** `bodyEdges` splitst een raaklijnketen langs een gezette zijde in een rechte rand, de boog van de plooi en een rechte rand. Tangent propagation neemt bij het bouwen en in het voorbeeld nog steeds de hele keten. Oude randverwijzingen naar een samengevoegde keten worden op positie omgezet: fillet/chamfer met propagation de hele keten, zonder propagation de rand bij de bewaarde klik; een feature op één rand (randflens, zoom, verstekflens …) de rechte rand het dichtst bij het oude midden, met een waarschuwing op die feature. Oude bestanden houden hun volume (`compat0510`, voorbeelden). Tests: `edgeSplit.test.ts` (9), `e2e/edgesplit.mjs`.
- **Jog-PM:** Up To Surface en Offset From Surface (met Reverse offset), een Fixed Face-keuzevak, Use gauge table, Override value voor de hoek; "Use default radius" maakt het stralenveld grijs. Tests: `jogBends.test.ts` (+7), `unfoldJog.test.ts` (+10, ontvouwen blijft exact), `e2e/jogpm.mjs`.
- **Zoomstandaarden tegen SW:** de SW-help (Hem PropertyManager, 2012 tot 2021, en de API `IHemFeatureData.Radius`) bevestigt dat Angle en Radius alleen bij Tear Drop en Rolled horen en Length/Gap bij Closed/Open, zoals de PM nu is. De standaardwaarden (225 graden / 1 t, 270 graden / 2 t) staan op geen openbare pagina die ik kon lezen (de help laadt met script): ze blijven een aanname, na te kijken in SW 2025 zelf.

Gemeten op de werkmap: `tsc` schoon; `vitest run` 191 bestanden / 1403 tests groen; `VOORBEELDEN=1` fab + documenten 197 van 197; e2e `sheetmetal` 14/14, `sheetmetal2` 7/7, `hem` 10/10, `jogmiter` 7/7, `jogpm` 10/10, `edgesplit` en `fab.mjs` zonder fout; line-budget en line-length groen; hoofdchunk 797,03 kB.
