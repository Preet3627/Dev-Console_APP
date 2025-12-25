import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
// FIX: Import `fileURLToPath` from `url` to handle file paths in an ES module context.
import { fileURLToPath } from 'url';
import { VitePWA } from 'vite-plugin-pwa';

// FIX: Define `__dirname` for an ES module context as it's not available by default.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Dev-Console',
        short_name: 'Dev-Console',
        description: 'An advanced local WordPress management system that uses AI to generate, edit, and troubleshoot plugins and themes, and syncs changes directly to a live WordPress site via a connector plugin.',
        theme_color: '#0d1117',
        background_color: '#0d1117',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
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