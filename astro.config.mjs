// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://charrishtravels.com',
  integrations: [sitemap()],
  // State pages live at /india/<state> and country pages at /world/<country>; the bare
  // paths, and the old /tours overview (now just a menu in the header), go to the directories.
  redirects: { '/india': '/tours/domestic', '/world': '/tours/international', '/tours': '/tours/domestic' },
  vite: {
    plugins: [tailwindcss()]
  }
});