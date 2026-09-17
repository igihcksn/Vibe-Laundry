import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const targetUrl = process.env.VITE_SUPABASE_URL || 'https://akddalctutuhqhxbdoyi.supabase.co';

const proxyConfig = {
  '/supabase-proxy': {
    target: targetUrl,
    changeOrigin: true,
    secure: true,
    ws: true,
    rewrite: (pathStr: string) => pathStr.replace(/^\/supabase-proxy/, ''),
    headers: {
      'User-Agent': 'NodeJS-Supabase-Client/1.0',
    },
  },
};

export default defineConfig(() => {
  return {
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(targetUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: proxyConfig,
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      proxy: proxyConfig,
    },
  };
});
