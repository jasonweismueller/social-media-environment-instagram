import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/social-media-environment-instagram/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: 'index.html', // ← force the correct entry
    },
  },
})