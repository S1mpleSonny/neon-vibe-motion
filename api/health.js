export const config = { runtime: 'edge' };

export default async function handler() {
  return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
