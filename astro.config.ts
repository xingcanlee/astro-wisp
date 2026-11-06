import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import wisp from './src/wisp/integration';

export default defineConfig({
  site: 'https://example.com',
  integrations: [wisp(), mdx(), react(), sitemap()],
  vite: { plugins: [tailwindcss()] },
});
