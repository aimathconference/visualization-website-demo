import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize, sep } from 'node:path';
import { ROOT } from './db.js';
import { authMiddleware } from './auth.js';
import { loadPosts } from './posts.js';
import { rateLimiter, STYLES, NEWSLETTER_LISTS, LICENSES } from './lib.js';
import { vizRoutes } from './routes/viz.js';
import { userRoutes } from './routes/users.js';
import { adminRoutes } from './routes/admin.js';
import { pageThemeRoutes } from './routes/page-theme.js'; // page theme (temporary)

export function loadConfig(env = process.env) {
  const authMode = env.AUTH_MODE === 'dev' ? 'dev' : 'tailscale';
  const devLogin = env.DEV_LOGIN || 'dev@example.com';
  return {
    authMode,
    devLogin,
    // In dev mode the default login is an admin, so you can try every role locally.
    adminLogins: (env.ADMIN_LOGINS ?? (authMode === 'dev' ? devLogin : '')).split(',').map(s => s.trim()).filter(Boolean),
    port: Number(env.PORT) || 3300,
    siteName: env.SITE_NAME || 'Loci',
    registryRepo: env.REGISTRY_REPO || '',
    registryBranch: env.REGISTRY_BRANCH || 'main',
    moderationRepo: env.MODERATION_REPO || '',
    githubToken: env.GITHUB_TOKEN || '',
    registryPollSeconds: Number(env.REGISTRY_POLL_SECONDS) || 60,
    dataDir: env.DATA_DIR || join(ROOT, 'data'),
    contentDir: env.CONTENT_DIR || join(ROOT, 'content', 'blog'),
    publicDir: join(ROOT, 'public'),
  };
}

const APP_CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: https:",
  "font-src 'self'", "connect-src 'self'", "frame-src 'self'", "object-src 'none'", "base-uri 'none'",
  "form-action 'self'", "frame-ancestors 'none'",
].join('; ');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.json': 'application/json', '.ico': 'image/x-icon',
};

function sendFile(c, file, cache = 'no-cache') {
  if (!existsSync(file) || !statSync(file).isFile()) return c.notFound();
  return c.body(readFileSync(file), 200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': cache });
}

export function createApp({ db, config, importer = null }) {
  const app = new Hono();
  const allow = rateLimiter();
  let posts = loadPosts(config.contentDir);
  const getPosts = () => posts;
  const reloadPosts = () => (posts = loadPosts(config.contentDir)).length;

  app.onError((err, c) => {
    if (err instanceof SyntaxError) return c.json({ error: 'Invalid JSON.' }, 400);
    console.error(err);
    return c.json({ error: 'Something went wrong on the server.' }, 500);
  });

  // Security headers for everything except the runner pages, which set their own (stricter) CSP.
  app.use('*', async (c, next) => {
    await next();
    if (c.req.path.startsWith('/run/')) return;
    c.header('Content-Security-Policy', APP_CSP);
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  });

  // Cross-site request forgery: `tailscale serve` attaches the visitor's identity to *every* request from
  // their device, including ones another website makes the browser send. Writes therefore need a custom
  // header (which a cross-site request can't add without a CORS preflight we never approve) and, when the
  // browser says where the request came from, a same-origin request.
  app.use('/api/*', async (c, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      const site = c.req.header('sec-fetch-site');
      if (c.req.header('x-loci') !== '1' || (site && site !== 'same-origin')) return c.json({ error: 'Cross-site request refused.' }, 403);
    }
    await next();
  });

  app.use('*', authMiddleware(db, config));
  app.use('/api/*', bodyLimit({ maxSize: 600_000, onError: c => c.json({ error: 'Request too large.' }, 413) }));

  app.get('/api/config', c => c.json({
    siteName: config.siteName,
    authMode: config.authMode,
    registryRepo: config.registryRepo,
    registryBranch: config.registryBranch,
    moderationRepo: config.moderationRepo,
    styles: STYLES,
    newsletterLists: NEWSLETTER_LISTS,
    licenses: LICENSES,
  }));

  app.get('/api/posts', c => c.json({ items: posts.map(({ body, ...p }) => p) }));
  app.get('/api/posts/:slug', c => {
    const p = posts.find(x => x.slug === c.req.param('slug'));
    return p ? c.json(p) : c.json({ error: 'No such post.' }, 404);
  });

  vizRoutes(app, { db, config, allow });
  userRoutes(app, { db, config, allow, getPosts });
  adminRoutes(app, { db, reloadPosts, importer });
  pageThemeRoutes(app, { db }); // page theme (temporary)
  app.all('/api/*', c => c.json({ error: 'Not found.' }, 404));

  // Static files: the app itself, then a few files mapped out of node_modules.
  app.get('/vendor/marked.esm.js', c => sendFile(c, join(ROOT, 'node_modules/marked/lib/marked.esm.js')));
  app.get('/vendor/purify.es.mjs', c => sendFile(c, join(ROOT, 'node_modules/dompurify/dist/purify.es.mjs')));
  app.get('/vendor/fonts/:pkg/:file', c => {
    const pkg = c.req.param('pkg'), file = c.req.param('file');
    if (!/^[a-z0-9-]+$/.test(pkg) || !/^[a-z0-9-]+\.woff2$/.test(file)) return c.notFound();
    return sendFile(c, join(ROOT, 'node_modules/@fontsource', pkg, 'files', file), 'public, max-age=604800');
  });
  app.get('*', c => {
    const rel = c.req.path === '/' ? 'index.html' : decodeURIComponent(c.req.path).replace(/^\/+/, '');
    const file = normalize(join(config.publicDir, rel));
    if (!file.startsWith(config.publicDir + sep)) return c.notFound();
    return sendFile(c, file);
  });

  return app;
}
