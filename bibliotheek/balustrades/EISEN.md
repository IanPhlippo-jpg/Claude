# Eisen - balustrades (configurator zoals de taatsdeuren)

Gevraagd door Ian op 2026-11-13: "Ik zou graag ook balustrades maken, maak me nu een configurator waar ik dit kan
maken als de taatsdeuren."

Bijgevraagd door Ian op 2026-11-13: "Ik zou ook voor onder schuine daken afschuiningen moeten kunnen toevoegen aan de
uiteinden van de balustrade."

## Keuzes van Ian (vragenronde 2026-11-13)
- **Soorten (alle vier):**
  1. staal met verticale spijlen (boven- en onderregel, gelast, poedercoat RAL);
  2. staal horizontaal of plaat (horizontale staven, vlakke, geperforeerde of lasergesneden plaat);
  3. glas met staal of inox (gelaagd veiligheidsglas met klemmen of tussen stalen staanders, met handregel);
  4. glas in een U-profiel (aluminium bodemprofiel, geklemd, eventueel handregel).
- **Plaats:** binnen (vide en trap, ook schuin langs een trap) en buiten (terras, balkon: thermisch verzinkt + poedercoat).
- **Bevestiging:** bovenop de vloer (voetplaat + ankers) en tegen de zijkant (zijmontage tegen vloerrand of trapboom).
- **Opbouw:** zoals de taatsdeuren: klantpagina (3D, kleuren, prijs) + werkplaats (zaaglijst, lasdetails, tekeningen
  per stuk, montage, bestellijst) + instellingen (uurloon, marge).
- **Prijs:** per strekkende meter per soort, met toeslagen (hoeken, trap, glas, zijmontage, buiten, plaatsen), naast
  de marktprijs gelegd zoals bij de deuren.

## Vaste regels (uit de taatsdeuren en de werkwijze)
- Tekeningen volgens ISO (5457, 7200, 128, 129, 5456-2 eerste hoek, 2553 lassen, 15786 gaten, 2768-m).
- Veiligheid volgens de Belgische regels voor borstweringen (NBN B 03-004) en de belastingen uit EN 1991-1-1 + ANB;
  glas volgens NBN S 23-002. Bronnen opzoeken en noteren; wat niet zeker is: AANNAME.
- Kooponderdelen: echte, in België/EU bestelbare producten met artikel en richtprijs.
- Ian bestelt zelf; er wordt niets besteld of verstuurd.

## Keuzes van de ontwerper (2026-11-13)
Ian liet de details open ("werk zelfstandig door"). Dit zijn de keuzes; "AANNAME" betekent dat de waarde niet letterlijk
in een bron staat (zie [docs/Normen-en-bronnen.md](docs/Normen-en-bronnen.md)).

**Opbouw**
- Dezelfde opbouw als de taatsdeuren. De klantpagina (`#balustrade`) toont de soort, de stijl, de maten, de kleur, de
  3D en de prijs per meter met de marktmeter. Daarnaast een werkplaats (`#werkplaats`) en instellingen
  (`#instellingen`).
- Generieke code komt uit `../taatsdeuren/`:
  - de RAL-kleuren en de afwerkingen (`opties.mjs`);
  - de tekst- en tabelhulpen (`blad.mjs`);
  - de zaagsnede en de staaflengte (`bestel.mjs`);
  - de laser- en coatprijzen (`prijzen.mjs`);
  - de montage-3D (`verbinding3d.mjs`) en de isometrische tekening (`tekenScène` uit `montage.mjs`);
  - `eur` (`dossier.mjs`).

  De prisma-hulpen en het montageblad zijn gekopieerd, want ze worden daar niet geëxporteerd.

**De vier soorten met hun stijlen**

| Soort | Stijlen |
|---|---|
| Spijlen | Ø12, Ø16 met ronde handregel, vierkant 12, plat 40x8 (lamellen), vierkant 14 dicht |
| Horizontaal of plaat | staven Ø16, platte staven 50x8, vlakke plaat, geperforeerd Rv 10-15, lasergesneden lamellen, cirkels Ø60 (de laatste is een opstap: rood in een woning) |
| Glas met staanders | stalen koker met platte handregel, stalen koker met inox handregel, inox staanders Ø48,3 |
| Glas in U-profiel | met U-handregel, zonder handregel |

