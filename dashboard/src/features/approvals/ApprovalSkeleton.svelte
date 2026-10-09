<script lang="ts">
  import { Skeleton } from '$lib/components/ui';
</script>

<div class="space-y-3 p-4" aria-label="Loading approvals" aria-busy="true">
  {#each Array(3) as _, index (index)}
    <div class="overflow-hidden rounded-lg border border-line">
      <div class="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
        <div class="space-y-2">
          <Skeleton class="h-3.5 w-36" />
          <Skeleton class="h-2.5 w-48" />
        </div>
        <div class="flex gap-2"><Skeleton class="h-7 w-14 rounded-md" /><Skeleton class="h-7 w-20 rounded-md" /></div>
      </div>
      <div class="p-4"><Skeleton class="h-24 rounded-md" /></div>
    </div>
  {/each}
</div>
