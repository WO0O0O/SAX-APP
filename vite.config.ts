import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

/** After a build: list every file in dist (for the offline copy) and stamp the service worker with a fingerprint of them. */
function offlineCopy(): Plugin {
  return {
    name: 'offline-copy',
    apply: 'build',
    closeBundle() {
      const dist = join(import.meta.dirname, 'dist');
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f);
          if (statSync(p).isDirectory()) walk(p);
          else files.push('/' + relative(dist, p));
        }
      };
      walk(dist);
      const list = files.filter((f) => f !== '/sw.js' && f !== '/precache.json').sort();
      const hash = createHash('sha256');
      for (const f of list) hash.update(f).update(readFileSync(join(dist, f)));
      writeFileSync(join(dist, 'precache.json'), JSON.stringify(list));
      const sw = readFileSync(join(dist, 'sw.js'), 'utf8').replaceAll('__BUILD__', hash.digest('hex').slice(0, 12));
      writeFileSync(join(dist, 'sw.js'), sw);
    },
  };
}

const API_PORT = Number(process.env.SAX_PORT ?? 5757);

export default defineConfig({
  plugins: [react(), tailwindcss(), offlineCopy()],
  server: {
    proxy: { '/api': `http://127.0.0.1:${API_PORT}` },
  },
  test: {
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
