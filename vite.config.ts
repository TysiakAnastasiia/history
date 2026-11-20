import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Назва репозиторію: сайт живе на https://<логін>.github.io/history/
  base: '/history/',
  plugins: [react(), tailwindcss()],
})