**Staanders en bevestiging**
- De staander kiest zichzelf. Het is het lichtste profiel uit de lijst (koker 40x40x3 tot 80x80x5; inox Ø48,3) dat
  minstens 1200 mm afstand haalt bij 85 % benutting (buiging, doorbuiging, las en ankers).
- De velden zijn gelijk verdeeld.
- Een vrije afstand kan ook. Is die te groot, dan staat de controle op rood.
- Bovenop de vloer:
  - een lasergesneden voetplaat van minstens 140 x 140, met de dikte uit de berekening (8-20 mm);
  - 4 ankers M12;
  - de staander staat 100 mm van de vloerrand (AANNAME).
- Zijmontage:
  - een console van 230 hoog x (staander + 60), met 2 afstandhouders koker 40x40x3 van 30 mm;
  - 2 ankers op 60 en 190 mm onder de vloerpas;
  - de vloerrand moet ≥ 260 mm dik zijn, anders rood.
- De ankers zijn echte artikelen:
  - chemisch: fischer FIS V Plus 360 S met FIS A M12x160 (M10 in het U-profiel);
  - mechanisch: keilbout fischer FAZ II 12/20 (10/10 in het U-profiel). Geen inslaganker, want dat is te zwak voor
    een balustrade;
  - buiten in RVS A4.

**Glas**
- Altijd gehard-gelaagd.
- In het U-profiel: 88.4 in een woning, 1010.4 in een publiek gebouw.
- Tussen staanders: 55.2 in een woning, 66.2 publiek, telkens met 4 Q-railing-klemmen MOD 2100 op een blindklinkmoer M8.
- Het U-profiel is Q-railing Easy Glass Smart: MOD 8210 bovenop, MOD 8240 zijmontage. De ankers staan om de 250 mm,
  dichter (tot 125 mm) als de berekening dat vraagt.
- Q-railing Prime en Pro staan alleen in de bronnen, want er is geen publieke prijs.

**Maten en lijnen**
- Vormen: recht, een hoek (L, hoek 60-170°), U, of een trap.
- De trap heeft een helling uit de optrede en de aantrede. Erna kan een vide in lijn volgen.
- Hoogte:
  - 1100 mm standaard; 1200 mm bij een valhoogte van 12 m of meer;
  - langs een trap zonder vide ≥ 900 mm (AANNAME);
  - met een vide erna geldt 1100 mm over de hele lijn. Dat is eenvoudiger om te maken: de handregel loopt
    evenwijdig door, zonder sprong.
- Openingen ≤ 110 mm overal. Ook horizontale staven boven 450 mm houden ≤ 110 mm (strenger dan de 180 mm van
  Homegrade).
- Onderaan:
  - 70 mm onder de onderregel;
  - 50 mm langs de trap (AANNAME);
  - 50 mm onder de plint;
  - 80 mm onder het glas.

**Horizontale staven**

Ze zijn beklimbaar.
- In categorie A-D komt standaard een dichte plint van 50 tot 450 mm (uit te zetten: dan rood).
- In categorie E (industrie) is het oranje.
- Lasergesneden cirkels Ø60 zijn rood in een woning.

**Berekening**

Vereenvoudigd en voorzichtig:
- de lijnlast op de volle hoogte (de norm neemt 1000 mm);
- de handregel vrij opgelegd;
- het glas per blad zonder samenwerking.

Kleuren:
- groen ≤ 90 % benut;
- oranje tussen 90 en 100 %, of bij een aanname die je moet nakijken (ankers en glasklemmen boven 75 %, glas zonder
  handregel);
- rood > 100 % of buiten de norm.

De echte ankers reken je na met fischer FIXPERIENCE.

