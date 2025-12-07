import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tsconfigPaths(),
    tanstackStart(),
    react(),
    tailwindcss(),
  ],
  ssr: {
    noExternal: ['@mui/x-data-grid', '@mui/x-date-pickers'],
  },
})
