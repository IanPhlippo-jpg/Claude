# Grijpen: welke stukken en hoe

Gemaakt door `besturing/greep.py`. De camera meet elk stuk; de planner kiest de draaiing van A6, het grijppunt en de zones, en rekent de toegelaten versnelling (veiligheid 2, plat en rechtop).

Vlakgrijper 1972 x 500 mm: FA-M 1972 x 130 (zone 1), FMP-60 1972 x 60 (zone 2), FA-M 1972 x 130 (zone 3); houdkracht volgens Schmalz bij -250 mbar. Zone = balk (0, 1, 2).

| Stuk | Massa | Pakbaar | Zones aan | Houdkracht | Versnelling plat / rechtop / toegelaten | A6 |
|---|--:|---|--:|--:|--:|--:|
| Deur 2115 x 1015 x 54 (60 kg) | 60.0 kg | ja | 3 | 5600 N | 36.9 / 13.5 / 4.0 m/s² | 0° |
| Plint 2400 x 70 x 12 (eik) | 1.4 kg | ja | 1 | 1321 N | 458.3 / 224.3 / 4.0 m/s² | 12° |
| Plint 1200 x 90 x 15 (MDF), dwars | 1.2 kg | ja | 1 | 1034 N | 415.6 / 202.9 / 4.0 m/s² | 90° |
| Plank 600 x 300 x 18 (spaanplaat) | 2.1 kg | ja | 1 | 747 N | 167.4 / 78.8 / 4.0 m/s² | -30° |
| Plankje 200 x 100 x 18 | 0.2 kg | ja | 1 | 70 N | 140.1 / 65.2 / 4.0 m/s² | 45° |
| Paneel 2500 x 1250 x 38 (zwaar) | 83.1 kg | nee: te zwaar: 83 kg + grijper 45 kg > 120 kg | 3 | 5600 N | 23.9 / 7.0 / 4.0 m/s² | 0° |
| Latje 1000 x 30 x 20 | 0.4 kg | ja | 1 | 287 N | 332.0 / 161.1 / 4.0 m/s² | 0° |
