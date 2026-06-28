/** Shared helpers for Pages Functions (api/chat, api/contact). */

const ALLOWED_ORIGINS = new Set([
  'https://hellodk.io',
  'https://www.hellodk.io',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
  'http://localhost:4326',
  'http://127.0.0.1:4326',
]);

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // same-origin / non-browser
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith('.pages.dev') || hostname.endsWith('.hellodk.io');
  } catch {
    return false;
  }
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  if (!origin || !isAllowedOrigin(origin)) {
    return { 'Access-Control-Allow-Origin': 'https://hellodk.io' };
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
  };
}

export function jsonResponse(request: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders(request),
    },
  });
}

export function optionsResponse(request: Request): Response {
  if (!isAllowedOrigin(request.headers.get('Origin'))) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, {
    headers: {
      ...corsHeaders(request),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/** Strip control chars — reduces header / log injection in contact subjects. */
export function sanitizeText(input: string, maxLen: number): string {
  return input.replace(/[\0-\x1f\x7f]/g, ' ').trim().slice(0, maxLen);
}
