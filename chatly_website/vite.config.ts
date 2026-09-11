import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // LiveKit is lazy-loaded during calls, but keep it its own chunk so a
          // call does not also download the app shell again.
          livekit: ['livekit-client'],
          apollo: [
            '@apollo/client',
            'graphql',
            'graphql-ws',
            'apollo-upload-client',
          ],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
