// Writes a consistent copy of the database to data/backups/. Safe while the app is running.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR, openDb } from '../server/db.ts';

const dir = join(DATA_DIR, 'backups');
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const file = join(dir, `sax-${stamp}.db`);

const db = openDb();
db.prepare('VACUUM INTO ?').run(file);
db.close();
console.log(`Backup written: ${file}`);
