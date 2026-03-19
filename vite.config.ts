import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Prototipe-Web-UPS/', // <-- Tambahkan baris ini, pastikan namanya sama persis dengan nama repository GitHub
})
