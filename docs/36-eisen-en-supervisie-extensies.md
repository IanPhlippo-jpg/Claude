# Eisen en supervisie: Lasconstructies+, Lasersnijden/plooien en Offerte uit model (Fable 5.2, 2026-11-19)

Dit document is de eisenlijst en het toezichtsdocument voor de drie extensies die na 3D Print komen (docs/33, fase 5). Het volgt de opzet van `docs/33-eisen-3d-print-extensie.md` en `docs/34-supervisie-fable-3d-print.md`. Er is voor dit document geen code gewijzigd, niets geïnstalleerd en niets gecommit.

Leeswijzer voor de zekerheid van wat hier staat:

- **Zeker**: gelezen in de code van deze repo (met bestandsnaam) of volgt uit een rekenregel die hier uitgeschreven staat.
- **Te verifiëren**: uit mijn kennis van een norm, van de Belgische regels of van SOLIDWORKS 2025, niet nagekeken tegen de normtekst, een wettekst of een referentiebeeld. De normen zijn betalend; ik heb ze niet voor me. De bouwagent zoekt een openbare bron of laat de waarde als AANNAME staan.
- **AANNAME**: een startwaarde die Ian moet kunnen aanpassen en die in elke uitvoer als aanname herkenbaar blijft.

Wat ik niet gedaan heb: de app gestart, een model geopend of een test gedraaid. De waarschuwingen in hoofdstuk 8 komen uit het lezen van de code.

---

## 1. Samenvatting

| Extensie | Wat Ian ermee doet | Fasen |
|---|---|---|
| **Lasconstructies+** | Profielen uit zijn eigen voorraad kiezen, een zaagstaat met zaagplan per staaf afdrukken, lasnaden met ISO 2553-symbolen en een lasvolgorde vastleggen, kostprijs per stuk zien | L1 voorraad en herkenning, L2 zaagstaat en zaagplan, L3 lasnaden en lasvolgorde, L4 kostprijs per stuk |
| **Lasersnijden/plooien** | Per plaat een DXF maken, de platen op standaardplaten leggen, een plooiblad met volgorde afdrukken, prijs per plaat zien | P1 uitslag en plaatgegevens, P2 DXF per plaat, P3 nesting, P4 plooivolgorde, P5 prijs per plaat |
| **Offerte uit model** | Vanuit een part of assembly een offerte voor de klant maken: materiaal, uren, btw, voorwaarden | O1 kostprijsmodel, O2 offerte-opmaak en PDF, O3 offertebeheer |

Daarvoor komt een gedeelde **fase F0** (werkplaatskern): instellingen, herkenning van profielen en platen, één prijsregel-formaat. Zonder F0 bouwen de drie extensies elk hun eigen prijsmodel, zoals nu al drie keer in `bibliotheek/` gebeurd is.

**Eerlijke kanttekening bij "wat SOLIDWORKS niet heeft".** SOLIDWORKS heeft wel een weldment-cut-list, een DXF-export van de flat pattern en (in Professional/Premium) Costing met een CostingManager en een Costing Task Pane (te verifiëren tegen de help van 2025). Wat het niet heeft: een zaagplan per staaf uit eigen voorraad, een lasvolgorde, nesting, een plooivolgorde en een offerte voor de klant. De bestaande SOLIDWORKS-onderdelen zijn dus de stijlreferentie; het nieuwe werk zit in wat erbovenop komt.

De vijf zwaarste risico's (hoofdstuk 9): de voorbeeldmodellen bevatten geen Structural Member- of Base Flange-features, de bestaande flat pattern dekt alleen plooien uit de base flange, prijzen die als AANNAME beginnen maar als echte prijs op een offerte belanden, een offerte zonder ondernemingsgegevens, en de schijn van EN 1090-conformiteit.

---

## 2. Gedeelde basis (fase F0)

### 2.1 Eisen

| Nr | Eis |
|---|---|
| F0-1 | Eén map `src/fab/` met pure TypeScript (geen React, geen store), zoals `src/print/`. De drie tabbladen zijn dunne lagen erboven in `src/app/fab/`, elk een eigen chunk die pas laadt bij het eerste tonen (zoals `PrintTab`, `Ribbon.tsx` regel 20). |
| F0-2 | **Instellingen per gebruiker**, nooit in de repo en niet in het model: uurloon, materiaalprijzen, machinetijden, marges, bedrijfsgegevens. Opslag zoals de printinstellingen. Export en import als JSON, zodat Ian ze kan bewaren. |
| F0-3 | Elke prijs en elke tijd is een record `{ waarde, eenheid, bron, aanname, datum }`. Een waarde die Ian zelf invult krijgt `aanname: false` en de datum van vandaag. Een waarde ouder dan 6 maanden (instelbaar) krijgt in de interface een markering "prijs nakijken". |
| F0-4 | **Herkenning** van elk body of component als `profiel`, `plaat`, `gezette plaat`, `koopdeel` of `onbekend`, met de herkomst `feature` (Structural Member, Base Flange), `herkend` (uit de geometrie) of `handmatig`. Zie 2.3. |
| F0-5 | Eén formaat voor een kostenregel: `{ categorie, omschrijving, hoeveelheid, eenheid, eenheidsprijs, bedrag, bron, aanname }`. Bedragen intern in eurocent als geheel getal; afronden gebeurt op één plek. |
| F0-6 | Alles wat uit het model afgeleid is (zaagstaat, nest, plooiblad, offerte) draagt een hash van de geometrie waaruit het kwam. Wijzigt het model, dan staat het resultaat als **verouderd** in de boom en is exporteren geblokkeerd tot het opnieuw berekend is. `meshHash` uit `src/print/plate.ts` is hiervoor herbruikbaar. |
| F0-7 | Opslag in het document onder één sleutel `doc.fab` met een verhoging van het bestandsformaat en een migratiestap in `src/core/document/migrate.ts`. Oude bestanden blijven openen; een bestand met `doc.fab` opent in een oudere build niet stil fout (melding). |
| F0-8 | Taal: de interface volgt de taal van de app (Engels, zoals "Sheet Metal" en "Frames"). **Alle uitvoer voor de werkplaats en de klant is Nederlands**: zaagstaat, plooiblad, lasplan, offerte. Eén vertaalbestand voor de uitvoer, zodat Frans later kan. |
| F0-9 | Getallen in uitvoer: Belgische notatie (`€ 1.234,56`, komma als decimaalteken, datum `dd/mm/jjjj`). In DXF, CSV voor machines en JSON altijd een punt. Eén formatter per soort, met een test op `NaN`, `-0`, `1e-7`. |
| F0-10 | Geen nieuwe pakketten zonder akkoord van Ian. `clipper2-ts` staat er al (akkoord bij 3D Print) en mag voor nesting gebruikt worden. |
| F0-11 | Niets wordt besteld, gemaild of verstuurd. De uitvoer is altijd een bestand dat Ian zelf doorstuurt. |

### 2.2 Instellingen (dialoog "Fabrication Settings")

Eén dialoog in de stijl van Tools ▸ Options (linker lijst, rechts de pagina), bereikbaar vanaf elk van de drie tabbladen:

- **Company**: bedrijfsgegevens voor de offerte (5.4). Leeg bij de start.
- **Rates**: uurloon, marges, afvalpercentages, btw-regime.
- **Materials**: profielen en platen met prijs, bron en datum; eigen voorraad en restanten.
- **Machines**: zaag, laser, kantbank, lasproces; per machine "eigen" of "uitbesteed".
- **Finishing**: poedercoaten, verzinken, stralen.
- **Quote**: nummering, geldigheid, voorwaarden, voettekst.

Elke rij toont rechts een bron en een geel label **AANNAME** zolang Ian de waarde niet zelf bevestigd heeft. Dezelfde markering staat in de 3D Print-database; de vorm wordt hergebruikt.

### 2.3 Herkenning van profielen en platen

Dit is de eis die de drie extensies bruikbaar maakt voor wat Ian nu al heeft. In `voorbeelden/` en `bibliotheek/` staat geen enkel `.kcad` met een `structuralMember`- of `baseFlange`-feature (gezocht op die featuretypes: alleen e2e-scripts gebruiken ze). De lastafel, de afzuiging, de taatsdeuren en de fitnesstoestellen zijn door generators als gewone extrusies gebouwd.

| Soort | Regel |
|---|---|
| Profiel uit feature | `rebuild.bodyMeta[id].kind === 'member'` (gezet in `src/core/features/frameBuild.ts`). Profiel, lengte en verstekhoeken komen uit de feature. |
| Profiel herkend | Het body heeft over zijn langste as een constante doorsnede (op de eindsneden na) en die doorsnede past binnen een tolerantie op een profiel uit de bibliotheek. Lengte = langste zijde langs de as. Eindhoeken uit de normalen van de eindvlakken. |
| Plaat | Twee evenwijdige vlakke hoofdvlakken op constante afstand t, alle andere vlakken loodrecht daarop, t in de lijst van handelsdiktes. |
| Gezette plaat uit feature | `doc.sheetMetal` is gezet en de boom heeft een `flatPattern`. |
| Gezette plaat herkend | Constante dikte, vlakke zones verbonden door cilindrische zones met binnenstraal r en buitenstraal r + t. |
| Koopdeel | Component uit de standaarddelen (`src/core/library/`) of met de eigenschap `fab.soort = koop`. |
| Onbekend | Al de rest. Komt als handmatige regel in de kostprijs (draaien, frezen, 3D-print), nooit stil op nul. |

Eisen bij de herkenning:

- De herkenning is een **voorstel**. In de PropertyManager staat per body wat herkend is en waarom ("koker 40 x 40 x 3, doorsnede 0,3 % afwijking"); Ian kan het overschrijven. Een overschrijving blijft in `doc.fab` staan en overleeft een rebuild.
- Tolerantie op de doorsnede: oppervlak binnen 2 %, buitenmaten binnen 0,3 mm. Twee kandidaten binnen de tolerantie (40 x 40 x 3 koudgevormd en warmgewalst) geven een keuze, geen stille gok.
- De generators in `voorbeelden/` en `bibliotheek/` mogen custom properties in het `.kcad` schrijven (`fab.soort`, `fab.profiel`, `fab.kwaliteit`). Een eigenschap gaat voor op herkenning. Dat is een latere stap; de herkenning moet zonder werken.
- Herkenning draait op de exacte kernel waar die beschikbaar is; op een gefacetteerd body geeft ze een waarschuwing en een ruimere tolerantie.

### 2.4 Samenhang van de drie extensies

```
model (part of assembly)
   └─ herkenning (F0) ──┬─ profielen ─ Lasconstructies+ ─ zaagstaat, zaagplan, lasplan ─┐
                        ├─ platen ──── Lasersnijden/plooien ─ DXF, nest, plooiblad ─────┼─ kostenregels ─ Offerte
                        ├─ koopdelen ───────────────────────────────────────────────────┤
                        └─ onbekend ─── handmatige regels ──────────────────────────────┘
```

De offerte rekent niets zelf uit over staal of plaat. Ze vraagt de kostenregels op bij de twee andere extensies en voegt koopdelen, afwerking, overhead, marge en btw toe.

---

## 3. Extensie 1: Lasconstructies+

### 3.1 Eisen

| Nr | Eis |
|---|---|
| L-1 | **Profielbibliotheek met norm en massa.** Elk profiel heeft: norm, vorm, maat, staalsoort, kg/m, omtrek (voor coating), doorsnede-oppervlak, handelslengte(s), prijs. De huidige `PROFILE_LIBRARY` in `src/core/features/weldments.ts` (40 maten: 27 ISO en 13 ANSI; geen kg/m, geen staalsoort) wordt uitgebreid, niet vervangen: bestaande bestanden met `standard`/`profileType`/`size` blijven openen. |
| L-2 | **Eigen voorraad.** Ian legt vast welke profielen hij in huis heeft: per profiel de staven (lengte, aantal) en de restanten (lengte per stuk). In de Structural Member-PropertyManager staat een filter "Only from stock"; profielen buiten de voorraad blijven kiesbaar met een markering. |
| L-3 | **Zaagstaat.** Per positie: positienummer, aantal, profiel, staalsoort, zaaglengte, hoek 1 en hoek 2, de stand van het verstek (zelfde vlak of gedraaid), gaten (aantal), gewicht per stuk en totaal, opmerking. Zaaglengte = **langste zijde** van het stuk, de maat die Ian op de zaag instelt. |
| L-4 | **Zaagplan per staaf.** Per profiel: welke stukken uit welke staaf of welk restant, met zaagsnede, restlengte en benutting. Restanten uit de voorraad eerst. Het plan toont hoeveel staven bij te bestellen zijn. Er wordt niets besteld. |
| L-5 | **Lasnaden.** Een lasnaad is een verbinding tussen twee bodies met soort (hoeklas, stompe las met naadvorm), maat (a of z, met de letter erbij), lengte, onderbroken (n x l (e)), rondom, montagelas, proces (ISO 4063-nummer), positie (ISO 6947), kwaliteitsniveau (ISO 5817). De bestaande Weld Bead blijft de 3D-voorstelling; de lasnaad is de gegevenslaag erboven. |
| L-6 | **Automatisch voorstel van lasnaden** waar twee profielen of platen elkaar raken, met een a-maat uit een regel (AANNAME: a = 0,7 x dunste wand, afgerond op 0,5, minimaal 3 mm; te verifiëren). Het voorstel is zichtbaar als voorstel tot Ian het bevestigt. |
| L-7 | **Lasvolgorde.** Een genummerde volgorde in stappen: hechten, dan aflassen. Het programma stelt een volgorde voor volgens vaste regels (3.6) en Ian versleept de stappen. De uitvoer is een lasplan: tabel plus een aanzicht met genummerde lassen. |
| L-8 | **Uitvoeringsklasse.** Per lasconstructie een veld EXC (geen, EXC1, EXC2, EXC3) dat het standaard kwaliteitsniveau en de vermeldingen op de tekening stuurt. Het programma verklaart nooit dat iets aan EN 1090 voldoet (3.5). |
| L-9 | **Kostprijs per stuk** en per constructie: materiaal (met zaagverlies en restant), zagen, boren, lassen (lasmeter per a-maat), afwerken. Per regel de bron. |
| L-10 | **Tekening.** Een tabel "Weldment Cut List" en een tabel "Weld Table" op een tekenblad, met ballonnen die naar de posities verwijzen. Lasaanduiding volgens ISO 2553 systeem A. Algemene toleranties in het titelblok: EN ISO 13920 (lasconstructie) naast ISO 2768-m (bewerkte maten). |
| L-11 | **Uitvoer:** zaagstaat en zaagplan als PDF (A4 liggend of A3) en als XLSX (`src/core/document/xlsx.ts` schrijft al XLSX); lasplan als PDF; bestellijst als XLSX. |

