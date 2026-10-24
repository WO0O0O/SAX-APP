import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { openDb } from './db.ts';
import { seed } from './seed.ts';
import { api } from './api.ts';

const PORT = Number(process.env.SAX_PORT ?? 5757);
// serveStatic resolves paths relative to the working directory.
const DIST = relative(process.cwd(), join(import.meta.dirname, '..', 'dist')) || '.';

const db = openDb();
seed(db);

const app = new Hono();
app.route('/api', api(db));
app.use('/*', serveStatic({ root: DIST }));
app.get('*', serveStatic({ path: join(DIST, 'index.html') }));

if (!existsSync(join(DIST, 'index.html'))) {
  console.warn('No build found: run `npm run build` (or use `npm run dev` for development).');
}

// Bound to loopback only: nothing else on the network can reach the app or its data.
const server = serve({ fetch: app.fetch, port: PORT, hostname: '127.0.0.1' }, () => {
  console.log(`Sax Tutor running at http://127.0.0.1:${PORT}  (Ctrl+C to stop)`);
});

function shutdown() {
  server.close();
  db.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
