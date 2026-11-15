import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function resolveBasePath(): string {
  if (process.env.VITE_BASE_PATH) {
    return process.env.VITE_BASE_PATH.endsWith('/')
      ? process.env.VITE_BASE_PATH
      : `${process.env.VITE_BASE_PATH}/`;
  }
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY) {
    const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
    if (repo && !repo.endsWith('.github.io')) {
      return `/${repo}/`;
    }
  }
  return '/';
}

export default defineConfig(() => {
  const base = resolveBasePath();

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: "LocalXI Cricket",
          short_name: "LocalXI",
          description: "Every Local Match. Every Player. Every Record. Mobile-first cricket platform.",
          id: base,
          start_url: base,
          scope: base,
          display: "standalone",
          orientation: "portrait",
          theme_color: "#1554B8",
          background_color: "#F2F6FC",
          icons: [
            {
              src: `${base}icons/icon-192.png`,
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: `${base}icons/icon-192-maskable.png`,
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable"
            },
            {
              src: `${base}icons/icon-512.png`,
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: `${base}icons/icon-512-maskable.png`,
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
