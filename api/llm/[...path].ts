export const config = { runtime: 'edge' };

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-URL',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const targetURL = req.headers.get('X-Target-URL') || process.env.LLM_BASE_URL;
  if (!targetURL) {
    return new Response(JSON.stringify({ error: 'Missing X-Target-URL header and no LLM_BASE_URL configured' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/llm/, '');
  const downstream = `${targetURL.replace(/\/+$/, '')}${path}`;

  const headers = new Headers();
  const auth = req.headers.get('Authorization') || (process.env.LLM_API_KEY ? `Bearer ${process.env.LLM_API_KEY}` : '');
  if (auth) headers.set('Authorization', auth);
  const ct = req.headers.get('Content-Type');
  if (ct) headers.set('Content-Type', ct);

  const res = await fetch(downstream, {
    method: req.method,
    headers,
    body: req.body,
  });

  const responseHeaders = new Headers(CORS_HEADERS);
  responseHeaders.set('Content-Type', res.headers.get('Content-Type') || 'application/json');

  return new Response(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}