### 3.2 Interface in SOLIDWORKS-stijl

**CommandManager.** Het bestaande tabblad heet in de app "Frames" (`Ribbon.tsx`, id `weldments`). Advies: geen tweede tabblad voor het bouwen van het frame, wel een nieuwe groep aan de rechterkant van "Frames", gescheiden door een verticale streep zoals tussen de groepen van Features:

| Knop | Soort | Doet |
|---|---|---|
| Stock Library | groot | opent de voorraad (dialoog, pagina Materials) |
| Recognize Members | groot | herkenning op alle bodies, opent de PropertyManager met het resultaat |
| Saw List | groot | opent de zaagstaat (tabel onderaan, zie hieronder) |
| Bar Nesting | klein | zaagplan per staaf |
| Weld Joint | groot | nieuwe lasnaad tussen twee bodies |
| Auto Weld Joints | klein | voorstel voor alle rakende bodies |
| Weld Sequence | klein | volgorde bewerken |
| Execution Class | klein | EXC en standaardwaarden |
| Cost | groot | kostprijs van deze constructie |
| Export | groot, met pijl | Saw list PDF, Saw list XLSX, Weld plan PDF, Order list XLSX |

In een assembly bestaat "Frames" nu niet (`Ribbon.tsx` regel 286 stuurt het door naar Assembly). De groep moet daar wel bereikbaar zijn: een lasconstructie van Ian is vaak een assembly van losse parts. Advies: een eigen tabblad **"Weld Shop"** in de assembly met dezelfde groep, en in een part de groep op "Frames". Dit is besluit B1 (hoofdstuk 11).

**PropertyManager** (links, groene vink, rode kruis, punaise; secties inklapbaar, zoals `weldmentPMs.tsx`):

- *Structural Member* (bestaand) krijgt in de sectie Selections: Standard, Type, Size, daaronder nieuw **Grade** (S235JRH, S355J2H, ...), een vakje **Only from stock**, en een grijze regel "3,30 kg/m · stock: 2 x 6000, 1 x 1840".
- *Weld Joint*: secties **Bodies** (twee selectievakken, blauw en roze zoals First/Second in Mate), **Weld** (Type, Size met a/z-keuze, Both sides, All around, Field weld, Intermittent met n, l, e), **Process** (ISO 4063, Position, Quality level, Filler), **Sequence** (stapnummer, Tack first). De preview is de bestaande weld bead plus het ISO 2553-symbool aan een leader in het grafische venster.
- *Recognize Members*: een lijst per body met een pictogram (profiel, plaat, vraagteken), de herkende maat en een keuzelijst om te overschrijven. Hover licht het body op.
- *Bar Nesting*: secties **Stock** (handelslengte, restanten gebruiken), **Saw** (zaagsnede, afkorten begin, minimale klemlengte), **Result** (staven, benutting, bij te bestellen).

**FeatureManager.** De bestaande opbouw blijft: `Cut list(n)` met `Cut-List-Item1(2)`-mappen en de `Weld Folder(n)` (`FeatureTreeBody.tsx` regel 301 tot 405). Nieuw:

- onder `Weld Folder` een map **Weld Joints(n)**, met per lasnaad een regel "W3 a4 x 120" en het stapnummer tussen haakjes;
- een map **Weld Sequence** met de stappen in volgorde (verslepen wijzigt de volgorde);
- een map **Fabrication** bovenaan in de boom (onder Sensors/Annotations) met Saw List, Bar Nesting en Cost. Een verouderd resultaat krijgt het rebuild-pictogram dat de boom al gebruikt voor een feature die opnieuw moet rekenen.
- rechtsklik op een Cut-List-Item: Properties… (bestaand) krijgt de kolommen kg, Grade en Stock.

**Tabellen.** De zaagstaat opent als een tabel onderaan het venster, op de plaats waar SOLIDWORKS de Design Table en de Motion Study toont (te verifiëren tegen een referentiebeeld), met sorteerbare kolommen en een regel per positie. Klikken op een regel selecteert de bodies. De dialoog `CutListDialog` (`evaluateDialogs2.tsx` regel 68) heeft nu twee tabbladen die alleen een melding tonen ("Properties Summary", "Cut List Table"); die worden echt gemaakt en tonen dezelfde gegevens.

Kolommen van de zaagstaat (NL in de uitvoer):

| Pos | Aantal | Profiel | Staalsoort | Zaaglengte | Hoek 1 | Hoek 2 | Verstek | Gaten | kg/st | kg totaal | Opmerking |
|---|---|---|---|---|---|---|---|---|---|---|---|

Kolommen van de lastabel:

| Las | Stap | Tussen | Soort | Maat | Lengte | Proces | Positie | Niveau | Opmerking |
|---|---|---|---|---|---|---|---|---|---|

### 3.3 Datamodel en aansluiting op de bestaande code

Nieuw in `src/fab/`:

```ts
interface StockProfile {            // fab/stock.ts
  id: string;                       // 'EN10219/SHS/40x40x3/S235JRH'
  norm: 'EN 10219' | 'EN 10210' | 'EN 10056' | 'EN 10279' | 'EN 10365' | 'EN 10058' | 'EN 10059' | 'EN 10060' | 'eigen';
  vorm: ProfileType | 'flat bar' | 'square bar' | 'round bar';
  maat: string; a: number; b: number; t: number;
  kwaliteit: string;                // 'S235JRH'
  kgPerM: Sourced<number>; omtrek: number; oppervlak: number;
  handelslengtes: number[];         // mm, bv. [6000, 12000]
  prijs: Sourced<{ perM?: number; perKg?: number }>;
  leverancier?: string;
}
interface StockBar { profielId: string; lengte: number; aantal: number; restant: boolean; locatie?: string }
interface SawLine { pos: number; n: number; profielId: string; zaaglengte: number; hoek1: number; hoek2: number;
  verstekGedraaid: boolean; gaten: number; kg: number; bodyIds: string[]; opm: string }
interface BarPlan { profielId: string; staven: { bron: 'nieuw' | 'restant'; lengte: number; stukken: { pos: number; l: number }[]; rest: number }[];
  teBestellen: number; benutting: number; ondergrens: number }
interface WeldJoint { id: string; bodies: [string, string]; ref: FaceRef[]; soort: 'hoeklas' | 'I' | 'V' | 'HV' | 'Y' | 'X' | 'prop';
  maat: { letter: 'a' | 'z' | 's'; mm: number }; lengte: number; tweezijdig: boolean; rondom: boolean; montage: boolean;
  onderbroken: { n: number; l: number; e: number } | null; proces: string; positie: string; niveau: 'B' | 'C' | 'D';
  stap: number; hechten: boolean; beadFeatureId?: string; bevestigd: boolean }
```

Aansluiting:

