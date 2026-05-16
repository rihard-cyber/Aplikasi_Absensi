import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Gunakan base '/Aplikasi_Absensi/' untuk GitHub Pages,
// dan './' untuk build lokal (Android/Capacitor)
const isGithubPages = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  base: isGithubPages ? '/Aplikasi_Absensi/' : './',
  plugins: [react()],
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
