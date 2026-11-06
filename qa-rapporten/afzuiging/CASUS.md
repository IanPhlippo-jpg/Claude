# Casus — nageltafelafzuiging (gelijke input voor vier onafhankelijke denkers)

## Vraag
Beoordeel welke volgende stap verantwoord is voor een maatwerk nagelstofafzuiging voor een salon. Het doel is een bruikbaar, comfortabel en veilig systeem; een onafhankelijk rapport moet aangeven wat behouden kan blijven en welke voorwaarden nodig zijn vóór productie of gebruik. Dit is een bestandsreview, niet een fysiek gekeurd apparaat. De opdrachtgever deelt zelf de conclusies met de bouwer.

## Beschikbare set
Snapshot 6 november 2026, circa23:07 CET (Europe/Brussels): 102 bestanden, waaronder27 Phlippo CAD-modellen, assemblage met77 geplaatste componenten zonder mates,9 STL’s,3 DXF’s,25 SVG’s,6 PDF’s, firmware voor twee ESP32’s en generatoren. Ontwerp: 210×210mm inbouwmodule,222mm rooster, radiale24V56,4W San Ace C1759TG24P0S01, één170×190×20mm M5-mat, terugblaas in werkruimte, aparte90W-adapter/elektronicabox, AMOLED-draaiknop/ESP-NOW. Nominale onderhang71mm bij34mm honingraatblad; rooster4mm boven blad.

## Vastgestelde resultaten
- Beide firmwaretargets compileren schoon. CAD-referenties en bestandsformaten parseren; DXF-audits zonder fouten. Roostercontrole: één stuk staal,140,7cm² open boven cassette, geen losse eilanden volgens contourcontrole.
- Productieset is revisie-inconsistent: romp CAD99mm versus STL/tekening114mm; cassette22 versus37mm; oude BOM noemt drie filters/stalen klauwen/M3, nieuwste CAD éénM5/PETG/M4. Vier STL’s zijn niet gesloten; vier voorgeschreven STL-typen ontbreken.
- Geen exact filterproduct-/fijnstof-/systeemlekbewijs; M5 is geen HEPA. Retourlucht maakt blootstellingscontrole essentieel. Geen gemeten systeemcurve of vangst-/geluidsrapport;500m³/h is een schatting,696m³/h fanvrijdebiet en609Pa maximumdruk zijn geen gelijktijdig werkpunt. Professionele producten claimen circa465–486m³/h met HEPA of tot4,4m/s, maar meetmethoden verschillen.
- Statisch aantoonbare firmwarepaden: sensormeting kan stale blijven, sampleloze ijking wordt geaccepteerd, software-UIT breekt ijking niet af, storingsbewaking ontbreekt bij20/25%, broadcast heeft geen unieke koppeling en boosttimeout zit alleen in de knop. Geen host/hardwarefoutinjectie uitgevoerd.
- G01-fanalternatief93,6W overschrijdt90W-voeding. Voor S01 is nominale ruimte beschikbaar, maar warmte, bedrading, USB-C, trekontlasting, guards/morsveiligheid en bevestiging op honingraatblad ontbreken als testbewijs. Filter uitkloppen in de salon is geen stofarme onderhoudsprocedure.

## Grenzen
Geen echte CAD-kernel-/SolidWorks-rebuild of exacte3D-botsingsanalyse, fysieke unit, print/slicerproef, FEM/CFD, blootstellings-, geluids-, elektrische of thermische test. De gedeelde generatorlibrary buiten de map is niet meegenomen; dat is geen bewezen fout in de volledige laptopprojectroot. Er zijn geen aankopen/bronwijzigingen gedaan en niets naar de bouwer gestuurd.

## Gevraagde onafhankelijke reactie — vast formaat
1. Kernconclusie (maximaal100woorden).
2. Controleerbare feiten versus aannames/onbekenden.
3. Maximaal5 prioriteiten, elk met impact, bewijssterkte en concrete acceptatietest.
4. Alternatieven en afruilen (gezondheid, maakbaarheid, kosten, comfort, onderhoud).
5. Wat moet blijven en wat mag niet worden vrijgegeven?
6. Welke ontbrekende informatie zou de conclusie wezenlijk veranderen?

Beoordeel onafhankelijk op dezelfde informatie. Geen naam, rol, handtekening, auteursmetadata of verwijzing naar andere reviewers. De rechter ontvangt later willekeurig gerangschikte, metadata-arme rapporten en weegt validiteit, bruikbaarheid en complementaire blinde vlekken. Deze casus bevat bewust geen eindscore of eerder rechterlijk oordeel.
