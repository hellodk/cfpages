/** Site identity — from legacy _config.yml (Jasper / hellodk.io). */
export const site = {
  title: 'hellodk.io',
  /** Homepage hero headline (was `site.name` in Jekyll). */
  name: 'Curiosity is the most powerful thing you own',
  /** Homepage hero subline (was `site.description` in Jekyll). */
  description:
    'A beautiful narrative written over an elegant publishing platform. The story begins here...',
  author: 'Deepak Gupta',
  tagline: 'DevOps · SRE · Homelab',
  /** Practical one-liner under the Jasper quote (Chirping hero). */
  heroTagline: 'DevOps, SRE, homelab — notes from the trenches.',
  homeCover: '/assets/images/cover1.jpg',
} as const;