**Afwerking**
- Binnen: stralen en poedercoaten.
- Buiten: thermisch verzinken met ontluchtingsgaten, daarna duplex poedercoaten.
- Inox en het geanodiseerde U-profiel worden niet gecoat.

**Prijs**
- De prijs is de kostprijs met de marge per soort: spijlen en horizontaal 30 %, glas met staanders 25 %, U-profiel 15 %.
- De klant ziet de prijs per strekkende meter, met de toeslagen apart: hoeken, trap, glas, zijmontage, buiten en
  plaatsen. Plaatsen is aan of uit.
- De marktmeter vergelijkt zonder plaatsen.
- De U-profielen en de rubbers worden per meter aangerekend, met 10 % zaagverlies, zoals de aluminium deuren. De
  bestellijst toont wel hele staven van 2,5 m.
- Gehard glas komt met geslepen kanten (in de m²-prijs, AANNAME).
- Het glas is aangerekend aan de handelsprijs: SCHATTING tussen de webshopprijs en werkspot, instelbaar.
- Plaatsen: 1,5 uur per meter, met 0,4 uur per glasplaat erbij.

**Onder een schuin dak (afschuining, 2026-11-13)**
- Invoer per uiteinde: aan/uit, dakhelling 15-60° (standaard 45), hoogte onder het dak aan de muur (0-2500 mm,
  standaard 600), spleet loodrecht op het dak (10-150 mm, standaard 40).
- Het schuine stuk: xs = (H + spleet / cos θ − hmuur) / tan θ (de bovenkant van de handregel bereikt H). De knik ligt op
  het hart van de handregel; daar komt een staander (als er plaats is). Tussen de knik en het andere einde, de hoek of
  de andere knik blijft minstens 150 mm vlak (AANNAME); anders rood, en het model maakt het schuine stuk korter en
  steiler zodat je ziet dat het niet past.
- Bij hoek en U: begin = de eerste lijn, einde = de laatste lijn. Langs een trap alleen het einde (de vide na de trap):
  een dak laag boven het begin van een trap is zeldzaam, en een schuine handregel boven een schuine trap zou een
  dubbele knik vragen.
- Eindstaander tegen het knieschot: met de voetplaat uit de muur (hart op voetplaat / 2 + 5 mm; opening ≤ 110).
  Bovenkant aan de muur lager dan 300 mm: geen staander maar een muurplaat 80 x h x 8 met 2 ankers M10 (AANNAME);
  lager dan 150 mm: rood (er is geen plaats meer voor een onderregel, vulling en handregel).
- Spijlen: ingekort tot onder de schuine handregel, bovenaan schuin; in een schuin veld geen bovenregel (die zou bij
  een lage muur onder de onderregel komen). Staven: van de hoge staander tot tegen de handregel, daar schuin gezaagd
  (90° − θ). Plint en platen: schuin gelaserd.
- Glas met staanders: trapezium (vijfhoek als de knik in het paneel valt); 2 klemmen per kant vanaf 360 mm, daaronder
  1 klem in het midden, lager dan 50 mm geen klem (oranje). Glas in U-profiel: voeg op de knik, U-handregel met een
  verbinder MOD 6790 op elke knik.
- Normen (AANNAMES, geen bron gevonden bij Buildwise of de Nederlandse Bbl): opening tussen dak en balustrade =
  spleet + 10 mm tolerantie ≤ 110 mm; spleet ≥ 20 mm (het dak werkt); lager dan H alleen waar het dak lager is dan
  H + 110 mm; muurankers in het knieschot met 50 % van de afschuifweerstand in beton.
- Prijs: aparte toeslag "Afschuining onder het dak" met 0,8 u per afschuining (helling uitzetten, knik), 0,05 u per
  schuin stuk, 0,5 u per muurplaat, de muurplaat en de ankers, en vormglas (omschreven rechthoek + 15 %, SCHATTING,
  instelbaar). Op de werf 0,5 u per afschuining bij het plaatsen.

**Marktband glas in U-profiel**

De bovengrens is € 600/m. De kit alleen kost al € 420-520/m aan materiaal, en de inox U-handregel komt daar ± € 60/m
bij.
