<script lang="ts">
  import { Skeleton } from '$lib/components/ui';
</script>

<div class="space-y-4" aria-label="Loading overview" aria-busy="true">
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {#each Array(4) as _, index (index)}<Skeleton class="h-[104px] rounded-lg" />{/each}
  </div>
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each Array(3) as _, index (index)}<Skeleton class="h-[220px] rounded-lg" />{/each}
  </div>
  <Skeleton class="h-[180px] rounded-lg" />
</div>
