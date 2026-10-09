<script lang="ts">
  import { onMount } from 'svelte';
  import { Maximize2, Minimize2, Plus, Terminal as TerminalIcon } from '@lucide/svelte';
  import { Button, EmptyState, IconButton, StatusDot } from '$lib/components/ui';
  import { readString, storageKeys, writeString } from '$lib/utils/storage';
  import { TerminalController, TerminalSessions, TerminalViewport } from '$features/terminal';

  const controller = new TerminalController();

  let viewport = $state<ReturnType<typeof TerminalViewport>>();
  let fullscreen = $state(false);
  let sessionsOpen = $state(readString(storageKeys.terminalSessionsOpen) !== 'false');

  const statusLabel = $derived(
    controller.socketState === 'connected' ? 'Connected' : controller.socketState === 'connecting' ? 'Connecting' : 'Disconnected',
  );

  function toggleSessions() {
    sessionsOpen = !sessionsOpen;
    writeString(storageKeys.terminalSessionsOpen, String(sessionsOpen));
  }

  function toggleFullscreen() {
    fullscreen = !fullscreen;
    requestAnimationFrame(() => {
      viewport?.refit();
      viewport?.focus();
    });
  }

  onMount(() => {
    // Delegate lazily so the handle stays valid however bind:this settles.
    controller.attach({
      write: (data) => viewport?.write(data),
      reset: () => viewport?.reset(),
      focus: () => viewport?.focus(),
      refit: () => viewport?.refit(),
    });
    void controller.init();
    return () => controller.dispose();
  });
</script>

<div
  class={[
    'flex h-full min-h-0 flex-col overflow-hidden bg-surface',
    fullscreen ? 'fixed inset-0 z-50' : 'rounded-lg border border-line shadow-card',
  ]}
>
  <header class="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line px-3">
    <div class="flex min-w-0 items-center gap-2 text-sm text-fg-subtle">
      <TerminalIcon size={14} strokeWidth={1.8} />
      <span>{controller.terminals.length} {controller.terminals.length === 1 ? 'session' : 'sessions'}</span>
    </div>
    <div class="flex items-center gap-2">
      {#if controller.active}
        <div class="hidden max-w-72 items-center gap-2 rounded-md border border-line px-2.5 py-1 text-xs text-fg-subtle md:flex">
          <StatusDot tone={controller.socketState === 'connected' ? 'success' : 'muted'} />
          <span class="truncate font-mono">{controller.active.cwd}</span>
          <span class="shrink-0 text-fg-faint">{statusLabel}</span>
        </div>
      {/if}
      <IconButton variant="outline" label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onclick={toggleFullscreen}>
        {#if fullscreen}<Minimize2 size={13} strokeWidth={1.8} />{:else}<Maximize2 size={13} strokeWidth={1.8} />{/if}
      </IconButton>
      <Button variant="primary" onclick={() => controller.create()} disabled={controller.creating}>
        <Plus size={13} strokeWidth={2} /> New terminal
      </Button>
    </div>
  </header>

  <div class="flex min-h-0 flex-1">
    <TerminalSessions
      terminals={controller.terminals}
      activeId={controller.activeId}
      loading={controller.loading}
      open={sessionsOpen}
      oncreate={() => controller.create()}
      onopen={(id) => controller.open(id)}
      onclose={(id) => controller.close(id)}
      ontoggle={toggleSessions}
    />

    <div class="relative min-w-0 flex-1 bg-surface">
      <TerminalViewport bind:this={viewport} ondata={controller.sendInput} onresize={controller.sendResize} />

      {#if !controller.active && !controller.loading}
        <div class="absolute inset-0 flex items-center justify-center bg-surface">
          <EmptyState
            icon={TerminalIcon}
            title="No terminal sessions"
            description="Create a terminal session to open an interactive shell in your workspace."
          >
            <Button variant="primary" onclick={() => controller.create()} disabled={controller.creating}>
              <Plus size={13} strokeWidth={2} /> New terminal
            </Button>
          </EmptyState>
        </div>
      {/if}

      {#if controller.error}
        <button
          type="button"
          class="absolute inset-x-4 bottom-4 rounded-md border border-line-strong bg-surface-raised px-3 py-2 text-left text-sm text-fg-muted shadow-pop"
          onclick={() => (controller.error = '')}
          title="Dismiss"
        >
          {controller.error}
        </button>
      {/if}
    </div>
  </div>
</div>
