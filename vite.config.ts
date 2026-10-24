import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    // No source maps in the shipped build: they roughly double the size of the
    // assets that end up inside the installer and are only useful while
    // debugging. `npm run dev` keeps the dev server with maps via esbuild.
    sourcemap: false,
    // Electron 28 bundles Chromium 120, so we can target modern ES and skip
    // the legacy transpilation pass (smaller + faster to parse).
    target: 'es2022',
    // Cap the chunk size warning threshold above the vendor split below.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html'),
        preload: path.resolve(__dirname, 'src/preload/index.ts')
      },
      output: {
        // Split the stable vendor runtime out of the app code so it changes
        // rarely and the per-page chunks stay small. Manual grouping keeps
        // React + router + i18n together (they are tightly coupled) and puts
        // the icon set in its own cacheable chunk.
        //
        // IMPORTANT: only the renderer's own libraries are grouped here. Any
        // other node_modules (e.g. `electron`, used solely by the preload
        // entry) must fall back to Rollup's default chunking: forcing them
        // into a shared `vendor` chunk makes the renderer evaluate preload-only
        // code (the `electron` wrapper reads `__dirname` at load time and
        // would crash the whole UI with a ReferenceError).
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('lucide-react')) return 'icons';
          if (
            id.includes('react-router') ||
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('scheduler')
          ) {
            return 'vendor-react';
          }
          if (id.includes('i18next') || id.includes('zustand') || id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'vendor';
          }
          // Renderer-only deps that slipped past the lists above (e.g. zod via
          // shared schemas) still need to stay out of preload/main territory.
          return undefined;
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared')
    },
    // Resolve TypeScript sources before any `.js`: Vite's default order puts
    // `.js` first, so a stray compiled file next to a `.ts` (e.g. a leftover
    // `src/shared/tweaks/debloat.js`) would silently win over its source.
    extensions: ['.ts', '.tsx', '.mts', '.mjs', '.js', '.jsx', '.json']
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
