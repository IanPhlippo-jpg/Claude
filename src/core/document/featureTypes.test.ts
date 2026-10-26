import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { FEATURE_TYPES } from './featureTypes';

// the whitelist of feature types must list exactly the `type` literals of the Feature union in types.ts
describe('feature type whitelist', () => {
  it('matches the Feature union', () => {
    const src = readFileSync('src/core/document/types.ts', 'utf8');
    const sf = ts.createSourceFile('types.ts', src, ts.ScriptTarget.Latest, true);
    const ifaces = new Map<string, ts.InterfaceDeclaration>();
    const aliases = new Map<string, ts.TypeAliasDeclaration>();
    sf.forEachChild((n) => { if (ts.isInterfaceDeclaration(n)) ifaces.set(n.name.text, n); if (ts.isTypeAliasDeclaration(n)) aliases.set(n.name.text, n); });
    const out = new Set<string>();
    const typeOf = (i: ts.InterfaceDeclaration) => {
      for (const m of i.members) if (m.name?.getText(sf) === 'type' && ts.isPropertySignature(m) && m.type) {
        if (ts.isLiteralTypeNode(m.type) && ts.isStringLiteral(m.type.literal)) out.add(m.type.literal.text);
        if (ts.isUnionTypeNode(m.type)) for (const x of m.type.types) if (ts.isLiteralTypeNode(x) && ts.isStringLiteral(x.literal)) out.add(x.literal.text);
      }
      for (const h of i.heritageClauses ?? []) for (const e of h.types) { const b = ifaces.get(e.expression.getText(sf)); if (b) typeOf(b); }
    };
    const visit = (t: ts.TypeNode): void => {
      if (ts.isUnionTypeNode(t)) return t.types.forEach(visit);
      if (ts.isTypeReferenceNode(t)) { const nm = t.typeName.getText(sf); const a = aliases.get(nm); if (a) return visit(a.type); const i = ifaces.get(nm); if (i) typeOf(i); }
    };
    visit(aliases.get('Feature')!.type);
    expect([...out].sort()).toEqual([...FEATURE_TYPES].sort());
  });
});
