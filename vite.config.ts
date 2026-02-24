import { defineConfig, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import react from '@vitejs/plugin-react'
import path from 'path'
import packageJson from './package.json'

/**
 * Dev server CORS proxy plugin.
 * Mirrors the Vercel serverless function (api/llm/[...path].ts):
 * reads X-Target-URL header, forwards request to the target LLM API.
 */
function devCorsProxy(): Plugin {
  return {
    name: 'dev-cors-proxy',
    configureServer(server) {
      server.middlewares.use('/api/llm', async (req: IncomingMessage, res: ServerResponse) => {
        // __config endpoint: report whether builtin key is available
        if (req.url === '/__config') {
          const hasBuiltinKey = !!(process.env.LLM_API_KEY && process.env.LLM_BASE_URL);
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify({
            hasBuiltinKey,
            defaultModel: hasBuiltinKey ? (process.env.LLM_MODEL || '') : '',
          }));
          return;
        }

        const targetURL = (req.headers['x-target-url'] as string | undefined) || process.env.LLM_BASE_URL;

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
          res.end(JSON.stringify({ error: 'Missing X-Target-URL header and no LLM_BASE_URL configured' }));
          return;
        }

        // req.url is the path after the /api/llm prefix
        const downstream = `${targetURL.replace(/\/+$/, '')}${req.url || ''}`;

        const headers: Record<string, string> = {};
        const auth = (req.headers.authorization as string | undefined) || (process.env.LLM_API_KEY ? `Bearer ${process.env.LLM_API_KEY}` : '');
        if (auth) headers['Authorization'] = auth;
        if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'] as string;

        // Collect request body
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

        try {
          const upstream = await fetch(downstream, {
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
