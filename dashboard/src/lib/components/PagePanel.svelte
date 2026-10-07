<script lang="ts">
  export let title: string;
  export let description = '';
  export let tag = '';
  export let tagTone: 'default' | 'amber' = 'default';
</script>

<section class="relative h-full overflow-hidden rounded-xl border border-[#1f150c]/[.15] bg-[#e1dcc9] shadow-[0_1px_2px_rgba(31,21,12,.08),0_8px_24px_rgba(31,21,12,.05)] dark:border-[#e1dcc9]/[.10] dark:bg-[#1f150c] dark:shadow-[0_1px_2px_rgba(0,0,0,.28),0_8px_30px_rgba(0,0,0,.10)]">
  <div class="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#412d15]/[.025] via-transparent to-[#412d15]/[.035] dark:from-[#e1dcc9]/[.025] dark:to-[#412d15]/[.08]"></div>
  <div class="relative z-[1] flex items-center justify-between border-b border-[#1f150c]/[.10] px-5 py-4 dark:border-[#e1dcc9]/[.10]">
    <div>
      <div class="flex items-center gap-1">
        <slot name="title-prefix" />
        <h2 class="text-[13px] font-semibold text-[#1f150c] dark:text-[#e1dcc9]">{title}</h2>
      </div>
      {#if description}
        <p class="mt-1 text-[10px] text-[#412d15]/[.65] dark:text-[#e1dcc9]/[.58]">{description}</p>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      {#if tag}
        <span class="rounded-md border px-2 py-1 text-[9px] font-semibold tracking-wider {tagTone === 'amber' ? 'border-[#412d15]/[.20] bg-[#412d15]/[.10] text-[#412d15] dark:border-[#e1dcc9]/[.18] dark:bg-[#412d15]/[.70] dark:text-[#e1dcc9]' : 'border-[#1f150c]/[.15] text-[#412d15] dark:border-[#e1dcc9]/[.10] dark:text-[#e1dcc9]/[.58]'}">{tag}</span>
      {/if}
      <slot name="actions" />
    </div>
  </div>
  <slot />
</section>
