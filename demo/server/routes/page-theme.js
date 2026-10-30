// TEMPORARY: moderators (and above) can recolor the whole site for themselves. Each person's choice is
// saved in the kv table, so it follows them to every device. To remove the feature, delete this file and
// public/js/page-theme.js, then the lines marked "page theme" in app.js, main.js, pages.js, theme.js and
// styles.css, and the "page colors" test in test/api.test.js.
//
// The Loci front end (the repository root, docs/server.md) uses the same four colors site-wide instead: a moderator
// saves them once for everyone (GET/PUT /api/page-theme below, kept under one kv key), and api/whoami reports them
// as pageTheme so every page applies them on load. Removing that: those two routes, siteTheme in routes/loci.js,
// pagecolors.js and its lines in the front end, and the "site page colors" test in test/loci.test.js.
import { requireUser } from '../auth.js';
import { kvGet, kvSet } from '../db.js';
import { parseJson } from '../lib.js';

const HEX_RE = /^#[0-9a-f]{6}$/i;
export const PAGE_THEME_KEYS = ['bg', 'fg', 'accent', 'accent2'];
export const SITE_THEME_KEY = 'page-theme:site';

/** The site-wide theme for the Loci front end, or null for each style's own colors. */
export const siteTheme = db => parseJson(kvGet(db, SITE_THEME_KEY), null);

/** {theme} from a request body → a clean theme, null (back to the defaults), or undefined when it is malformed. */
function cleanTheme(theme) {
  if (theme === null) return null;
  if (!theme || typeof theme !== 'object' || !PAGE_THEME_KEYS.every(k => HEX_RE.test(theme[k] || ''))) return undefined;
  return Object.fromEntries(PAGE_THEME_KEYS.map(k => [k, theme[k].toLowerCase()]));
}
const BAD = 'Pick a color for the background, text and both accents.';

export function pageThemeRoutes(app, { db }) {
  const key = c => `page-theme:${c.get('user').id}`;
  const clear = db.prepare('DELETE FROM kv WHERE key = ?');

  app.get('/api/me/page-theme', requireUser('moderator'), c => c.json({ theme: parseJson(kvGet(db, key(c)), null) }));

  // Body: { theme: { bg, fg, accent, accent2 } } with #rrggbb colors, or { theme: null } for the default.
  app.put('/api/me/page-theme', requireUser('moderator'), async c => {
    const theme = cleanTheme((await c.req.json()).theme);
    if (theme === undefined) return c.json({ error: BAD }, 400);
    if (theme === null) { clear.run(key(c)); return c.json({ theme: null }); }
    kvSet(db, key(c), JSON.stringify(theme));
    return c.json({ theme });
  });

  // Site-wide (the Loci front end's Page colors panel): anyone may read it, moderators and above set it for everyone.
  app.get('/api/page-theme', c => c.json({ theme: siteTheme(db) }));
  app.put('/api/page-theme', requireUser('moderator'), async c => {
    const theme = cleanTheme((await c.req.json()).theme);
    if (theme === undefined) return c.json({ error: BAD }, 400);
    if (theme === null) { clear.run(SITE_THEME_KEY); return c.json({ theme: null }); }
    kvSet(db, SITE_THEME_KEY, JSON.stringify(theme));
    return c.json({ theme });
  });
}
