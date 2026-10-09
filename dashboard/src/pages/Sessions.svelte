<script lang="ts">
  import { Panel } from '$lib/components/ui';
  import { dashboard } from '$lib/stores/dashboard.svelte';
  import { SessionList, SessionListSkeleton } from '$features/sessions';
</script>

<Panel title="OMP sessions" description="Lifecycle management for the isolated OMP agent runtime.">
  {#if dashboard.loading}
    <SessionListSkeleton />
  {:else}
    <SessionList sessions={dashboard.sessions} />
  {/if}
</Panel>
