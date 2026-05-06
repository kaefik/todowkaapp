import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isTelegram = mode === 'telegram'
  
  const plugins = [
    react(),
    tailwindcss(),
  ]
  
  // PWA only for non-Telegram build
  if (!isTelegram) {
    plugins.push(VitePWA({
      registerType: 'prompt',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'offline.html'],
      manifest: {
        name: 'Todowka',
        short_name: 'Todowka',
        description: 'GTD Task Manager',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    }))
  }
  
  return {
    base: isTelegram ? './' : '/',
    plugins,
    build: {
      outDir: isTelegram ? 'dist-tg' : 'dist',
      rollupOptions: isTelegram ? undefined : {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.match(/\/(react|react-dom|react-router-dom|scheduler)\//)) return 'vendor-react'
              if (id.match(/\/@dnd-kit\//)) return 'vendor-ui'
              if (id.match(/\/(zustand|dexie|dexie-react-hooks)\//)) return 'vendor-data'
              if (id.match(/\/(i18next|react-i18next)\//)) return 'vendor-i18n'
              if (id.match(/\/(react-hook-form|@hookform|zod)\//)) return 'vendor-forms'
              if (id.match(/\/(react-colorful|uuid)\//)) return 'vendor-utils'
            }
          }
        }
      }
    },
    build: isTelegram ? {
      outDir: 'dist-tg',
      rollupOptions: {
        input: {
          main: 'index-tg.html'
        }
      }
    } : {
      outDir: 'dist',
      rollupOptions: {
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (_proxyReq, req) => {
              console.log('[Proxy] Forwarding request:', req.method, req.url)
            })
            proxy.on('proxyRes', (proxyRes, req) => {
              console.log('[Proxy] Response status:', proxyRes.statusCode, req.url)
            })
          },
        },
        '/health': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        }
      }
    },
    define: {
      'import.meta.env.VITE_TELEGRAM_MODE': JSON.stringify(isTelegram)
    }
  }
})