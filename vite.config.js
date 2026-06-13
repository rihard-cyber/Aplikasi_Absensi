import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Gunakan base '/Aplikasi_Absensi/' untuk GitHub Pages,
// dan './' untuk build lokal (Android/Capacitor)
const isGithubPages = process.env.GITHUB_PAGES === 'true'
const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: projectRoot,
  base: isGithubPages ? '/Aplikasi_Absensi/' : './',
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  optimizeDeps: {
    entries: [
      'index.html',
      'src/**/*.{js,ts,jsx,tsx}',
      '!**/android/**',
      '!**/dist/**'
    ]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
        },
      },
    },
  },
})
