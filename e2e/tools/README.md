# e2e/tools

Hulpscripts die niet in de regressie horen (QA v0.3.4 F33): schermafbeeldingen voor vergelijkingen (`look-*`),
kalibratie van licht en kleur (`calib-*`, `tune-*`, `sample-*`), uitsnedes (`crop-*`), het app-icoon (`make-icon`) en
losse debugscripts. Ze draaien tegen `vite preview` op 4173 en schrijven naar `e2e-out/`; sommige lezen bestanden die
alleen op de ontwikkelmachine staan (referentieframes in `referentie-video/`). Start ze vanuit de projectmap:

    node e2e/tools/look-deurkruk.mjs

De desktop-hulpscripts `desktop-export`, `desktop-peek` en `desktop-peek-autosave` lezen alleen de autosave of maken een
schermafbeelding van de onverpakte shell (`electron .`, eerst `npm run build`); ze controleren niets en geven dus geen
foutcode (QA F101).
