import { defineConfig, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import react from '@vitejs/plugin-react'
import path from 'path'
import packageJson from './package.json'

/**
 * Dev server CORS proxy plugin.
 * Mirrors the Vercel Edge Function (api/proxy.js):
 * reads X-Target-URL header (full downstream URL), forwards request.
 */
function devCorsProxy(): Plugin {
  return {
    name: 'dev-cors-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req: IncomingMessage, res: ServerResponse) => {
        const targetURL = req.headers['x-target-url'] as string | undefined;

        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-URL',
          });
          res.end();
          return;
        }

        if (!targetURL) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing X-Target-URL header' }));
          return;
        }

        const headers: Record<string, string> = {};
        const auth = req.headers.authorization as string | undefined;
        if (auth) headers['Authorization'] = auth;
        if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'] as string;

        // Collect request body
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

        try {
          const upstream = await fetch(targetURL, {
            method: req.method,
            headers,
            body,
          });

          res.writeHead(upstream.status, {
            'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          const buf = await upstream.arrayBuffer();
          res.end(Buffer.from(buf));
        } catch (e) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
  };
}

export default defineConfig(({ command }) => {
  // Dev server always enables CORS proxy so any LLM API works out of the box
  if (command === 'serve') {
    process.env.VITE_LLM_PROXY = 'true';
  }

  return {
    base: process.env.VITE_BASE_PATH || '/neon/',
    plugins: [
      react(),
      command === 'serve' && devCorsProxy(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
  }
})
