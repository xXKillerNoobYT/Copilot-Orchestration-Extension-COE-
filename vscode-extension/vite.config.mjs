import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  root: path.resolve(__dirname, 'resources/planBuilder'),
  build: {
    outDir: path.resolve(__dirname, 'dist/planBuilder'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'resources/planBuilder/index.html')
      },
      external: ['vscode']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  // Suppress warnings about Node.js modules being externalized
  // These imports are in service files that aren't used in the browser bundle
  optimizeDeps: {
    exclude: ['vscode', 'fs', 'path']
  }
});
