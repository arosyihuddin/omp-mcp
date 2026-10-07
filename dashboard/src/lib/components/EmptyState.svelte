<script lang="ts">
  import type { Component } from 'svelte';
  import { Folder } from '@lucide/svelte';
  export let title: string;
  export let description: string;
  export let icon: Component = Folder;
</script>

<div class="relative z-[1] flex min-h-[360px] flex-col items-center justify-center px-8 text-center">
  <div class="flex h-12 w-12 items-center justify-center rounded-xl border border-[#1f150c]/[.15] bg-[#412d15]/[.08] text-[#412d15] shadow-[inset_0_1px_rgba(31,21,12,.03)] dark:border-[#e1dcc9]/[.10] dark:bg-[#412d15]/[.30] dark:text-[#e1dcc9]/[.58]"><svelte:component this={icon} size={20} strokeWidth={1.8} /></div>
  <h3 class="mt-4 text-[14px] font-medium text-[#1f150c] dark:text-[#e1dcc9]">{title}</h3>
  <p class="mt-2 max-w-md text-[11px] leading-5 text-[#412d15]/[.65] dark:text-[#e1dcc9]/[.58]">{description}</p>
  <slot />
</div>
