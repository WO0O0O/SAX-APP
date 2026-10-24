import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const API_PORT = Number(process.env.SAX_PORT ?? 5757);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': `http://127.0.0.1:${API_PORT}` },
  },
  test: {
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
