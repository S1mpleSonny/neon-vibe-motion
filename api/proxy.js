export const config = { maxDuration: 300 };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-URL',
};

export default async function handler(req, res) {
  console.log('[proxy] incoming:', req.method, req.url);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const targetURL = req.headers['x-target-url'];
  console.log('[proxy] X-Target-URL:', targetURL);

  if (!targetURL) {
    res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing X-Target-URL header' }));
    return;
  }

  const headers = {};
  if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];

  // Collect request body
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  try {
    console.log('[proxy] fetching:', targetURL);
    const upstream = await fetch(targetURL, {
      method: req.method,
      headers,
      body,
    });

    console.log('[proxy] downstream responded:', upstream.status);

    res.writeHead(upstream.status, {
      ...CORS_HEADERS,
      'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
    });

    // Stream the response body
    const buf = await upstream.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (err) {
    console.log('[proxy] fetch error:', String(err));
    res.writeHead(502, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
}
