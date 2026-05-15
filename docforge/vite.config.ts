import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 使用相對路徑，支援 Electron
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
