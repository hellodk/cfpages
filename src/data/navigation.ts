/** hellodk.io sidebar — Topics, LLM, and site pages. */

export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

/** Primary content categories */
export const topicNav: NavItem[] = [
  { href: '/tag/devops', label: 'DevOps / Platform Engineering', icon: 'devops' },
  { href: '/tag/fiction', label: 'Fiction', icon: 'fiction' },
  { href: '/tag/travel', label: 'Travel', icon: 'travel' },
  { href: '/resume', label: 'Resume', icon: 'resume' },
  { href: '/tag/photography', label: 'Photography', icon: 'photography' },
  { href: '/tag/llm', label: 'LLM', icon: 'mlx' },
];

/**
 * Previously a seven-item LLM section. Collapsed into a single `LLM` entry in
 * topicNav: `llm` carries 7 live posts, while ai-agents, claude-code, cursor
 * and antigravity had none, and mlx/graphify/machine-learning had 1-3 each.
 * Kept as an empty export so navTagSlugs and any stale import still resolve.
 */
export const llmNav: NavItem[] = [];

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
