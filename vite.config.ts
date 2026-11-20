import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Назва репозиторію: сайт живе на https://<логін>.github.io/history/
  base: '/history/',
  plugins: [react(), tailwindcss()],
  // React + Motion + Zod + Router разом ~165 КБ у gzip — для застосунку це норма
  build: { chunkSizeWarningLimit: 700 },
})
