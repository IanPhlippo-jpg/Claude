/**
 * Rebuild voor de modeltests (afzuiging, bureau): de tests meten de vorm, niet de snelheid. Zonder tijdsbudget, want op
 * een drukke machine sloeg de rebuild na 45 s de resterende features over en kreeg een test een onvolledige vorm (QA
 * 0.5.12: de voedingsbox zonder de uitsparing van de schakelaar). Elke rebuildfout laat de test meteen falen in plaats
 * van stil verder te rekenen.
 */
import { rebuildDocument as rebuildMetBudget, setRebuildBudget } from '../core/features/rebuild';

setRebuildBudget(Number.POSITIVE_INFINITY);

export const rebuildDocument: typeof rebuildMetBudget = (...args) => {
  const r = rebuildMetBudget(...args);
  if (Object.keys(r.errors).length) throw new Error(`rebuildfout in ${args[0].name ?? 'document'}: ${JSON.stringify(r.errors)}`);
  return r;
};
