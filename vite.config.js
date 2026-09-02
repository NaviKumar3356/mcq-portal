import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // When running `netlify dev`, functions are served on the same origin already.
      // This proxy only helps if you run `vite` standalone against a separately-running
      // `netlify functions:serve`. See README for the recommended `netlify dev` workflow.
      '/api': 'http://localhost:9999/.netlify/functions',
    },
  },
});
