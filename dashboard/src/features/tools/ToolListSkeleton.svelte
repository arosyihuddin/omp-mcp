<script lang="ts">
  import { Skeleton } from '$lib/components/ui';
</script>

<div class="divide-y divide-line" aria-label="Loading tools" aria-busy="true">
  {#each Array(8) as _, index (index)}
    <div class="grid grid-cols-[32px_1fr_auto] items-center gap-3 px-4 py-3.5">
      <Skeleton class="h-8 w-8 rounded-md" />
      <div class="space-y-2">
        <Skeleton class="h-3 w-36" />
        <Skeleton class="h-2.5 w-3/4" />
      </div>
      <Skeleton class="h-4 w-8 rounded-full" />
    </div>
  {/each}
</div>