| Bestaand | Wat ermee gebeurt |
|---|---|
| `weldments.ts` `PROFILE_LIBRARY`, `findProfile` | Blijft de bron voor de doorsnedegeometrie. `StockProfile` verwijst ernaar met `standard`/`type`/`size`. Nieuwe maten komen in de bibliotheek erbij; `findProfile` valt nu stil terug op het eerste profiel van dat type als de maat ontbreekt. Dat mag niet meer stil gebeuren zodra er een prijs aan hangt (melding in What's Wrong). |
| `weldments.ts` `cutList()` | Blijft de groepering voor de boom. De zaagstaat bouwt erop voort maar groepeert strenger: zie waarschuwing W1 (hoofdstuk 8). |
| `frameBuild.ts` `bodyMeta` | Krijgt optioneel `profielId`, `kwaliteit` en `verstekGedraaid`. `length`, `angle1`, `angle2` bestaan al. Nakijken of `length` de langste zijde is en niet de hartlijn (W2). |
| `WeldBeadFeature` (`types.ts` regel 543) | Blijft. Een `WeldJoint` kan naar een bead verwijzen (`beadFeatureId`) of zonder 3D-rups bestaan. Een bead zonder joint krijgt bij het openen een joint met dezelfde maat. |
| `StructuralMemberFeature` | Krijgt optioneel `grade`. Geen andere wijziging aan het formaat. |
| `prefsTables.ts` `frameCutList`, `doc.weldCollectIdentical` | De bestaande documentopties blijven gelden voor de boom en voor de zaagstaat. |
| `DrawingSheet.tables` (`types.ts` regel 1421, soorten `bom`, `hole`, `general`) | Twee soorten erbij: `weldCutList` en `weldTable`. `tables.ts` `tableGrid` krijgt er twee takken bij; `validateFeatures.ts` en de migratie moeten ze kennen. |
| Annotatie `kind: 'weld'` (`types.ts` regel 1383) | Het lassymbool op de tekening wordt gevuld uit de `WeldJoint` (Model Items), en getoetst aan ISO 2553 systeem A (3.5). |
| `measure.ts` `massProperties` | Controle: massa uit volume x dichtheid tegen kg/m x lengte. Meer dan 2 % verschil geeft een waarschuwing op de regel. |

### 3.4 Hergebruik uit bibliotheek/

| Bron | Wat | Hoe |
|---|---|---|
| `taatsdeuren/bestel.mjs` `zaagplan`, `ZAAGSNEDE = 4`, `STAAFLENGTE = 6000` | First fit decreasing op staven van 6 m met zaagsnede | Algoritme en standaardwaarden overnemen in `fab/barNest.ts`; uitbreiden met restanten, afkorten en een ondergrens. De bibliotheekfunctie is het testorakel. |
| `fitness/stuklijst.mjs` `zaagplan`, `KLEM = 150`, `zaagTekst` | Klemlengte voor gebogen buis; tekst "haaks / schuin 45°" | Tekst en klemlengte overnemen. |
| `taatsdeuren/prijzen.mjs` `STAAF` | Tabel met kg/m, prijs per m, omtrek en bron per staaf | Startinhoud van de voorraadbibliotheek, met de bron en de datum (2026-11-10) erbij. |
| `fitness/werkwijze.mjs` `UREN` | Uren per zaagsnede (0,07), per schuin stuk (0,06), per gat (0,025), per lasverbinding (0,12), per meter las (0,35) | Startwaarden van de machinetijden, alle als AANNAME zoals ze daar staan. |
| `balustrades/stuklijst.mjs`, `fitness/stuklijst.mjs` | Opbouw van een stuklijst volgens ISO 7573 met posities | Kolommen en volgorde als voorbeeld voor de uitvoer. |
| `taatsdeuren/bestel.mjs` `bestelBlad` | A3-blad met een balk per staaf en het restant | Opmaak van het zaagplan overnemen. |

Niet rechtstreeks importeren in de app in deze fase: de bibliotheek is `.mjs` met `.d.mts`, wordt alleen door `src/qa/testGroups.test.ts` aangeraakt en rekent op de gegevensvorm van een configurator (`o.delen`, `voorbeeld.P`). Advies: de rekenregels in `src/fab/` in TypeScript, de bibliotheek als orakel in de tests. Later kan de bibliotheek uit `src/fab/` gaan importeren, zodat het uurloon op één plek staat. Zie W8.

### 3.5 Normen

Alles in deze paragraaf is **te verifiëren**; ik geef aan wat het programma ermee doet, niet wat de norm letterlijk zegt.

**EN 1090-2 (uitvoering van staalconstructies) en uitvoeringsklassen.**

- Vier klassen, EXC1 tot EXC4. De keuze hoort bij de ontwerper van de constructie (EN 1993-1-1 bijlage C met de Belgische ANB), niet bij de lasser en niet bij dit programma. Is er niets opgegeven, dan geldt EXC2.
- EN 1090-1 koppelt er CE-markering aan voor dragende bouwdelen, met een gecertificeerde productiecontrole (FPC) door een aangemelde instantie. Of een balustrade, een trap of een luifel van Ian eronder valt, hangt af van de functie in het bouwwerk. Taatsdeuren en fitnesstoestellen vallen er niet onder; die hebben eigen normen (EN ISO 20957 staat al in `bibliotheek/fitness/normen.mjs`).
- Wat het veld EXC in het programma stuurt:

| | EXC1 | EXC2 | EXC3 |
|---|---|---|---|
| Kwaliteitsniveau lassen (ISO 5817), standaard | D | C | B |
| Kwaliteitseisen lassen (EN ISO 3834) | deel 4 | deel 3 | deel 2 |
| Lasser gekwalificeerd (EN ISO 9606-1) | ja | ja | ja |
| Lasmethodebeschrijving (WPS) | niet vereist | vereist | vereist |
| Lascoördinatie (EN ISO 14731) | niet vereist | vereist | vereist |
| Vermelding op lasplan | "EXC1" | "EXC2" | "EXC3" |

- Het programma toont bij EXC2 en hoger een vaste regel op het lasplan en in de PropertyManager: "EXC2 vraagt een gecertificeerde FPC, WPS en lascoördinatie. Dit programma controleert dat niet." Het woord "conform" komt nergens automatisch in de uitvoer.
- EXC4 is niet kiesbaar (buiten het werk van Ian).

**EN ISO 13920 (algemene toleranties voor lasconstructies).** Klassen A tot D voor lengte en hoek, E tot H voor rechtheid, vlakheid en evenwijdigheid. Standaard in het titelblok van een lastekening: "EN ISO 13920-BF" (instelbaar). De tabelwaarden van klasse B (±1 tot 30, ±2 tot 400, ±3 tot 1000, ±4 tot 2000, ±6 tot 4000, ±8 tot 8000 mm) komen uit mijn geheugen en moeten nagekeken worden voor ze in de code komen. Bewerkte maten houden ISO 2768-m.

**ISO 2553 (lasaanduiding op tekeningen).**

- Systeem A: een doorgetrokken referentielijn met een streeplijn eronder of erboven. Symbool op de doorgetrokken lijn = las aan de pijlzijde; op de streeplijn = tegenzijde. Bij een symmetrische las geen streeplijn. Systeem B (één lijn) wordt niet gebruikt.
- De maat van een hoeklas staat links van het symbool met de letter erbij: `a4` (keelhoogte) of `z6` (beenlengte). Zonder letter is de aanduiding dubbelzinnig; het programma schrijft de letter altijd.
- Rechts van het symbool de lengte; onderbroken als `n x l (e)`.
- Cirkel op de knik = rondom; vlag op de knik = montagelas.
- In de staart: proces volgens ISO 4063 (135 MAG, 131 MIG, 141 TIG, 111 elektrode), kwaliteitsniveau (ISO 5817), positie (ISO 6947: PA, PB, PC, PF, ...), toevoegmateriaal.
- De `WeldBeadFeature` heeft nu een vrij tekstveld `symbol`. Dat wordt een afgeleide van de `WeldJoint`, zodat symbool en gegevens niet uit elkaar lopen.

**Profielnormen.**

| Norm | Wat | Wat het programma eruit haalt |
|---|---|---|
| EN 10219-1/-2 | Koudgevormde gelaste holle profielen (koker, buis). Staalsoorten S235JRH, S355J2H | Nominale hoekstralen (buiten 2t tot 6 mm, 2,5t tot 10 mm, 3t daarboven; zo staat het al in `hss()` in `weldments.ts`), kg/m, toleranties: buitenmaat ±1 % met minimum ±0,5 mm, wanddikte ±10 % tot 5 mm, massa ±6 %, rechtheid 0,15 % van de lengte |
| EN 10210-1/-2 | Warmgewalste (warm afgewerkte) holle profielen | Kleinere hoekstralen (nominaal buiten 1,5t, binnen 1,0t), eigen kg/m. De doorsnede en dus de massa verschillen van EN 10219 bij dezelfde maat: de bibliotheek moet de twee uit elkaar houden |
| EN 10056-1 | Hoekstaal | maten, kg/m |
| EN 10279 | UPN | maten, kg/m. De huidige bibliotheek tekent UPN met evenwijdige flenzen van de gemiddelde dikte (commentaar in `weldments.ts`); kg/m komt daarom uit de tabel, niet uit het volume |
| EN 10365 | IPE, HEA, HEB, UPE | maten, kg/m |
| EN 10058 / 10059 / 10060 | Platstaal, vierkant, rond | maten, kg/m |
| EN 10025-2 | Staalsoorten S235JR, S355J2 | naam op de zaagstaat |

Wat het programma met de toleranties doet: ze tonen in de eigenschappen van het profiel en een waarschuwing geven waar ze ertoe doen. Voorbeeld: een koker die in een andere koker moet schuiven met minder speling dan de som van de toleranties. Verder niets; het model blijft nominaal.

### 3.6 Lasvolgorde: wat het programma voorstelt

Het voorstel is een vuistregel, geen berekening van krimp of vervorming. Dat staat op het lasplan.

1. Eerst alle verbindingen hechten (stap "Hechten", één stap, volgorde van buiten naar binnen).
2. Deelsamenstellingen eerst: wat als aparte groep kan gelast worden (een raam, een poot) voor het geheel.
3. Stompe lassen voor hoeklassen (de grootste krimp eerst, terwijl het stuk nog vrij kan bewegen).
4. Van het midden van de constructie naar buiten.
5. Afwisselend aan weerszijden van het symmetrievlak; bij een tweezijdige hoeklas kant 1, andere verbinding, kant 2.
6. Lange lassen (langer dan 300 mm, AANNAME) in stukken met de terugstapmethode; het plan toont de stukken.

Elke regel is een aparte functie met een test op een eenvoudig frame, zodat een foute volgorde terug te voeren is op één regel. Ian kan elke stap verslepen; een handmatige volgorde wordt nooit overschreven door een nieuw voorstel zonder vraag.

### 3.7 Acceptatiecriteria

Proefstukken:

| Naam | Wat | Waar |
|---|---|---|
| **LF1 Proefraam** | Nieuw part met echte Structural Members: rechthoek 1000 x 600 buitenmaat in koker 40 x 40 x 3, vier verstekhoeken, één tussenstijl haaks | te bouwen in een e2e-script en als vitest-fixture |
| **LF2 Onderframe lastafel** | UNP 100 op een vloerplaat, gewone extrusies | `voorbeelden/lastafel/delen/Onderframe.kcad`, orakel: `voorbeelden/lastafel/docs/Materiaallijst.md` en `materiaal.json` |
| **LF3 Bovenframe afzuiging** | Twee soorten latten | `voorbeelden/afzuiging/Bovenframe.kcad`, `Bovenframe-dwarslat.kcad`, `Bovenframe-zijlat.kcad` |
| **LF4 Taatsdeur** | Kader en roeden in koker en T-profiel | `bibliotheek/taatsdeuren/modellen/TD-01-strak-1000x2400.kcad`, orakel: `stuklijst()` en `zaagplan()` uit `bibliotheek/taatsdeuren/` |
| **LF5 Fitnessrek** | Een rek uit de catalogus (keuze van de bouwagent, vastgelegd in de test) | orakel: `stuklijst()`, `zaagplan()`, `totalen()` uit `bibliotheek/fitness/` |
| **LF6 Deurkruk** | Negatief proefstuk: geen profiel, geen plaat | `voorbeelden/deurkruk/Kruk.kcad` |

**Fase L1: voorraad en herkenning**

- L1.1 LF1: 5 bodies herkend als koker 40 x 40 x 3 met herkomst `feature`; 4 met hoeken 45°/45°, 1 met 0°/0°.
- L1.2 LF2 en LF3: elk profielbody herkend met herkomst `herkend`; maat en lengte gelijk aan het orakel (lengte binnen 0,5 mm). Geen enkel body stil overgeslagen: de som herkend + plaat + onbekend is het aantal bodies.
- L1.3 LF6: alle bodies `onbekend`, geen fout, geen regel in de zaagstaat.
- L1.4 kg/m van elke koker in de bibliotheek nagerekend uit de doorsnede met hoekstralen x 7850 kg/m³: binnen 1 % van de tabelwaarde. Een tabelwaarde zonder bron staat als AANNAME.
- L1.5 Voorraad: een restant van 1840 mm toevoegen, app herstarten, het staat er nog. Instellingen exporteren en importeren geeft dezelfde JSON terug.
- L1.6 Een bestand van voor deze fase opent ongewijzigd; opslaan en heropenen geeft dezelfde bodies (bestaande `examples.check.test.ts` blijft groen).
- L1.7 Overschrijven: een herkende koker 40 x 40 x 3 handmatig op 40 x 40 x 4 zetten, rebuild, de keuze blijft.

**Fase L2: zaagstaat en zaagplan**

- L2.1 LF1: 3 posities (2 x 1000, 2 x 600, 1 x 520). Zaaglengte is de langste zijde; een handberekening staat in de test. Totaal 3,72 m; kg = 3,72 x kg/m binnen 0,5 %.
- L2.2 LF1 zaagplan op 6000 mm met zaagsnede 4 mm: 1 staaf, rest 6000 − 3720 − 5 x 4 = 2260 mm, exact.
- L2.3 Ondergrens: voor elk zaagplan geldt staven ≥ ⌈(som lengtes + sneden) / staaflengte⌉. Een test met 200 willekeurige lijsten (vaste seed): nooit onder de ondergrens, nooit een staaf overvol, elk stuk precies één keer geplaatst, en gemiddeld binnen 1 staaf of 5 % van de ondergrens.
- L2.4 Restanten eerst: met een restant van 1100 mm in de voorraad komt een stuk van 1000 uit dat restant; het plan toont "restant".
- L2.5 Een stuk langer dan de handelslengte geeft een fout op die positie, geen stil plan.
- L2.6 LF4 en LF5: aantal staven per profiel gelijk aan het orakel uit de bibliotheek, of beter (minder staven), nooit slechter.
- L2.7 Gespiegelde stukken: twee kokers met dezelfde lengte en hoeken maar met gaten in spiegelbeeld zijn twee posities; zonder gaten en met verstek in hetzelfde vlak één positie (W1).
- L2.8 Tabel "Weldment Cut List" op een tekenblad: dezelfde regels als de zaagstaat, ballonnen verwijzen naar de juiste positie; export naar DXF en PDF van het blad bevat de tabel.
- L2.9 PDF van de zaagstaat: tekens `€`, `ë`, `°`, `Ø` komen goed (W12); XLSX opent met getallen als getal, niet als tekst.
- L2.10 Model wijzigen (een lengte): de zaagstaat staat als verouderd, export geeft een melding, na herberekenen klopt de nieuwe lengte.

**Fase L3: lasnaden en lasvolgorde**

- L3.1 LF1 Auto Weld Joints: 6 verbindingen gevonden (4 hoeken, 2 van de tussenstijl), elk als voorstel gemarkeerd.
- L3.2 Laslengte van een rondom gelaste koker 40 x 40 haaks op een vlak: 4 x 40 minus de hoekafrondingen, uit de doorsnedeomtrek; binnen 1 mm van de handberekening.
- L3.3 ISO 2553: een reeks van 8 voorbeeldsymbolen (hoeklas pijlzijde, tegenzijde, tweezijdig, rondom, montage, onderbroken, V-naad, met staart) als beeld vastgelegd en door mij naast een openbare afbeelding van de norm gelegd. De letter a of z staat er altijd.
- L3.4 Volgorde: op LF1 komt hechten voor aflassen, en geen twee opeenvolgende aflasstappen liggen aan dezelfde hoek. Elke regel uit 3.6 heeft een eigen test.
- L3.5 Verslepen in de boom wijzigt de stapnummers in de tabel en op het lasplan; na opslaan en heropenen is de volgorde dezelfde.
- L3.6 EXC2 kiezen zet het standaardniveau op C en de vaste regel op het lasplan; het woord "conform" komt in geen enkele uitvoer voor (tekstzoektest op de PDF-inhoud).
- L3.7 Een Weld Bead uit een bestaand bestand krijgt bij het openen een lasnaad met dezelfde maat; het bestand blijft geldig in de vorige build tot het opnieuw opgeslagen wordt.

**Fase L4: kostprijs per stuk**

- L4.1 LF1 met vaste testinstellingen: elke regel nagerekend in de test (materiaal = aantal staven of meters x prijs, zagen = sneden x tijd x uurloon, lassen = meters x tijd per meter voor a-maat x uurloon). Totaal op de cent.
- L4.2 Twee manieren van materiaal rekenen, kiesbaar: "verbruikt" (meters + afval %) en "aangekocht" (hele staven, restant als voorraad). De regel zegt welke.
- L4.3 Elke regel met een AANNAME-waarde toont het label; de kop van de kostprijs telt ze ("7 van 12 regels op aannames").
- L4.4 LF5 naast `kostprijs()` uit `bibliotheek/fitness/prijzen.mjs` met dezelfde instellingen: staal en arbeid voor zagen en lassen binnen 2 %; verschillen daarboven zijn verklaard in de test.
- L4.5 Uurloon wijzigen van 45 naar 60: alle arbeidsregels schalen exact, materiaal blijft.

---

## 4. Extensie 2: Lasersnijden/plooien

### 4.1 Eisen

| Nr | Eis |
|---|---|
| P-1 | **Plaatgegevens per stuk:** dikte, materiaal, omschreven rechthoek (kleinste, met draaien), netto oppervlak, snijlengte buiten en binnen, aantal insteken, aantal plooien, gewicht, walsrichting (keuze). Dit zijn de eigenschappen die SOLIDWORKS op een sheet metal cut-list-item zet (te verifiëren). |
| P-2 | **Uitslag** van elk gezet stuk, ook als de plooien niet uit de base flange komen (W4). Waar de uitslag niet betrouwbaar te maken is: een fout op dat stuk, geen DXF. |
| P-3 | **DXF per plaat.** Eén bestand per positie, schaal 1:1 in mm. Buitencontour en binnencontouren als gesloten polylijnen met echte bogen, gaten als cirkels, plooilijnen en tekst op eigen lagen. Naam: `<positie>_<materiaal>_<dikte>mm_<aantal>x.dxf`. Daarnaast een overzichtslijst (XLSX of CSV) met aantal, materiaal en dikte per bestand. |
| P-4 | **Controles voor de export:** contour gesloten, geen zelfdoorsnijding, geen dubbele lijnen, gaten kleiner dan de plaatdikte gemeld, steg tussen twee uitsparingen smaller dan de plaatdikte gemeld, gat dichter bij een plooilijn dan een instelbare afstand gemeld. |
| P-5 | **Nesting** per materiaal en dikte op standaardplaten (1000 x 2000, 1250 x 2500, 1500 x 3000, 2000 x 4000; uitbreidbaar, eigen restplaten). Instellingen: afstand tussen stukken, rand van de plaat, toegelaten draaiing (0/90/180/270 of vrij), walsrichting vast, stukken in gaten van andere stukken. Uitvoer: een DXF per genest blad, een PDF met het legplan en de benutting. |
| P-6 | **Plooivolgorde** per gezet stuk: genummerde zettingen met richting (op/neer), hoek, binnenstraal, V-opening, aanslagmaat en welke kant tegen de aanslag ligt. Het programma stelt een volgorde voor en Ian past ze aan. Uitvoer: een plooiblad (PDF) met de uitslag, de genummerde plooilijnen en een tabel. |
| P-7 | **Plooicontroles:** minimale flenslengte voor de V-opening, benodigde perskracht tegen de kantbank, plooilengte tegen de werklengte, binnenstraal tegen de minimale straal van het materiaal. |
| P-8 | **Prijs per plaat** en per stuk: materiaal (aandeel van de plaat), snijden, insteken, plooien met instellen, ontbramen. Twee manieren: uitbesteed (prijs per meter en per insteek van de loonsnijder) en eigen machine (machinetijd x machine-uurtarief). |
| P-9 | **Tekening:** uitslagaanzicht met plooilijnen en plooinotities (bestaat: `bendLines` in `sheet.ts`), en een nieuwe tabel "Bend Table". Thermisch snijden: vermelding EN ISO 9013 in het titelblok (instelbaar). |
| P-10 | Werkt op een part (één of meer bodies) en op een assembly (alle platen van alle componenten, gelijke stukken samengeteld). |

### 4.2 Interface in SOLIDWORKS-stijl

**CommandManager.** Een eigen tabblad **"Laser & Bend"** (part en assembly, niet bij een tekening), lui geladen. Het bouwen van plaatwerk blijft op "Sheet Metal".

| Knop | Soort | Doet |
|---|---|---|
| Recognize Plates | groot | herkenning, PropertyManager met de lijst |
| Flat Patterns | groot | lijst van alle uitslagen met controles |
| Export DXF | groot, met pijl | per plaat, alle platen als ZIP, genest blad |
| Sheet Library | klein | standaardplaten en restplaten |
| Nest | groot | nesting starten |
| Cancel Nesting | klein | alleen actief tijdens het rekenen |
| Bend Sequence | groot | volgorde bewerken |
| Bend Check | klein | controles P-7 |
| Bend Sheet | klein | plooiblad PDF |
| Cost | groot | prijs per plaat |

**PropertyManager.**

- *Export DXF*: zoals de DXF/DWG Output-PropertyManager van SOLIDWORKS bij een flat pattern (te verifiëren): sectie **Entities to Export** met vakjes Geometry, Bend lines, Sketches, Bounding box, Part number text; sectie **Layers** (namen, standaard CONTOUR, GATEN, ZETLIJN_OP, ZETLIJN_NEER, TEKST, zoals de bibliotheek ze noemt); sectie **Options** (DXF-versie R12 of R2000, bogen als boog of als polylijn, één bestand per stuk). Daarna een previewvenster met het DXF-beeld en OK/Cancel, zoals de DXF/DWG Cleanup-dialoog.
- *Nest*: secties **Parts** (lijst met aantal en een vakje per stuk), **Sheet** (formaat, restplaten eerst), **Spacing** (tussen stukken, rand), **Rotation**, **Result** (bladen, benutting per blad, restplaat).
- *Bend Sequence*: een lijst met de zettingen in volgorde; pijlen omhoog en omlaag en verslepen; per zetting hoek, richting, V-opening, aanslagmaat. De geselecteerde zetting licht op in het model en het model toont de toestand na die stap (stuk gevouwen tot en met stap n).

**FeatureManager.**

- De bestaande map `Flat-Pattern` met `Flat-Pattern1` en de Bend-Lines blijft.
- De map **Fabrication** (zie 3.2) krijgt: `Plates(n)` met per positie een regel "P3 S235 3 mm (4x)", `Nests` met per materiaal en dikte een map en per blad een regel "Sheet 1 1500 x 3000 71 %", en per gezet stuk `Bend Sequence`.

**Nestweergave.** Een eigen weergave in het grafische venster, zoals de plaatweergave van 3D Print: het blad van boven, stukken in de kleur van hun positie, positienummer in het stuk, restplaat gearceerd, benutting in de hoek. Stukken zijn met de muis te verplaatsen en te draaien; een overlap kleurt rood en blokkeert de export.

**Tabellen.**

Plaatlijst (uitvoer NL): Pos, Aantal, Benaming, Materiaal, Dikte, Lengte x Breedte, Oppervlak, Snijlengte, Insteken, Plooien, kg/st, Bestand.

Bend Table op de tekening, zoals SOLIDWORKS (te verifiëren): Tag, Direction, Angle, Inner Radius. Op het plooiblad uitgebreid met V-opening, aanslagmaat, kant.

### 4.3 Datamodel en aansluiting

```ts
interface FlatPart {                       // fab/flat.ts
  bron: BodySource;                        // part, body of componentpad, met geometriehash
  pos: number; n: number; materiaal: string; t: number;
  buiten: Loop; binnen: Loop[];            // Loop = segmenten { a, b, bulge } : lijnen en bogen, exact
  gaten: { c: P2; r: number }[];
  plooien: { a: P2; b: P2; hoek: number; r: number; richting: 'op' | 'neer'; ba: number; featureId?: string }[];
  bbox: { l: number; b: number; draai: number }; oppervlak: number;
  snijlengte: { buiten: number; binnen: number }; insteken: number; kg: number;
  walsrichting: 'vrij' | 'langs' | 'dwars';
  betrouwbaar: 'exact' | 'benaderd' | 'geen';   // zie P-2
}
interface StockSheet { id: string; materiaal: string; t: number; l: number; b: number; prijsPerKg: Sourced<number>; voorraad: number; restplaat: boolean }
interface Nest { materiaal: string; t: number; bladen: { sheetId: string; stukken: { pos: number; x: number; y: number; draai: number; gespiegeld: false }[]; benutting: number }[];
  instellingen: NestSettings; status: 'rechthoek' | 'vorm' | 'handmatig' }
interface BendStep { plooi: number; stap: number; vOpening: number; aanslag: number; aanslagKant: 'a' | 'b'; omkeren: boolean; perskracht: number }
```

Aansluiting:

| Bestaand | Wat ermee gebeurt |
|---|---|
| `sheetmetal.ts` `bendAllowance`, `bendDeduction`, `outerSetback`, `flatLength` | Blijven de enige plek voor de buigtoeslag. `fab/flat.ts` rekent niets zelf uit over plooien. |
| `sheetmetal.ts` `bendTableK`, `materialKFactor` | Er komt een derde, uitdrukkelijke keuze bij: **DIN 6935** (4.5). Welke K gebruikt is, staat op het plooiblad. |
| `unfold.ts` `sheetMapping`, `unfoldGeometry`; `sheetMetalBuild.ts` tak `flatPattern` | De uitslag bestaat voor plooien uit de base flange (`ctx.sheet.bentOnly`). Voor de andere gevallen valt de code terug op `flatPatternGeometry` uit de schetsketen. Zie W4: dit is het eerste wat de bouwagent moet nameten. |
| `FlatPatternFeature`, Bend-Lines als `curves` | De plooilijnen van `FlatPart` komen uit dezelfde bron (`fpMap.bends`), niet uit een tweede berekening. |
| `rebuild.bendCounts` | Controle: aantal plooien in `FlatPart` = som van `bendCounts`. |
| `export2d.ts` `toDxf` | Schrijft nu R12 met LINE, POLYLINE, CIRCLE en TEXT, zonder ARC en zonder bulge, met alleen de laag HIDDEN. Uitbreiden met bogen en lagen, of één nieuwe DXF-schrijver die ook de tekenbladen bedient (W6). |
| `exchange/dxfRead.ts` `readDxf` | De rondreistest: wat `fab` schrijft, leest `readDxf` terug met dezelfde contourlengte en hetzelfde oppervlak. |
| `drawing/sheet.ts` `bendLines`, `DrawingPM.tsx` "Flat Pattern Display" | Blijven; de Bend Table leest dezelfde plooien. |
| `DrawingSheet.tables` | Soort `bend` erbij. |
| `clipper2-ts` via `src/print/geom/polygons.ts` | Offset (afstand tussen stukken) en Minkowski-som (no-fit-polygoon) voor vormnesting. Dezelfde interface gebruiken; geen tweede polygoonkern. |
| `src/workers/slice.worker.ts` | Voorbeeld voor een eigen `nest.worker.ts` met voortgang en annuleren. Niet de rebuild-worker gebruiken (docs/34 6.3). |
| `src/print/pack/` | De schikking van de 3D Print-plaat; nakijken of de rechthoekpakker herbruikbaar is voor de eerste nestingstap. |

### 4.4 Hergebruik uit bibliotheek/

| Bron | Wat | Hoe |
|---|---|---|
| `fitness/dxf.mjs` | R12-schrijver met gesloten polylijn met bulge, lagen CONTOUR, GATEN, TEKST, ZETLIJN, bewust zonder `$INSUNITS` | Opbouw en laagnamen overnemen; de uitvoer van `plaatDxf()` is het orakel voor een vlakke plaat met gaten. |
| `taatsdeuren/dxf.mjs` `schrijver`, `laserDxf` | Meerdere stukken naast elkaar met naam | Voorbeeld voor het geneste blad. |
| `fitness/vorm.mjs` `buigToeslag`, `terugzet`, `uitslagStrook`, `terugVouwen`, `ontvouw` | Uitslag van een prismatisch gezet profiel en van een mantel uit vlakke panelen, met zetlijnen | **Onafhankelijk orakel** voor `sheetmetal.ts`: dezelfde strook in beide, uitslaglengte binnen 0,01 mm bij gelijke K. Let op: de bibliotheek rekent standaard met K = 0,4, de app met 0,5 (W7). |
| `fitness/vorm.mjs` `afronden`, `binnen`, `randAfstand` | Contour met afgeronde hoeken als bulge-segmenten; punt-in-veelhoek | Rechtstreeks bruikbaar voor de contourcontroles. |
| `fitness/vorm.mjs` `KANTBANK` | Binnenstraal per plaatdikte bij luchtbuigen, uit twee publieke tabellen | Startwaarden voor de matrijstabel, met de bron die daar staat. |
| `fitness/stuklijst.mjs` `snijden` | Snijlengte en aantal insteken van een laserdeel | Orakel voor P-1. |
| `fitness/stuklijst.mjs` `nesting` | Grove shelf-nesting op 3000 x 1500 met 10 mm tussenruimte | Startpunt en ondergrens-vergelijking voor de rechthoeknesting; de nieuwe moet minstens even goed zijn. |
| `fitness/prijzen.mjs` `STANDAARD.snijM`, `insteek`, `plaatKg`, `BRON.laser` | Loonsnijprijs per meter per diktetrap, per insteek, plaatprijs per kg | Startwaarden voor "uitbesteed" (5.2). |
| `voorbeelden/lastafel/mallen/Laserwerk-DXF-lastafel.zip`, `voorbeelden/afzuiging/laser/rooster.dxf` | Bestaande DXF's voor de lasersnijder | Vergelijkingsbestanden (contourlengte, aantal gaten). |

### 4.5 Normen en rekenregels

**EN 10029 en EN 10051 (plaattoleranties).** Te verifiëren.

- EN 10029: warmgewalste plaat van 3 mm en dikker, gewalst op een kwartowals. Diktetolerantie in klassen A tot D (klasse A grotendeels plus, klasse D symmetrisch), plus toleranties op breedte, lengte en vlakheid (klasse N en S).
- EN 10051: plaat en band uit continu warmgewalste breedband, in de praktijk de dunnere platen tot ongeveer 25 mm die van de rol komen.
- Daarnaast in de praktijk van Ian: EN 10131 (koudgewalst, dunner dan 3 mm), EN 10143 (verzinkt), EN 10088 (roestvast), EN 485 (aluminium). Vermelden, niet uitwerken.
- Wat het programma ermee doet: (1) de lijst van handelsdiktes voor de herkenning; (2) per plaatsoort een veld "diktetolerantie" dat op het plooiblad komt, omdat een dikkere plaat een andere plooihoek geeft bij luchtbuigen; (3) de massa rekent met de nominale dikte, en de prijsregel vermeldt dat de leverancier per werkelijk gewicht kan factureren. Geen tabellen met toleranties in de code zonder bron.
- Getallen zoals "klasse A, 5 tot 8 mm: −0,4/+0,8" ken ik uit het hoofd en zet ik hier bewust niet als feit.

**EN ISO 9013 (thermisch snijden).** Kwaliteit van het snijvlak in bereiken (haaksheid, ruwheid) en maattoleranties in klassen. Het programma zet een instelbare vermelding in het titelblok van een snijtekening en verandert niets aan de geometrie. De snijspleet (kerf) wordt **niet** in de DXF verrekend: dat doet de machine van de lasersnijder. Dit staat als regel in de exportdialoog.

**DIN 6935 (koudbuigen van plaat) en K-factor.**

- DIN 6935 legt de neutrale lijn op een afstand k·s/2 van de binnenkant, met de correctiefactor k = 0,65 + 0,5·log10(r/s) voor r/s tot 5, en k = 1 daarboven (s = plaatdikte, r = binnenstraal). Te verifiëren, maar dit is een veel gepubliceerde formule.
- De K-factor van SOLIDWORKS en van `sheetmetal.ts` is de afstand van de neutrale lijn tot de binnenkant gedeeld door de dikte. Dus **K = k / 2**. Voor r = s geeft DIN k = 0,65 en K = 0,325; voor r ≥ 5s is K = 0,5.
- De huidige `bendTableK` geeft 0,33 onder r/t = 1, 0,4 tot 3 en 0,5 daarboven. Dat is een trap waar DIN een kromme geeft: bij r/t = 2 zegt DIN K = 0,40, bij r/t = 3 K = 0,44, bij r/t = 1 K = 0,325. De trap blijft bestaan voor bestaande bestanden; DIN 6935 komt erbij als vierde keuze in "Bend Allowance" en wordt de standaard voor nieuw plaatwerk in staal (besluit B5).
- DIN 6935 geeft ook minimale buigstralen per staalsoort en walsrichting. Die tabel neem ik niet over zonder bron; het veld bestaat per materiaal en begint als AANNAME.
- De echte buigtoeslag hangt af van de matrijs en het gereedschap van wie plooit. Daarom: per materiaal en dikte kan Ian een **gemeten buigaftrek** invullen (proefstrook van 100 mm plooien en nameten). Een gemeten waarde gaat voor op elke formule en staat zo op het plooiblad.

**Luchtbuigen: vuistregels** (alle AANNAME, instelbaar per matrijs):

| Grootheid | Regel |
|---|---|
| V-opening | 6 tot 8 x dikte tot 6 mm, 10 x daarboven |
| Binnenstraal bij luchtbuigen (staal) | ongeveer V / 6; de tabel `KANTBANK` uit de bibliotheek gaat voor |
| Minimale flenslengte | ongeveer 0,7 x V |
| Perskracht | F [kN per meter] ≈ 1,42 x Rm [N/mm²] x s² / V [mm]. Voorbeeld: 3 mm, V = 24, Rm = 450: 240 kN/m |

Een belangrijk gevolg: de binnenstraal in het model (`bendRadius`, standaard 3) is bij luchtbuigen geen vrije keuze maar volgt uit de V-opening. Bend Check meldt een model waarvan de straal meer dan 20 % afwijkt van wat de gekozen matrijs geeft.

**Plooivolgorde: regels voor het voorstel.**

1. Korte flenzen en binnenste plooien eerst, lange en buitenste laatst (anders past het stuk niet meer tussen stempel en matrijs).
2. Plooien in dezelfde richting na elkaar, zo weinig mogelijk omkeren.
3. Aanslag tegen een gesneden rand waar het kan, niet tegen een eerdere plooi.
4. Een plooi die een eerdere flens tegen de bovenbalk zou duwen, schuift naar voren.

Regel 4 vraagt een botsingscontrole in doorsnede (stuk tegen het profiel van stempel en bovenbalk). In v1 gebeurt die alleen voor prismatische stukken (alle plooilijnen evenwijdig), in 2D. Voor andere stukken staat op het plooiblad: "volgorde niet op botsing gecontroleerd". Geen stille goedkeuring.

**Nesting.** Er is geen norm. Vast te leggen:

- Afstand tussen stukken: standaard gelijk aan de plaatdikte met een minimum van 5 mm; rand 10 mm (AANNAME, de lasersnijder beslist).
- Geen gemeenschappelijke snijlijn, geen spiegelen (een gespiegeld stuk is een ander stuk), draaien alleen binnen wat de walsrichting toelaat.
- Stap 1, rechthoeknesting op de kleinste omschreven rechthoek. Snel, voorspelbaar, genoeg voor een prijs.
- Stap 2, vormnesting met no-fit-polygonen (Minkowski-som via Clipper2), stukken in volgorde van dalend oppervlak, onder-links plaatsen, daarna een beperkt aantal herschikkingen binnen een tijdsbudget. Bogen worden voor de nesting benaderd met een koordefout van 0,1 mm **naar buiten**, zodat de echte stukken nooit dichter liggen dan ingesteld.
- De kwaliteit wordt gemeten tegen een ondergrens: bladen ≥ ⌈som netto oppervlak / bruikbaar bladoppervlak⌉.
- Het programma belooft geen optimum. Op het legplan staat de benutting en de status "rechthoek" of "vorm".

### 4.6 Acceptatiecriteria

Proefstukken:

| Naam | Wat | Waar |
|---|---|---|
| **PP1 Vlakke plaat** | 200 x 100 x 5 met 4 gaten Ø9 en afgeronde hoeken R10 | nieuw, fixture; orakel `plaatDxf()` uit `bibliotheek/fitness/dxf.mjs` |
| **PP2 L-profiel** | Base flange 100 x 50, lengte 200, t = 3, r = 3, één plooi 90° | nieuw; orakel `uitslagStrook()` uit `bibliotheek/fitness/vorm.mjs` en een handberekening |
| **PP3 U-bak met edge flanges** | Base flange met twee edge flanges en een gat in een flens | nieuw; dit is het proefstuk voor W4 |
| **PP4 Rooster afzuiging** | Veel uitsparingen | `voorbeelden/afzuiging/Rooster-LB.kcad`, vergelijking met `voorbeelden/afzuiging/laser/rooster.dxf` |
| **PP5 Platen lastafel** | Ogen, lippen, bokken, kopplaat | `voorbeelden/lastafel/delen/*.kcad`, vergelijking met `mallen/Laserwerk-DXF-lastafel.zip` |
| **PP6 Opvanglade lastafel** | Gezette bak | `voorbeelden/lastafel/delen/Opvanglade.kcad` |
| **PP7 Boogdeur** | Lasergesneden bogen | `bibliotheek/taatsdeuren/modellen/TD-05-boog-1000x2400.kcad`, orakel `laserDxf()` |
| **PP8 Fitnessrek** | Alle laserdelen van één toestel | orakel `dxfBestanden()`, `nesting()`, `snijden()` uit `bibliotheek/fitness/` |

**Fase P1: uitslag en plaatgegevens**

- P1.1 PP1: oppervlak = 200 x 100 − (4 − π) x 10² − 4 x π x 4,5² mm², snijlengte buiten = 2 x (180 + 80) + 2π x 10, binnen = 4 x π x 9, insteken = 5. Elk binnen 0,01 mm of 0,01 mm².
- P1.2 PP2: uitslaglengte uit de handberekening voor K = 0,5, voor K = 0,325 en voor DIN 6935; elk binnen 0,01 mm. Dezelfde strook door `uitslagStrook()` met dezelfde K geeft hetzelfde binnen 0,01 mm.
- P1.3 DIN 6935: K = k/2 getest op r/s = 0,5, 1, 2, 3, 5 en 10; boven 5 exact 0,5; de functie is monotoon.
- P1.4 PP3: de uitslag bevat het gat op de juiste plaats (afstand tot de plooilijn binnen 0,02 mm van de handberekening) en het volume van de uitslag is gelijk aan het volume van het gevouwen stuk binnen 0,5 %. Lukt dat niet, dan is `betrouwbaar: 'geen'` en is er een fout op het stuk. Een uitslag zonder het gat mag niet als geldig doorgaan.
- P1.5 Elk gezet proefstuk: oppervlak van de uitslag x dikte = volume van het gevouwen body binnen 0,5 % (de plooizones rekken; de grens is daarom niet nul).
- P1.6 Herkenning PP5 en PP6: elke plaat herkend met de dikte uit de materiaallijst; geen profiel als plaat geteld en omgekeerd.
- P1.7 Een cilinder Ø9 in het model komt in `FlatPart.gaten` als cirkel met r = 4,5 binnen 0,005 mm, niet als veelhoek (W5).

**Fase P2: DXF per plaat**

- P2.1 PP1: het bestand bevat precies 1 gesloten polylijn op CONTOUR met 4 bogen (bulge = tan(22,5°) = 0,4142) en 4 CIRCLE op GATEN. Teruggelezen met `readDxf`: zelfde oppervlak en omtrek binnen 0,001.
- P2.2 Het bestand begint met een geldige R12-kop, gebruikt een punt als decimaalteken, bevat geen `NaN`, geen `e-`, geen tekens buiten ASCII in laag- en bloknamen.
- P2.3 Eenheid: de omschreven rechthoek in het DXF is in mm gelijk aan die van `FlatPart` (test tegen een fout van factor 25,4 of 1000).
- P2.4 Plooilijnen op ZETLIJN_OP en ZETLIJN_NEER, niet op CONTOUR; met de optie uit staan ze niet in het bestand.
- P2.5 Controles P-4: zes negatieve proefstukken (open contour, zelfdoorsnijding, dubbele lijn, gat Ø2 in 5 mm, steg van 2 mm in 5 mm, gat op 3 mm van een plooilijn). Elk geeft precies zijn eigen melding; de eerste drie blokkeren de export.
- P2.6 PP4 en PP5 naast de bestaande DXF's: zelfde aantal gesloten contouren en gaten, snijlengte binnen 0,5 %. Verschillen worden verklaard, niet weggemiddeld.
- P2.7 PP8: zelfde aantal bestanden en zelfde snijlengte per positie als `dxfBestanden()` en `snijden()` (binnen 0,5 %).
- P2.8 Elk geëxporteerd bestand opent in een gratis DXF-viewer of in de software van een lasersnijder; Ian of de bouwagent legt één schermbeeld vast. Tot dan staat de DXF-export als "nog te openen bij de lasersnijder", zoals "nog te printen" bij 3D Print.
- P2.9 Alle platen als ZIP: bestandsnamen uniek, de lijst (XLSX) telt even veel regels als bestanden en het totaal aantal stukken klopt met het model.

**Fase P3: nesting**

- P3.1 Geldigheid, voor elk nest: geen twee stukken dichter dan de ingestelde afstand (gecontroleerd met een onafhankelijke afstandsmeting op de exacte contouren, niet met de nestingcode zelf), elk stuk binnen de rand, elk stuk precies zo vaak als gevraagd, draaiing binnen wat toegelaten is.
- P3.2 Rechthoeknesting: 20 rechthoeken 500 x 300 op 1500 x 3000 met 10 mm afstand en rand: 1 blad. 31 stuks: 2 bladen. Uitgeschreven in de test.
- P3.3 PP8: niet meer bladen dan `nesting()` uit de bibliotheek voor dezelfde stukken.
- P3.4 Vormnesting: 40 gelijke rechthoekige driehoeken (benen 400 en 300) komen op minder oppervlak dan hun omschreven rechthoeken (benutting boven 70 % waar rechthoeknesting op 50 % blijft).
- P3.5 Ondergrens: nooit minder bladen dan de ondergrens (dat zou een fout zijn); op een vaste set van 10 lijsten gemiddeld binnen 1 blad erboven.
- P3.6 Tijd: 100 stukken van 10 soorten, rechthoek binnen 1 s, vorm binnen 60 s op de machine van Ian; annuleren binnen 200 ms; de interface blijft reageren (worker).
- P3.7 Herhaalbaar: dezelfde invoer en instellingen geven hetzelfde nest (vaste seed).
- P3.8 Een stuk groter dan elk blad geeft een fout op dat stuk; de rest wordt wel genest.
- P3.9 Handmatig verschuiven tot een overlap: rood, export geblokkeerd.
- P3.10 Het geneste DXF: elk stuk als eigen contour, positienummer op TEKST, bladrand op een eigen laag; teruggelezen klopt het aantal contouren.

**Fase P4: plooivolgorde**

- P4.1 PP2: 1 stap, richting en hoek juist, aanslagmaat = flenslengte tot de plooilijn in de uitslag, binnen 0,05 mm.
- P4.2 Een Z-profiel (twee plooien in tegengestelde richting): het voorstel bevat één keer omkeren en het plooiblad zegt dat.
- P4.3 Een hoedprofiel (vier plooien): de volgorde van het voorstel is de volgorde die zonder botsing kan (binnenste plooien eerst); de 2D-botsingscontrole keurt de omgekeerde volgorde af.
- P4.4 Perskracht PP2 met Rm = 450, V = 24, lengte 200: 1,42 x 450 x 9 / 24 x 0,2 = 47,9 kN, binnen 1 %.
- P4.5 Flens korter dan 0,7 x V: melding met de naam van de plooi.
- P4.6 PP6 (niet prismatisch): het plooiblad draagt "volgorde niet op botsing gecontroleerd".
- P4.7 Het model toont de toestand na stap n: het volume blijft gelijk in elke stap (binnen 0,5 %).
- P4.8 Bend Table op een tekenblad: zelfde plooien, zelfde tags als op het plooiblad.

**Fase P5: prijs per plaat**

- P5.1 PP1 met vaste testinstellingen, uitbesteed: materiaal = omschreven rechthoek met afstand x dikte x dichtheid x prijs per kg; snijden = snijlengte x prijs per meter voor de diktetrap; insteken x prijs. Op de cent, uitgeschreven in de test.
- P5.2 Twee manieren van materiaal toerekenen, kiesbaar en vermeld op de regel: "omschreven rechthoek + afval %" (zonder nest) en "aandeel van het geneste blad" (blad gedeeld naar netto oppervlak, restplaat boven een instelbare maat telt als voorraad).
- P5.3 Eigen machine: tijd = snijlengte / snelheid(materiaal, dikte) + insteken x insteektijd + verplaatsen; zelfde stuk, handberekening in de test.
- P5.4 Een dikte of materiaal zonder prijs of snelheid geeft een regel "geen prijs" en een totaal dat als onvolledig gemarkeerd is. Geen stille nul, geen interpolatie buiten de tabel.
- P5.5 PP8 naast `kostprijs()` uit de bibliotheek (categorie laser): binnen 2 % bij dezelfde instellingen.

---

## 5. Prijsmodel (gedeeld door de drie extensies)

### 5.1 Uitgangspunten

- Alle bedragen **exclusief btw** tot op de offerte.
- Elke startwaarde hieronder is een **AANNAME**. Ze komen uit de drie prijsbestanden in `bibliotheek/` (opgezocht tussen 2026-11-10 en 2026-11-13, bronnen staan daar per regel) of zijn een richtwaarde van mij. Ian vervangt ze door zijn eigen inkoopprijzen.
- Een offerte toont de klant nooit het woord AANNAME, maar het programma toont Ian voor het exporteren hoeveel regels erop steunen en vraagt een bevestiging (zoals de AANNAME-bevestiging bij 3D Print).

### 5.2 Invoer

**Tarieven**

| Instelling | Start | Bron |
|---|---|---|
| Uurloon | € 45/u | keuze van Ian (`bibliotheek/*/prijzen.mjs`). `UURLOON_UITLEG` in de balustrades zegt al dat een kostendekkend tarief voor een zelfstandige in België eerder € 55 tot 70/u is; die tekst hoort naast het veld |
| Marge | 30 % | bibliotheek: 15 tot 35 % per soort |
| Afval profielen | 15 % | `fitness/prijzen.mjs` |
| Afval plaat (zonder nest) | 20 % | AANNAME van mij |
| Leercurve reeks | uit | `fitness/prijzen.mjs` heeft er een (1 stuk x 2,5, 5 stuks x 1,6, 20 stuks x 1,0); als optie |

**Materiaal**

| Instelling | Start | Bron |
|---|---|---|
| Profielstaal S235 | € 1,80/kg | `fitness/prijzen.mjs` `BRON.staalKg` |
| Profiel per meter | tabel `STAAF` | `taatsdeuren/prijzen.mjs` |
| Plaat S235 | € 1,60/kg | `fitness/prijzen.mjs` |
| RVS 304, aluminium | geen startwaarde | leeg tot Ian een prijs invult; een stuk in dat materiaal geeft "geen prijs" |
| Lasdraad, gas | in het lastarief per meter begrepen | AANNAME; als aparte regel mogelijk |

**Machinetijden en loonwerk**

| Bewerking | Eigen (tijd) | Uitbesteed (prijs) | Bron |
|---|---|---|---|
| Zagen | 0,07 u per stuk, + 0,06 u per schuin stuk | n.v.t. | `fitness/werkwijze.mjs` `UREN` |
| Boren | 0,025 u per gat | buislaser € 0,40 per gat | idem, `buislaserGat` |
| Lasersnijden | snelheid per materiaal en dikte (tabel, leeg), insteektijd, machine-uurtarief | € 0,90/m tot 3 mm, € 1,40 tot 6, € 2,20 tot 10, € 3,20 daarboven; € 0,25 per insteek; startkost per order (leeg) | `fitness/prijzen.mjs` `snijM`, `insteek` |
| Plooien | 0,02 u per zetting + 0,15 u instellen per positie | prijs per zetting + instelkost (leeg) | `UREN.zet` |
| Buizen buigen | n.v.t. | € 25 per bocht + € 100 instellen | `bocht`, `buigInstel` |
| Hechten en passen | 0,12 u per verbinding | n.v.t. | `UREN.verbinding` |
| Lassen | 0,35 u per meter, of een tabel per a-maat | n.v.t. | `UREN.lasM` |
| Afwerken | 0,35 u per constructie + slijpen per meter las (leeg) | n.v.t. | `UREN.afwerk` |
| Laserdeel afwerken | 0,03 u per stuk | n.v.t. | `UREN.laser` |

Lassen per a-maat (optie, AANNAME van mij): het neergesmolten volume van een hoeklas is ongeveer a² x lengte; de tijd per meter schaalt daarmee en met het aantal lagen (boven a5 meer dan één laag). De tabel begint met één waarde (a3 tot a4 = 0,35 u/m) en Ian vult aan uit eigen ervaring. Geen formule met boogtijd en inschakelduur in v1: dat suggereert een nauwkeurigheid die er niet is.

**Afwerking en overhead**

| Instelling | Start | Bron |
|---|---|---|
| Poedercoaten | € 25/m² | `fitness/prijzen.mjs` |
| Thermisch verzinken | € 0,75/kg | idem |
| Minimum per rit lakkerij, transport, verpakking | € 100 / € 60 / € 25 tot 45 | idem, `overhead` |
| Garantie en verzekering | 3 % + 1,5 % | idem |
| Opmeten, tekenen | uren, leeg | `balustrades/prijzen.mjs` categorie "opdracht" |
| Plaatsen | uren en rit, leeg | idem |

Het oppervlak voor coating komt uit het model (buitenoppervlak van de bodies; bij een gesloten koker alleen de buitenkant).

### 5.3 Opbouw van de berekening

```
materiaal   = profielen + platen + koopdelen (+ afval of restant)
bewerking   = som (tijd x uurloon) + loonwerk
afwerking   = coating + verzinken
overhead    = vaste bedragen + percentages
kostprijs   = materiaal + bewerking + afwerking + overhead
verkoop     = kostprijs x (1 + marge)        ← excl. btw
```

Eisen:

- Elke regel is terug te klikken naar de bodies of de lasnaden waar ze vandaan komt.
- Aantal stuks (reeks) is een invoer: instelkosten en vaste kosten worden over de reeks verdeeld; de prijs per stuk bij 1, 5 en 20 stuks is naast elkaar te zien.
- Afronden: per regel op de cent; het totaal is de som van de afgeronde regels. Eén afrondingsfunctie (half naar boven, op gehele centen), getest op 0,005 en 1,005.

---

## 6. Extensie 3: Offerte uit model

### 6.1 Eisen

| Nr | Eis |
|---|---|
| O-1 | Werkt op een part en op een assembly. Bij een assembly: elk component één keer berekend, vermenigvuldigd met het aantal (zoals de BOM in `tables.ts` telt met `bomPartNumber`). |
| O-2 | **Kostprijs** (voor Ian) en **offerte** (voor de klant) zijn twee weergaven van dezelfde gegevens. De klant ziet nooit de kostprijs, de marge, de bronnen of de aannames. |
| O-3 | Offerteregels zijn vrij te groeperen: één regel "Balustrade volgens tekening" of uitgesplitst in materiaal, werk, afwerking, plaatsing. Ian kiest per offerte het detailniveau. Vrije regels (tekst, aantal, eenheid, prijs) kunnen erbij. |
| O-4 | **Btw** per regel (21 %, 6 %, 0 % verlegd, vrijgesteld), met de totalen per tarief. Zie 6.4. |
| O-5 | Vaste velden: nummer, datum, geldig tot, klant, werfadres, omschrijving, leveringstermijn, betalingsvoorwaarden, voorwaarden, handtekeningvak "voor akkoord". |
| O-6 | **Bedrijfsgegevens als invulvelden.** Ian heeft nog geen naam en geen ondernemingsnummer. Zolang een verplicht veld leeg is, draagt elke export het watermerk **ONTWERP** over de pagina en de regel "Geen geldige offerte: ondernemingsgegevens ontbreken". |
| O-7 | Uitvoer: PDF (A4 staand), en de onderliggende gegevens als XLSX. Een afbeelding van het model (de bestaande renderer of een isometrisch aanzicht) kan bovenaan. Geen verzenden. |
| O-8 | Een offerte **bevriest** bij het exporteren: prijzen, instellingen en de geometriehash worden in het document bewaard. Wijzigt het model of een prijs daarna, dan blijft de bevroren offerte wat ze was en toont de boom "model gewijzigd sinds offerte 2026-003". Een nieuwe versie krijgt een revisieletter. |
| O-9 | Nummering: doorlopend per jaar (`2026-001`), instelbaar voorvoegsel, nooit twee keer hetzelfde nummer, geen gaten door annuleren van een dialoog. |
| O-10 | Een bijlage "Specificatie" (optie): stuklijst zonder prijzen, kleur, materiaal, normvermeldingen. De tekeningen zelf blijven tekenbladen. |

### 6.2 Interface in SOLIDWORKS-stijl

De stijlreferentie is SOLIDWORKS Costing (te verifiëren tegen de help van 2025): een knop op Evaluate, een **CostingManager** als extra tabblad boven de FeatureManager, en een **Costing Task Pane** rechts met de instellingen en onderaan de geschatte kost.

**CommandManager.** Tabblad **"Quote"** (part en assembly):

| Knop | Soort | Doet |
|---|---|---|
| Cost Model | groot | berekent of herberekent de kostprijs; opent de Cost Manager |
| Rates & Materials | groot | Fabrication Settings |
| Add Line | klein | vrije regel |
| Purchased Parts | klein | koopdelen met prijs |
| Finishing | klein | coating, verzinken |
| Quantity | klein | reeksgrootte |
| Customer | groot | klant en werf |
| Quote | groot | opent de offerte (voorbeeld) |
| Export | groot, met pijl | PDF, XLSX |
| Company | klein | bedrijfsgegevens |

Daarnaast een knop **Costing** op Evaluate die naar dit tabblad springt, zoals SOLIDWORKS.

**Cost Manager** (tabblad in het linkerpaneel, naast FeatureManager, PropertyManager en ConfigurationManager; `ManagerPane.tsx`). Een boom:

```
Cost (Lastafel-onderframe)         € 412,30   ⚠ 7 aannames
├─ Material                        € 148,10
│   ├─ Profiles (4)
│   ├─ Plates (6)
│   └─ Purchased (3)
├─ Operations                      € 201,60
│   ├─ Sawing (14 cuts)
│   ├─ Laser cutting (6 parts)
│   ├─ Bending (4 bends)
│   └─ Welding (3,2 m)
├─ Finishing                       €  38,00
├─ Overhead                        €  24,60
└─ No cost assigned (2)            ← bodies van soort 'onbekend'
```

De map "No cost assigned" bestaat ook in SOLIDWORKS Costing (te verifiëren) en is de plek waar niets stil verdwijnt. Klikken op een regel selecteert de bodies; rechtsklik geeft Override Cost… en Exclude.

**Task Pane rechts** (`TaskPane.tsx`): een tabblad Quote met Quantity, Markup, btw-regime, en onderaan een vast blok: kostprijs per stuk, verkoop excl. btw, verkoop incl. btw, en de vergelijking met de vorige berekening (groen of rood pijltje), zoals het blok "Estimated Cost per Part" van Costing.

**PropertyManager.** *Customer* (naam, adres, btw-nummer, particulier of bedrijf, werfadres, woning ouder dan 10 jaar) en *Quote* (nummer, datum, geldigheid, groepering, bijlagen).

**Offertevoorbeeld.** Een eigen venster met de pagina op schaal, zoals Print Preview; wat Ian ziet is wat in de PDF komt.

### 6.3 Datamodel en aansluiting

```ts
interface CostLine { id: string; categorie: 'profiel' | 'plaat' | 'koop' | 'zagen' | 'laser' | 'plooien' | 'lassen' | 'afwerking' | 'overhead' | 'vrij';
  omschrijving: string; hoeveelheid: number; eenheid: string; eenheidsprijsCent: number; bedragCent: number;
  bron: string; aanname: boolean; herkomst: BodySource[]; override?: { bedragCent: number; reden: string } }
interface Quote { id: string; nummer: string; revisie: string; datum: string; geldigTot: string;
  klant: { naam: string; adres: string; btwNummer?: string; soort: 'particulier' | 'bedrijf' }; werfadres?: string;
  regels: { omschrijving: string; hoeveelheid: number; eenheid: string; prijsCent: number; btw: 21 | 6 | 0; uit: string[] }[];
  btwRegime: 'normaal' | 'verlegd' | 'vrijgesteld'; voorwaarden: string; betaling: string; levertermijn: string;
  bevroren?: { op: string; hash: string; kostenregels: CostLine[]; instellingen: FabSettingsSnapshot } }
interface Company { naam: string; rechtsvorm: string; adres: string; ondernemingsnummer: string; btwPlichtig: boolean;
  rpr?: string; iban: string; bic?: string; telefoon: string; email: string; website?: string; logo?: string; verzekeraar?: string }
```

Aansluiting:

| Bestaand | Wat ermee gebeurt |
|---|---|
| `tables.ts` BOM, `configurations.ts` `bomPartNumber`, `bomDescription` | Dezelfde telling van componenten en dezelfde omschrijving; een component dat in de BOM uitgesloten is (`envelope`, `suppressed`) telt ook niet in de offerte. |
| `core/library/` (standaarddelen) | Koopdelen met een prijsveld per stuk (leeg tot Ian het invult). |
| `document/materials.ts` | Dichtheid; een prijs per kg komt **niet** in de materiaalbibliotheek maar in de instellingen (per gebruiker). |
| `export2d.ts` `toPdf` | Tekent paden en tekst. Voor een offerte zijn nodig: meerdere pagina's, een afbeelding, rechts uitlijnen van bedragen, tekens `€ ë é ï ç °`. Nakijken wat er is en uitbreiden (W12). |
| `xlsx.ts` `writeXlsx` | Eén blad per export; meerdere bladen (offerte, kostprijs, stuklijst) vraagt een uitbreiding. |
| Configuraties | Een offerte hoort bij één configuratie; de naam staat erop. |
| `doc.fab.quotes[]` | De offertes zitten in het model. Klantgegevens in een `.kcad` zijn persoonsgegevens: zie risico R9. |

### 6.4 Opmaak van de offerte en Belgische vereisten

**Ik ben geen boekhouder en geen jurist.** Wat hier staat is mijn kennis van de Belgische regels en is **te verifiëren met de boekhouder van Ian voor de eerste echte offerte de deur uitgaat**. Dat staat ook als vaste regel in de dialoog Company.

**Opbouw van de pagina (A4 staand):**

1. Kop: logo of naam links; rechts "OFFERTE", nummer, datum, geldig tot.
2. Twee blokken: afzender (bedrijfsgegevens) en klant (naam, adres, btw-nummer als bedrijf), daaronder het werfadres als het afwijkt.
3. Onderwerp en korte omschrijving, optioneel een afbeelding van het model.
4. Tabel: Pos, Omschrijving, Aantal, Eenheid, Eenheidsprijs, Btw %, Bedrag excl. btw.
5. Totalen: subtotaal excl. btw, btw per tarief met de maatstaf, **totaal incl. btw**.
6. Leveringstermijn, betalingsvoorwaarden (voorschot, saldo, termijn), geldigheid.
7. Voorwaarden (vrije tekst uit de instellingen; verwijzing naar algemene voorwaarden op de keerzijde of als bijlage).
8. "Voor akkoord": naam, datum, handtekening van de klant.
9. Voettekst op elke pagina: bedrijfsnaam, adres, ondernemingsnummer, IBAN, paginanummer.

**Vermeldingen van de onderneming** (Wetboek van economisch recht, boek III; te verifiëren): naam en rechtsvorm, adres van de zetel, ondernemingsnummer in de vorm `BE 0xxx.xxx.xxx` voorafgegaan door "BTW" als de onderneming btw-plichtig is, voor een vennootschap "RPR" met de rechtbank, en een bankrekening. Deze horen op alle documenten die van de onderneming uitgaan, dus ook op een offerte.

**Invulvelden zolang Ian geen zaak heeft:**

| Veld | Invulveld in de sjabloon |
|---|---|
| Naam | `[BEDRIJFSNAAM]` |
| Rechtsvorm | `[EENMANSZAAK / BV]` |
| Adres | `[STRAAT NR, POSTCODE GEMEENTE]` |
| Ondernemingsnummer | `[BTW BE 0___.___.___]` |
| RPR | `[RPR + RECHTBANK]` (alleen vennootschap) |
| Bank | `[IBAN BE__ ____ ____ ____]` |
| Contact | `[TELEFOON]`, `[E-MAIL]` |

"Eventus" komt nergens als standaardwaarde: dat bedrijf is niet van Ian. Het veld is leeg, niet vooraf ingevuld. Het programma controleert de vorm van een ondernemingsnummer (10 cijfers, modulo 97-controle; te verifiëren) en van een IBAN, en doet verder niets: geen opzoeking in de KBO, geen verbinding naar buiten.

**Btw-tarieven en regimes** (te verifiëren):

| Geval | Tarief | Wat de offerte vermeldt |
|---|---|---|
| Standaard: levering van goederen, werk voor een bedrijf, nieuwbouw | 21 % | niets extra |
| Werk in onroerende staat (geplaatst door Ian) aan een privéwoning die minstens 10 jaar in gebruik is, gefactureerd aan de eindgebruiker | 6 % | de voorwaarden, en dat de klant voor de juistheid instaat. Sinds 2022 vervangt een vermelding op de factuur het vroegere attest (te verifiëren); `bibliotheek/balustrades/dossier.mjs` spreekt nog van "attest van de klant" en moet dan mee aangepast worden |
| Alleen leveren zonder plaatsen (een deur afhalen, een fitnesstoestel) | 21 % | het programma laat 6 % niet toe op een regel zonder plaatsing in dezelfde offerte |
| Werk in onroerende staat voor een btw-plichtige klant die periodieke aangiften indient | 0 %, btw verlegd | de wettelijke vermelding "Btw verlegd" met de standaardtekst (uit de instellingen, door de boekhouder te leveren) |
| Vrijstellingsregeling kleine ondernemingen (omzet onder de drempel) | geen btw | de wettelijke vermelding dat de regeling van toepassing is; er wordt geen btw getoond |

De laatste rij is voor een starter een echte mogelijkheid. Het regime is daarom een instelling van de onderneming, niet een vaste 21 %. Ian kiest dit met zijn boekhouder (besluit B7).

Regels voor het programma:

- Het tarief is een keuze per regel met 21 % als standaard. 6 % kiezen opent een vakje met de drie voorwaarden (woning ouder dan 10 jaar, privégebruik, geplaatst en rechtstreeks aan de eindgebruiker gefactureerd) dat Ian moet aanvinken. Het programma beslist het tarief nooit zelf.
- Aan een particulier staat de prijs **inclusief btw** duidelijk als totaal; de regels mogen exclusief zijn als de totalen beide tonen.
- Btw wordt berekend per tarief op de som van de maatstaf, afgerond op de cent, niet per regel opgeteld.

**Geldigheid en voorwaarden.** Er is voor zover ik weet geen wettelijke geldigheidsduur; een offerte zonder termijn bindt langer dan Ian wil, zeker met staalprijzen die bewegen. Daarom: het veld "geldig tot" is verplicht, standaard 30 dagen (AANNAME, instelbaar), en de standaardtekst bevat een voorbehoud voor materiaalprijzen. Startteksten voor de voorwaarden (door Ian en zijn boekhouder of een jurist na te lezen; in de sjabloon gemarkeerd als "voorbeeldtekst"):

- geldigheid en wanneer de overeenkomst tot stand komt (ondertekende offerte en voorschot);
- voorschot (percentage, instelbaar) en betalingstermijn van het saldo;
- leveringstermijn als richttermijn vanaf akkoord en voorschot;
- wat niet inbegrepen is (elektriciteit, stellingen, afbraak, schilderwerk, vergunningen);
- maten op te meten na akkoord; afwijkingen van de werf worden verrekend;
- eigendomsvoorbehoud tot volledige betaling;
- garantie en klachten;
- voor consumenten bij verkoop buiten de verkoopruimte of op afstand: informatie over het herroepingsrecht, en dat het voor werk op maat doorgaans niet geldt (te verifiëren, boek VI WER);
- bevoegde rechtbank en toepasselijk recht.

**Buiten bereik:** facturen. Sinds 1 januari 2026 moeten facturen tussen Belgische btw-plichtigen gestructureerd elektronisch zijn (Peppol; te verifiëren). Een offerte valt daar niet onder. Het programma maakt geen facturen; de XLSX-export is er zodat Ian of zijn boekhoudpakket de regels kan overnemen.

### 6.5 Hergebruik uit bibliotheek/

| Bron | Wat | Hoe |
|---|---|---|
| `fitness/prijzen.mjs` `kostprijs` | De meest volledige opbouw: regels `{ cat, wat, bedrag, bron }`, categorieën `CAT`, overhead, leercurve, marge, btw | Structuur van `CostLine` en van de categorieën; orakel voor de vergelijking |
| `balustrades/prijzen.mjs` | Categorieën die de klant als toeslag ziet (opdracht, hoek, trap, plaatsen), prijs per strekkende meter | Voorbeeld voor het groeperen van offerteregels |
| `balustrades/dossier.mjs` `btwFactor` | 21 % of 6 % | De regel overnemen, uitbreiden met verlegd en vrijgesteld |
| `*/prijzen.mjs` `MARKT`, `MARKTBAND` | Marktprijzen BE/NL met bron | Optioneel blok in de Task Pane: "markt: € x tot y" als het product uit een bibliotheek komt. Alleen voor Ian, nooit op de offerte |
| `*/dossier.mjs` | HTML-dossier met kostprijstabel en XLSX-rijen | Voorbeeld voor de kostprijsweergave en de XLSX-export |
| `taatsdeuren/aanvraag.mjs` | Offerteaanvraag aan een leverancier in NL en EN, titelblok ISO 7200 | Voorbeeld voor een latere functie "prijsaanvraag aan lasersnijder" (bijlage bij de DXF-ZIP); niet in v1 |
| `voorbeelden/lastafel/docs/Offerteaanvragen.md` | Vier aanvragen klaar om te mailen | Idem |

### 6.6 Acceptatiecriteria

Proefstukken: LF1, LF2, PP1, PP6 uit de vorige hoofdstukken, plus:

| Naam | Wat | Waar |
|---|---|---|
| **OA1 Lastafel** | Assembly met profielen, platen, koopdelen en onbekende delen | `voorbeelden/lastafel/Lastafel.kcad`, vergelijking met de bestellijst in `voorbeelden/lastafel/README.md` |
| **OA2 Taatsdeur** | Product uit een bibliotheek | `bibliotheek/taatsdeuren/modellen/TD-01-strak-1000x2400.kcad`, orakel `kostprijs()` |
| **OA3 Deurkruk** | Assembly zonder profiel of plaat | `voorbeelden/deurkruk/Deurkruk.kcad` |

**Fase O1: kostprijsmodel**

- O1.1 LF1 en PP1 als part: de Cost Manager toont dezelfde regels en bedragen als L4.1 en P5.1.
- O1.2 OA1: elk component komt precies één keer voor in een van de mappen; de som van de aantallen is het aantal componenten in de BOM. De map "No cost assigned" bevat de hydrauliek en de elektrische delen, niet nul regels.
- O1.3 OA3: alles in "No cost assigned"; het totaal is als onvolledig gemarkeerd en Export geeft een bevestigingsvraag.
- O1.4 Override: een regel op € 100 zetten met een reden; het totaal volgt; na een herberekening blijft de override, met een markering.
- O1.5 Aantal 1, 5 en 20: instelkosten gedeeld door het aantal, materiaal per stuk gelijk; handberekening in de test.
- O1.6 OA2 naast `kostprijs()` uit de bibliotheek met dezelfde instellingen: staal en arbeid binnen 5 %; glas, beslag en plaatsen zijn koopdelen of vrije regels en worden als zodanig getoond. Verschillen verklaard in de test.
- O1.7 Model wijzigen: de Cost Manager toont verouderd; herberekenen geeft het pijltje omhoog of omlaag in de Task Pane met het juiste verschil.
- O1.8 Geen enkele euro in de kostprijs zonder bron: een test loopt alle regels af en faalt op een lege `bron`.

**Fase O2: offerte-opmaak en PDF**

- O2.1 Met lege bedrijfsgegevens: de PDF draagt het watermerk ONTWERP op elke pagina en de regel over ontbrekende gegevens; de invulvelden uit 6.4 staan er letterlijk.
- O2.2 Met ingevulde testgegevens (duidelijk fictief, "Testbedrijf BV", een ondernemingsnummer dat de modulo-controle haalt): geen watermerk; alle vermeldingen uit 6.4 staan in kop of voettekst.
- O2.3 Btw: drie regels van € 100,00, € 33,33 en € 0,01 aan 21 %, één van € 250,00 aan 6 %. Maatstaf 21 % = € 133,34, btw = € 28,00; maatstaf 6 % = € 250,00, btw = € 15,00; totaal incl. = € 426,34. Op de cent.
- O2.4 6 % kiezen zonder de drie vakjes aan te vinken: niet mogelijk. 6 % op een offerte zonder plaatsingsregel: melding.
- O2.5 Regime "verlegd": geen btw-bedrag, de vermelding staat er; regime "vrijgesteld": geen btw-kolom, de vermelding staat er.
- O2.6 Tekstzoektest op de PDF van de klant: de woorden "AANNAME", "marge", "kostprijs", "bron" en "uurloon" komen niet voor.
- O2.7 Notatie: `€ 1.234,56`, datum `19/11/2026`, een bedrag van € 0,50 als `€ 0,50`. Tekens `€ ë é ï ç °` leesbaar in de PDF (W12).
- O2.8 Een offerte van 60 regels loopt over twee pagina's: de tabelkop herhaalt, totalen staan niet los van de laatste regels, voettekst en "pagina 1 van 2" op beide.
- O2.9 Het voorbeeld op het scherm en de PDF zijn hetzelfde (beeldvergelijking van de eerste pagina binnen een kleine marge).
- O2.10 Er gaat geen netwerkverzoek uit bij het maken of exporteren van een offerte (e2e met onderschepte verzoeken).

**Fase O3: offertebeheer**

- O3.1 Twee offertes na elkaar: nummers `2026-001` en `2026-002`. Een geannuleerde export verbruikt geen nummer.
- O3.2 Bevriezen: na export het uurloon wijzigen; de bevroren offerte opnieuw openen toont de oude bedragen; een nieuwe versie krijgt revisie B en de nieuwe bedragen.
- O3.3 Model wijzigen na export: de boom toont "model gewijzigd sinds offerte 2026-001".
- O3.4 Opslaan, sluiten, openen: offertes, klant en revisies zijn er nog; een bestand van voor deze fase opent zonder `doc.fab`.
- O3.5 XLSX: bladen Offerte, Kostprijs en Stuklijst; bedragen als getal; de som in Excel is gelijk aan het totaal in de PDF.
- O3.6 "Save a copy without customer data" maakt een `.kcad` zonder klantgegevens en zonder prijzen (R9).

---

## 7. Aanbevolen bouwvolgorde

| Stap | Fase | Waarom op deze plaats |
|---|---|---|
| 1 | **F0** werkplaatskern | Alles hangt eraan; zonder herkenning werkt niets op de bestaande modellen |
| 2 | **P1** uitslag en plaatgegevens | Hier zit het grootste onbekende in de bestaande code (W4, W5). Vroeg weten of de uitslag betrouwbaar is |
| 3 | **P2** DXF per plaat | Eerste uitvoer waar Ian meteen iets aan heeft; klein en goed te testen |
| 4 | **L1** voorraad en herkenning van profielen | Bouwt op F0 |
| 5 | **L2** zaagstaat en zaagplan | Tweede uitvoer met directe waarde; algoritme bestaat al in de bibliotheek |
| 6 | **L4** en **P5** kostprijs per stuk en per plaat (P5 eerst zonder nest) | Geeft de kostenregels voor de offerte |
| 7 | **O1** kostprijsmodel | Voegt samen wat er is |
| 8 | **O2** offerte en PDF | De derde gevraagde uitvoer; tot hier is alles wat Ian vroeg in een eerste vorm bruikbaar |
| 9 | **P3** nesting, eerst rechthoek, dan vorm | Grootste algoritmische werk; verbetert P5 maar blokkeert niets |
| 10 | **L3** lasnaden en lasvolgorde | Veel interface, weinig afhankelijkheden; mag ook parallel met stap 9 |
| 11 | **P4** plooivolgorde | Botsingscontrole is onzeker; als laatste, met een eerlijke beperking |
| 12 | **O3** offertebeheer | Nummering en bevriezen; pas zinvol als de offerte stabiel is |

Na elke stap een review door mij met de criteria van die fase, zoals bij 3D Print (docs/35): tests en eigen meetscripts draaien, de uitvoerbestanden met de hand nalopen, de foto's naast SOLIDWORKS leggen. Stap 9 en 10 kunnen door twee agenten tegelijk, elk met een vaste bundel bestanden (`src/fab/nest*` tegen `src/fab/weld*`).

Vrijgave zoals bij 3D Print ("nog te printen"): elke uitvoer voor een machine of een klant heeft een status die pas verandert als Ian het in het echt gedaan heeft.

| Uitvoer | Status tot | Vrijgave door |
|---|---|---|
| DXF per plaat | "nog te openen bij de lasersnijder" | één echte bestelling of een bevestiging van de lasersnijder |
| Zaagstaat | "nog te zagen" | LF1 gezaagd en nagemeten |
| Uitslag en plooiblad | "nog te plooien" | een proefstrook geplooid en nagemeten |
| Offerte | "ONTWERP" | bedrijfsgegevens ingevuld en sjabloon nagelezen door de boekhouder |

---

## 8. Vroege waarschuwingen uit de bestaande code

Gelezen, niet uitgevoerd. De bouwagent bevestigt of weerlegt elk punt met een test voor hij erop bouwt.

| Nr | Waar | Wat | Gevolg | Advies |
|---|---|---|---|---|
| W1 | `weldments.ts` `cutList()` | Groepeert op gesorteerde omschreven maten, volume en omschrijving. Twee stukken die elkaars spiegelbeeld zijn hebben dezelfde sleutel | Een links en een rechts stuk met gaten komen als één positie op de zaagstaat | De zaagstaat vergelijkt ook de ligging van de eindvlakken en gaten in een eigen assenstelsel van het stuk, zoals `taatsdeuren/stuklijst.mjs` (kiest de eenvoudigste van 4 spiegelingen). Criterium L2.7 |
| W2 | `frameBuild.ts` regel 56 | `bodyMeta.length` komt uit `m.length` van het segment | Niet nagekeken of dat de langste zijde is of de hartlijn. Bij verstek scheelt dat de profielhoogte | Test op LF1 voor de zaagstaat erop steunt |
| W3 | `weldments.ts` `PROFILE_LIBRARY`, `findProfile` | 40 maten, geen kg/m, geen staalsoort, geen onderscheid EN 10219 tegen EN 10210; `findProfile` valt stil terug op een ander profiel | Massa en prijs op het verkeerde profiel zonder melding | Bibliotheek uitbreiden; terugval alleen met een waarschuwing |
| W4 | `sheetMetalBuild.ts` regel 209 tot 238 | De echte uitslag (`unfoldGeometry` met uitsparingen en gaten) draait alleen als `ctx.sheet.bentOnly` waar is, volgens het commentaar "when the bends all come from the base flange". Anders komt de uitslag uit `flatPatternGeometry(chain, ..., extensions)`: de schetsketen met flensverlengingen | Een stuk met edge flanges, hems of een miter flange krijgt mogelijk een uitslag zonder zijn uitsparingen. Een DXF daarvan is een fout stuk in staal | Eerste taak van fase P1: PP3 bouwen en nameten. Is het zo, dan is een algemene ontvouwer (vlakken en plooizones als graaf, ontvouwen vanaf een vast vlak) het hoofdwerk van P1 |
| W5 | `unfold.ts`, flat body als `BufferGeometry` | De uitslag is een mesh. Een gat is een veelhoek, een afgeronde hoek een reeks koorden | Een DXF met honderden lijntjes in plaats van bogen: trage, hoekige snede, en sommige lasersnijders weigeren het | Contour uit de exacte kernel waar die er is (`src/core/occt`), anders bogen terugvinden met een cirkelfit binnen 0,005 mm en als boog schrijven. Criterium P1.7 |
| W6 | `export2d.ts` `toDxf` | R12 met LINE, POLYLINE, CIRCLE, TEXT; geen ARC, geen bulge, één laag | Niet bruikbaar als laser-DXF | Eén DXF-schrijver met lagen en bogen die ook de tekenbladen bedient; de bibliotheek heeft de bulge-polylijn al |
| W7 | `sheetmetal.ts` | Drie K-waarden in omloop: standaard 0,5 (`DEFAULT_SHEET_METAL`), 0,44 voor staal (`materialKFactor`), trap 0,33/0,4/0,5 (`bendTableK`); de bibliotheek rekent met 0,4 | Dezelfde bak geeft een andere uitslag naargelang de weg. Bij 3 mm en 4 plooien scheelt 0,5 tegen 0,33 ongeveer 3 mm | Eén bron, zichtbaar op het plooiblad; DIN 6935 als keuze; gemeten buigaftrek gaat voor |
| W8 | `bibliotheek/*/prijzen.mjs` | Drie prijsmodellen met elk een eigen `STANDAARD`, eigen sleutels, uurloon 45 op drie plaatsen | Een vierde in de app maakt het erger | `src/fab/` wordt de bron; de bibliotheek blijft in deze ronde ongewijzigd en dient als orakel; samenvoegen als aparte taak daarna |
| W9 | `evaluateDialogs2.tsx` regel 82 tot 83 | "Properties Summary" en "Cut List Table" tonen alleen een melding | Half afgewerkte dialoog op de plek waar de zaagstaat aansluit | Afmaken in L2 |
| W10 | `Ribbon.tsx` regel 286, `tabShow.ts` | In een assembly bestaat het tabblad Frames niet | De lasgroep is in een assembly onbereikbaar | Besluit B1 |
| W11 | `types.ts` regel 1421, `validateFeatures.ts`, `migrate.ts` | Tabelsoorten zijn een gesloten lijst | Een nieuwe soort in een oud programma: nakijken dat het bestand met een duidelijke melding weigert of de tabel overslaat | Test met een fixture, zoals `compat0510.test.ts` |
| W12 | `export2d.ts` `toPdf` | Gebouwd voor tekenbladen. Niet nagekeken: meerdere pagina's, afbeeldingen, lettertype-codering van `€` en letters met accenten | Een offerte met `?` in plaats van `€` | Vroeg testen (L2.9); zo nodig een ingebed lettertype. Geen nieuw pakket zonder akkoord |
| W13 | `tools/line-budget.cjs`, `tools/bundle-budget.cjs`, `Ribbon.tsx` | Er zijn budgetten op regels en bundel; `Ribbon.tsx` is groot | Drie tabbladen erbij breken de poort | Elk tabblad een eigen lui geladen chunk; pictogrammen in een eigen bestand zoals `printIcons.tsx` |
| W14 | `store.ts`, slices | De store is in slices gesplitst met `useShallow` | Een nieuwe grote slice die bij elke muisbeweging rendert | Eigen store per extensie zoals `printStore.ts` |
| W15 | Tabblad "Add-Ins" (`Ribbon.tsx` regel 549) | Er is al een tabblad "Phlippo Add-Ins" | Een part heeft nu al een tiental tabbladen; er komen er tot drie bij | De drie extensies aan en uit te zetten op Add-Ins, zoals SOLIDWORKS add-ins; standaard aan |

---

## 9. Risico's

| Nr | Risico | Kans | Gevolg | Maatregel |
|---|---|---|---|---|
| R1 | **De voorbeeldmodellen hebben geen weldment- of sheet metal-features.** Zonder herkenning werken de extensies alleen op nieuwe modellen | zeker | de extensies doen niets op de lastafel, de deuren en de toestellen | Herkenning in F0 (2.3), getest op LF2 tot LF5; generators later met `fab.*`-eigenschappen |
| R2 | **Foute uitslag** (W4, W5, W7) | groot | plaat verkeerd gesneden: geld en tijd weg, en vertrouwen | P1 voor al de rest; volumecontrole op elke uitslag; status "nog te plooien"; proefstrook |
| R3 | **AANNAME-prijzen op een echte offerte.** € 45/u zonder vaste kosten, staalprijs van november 2026, loonsnijprijzen die nooit bij een Belgische snijder zijn opgevraagd | groot | Ian werkt met verlies of prijst zich uit de markt | Teller van aannames, bevestiging bij export, datum per prijs, de uitleg bij het uurloon, marktband ernaast waar die bestaat |
| R4 | **Offerte zonder geldige ondernemingsgegevens of met een fout btw-tarief** | middel | boete of een klant die 6 % eist waar 21 % moest; Ian draagt het verschil | Watermerk ONTWERP, 6 % alleen met aangevinkte voorwaarden, regime als instelling, vaste regel "nakijken met de boekhouder"; alle juridische punten in dit document zijn te verifiëren |
| R5 | **Schijn van EN 1090-conformiteit.** Een lasplan met "EXC2" en ISO 2553-symbolen ziet er officieel uit | middel | Ian levert dragend werk zonder FPC-certificaat in de waan dat het in orde is | Vaste waarschuwing vanaf EXC2, het woord "conform" nooit automatisch, EXC4 niet kiesbaar |
| R6 | **Normwaarden uit het hoofd.** De normen zijn betalend; mijn getallen (toleranties, K-formule, klassen) zijn niet nagekeken | zeker | een fout getal in de code met een normnummer erbij lijkt gezag te hebben | Elke normwaarde in de code met een openbare bron of het label AANNAME, zoals `bibliotheek/balustrades/normen.mjs` het doet |
| R7 | **Vormnesting** is zwaar: no-fit-polygonen met bogen en gaten, rekentijd, randgevallen | groot | fase P3 loopt uit of geeft overlappende stukken | Rechthoeknesting eerst en altijd als terugval; geldigheid gecontroleerd met een onafhankelijke meting (P3.1); tijdsbudget en annuleren |
| R8 | **Plooivolgorde zonder betrouwbare botsingscontrole** | groot | een volgorde die op de kantbank niet kan | Controle alleen voor prismatische stukken; anders de uitdrukkelijke vermelding; Ian kan altijd verslepen |
| R9 | **Klantgegevens en prijzen in het `.kcad`.** Het model gaat naar een lasersnijder of een collega, de repo is publiek | middel | persoonsgegevens (AVG) en de marge van Ian op straat | Offertes in `doc.fab.quotes` met een uitdrukkelijke export "zonder klantgegevens en prijzen" (O3.6); de DXF- en STEP-export bevat ze nooit; geen echte klantgegevens in fixtures of voorbeelden |
| R10 | **DXF-dialect.** Elke lasersnijder leest anders (R12 tegen R2000, splines, lagen, eenheden) | middel | bestand geweigerd of op de verkeerde schaal ingelezen | R12 als standaard zoals de bibliotheek (bewust zonder `$INSUNITS`), geen splines, rondreistest, status "nog te openen" |
| R11 | **Herkenning geeft een verkeerd profiel** (40 x 40 x 3 tegen 40 x 40 x 4 op een gefacetteerd body) | middel | verkeerd besteld, verkeerde prijs | Tolerantie, keuze bij twee kandidaten, zichtbaar "herkend" tegen "uit feature", massacontrole |
| R12 | **Lasvolgorde als waarheid gelezen** | middel | vervorming ondanks "het programma zei het" | Het lasplan zegt dat het een voorstel volgens vuistregels is; geen krimpberekening beloofd |
| R13 | **Omvang.** Drie extensies met twaalf fasen, naast 3D Print fase 4 en Phlippo Studio | groot | alles half af | De volgorde van hoofdstuk 7: na stap 8 heeft Ian van elke extensie een bruikbare eerste vorm; de rest is verbetering |
| R14 | **Twee waarheden** tussen `src/fab/` en `bibliotheek/` | middel | dezelfde deur kost in de configurator iets anders dan in de offerte | Orakeltests binnen 2 tot 5 %; samenvoegen als aparte taak (W8) |
| R15 | **Bestandsformaat.** `doc.fab` in een oudere build | klein | stil verlies van offertes bij opslaan in een oude versie | Formaatversie verhogen, migratie, compat-test |

---

## 10. Wat ik bij elke review controleer

1. De criteria van de fase, elk met een test of een bestand dat ik zelf opnieuw laat lopen. Een criterium zonder bewijs is niet gehaald.
2. Elke uitvoer met de hand: een DXF als tekst en teruggelezen, een zaagstaat nagerekend op één regel, een offerte opgeteld op een rekenmachine.
3. Negatieve proeven: het programma moet weigeren wat fout is (open contour, stuk te lang, 6 % zonder voorwaarden).
4. Foto's van tabblad, PropertyManager en boom naast SOLIDWORKS: vink en kruis bovenaan, secties inklapbaar, selectievakken in blauw, pictogrammen in dezelfde lijndikte en kleurtaal, geen nieuwe soort venster waar SOLIDWORKS een PropertyManager gebruikt.
5. Het deurkruk-voorbeeld bij elke update, ook hier: de deurkruk is het proefstuk dat **niets** mag opleveren behalve "No cost assigned", zonder fout.
6. De eerlijkheid: staat elke aanname als aanname, elke niet in het echt geteste uitvoer als "nog te ...", en staat nergens "conform"?
7. De poorten: typecheck, vitest, e2e, regel- en bundelbudget, `graphify update .`.

---

## 11. Besluiten voor Ian

| Nr | Vraag | Mijn advies |
|---|---|---|
| B1 | Lasconstructies+: een groep op het bestaande tabblad "Frames" (part) plus een tabblad "Weld Shop" in een assembly, of overal één nieuw tabblad? | Groep op Frames in een part, "Weld Shop" in een assembly |
| B2 | Namen van de tabbladen: Engels zoals de rest van de app ("Laser & Bend", "Quote") of Nederlands ("Lasersnijden/plooien", "Offerte")? | Engels in de interface, Nederlands in alle uitvoer |
| B3 | Heeft Ian een eigen laser of kantbank, of besteedt hij uit? | Standaard "uitbesteed" voor laser en plooien, "eigen" voor zagen en lassen; per machine om te zetten |
| B4 | Welke profielen en platen heeft hij nu in huis? | Een lijst van Ian vult de voorraad; zonder lijst start ze leeg met de tabel uit de taatsdeuren als catalogus |
| B5 | DIN 6935 als standaard voor nieuw plaatwerk in staal in plaats van K = 0,5? | Ja, met de gemeten buigaftrek als voorkeur zodra Ian een proefstrook heeft |
| B6 | Uurloon: blijft € 45/u, of een kostendekkend tarief? | Navragen bij de boekhouder; het veld blijft een instelling en de uitleg staat erbij |
| B7 | Btw-regime bij de start: normaal of de vrijstellingsregeling voor kleine ondernemingen? | Beslissing van Ian met zijn boekhouder; het programma ondersteunt beide |
| B8 | Mag er voor de PDF een lettertype ingebed worden als de standaardletters `€` en accenten niet halen? | Ja, een vrij lettertype, eerst nakijken of het nodig is (W12) |
| B9 | Nesting: volstaat rechthoeknesting voor de eerste versie, met vormnesting daarna? | Ja |
| B10 | Voorwaarden op de offerte: levert Ian een eigen tekst, of start hij met de voorbeeldtekst? | Voorbeeldtekst, gemarkeerd als voorbeeld, na te lezen voor gebruik |
