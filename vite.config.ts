
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Change this to match your repository name
  base: '/chess-academy/',
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});
