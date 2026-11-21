import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Назва репозиторію: сайт живе на https://<логін>.github.io/history/
  base: '/history/',
  plugins: [react(), tailwindcss()],
  // Головний файл: React + Motion + Zod + Router + контент тем (~215 КБ у gzip).
  // TODO етап 5: вантажити контент по темах, інакше 32 теми роздують бандл.
  build: { chunkSizeWarningLimit: 1000 },
})
