// Entry point: `npm start` (Tailscale identity) or `npm run dev` (fake identity for local development).

import { serve } from '@hono/node-server';
import { join } from 'node:path';
import { openDb } from './db.js';
import { createApp, loadConfig } from './app.js';
import { seedIfEmpty } from './seed.js';
import { createImporter } from './registry.js';
import { purgeExpiredPreviews } from './routes/viz.js';

const config = loadConfig();
const db = openDb(join(config.dataDir, 'loci.db'));
if (seedIfEmpty(db)) console.log('Seeded the database with the six mockup visualizations.');

const importer = config.registryRepo ? createImporter({ db, config }) : null;
const app = createApp({ db, config, importer });

// Always 127.0.0.1: in Tailscale mode every request must arrive through `tailscale serve`, which adds the
// identity headers and strips any a client tries to send itself (DEMO_PLAN.md section 5).
const server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: config.port }, info => {
  console.log(`${config.siteName} demo on http://127.0.0.1:${info.port} (auth: ${config.authMode})`);
  if (config.authMode === 'dev') console.log(`  dev identity: ${config.devLogin} (admin). Switch people with the "Acting as" box on the page.`);
  else console.log('  expose it on the tailnet with: sudo tailscale serve --bg ' + info.port);
  if (importer) console.log(`  importing approved entries from github.com/${config.registryRepo}`);
});

importer?.start();
setInterval(() => purgeExpiredPreviews(db), 10 * 60 * 1000).unref();

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { importer?.stop(); server.close(); db.close(); process.exit(0); });
}
