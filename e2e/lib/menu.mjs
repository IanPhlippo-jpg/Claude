// A menu row by its path, as the menus nest their groups ("Features ▸ Move/Copy…" is Move/Copy… in the Features
// fly-out): the groups are hovered open first. Works like a locator for count() and click().
export function menuPath(page, label) {
  const parts = label.split(' ▸ ');
  const row = (text, scope) => (scope ?? page).locator(`.k-menu-item:has-text("${text}")`).first();
  const open = async () => {
    // a menu that is not nested (a context menu) shows the whole path on one row
    if (await row(label).count()) return row(label);
    let scope = null;
    for (const p of parts.slice(0, -1)) {
      const host = (scope ?? page).locator('.k-menu-flyhost', { has: page.locator(`.k-menu-item:has-text("${p}")`) }).first();
      if (!(await host.count())) return null;
      await host.hover();
      await page.waitForTimeout(80);
      scope = host.locator('.k-menu-sub').first();
    }
    return row(parts[parts.length - 1], scope);
  };
  if (parts.length === 1) return row(label);
  return {
    count: async () => { const r = await open(); return r ? r.count() : 0; },
    click: async () => { const r = await open(); if (!r) throw new Error(`menu path not found: ${label}`); await r.click(); },
  };
}
