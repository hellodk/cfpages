import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://hellodk.io',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      // Shiki writes its palette as an inline style on every <pre>, so a
      // stylesheet override would have to fight it with !important on each
      // rule. Changing the theme is the only clean lever, and it reaches every
      // fenced block on the site at once.
      theme: 'github-light',
      wrap: false,
    },
  },
});