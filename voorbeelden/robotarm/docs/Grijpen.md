# Grijpen: welke stukken en hoe

Gemaakt door `besturing/greep.py`. De camera meet elk stuk; de planner kiest de draaiing van A6, het grijppunt en de zones, en rekent de toegelaten versnelling (veiligheid 2, plat en rechtop).

Vlakgrijper 2000 x 500 mm, 4 x 2 zones, werkonderdruk 40 kPa.

| Stuk | Massa | Pakbaar | Zones aan | Houdkracht | Versnelling plat / rechtop / toegelaten | A6 |
|---|--:|---|--:|--:|--:|--:|
| Deur 2115 x 1015 x 54 (60 kg) | 60.0 kg | ja | 8 | 24000 N | 190.2 / 90.2 / 4.0 m/s² | 0° |
| Plint 2400 x 70 x 12 (eik) | 1.4 kg | ja | 4 | 3360 N | 1180.7 / 585.4 / 4.0 m/s² | 12° |
| Plint 1200 x 90 x 15 (MDF), dwars | 1.2 kg | ja | 2 | 2160 N | 879.1 / 434.6 / 4.0 m/s² | 90° |
| Plank 600 x 300 x 18 (spaanplaat) | 2.1 kg | ja | 2 | 3600 N | 844.9 / 417.5 / 4.0 m/s² | -30° |
| Plankje 200 x 100 x 18 | 0.2 kg | ja | 1 | 480 N | 1015.8 / 503.0 / 4.0 m/s² | 45° |
| Paneel 2500 x 1250 x 38 (zwaar) | 83.1 kg | nee: te zwaar: 83 kg + grijper 55 kg > 120 kg | 8 | 24000 N | 134.6 / 62.4 / 4.0 m/s² | 0° |
| Latje 1000 x 30 x 20 | 0.4 kg | ja | 1 | 360 N | 418.8 / 204.5 / 4.0 m/s² | 0° |
