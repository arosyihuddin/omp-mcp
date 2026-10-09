<script lang="ts">
  import { Skeleton } from '$lib/components/ui';

  interface Props {
    rows?: number;
  }

  let { rows = 5 }: Props = $props();
</script>

<div class="divide-y divide-line" aria-label="Loading sessions" aria-busy="true">
  {#each Array(rows) as _, index (index)}
    <div class="flex items-center gap-3 px-4 py-3.5">
      <Skeleton class="h-3.5 w-3.5" />
      <Skeleton class="h-3 w-40" />
      <Skeleton class="h-4 w-14" />
      <Skeleton class="ml-auto h-3 w-24" />
    </div>
  {/each}
</div>
