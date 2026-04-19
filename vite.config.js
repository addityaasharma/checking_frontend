import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    proxy: {
      "/v1": {
        target: "https://bobo-y3hg.onrender.com", // 🔥 your Flask backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
})