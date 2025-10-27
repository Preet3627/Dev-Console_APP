import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
// FIX: Import `fileURLToPath` from `url` to handle file paths in an ES module context.
import { fileURLToPath } from 'url';

// FIX: Define `__dirname` for an ES module context as it's not available by default.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative paths in the build output
  server: {
    proxy: {
      '/dev-console-api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})