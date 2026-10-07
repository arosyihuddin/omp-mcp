<script lang="ts">
  import PagePanel from '../lib/components/PagePanel.svelte';
  import SessionList from '../lib/components/SessionList.svelte';
  import type { Session } from '../lib/types';
  export let sessions: Session[] = [];
</script>
<PagePanel title="OMP sessions" description="Lifecycle management for the isolated OMP agent runtime.">
  <SessionList {sessions} />
</PagePanel>
