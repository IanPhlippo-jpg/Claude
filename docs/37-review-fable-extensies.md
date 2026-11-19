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
