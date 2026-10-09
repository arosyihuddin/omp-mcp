/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
export default {
  // Enforce Svelte 5 runes across first-party code. Third-party components in
  // node_modules (e.g. @lucide/svelte) keep their own compile mode.
  vitePlugin: {
    dynamicCompileOptions({ filename }) {
      if (filename.includes('node_modules')) return undefined;
      return { runes: true };
    },
  },
};
