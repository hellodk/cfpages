import { jsonResponse, optionsResponse, sanitizeText } from '../lib/http';

interface Env {
  BREVO_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
  CONTACT_FROM_NAME?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.BREVO_API_KEY) {
    return jsonResponse(request, { error: 'Contact form not configured' }, 503);
  }
  if (!env.CONTACT_TO_EMAIL?.trim()) {
    return jsonResponse(request, { error: 'Contact form not configured' }, 503);
  }

  let body: { name?: string; email?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: 'Invalid JSON' }, 400);
  }

  const name = sanitizeText(body.name ?? '', 200);
  const email = sanitizeText(body.email ?? '', 254);
  const message = sanitizeText(body.message ?? '', 5000);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name || !email || !message) {
    return jsonResponse(request, { error: 'Name, email, and message are required' }, 400);
  }
  if (!emailRegex.test(email)) {
    return jsonResponse(request, { error: 'Invalid email address' }, 400);
  }

  const toEmail = env.CONTACT_TO_EMAIL.trim();
  const fromEmail = env.CONTACT_FROM_EMAIL?.trim() || toEmail;
  const fromName = sanitizeText(env.CONTACT_FROM_NAME || 'hellodk.io', 100);

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: toEmail, name: 'Deepak Gupta' }],
      replyTo: { email, name },
      subject: `[hellodk.io] Contact from ${name}`,
      textContent: `From: ${name} <${email}>\n\n${message}`,
    }),
  });

  if (!res.ok) {
    console.error('Brevo error:', res.status, res.statusText);
    return jsonResponse(request, { error: 'Failed to send message' }, 502);
  }

  return jsonResponse(request, { ok: true });
};

export const onRequestOptions: PagesFunction = async ({ request }) => optionsResponse(request);
