/** hellodk.io sidebar — Topics, LLM, and site pages. */

export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

/** Primary content categories */
export const topicNav: NavItem[] = [
  { href: '/tag/databases', label: 'Databases', icon: 'databases' },
  { href: '/tag/devops', label: 'DevOps', icon: 'devops' },
  { href: '/tag/fiction', label: 'Fiction', icon: 'fiction' },
  { href: '/tag/mlops', label: 'ML Ops', icon: 'mlops' },
  { href: '/tag/travel', label: 'Travel', icon: 'travel' },
  { href: '/resume', label: 'Resume', icon: 'resume' },
  { href: '/tag/photography', label: 'Photography', icon: 'photography' },
];

/** AI / LLM tooling and write-ups */
export const llmNav: NavItem[] = [
  { href: '/tag/mlx', label: 'MLX', icon: 'mlx' },
  { href: '/tag/graphify', label: 'Graphify', icon: 'graphify' },
  { href: '/tag/machine-learning', label: 'Machine Learning', icon: 'machine-learning' },
  { href: '/tag/ai-agents', label: 'AI Agents', icon: 'ai-agents' },
  { href: '/tag/claude-code', label: 'Claude Code', icon: 'claude-code' },
  { href: '/tag/cursor', label: 'Cursor', icon: 'cursor' },
  { href: '/tag/antigravity', label: 'Antigravity', icon: 'antigravity' },
];

/** Site pages — after topic + LLM sections */
export const siteNav: NavItem[] = [
  { href: '/about', label: 'About', icon: 'about' },
  { href: '/author', label: 'Author', icon: 'author' },
];

/** @deprecated use topicNav — kept for imports that expect mainNav */
export const mainNav = topicNav;

const tagFromHref = (href: string) =>
  href.startsWith('/tag/') ? href.slice('/tag/'.length) : null;

/** Tag slugs linked from nav — build empty tag pages even with no posts yet. */
export const navTagSlugs = [
  ...new Set(
    [...topicNav, ...llmNav]
      .map((item) => tagFromHref(item.href))
      .filter((tag): tag is string => Boolean(tag)),
  ),
];

export function isNavActive(href: string, currentPath: string): boolean {
  if (href === '/') return currentPath === '/';
  if (href.startsWith('/tag/')) {
    return currentPath === href || currentPath.startsWith(`${href}/`);
  }
  return currentPath === href || currentPath.startsWith(`${href}/`);
}
