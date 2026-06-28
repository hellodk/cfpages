interface Env {
  BREVO_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
  CONTACT_FROM_NAME?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.BREVO_API_KEY) {
    return json({ error: 'Contact form not configured' }, 503);
  }

  let body: { name?: string; email?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { name, email, message } = body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return json({ error: 'Name, email, and message are required' }, 400);
  }
  if (!emailRegex.test(email)) {
    return json({ error: 'Invalid email address' }, 400);
  }
  if (message.length > 5000) {
    return json({ error: 'Message too long' }, 400);
  }

  const toEmail = env.CONTACT_TO_EMAIL || 'hello.dk@outlook.com';
  const fromEmail = env.CONTACT_FROM_EMAIL || toEmail;
  const fromName = env.CONTACT_FROM_NAME || 'hellodk.io';

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
      replyTo: { email: email.trim(), name: name.trim() },
      subject: `[hellodk.io] Contact from ${name.trim()}`,
      textContent: `From: ${name.trim()} <${email.trim()}>\n\n${message.trim()}`,
    }),
  });

  if (!res.ok) {
    console.error('Brevo error:', await res.text());
    return json({ error: 'Failed to send message' }, 502);
  }

  return json({ ok: true });
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
