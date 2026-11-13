# Eisen - balustrades (configurator zoals de taatsdeuren)

Gevraagd door Ian op 2026-11-13: "Ik zou graag ook balustrades maken, maak me nu een configurator waar ik dit kan
maken als de taatsdeuren."

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

**Marktband glas in U-profiel**

De bovengrens is € 600/m. De kit alleen kost al € 420-520/m aan materiaal, en de inox U-handregel komt daar ± € 60/m
bij.
