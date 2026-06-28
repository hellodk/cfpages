import { SLUG_COVERS, DEFAULT_COVER } from '../data/post-covers';

const TAG_COVERS: Record<string, string> = {
  kubernetes: 'assets/images/kubernetes/kubernetes_logo.png',
  cassandra: 'assets/images/cassandra/astronaut_on_the_moon.jpg',
};

function normalizeCoverPath(cover: string): string {
  const path = cover.replace(/^\//, '');
  return path.startsWith('assets/') ? `/${path}` : `/${path}`;
}

function extractFirstImage(body: string): string | undefined {
  const md = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (md?.[1] && !md[1].startsWith('http')) return normalizeCoverPath(md[1]);

  const html = body.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (html?.[1] && !html[1].startsWith('http')) return normalizeCoverPath(html[1]);

  return undefined;
}

export function resolvePostCover(
  slug: string,
  cover: string | undefined,
  tags: string[],
  body?: string,
): string {
  if (cover) return normalizeCoverPath(cover);

  if (SLUG_COVERS[slug]) return normalizeCoverPath(SLUG_COVERS[slug]);

  const fromBody = body ? extractFirstImage(body) : undefined;
  if (fromBody) return fromBody;

  for (const tag of tags) {
    const key = tag.toLowerCase();
    if (TAG_COVERS[key]) return normalizeCoverPath(TAG_COVERS[key]);
  }

  return normalizeCoverPath(DEFAULT_COVER);
}
