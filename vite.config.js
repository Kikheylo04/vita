import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import brandHtml from './vite-plugin-brand-html'

export default defineConfig({
  plugins: [react(), brandHtml()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    assetsInlineLimit: 4096,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          emailjs: ['@emailjs/browser'],
        },
      },
    },
  },
})
