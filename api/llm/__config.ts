export const config = { runtime: 'edge' };

export default async function handler(): Promise<Response> {
  const hasBuiltinKey = !!(process.env.LLM_API_KEY && process.env.LLM_BASE_URL);

  return new Response(
    JSON.stringify({
      hasBuiltinKey,
      defaultModel: hasBuiltinKey ? (process.env.LLM_MODEL || '') : '',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
