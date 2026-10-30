// TEMPORARY: moderators (and above) can recolor the whole site for themselves. Each person's choice is
// saved in the kv table, so it follows them to every device. To remove the feature, delete this file and
// public/js/page-theme.js, then the lines marked "page theme" in app.js, main.js, pages.js, theme.js and
// styles.css, and the "page colors" test in test/api.test.js.
import { requireUser } from '../auth.js';
import { kvGet, kvSet } from '../db.js';
import { parseJson } from '../lib.js';

const HEX_RE = /^#[0-9a-f]{6}$/i;
export const PAGE_THEME_KEYS = ['bg', 'fg', 'accent', 'accent2'];

export function pageThemeRoutes(app, { db }) {
  const key = c => `page-theme:${c.get('user').id}`;
  const clear = db.prepare('DELETE FROM kv WHERE key = ?');

  app.get('/api/me/page-theme', requireUser('moderator'), c => c.json({ theme: parseJson(kvGet(db, key(c)), null) }));

  // Body: { theme: { bg, fg, accent, accent2 } } with #rrggbb colors, or { theme: null } for the default.
  app.put('/api/me/page-theme', requireUser('moderator'), async c => {
    const { theme } = await c.req.json();
    if (theme === null) { clear.run(key(c)); return c.json({ theme: null }); }
    if (!theme || typeof theme !== 'object' || !PAGE_THEME_KEYS.every(k => HEX_RE.test(theme[k] || ''))) {
      return c.json({ error: 'Pick a color for the background, text and both accents.' }, 400);
    }
    const clean = Object.fromEntries(PAGE_THEME_KEYS.map(k => [k, theme[k].toLowerCase()]));
    kvSet(db, key(c), JSON.stringify(clean));
    return c.json({ theme: clean });
  });
}
