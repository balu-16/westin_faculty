import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Vite 8 (rolldown) dropped the `manualChunks` object form; the
        // equivalent is codeSplitting groups. Emits one `react-vendor` chunk
        // for react + react-dom + react-router-dom.
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
            },
          ],
        },
      },
    },
  },
})
