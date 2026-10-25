# Merken en auteursrecht: wat mag wel en niet lijken op het origineel

Vraag van de gebruiker (2026-10-20): de interface moet er exact uitzien als SOLIDWORKS; welke "work-arounds"
zijn er voor auteursrecht en merkenrecht? Dit is een praktische samenvatting, geen juridisch advies; bij twijfel
een IE-advocaat raadplegen.

## Wat in Europa vrij is om na te maken

- **Functionaliteit, werkwijze en bedieningsconcept** (CommandManager-indeling, workflow "vlak kiezen → schets →
  feature", sneltoetsen, muisgedrag, de volgorde van knoppen) vallen niet onder het auteursrecht op software.
  Het Hof van Justitie EU besliste in *SAS Institute / World Programming* (C-406/10) dat functionaliteit,
  programmeertaal en bestandsformaten geen beschermde uitdrukking zijn.
- **Een grafische gebruikersinterface** is alleen beschermd als hij een "eigen intellectuele schepping" is
  (*BSA / Ministerstvo kultury*, C-393/09). Standaardelementen zoals een menubalk, een tabstrip, een boomstructuur,
  een eigenschappenpaneel, een statusbalk, Windows-grijs en blauwe selectie zijn technisch bepaald en gangbaar,
  en daarom in de praktijk niet (of nauwelijks) beschermd.
- **Kleuren en kleurconventies** (blauw = onderbepaald, zwart = volledig bepaald, rood = overbepaald, groene
  relatie-iconen, witte viewport) zijn conventies, geen beschermde werken.
- **Engelse commandonamen** zoals "Extruded Boss/Base", "Smart Dimension", "Shaded Sketch Contours" zijn
  beschrijvende aanduidingen; alleen geregistreerde merken (zie hieronder) moeten vermeden worden.

## Wat wél beschermd is en vermeden moet worden

| Beschermd | Waarom | Wat de app doet |
|---|---|---|
| Naam **SOLIDWORKS**, het DS-logo, de rode "S"-woordmerken | Geregistreerde merken van Dassault Systèmes SolidWorks Corp. (o.a. SOLIDWORKS, eDrawings, PDMWorks, 3D ContentCentral) | Eigen naam **Phlippo CAD**, eigen logo (blauwe tegel met "P"); "Phlippo Add-Ins" in plaats van "SOLIDWORKS Add-Ins"; "PhlippoCAD Design ›" in de titel |
| **FeatureManager** | In oudere SOLIDWORKS-documentatie als (mede-)geregistreerd merk vermeld | In de UI vervangen door **Feature Tree** / "design tree"; alleen in de Nederlandse documentatie nog als vergelijkingsterm |
| **Iconen (pixel-/vectorkunst)** | Elke icoon is een eigen tekening en daarmee een werk; 1-op-1 kopiëren is inbreuk | Alle iconen zijn eigen tekeningen in dezelfde beeldtaal (`src/ui/icons.tsx`); er wordt niets uit de video of het programma uitgeknipt |
| **Schermafbeeldingen, hulpteksten, tutorials** | Teksten en screenshots van DS zijn auteursrechtelijk beschermd | Hulpteksten zijn zelf geschreven; de videoframes blijven lokaal in `referentie-video/` (gitignore) en worden niet gepubliceerd |
| **Lettertype en exacte pixelmaten** | Segoe UI is een Windows-systeemlettertype (licentie via Windows, niet via DS); de layoutmaten zijn niet beschermd | Lettertype-stack met Segoe UI, maten vrij overgenomen |
| **Bestandsformaten .SLDPRT etc.** | Formaat zelf is niet beschermd (SAS-arrest), maar reverse engineering van de binaire structuur kan contractueel (EULA) verboden zijn | Eigen formaat `.kcad` (JSON) |

## Praktische regels voor dit project

1. Geen woord "SOLIDWORKS", "SolidWorks", "Dassault", "3DEXPERIENCE" of "FeatureManager" in de UI, het logo, de
   bestandsnamen, de app-titel of de store-sleutels (`phlippo.*`). In de documentatie mag het als verwijzing.
2. Geen bitmap of SVG overnemen uit het programma, de help of de video; iconen altijd zelf tekenen.
3. Lay-out, kleuren, workflow, commandonamen en sneltoetsen mogen identiek zijn.
4. Bij publicatie een korte disclaimer: "Phlippo CAD is niet verbonden met of goedgekeurd door Dassault Systèmes.
   SOLIDWORKS is een geregistreerd merk van Dassault Systèmes SolidWorks Corp."
5. De videoframes en app-screenshots in `referentie-video/` zijn alleen voor lokale vergelijking en worden niet
   mee gepusht.

Bronnen: Justia-overzicht van merken van Dassault Systèmes SolidWorks Corp.; SOLIDWORKS-documentatie met de
merkvermelding van FeatureManager; HvJ EU C-393/09 (BSA) en C-406/10 (SAS Institute) via commentaren van
Fieldfisher en Husovec.

## Disclaimer in de app (0.3.2)

Help ▸ About Phlippo CAD vermeldt sinds 0.3.2 dat Phlippo CAD een onafhankelijk product van Ian Phlippo is en dat SOLIDWORKS een merk van Dassault Systèmes is (nominatief gebruik).

**Correctie 0.3.4 (QA-rapport v0.3.3, F50/F72).** De eerdere zin "niet afgeleid van" klopte niet: de werkwijze is bewust gemodelleerd naar publiek getoond gedrag (referentievideo's). De bewering dat `grep -rn SOLIDWORKS src` niets oplevert was ook fout (vier commentaarregels en de About-tekst). Sinds 0.3.4:

- één tekst (`src/app/legal.ts`): onafhankelijk product, niet verbonden met of goedgekeurd door Dassault Systèmes SolidWorks Corp., geen SOLIDWORKS-code, -bestanden of -artwork, werkwijze gemodelleerd naar publiek getoond gedrag; SOLIDWORKS alleen ter referentie genoemd;
- die tekst staat in About, op het Welcome-venster, op de licentiepagina van de installer (`LICENSE.txt`) en (kort) in elk Phlippo Viewer-bestand;
- productnamen van SOLIDWORKS zijn uit de zichtbare tekst gehaald (script `e2e-out/rename-trademarks.cjs`, alleen string-literals en JSX-tekst): FeatureManager → Feature Tree, PropertyManager → Property Panel, CommandManager → Command Ribbon, ConfigurationManager → Configurations, DisplayManager → Display Panel, MotionManager → Motion Timeline, DimXpert(Manager) → Auto Tolerancing / Tolerance Tree, TolAnalyst → Tolerance Stack-up, SimulationXpress → Quick Beam Estimate, FeatureXpert / DraftXpert → Auto-Fix Fillets / Auto-Fix Draft, Instant3D / Instant2D → Drag Handles / Drag Dimensions, RealView → Realistic Shading, SpeedPak → Lightweight Subassembly, eDrawings → Phlippo Viewer. Hole Wizard en Smart Fasteners (beschrijvende termen) blijven;
- in de broncode staat het woord SOLIDWORKS alleen nog in `src/app/legal.ts` (controle: `grep -rn SOLIDWORKS src`). Namen van componenten en bestanden in de code (bv. `PropertyManager.tsx`) zijn interne identifiers en niet zichtbaar.
