import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/social-media-environment/',  // <-- match your repo name
  plugins: [react()],
})