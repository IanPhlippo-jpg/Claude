# Veiligheid van de robotcel

Risicobeoordeling volgens EN ISO 12100 en EN ISO 10218-2, veiligheidsfuncties met het vereiste prestatieniveau (PLr)
volgens EN ISO 13849-1. Dit is de basis; de validatie (SISTEMA-berekening, testen) gebeurt bij de bouw.

## Normen

| Norm | Wat ze vraagt in deze cel |
|---|---|
| EN ISO 10218-1:2025 | de robot zelf: remmen, stopfuncties, snelheidsbegrenzing in handbediening, typeplaatje |
| EN ISO 10218-2:2025 | de hele cel: afscherming, beveiligde ruimte, veiligheidsfuncties, validatie |
| EN ISO 13849-1 | PL per veiligheidsfunctie (hier PL d, categorie 3) |
| EN 60204-1 | elektrische uitrusting: hoofdschakelaar, stopcategorieën 0 en 1, aarding |
| EN ISO 13850 | noodstop: rood op geel, zelfvergrendelend, stopcategorie 1 |
| EN ISO 14120, EN ISO 13857 | hek 2000 hoog, openingen en afstanden zodat armen en benen niet bij de robot kunnen |
| EN ISO 13855 | afstand van de lichtschermen tot het gevaar, uit de stoptijd |
| EN ISO 4414 | pneumatiek: veilig ontluchten, de grijper laat het stuk niet vallen bij luchtuitval |
| Machineverordening (EU) 2023/1230 | CE-markering, technisch dossier, vanaf 20 januari 2027 |

## Gevaren en maatregelen

| Gevaar | Waar | Maatregel |
|---|---|---|
| Geraakt of geplet worden door de robot (tot 3 m/s) | binnen het hek | hek 2000 hoog, deur vergrendeld (-B10) tot de robot stilstaat; lichtschermen aan de bandopeningen |
| Een stuk valt uit de grijper (deur 60 kg) | onder de baan van de robot | houdkracht met veiligheid 2 (docs/Grijpen.md), vacuümschakelaar per zone, terugslagkleppen, versnelling begrensd per stuk |
| Knellen tussen stuk en band | grijpplaats | stopper, fotocel, de robot daalt traag de laatste 50 mm |
| Elektrische schok | kast | IP54, aanraakbeveiliging, aardlek op het stopcontact, hoofdschakelaar afsluitbaar |
| Perslucht | slangen | veilig ontluchten -Q30, zachte start |
| Onverwacht starten na onderhoud | cel | start alleen na reset (-S3) buiten het hek; hoofdschakelaar met hangslot |

## Veiligheidsfuncties

| Nr | Functie | Ingang | Reactie | PLr |
|---|---|---|---|---|
| SF1 | Noodstop | -S1 (bedienpaneel), -S2 (kastdeur), 2 kanalen | stopcategorie 1: remmen, daarna STO en -Q2 af | d |
| SF2 | Toegangsdeur open | -B10 Schmersal AZM201, 2 kanalen, vergrendeld | deur gaat pas open bij stilstand; open = STO | d |
| SF3 | Lichtscherm onderbroken zonder muting | -B11, -B12 OSSD | STO (stopcategorie 0) | d |
| SF4 | Muting: een stuk mag door de opening | -B13..-B16, alleen tijdens een stuk, maximaal 8 s | lichtscherm overbrugd, lamp -P2 aan | c |
| SF5 | Handbediening (T1) | -S4 sleutel, vrijgaveknop | snelheid ≤ 250 mm/s aan de flens, vrijgave nodig | d |
| SF6 | Vacuüm valt weg tijdens dragen | -B21..-B23 | stopcategorie 1, robot blijft staan met het stuk laag | c |

Stoptijd en afstand van de lichtschermen (EN ISO 13855): S = K x T + C met K = 2000 mm/s en T = stoptijd robot (meten,
verwacht ± 0,5 s) + 0,02 s lichtscherm → S ≈ 2000 x 0,52 + 850 (C voor een resolutie van 30 mm) ≈ 1890 mm tussen
lichtscherm en het dichtste gevaarpunt. De robot is via de software (veilige zone in de besturing) begrensd tot 1900
mm van de bandopeningen; anders de lichtschermen verder naar buiten zetten.

## Validatie (bij de bouw)

1. SISTEMA-project met de werkelijke onderdelen (MTTFd, DC, CCF) per functie; doel PL d.
2. Testen: noodstop, deur, lichtschermen met teststaaf (30 mm), muting met een stuk en zonder stuk, luchtuitval met een
   deur van 60 kg aan de grijper (laag boven de band).
3. Stoptijden meten en de afstand van de lichtschermen bevestigen.
4. Technisch dossier, EU-conformiteitsverklaring, CE-markering, gebruikershandleiding.
