import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import http from 'http';

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
            agent: new http.Agent(),
            rewrite: (path) => path
          },
          // Add external API proxies to avoid CORS issues
          '/external/topstep': {
            target: 'https://api.topstepx.com',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/external\/topstep/, ''),
            configure: (proxy, _options) => {
              proxy.on('error', (err, _req, _res) => {
                console.log('proxy error', err);
              });
            }
          }
        }
      }
    };
});
