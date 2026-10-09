import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

const backend = process.env.OMP_MCP_BACKEND ?? 'http://127.0.0.1:48765';

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
      $features: fileURLToPath(new URL('./src/features', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': { target: backend, changeOrigin: true, ws: true },
    },
  },
});
