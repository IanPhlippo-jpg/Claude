import { describe, expect, it } from 'vitest';
import { renameOldKeys } from './prefs';

describe('options: renamed keys (F50)', () => {
  it('keeps a value saved under an old key', () => {
    expect(renameOldKeys({ 'doc.dimxpertMethod': 'General tolerance', 'general.featureXpert': false, 'sketch.autoRotate': true })).toEqual({ 'doc.autoToleranceMethod': 'General tolerance', 'general.autoFixFillets': false, 'sketch.autoRotate': true });
  });
  it('prefers a value under the new key', () => {
    expect(renameOldKeys({ 'addin.toolbox': true, 'addin.standardParts': false })).toEqual({ 'addin.standardParts': false });
  });
});
