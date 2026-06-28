interface Env {
  AI?: Ai;
  BREVO_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
}

interface KnowledgePost {
  slug: string;
  url: string;
  title: string;
  description: string;
  tags: string[];
  excerpt: string;
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

function scorePost(post: KnowledgePost, query: string): number {
  const q = query.toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  let score = 0;
  const hay = `${post.title} ${post.description} ${post.tags.join(' ')} ${post.excerpt}`.toLowerCase();
  for (const term of terms) {
    if (hay.includes(term)) score += 1;
    if (post.title.toLowerCase().includes(term)) score += 2;
    if (post.tags.some(t => t.toLowerCase().includes(term))) score += 2;
  }
  return score;
}

async function retrieveContext(request: Request, query: string): Promise<string> {
  const indexUrl = new URL('/knowledge-index.json', request.url);
  const res = await fetch(indexUrl.toString());
  if (!res.ok) return '';
  const data = (await res.json()) as { posts: KnowledgePost[] };
  const ranked = data.posts
    .map(p => ({ post: p, score: scorePost(p, query) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  if (!ranked.length) return '';
  return ranked
    .map(({ post }) => `### ${post.title}\nURL: ${post.url}\n${post.excerpt}`)
    .join('\n\n');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const message = body.message?.trim();
  if (!message || message.length > 500) {
    return json({ error: 'Message required (max 500 chars)' }, 400);
  }

  const contextText = await retrieveContext(request, message);

  if (!env.AI) {
    if (contextText) {
      return json({
        answer: 'Here are relevant posts from hellodk.io that may help:',
        sources: contextText.split('### ').slice(1).map(block => {
          const title = block.split('\n')[0];
          const url = block.match(/URL: (https:\/\/[^\n]+)/)?.[1];
          return { title, url };
        }).filter(s => s.url),
        mode: 'search-only',
      });
    }
    return json({
      answer: 'AI is not configured yet. Try /search or browse posts on the homepage.',
      sources: [],
      mode: 'fallback',
    });
  }

  const systemPrompt = contextText
    ? `You are a helpful assistant for hellodk.io, Deepak Gupta's DevOps/SRE blog. Answer using ONLY the context below. Cite post URLs when relevant. If the context doesn't cover the question, say so and suggest /search.\n\n${contextText}`
    : `You are a helpful assistant for hellodk.io, Deepak Gupta's DevOps/SRE blog. You don't have specific post context for this query. Give a brief, honest answer and suggest browsing /search or the homepage.`;

  try {
    const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 512,
    }) as { response?: string };

    return json({
      answer: result.response ?? 'No response generated.',
      sources: contextText
        ? contextText.split('### ').slice(1).map(block => ({
            title: block.split('\n')[0],
            url: block.match(/URL: (https:\/\/[^\n]+)/)?.[1],
          })).filter(s => s.url)
        : [],
      mode: 'rag',
    });
  } catch (err) {
    console.error('AI error:', err);
    return json({ error: 'AI request failed', answer: null }, 500);
  }
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
