import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'https';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
            agent: new https.Agent(),
            rewrite: (path) => path
          },
          // Add external API proxies to avoid CORS issues
          '/external/topstep': {
            target: 'https://api.topstepx.com',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/external\/topstep/, '/api')
          }
        }
      }
    };
});
