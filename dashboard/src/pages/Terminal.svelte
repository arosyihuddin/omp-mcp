<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Plus, X, Circle, Terminal as TerminalIcon } from '@lucide/svelte';
  import { Terminal as XTerm } from '@xterm/xterm';
  import { FitAddon } from '@xterm/addon-fit';
  import '@xterm/xterm/css/xterm.css';

  type TerminalInfo = {
    id: string;
    title: string;
    cwd: string;
    status: 'running' | 'exited';
    createdAt: string;
    updatedAt: string;
    exitCode?: number;
  };

  let terminals: TerminalInfo[] = [];
  let activeId = '';
  let terminalElement: HTMLDivElement;
  let term: XTerm | null = null;
  let fit: FitAddon | null = null;
  let socket: WebSocket | null = null;
  let lastResize = '';
  let loading = true;
  let creating = false;
  let error = '';
  let socketState: 'connecting' | 'connected' | 'closed' = 'closed';


  $: activeTerminal = terminals.find((item) => item.id === activeId);

  async function loadTerminals() {
    try {
      const response = await fetch('/api/terminals', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to load terminals');
      terminals = data.terminals ?? [];
      if (!activeId && terminals.length) activeId = terminals[0].id;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load terminals';
    } finally {
      loading = false;
    }
  }

  async function createTerminal() {
    creating = true;
    error = '';
    try {
      const response = await fetch('/api/terminals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to create terminal');
      terminals = [data.terminal, ...terminals];
      activeId = data.terminal.id;
      connect(activeId);
      requestAnimationFrame(() => {
        fit?.fit();
        term?.focus();
        sendResize();
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to create terminal';
    } finally {
      creating = false;
    }
  }

  async function closeTerminal(id: string) {
    try {
      const response = await fetch('/api/terminals/' + encodeURIComponent(id), { method: 'DELETE' });
      if (!response.ok) throw new Error('Unable to close terminal');
      terminals = terminals.filter((item) => item.id !== id);
      if (activeId === id) {
        activeId = terminals[0]?.id ?? '';
        if (activeId) connect(activeId);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to close terminal';
    }
  }

  function connect(id: string) {
    socket?.close();
    lastResize = '';
    socketState = 'connecting';
    socket = new WebSocket(
      (location.protocol === 'https:' ? 'wss://' : 'ws://') +
      location.host +
      '/api/terminal/socket?id=' +
      encodeURIComponent(id),
    );

    socket.onopen = () => {
      socketState = 'connected';
      requestAnimationFrame(() => {
        fit?.fit();
        term?.focus();
        sendResize();
      });
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as {
        type: string;
        data?: string;
        output?: string;
        terminal?: TerminalInfo;
        exitCode?: number;
        message?: string;
      };

      if (payload.type === 'snapshot') {
        if (payload.terminal) {
          terminals = terminals.map((item) => item.id === id ? payload.terminal! : item);
        }
        term?.reset();
        if (payload.output) term?.write(payload.output);
        requestAnimationFrame(() => {
          fit?.fit();
          term?.focus();
          sendResize();
        });
      } else if (payload.type === 'output' && payload.data) {
        term?.write(payload.data);
      } else if (payload.type === 'exit') {
        terminals = terminals.map((item) =>
          item.id === id ? { ...item, status: 'exited', exitCode: payload.exitCode } : item,
        );
      } else if (payload.type === 'error') {
        error = payload.message ?? payload.data ?? 'Terminal connection error';
      }
    };

    socket.onclose = () => {
      socketState = 'closed';
    };

    socket.onerror = () => {
      socketState = 'closed';
      error = 'Terminal connection failed';
    };
  }

  function openTerminal(id: string) {
    activeId = id;
    term?.reset();
    connect(id);
    requestAnimationFrame(() => term?.focus());
  }

  function sendInput(data: string) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', data }));
    }
  }

  function sendResize() {
    if (term && socket?.readyState === WebSocket.OPEN) {
      const size = String(term.cols) + 'x' + String(term.rows);
      if (size === lastResize) return;
      lastResize = size;
      socket.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    }
  }


  function resize() {
    fit?.fit();
    sendResize();
  }

  onMount(() => {
    term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      scrollback: 10000,
      theme: {
        background: '#0b0b0c',
        foreground: '#d8d5cd',
        cursor: '#f4f1e8',
        selectionBackground: '#ffffff1f',
        black: '#171719',
        brightBlack: '#6b6b70',
      },
      rightClickSelectsWord: true,
      scrollOnUserInput: true,
    });

    fit = new FitAddon();
    term.loadAddon(fit);
    term.open(terminalElement);
    term.onData(sendInput);
    term.onBinary(sendInput);

    const observer = new ResizeObserver(resize);
    observer.observe(terminalElement);

    void loadTerminals().then(() => {
      if (activeId) connect(activeId);
    });

    return () => observer.disconnect();
  });

  onDestroy(() => {
    socket?.close();
    term?.dispose();
  });
</script>

<div class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-black/[.10] bg-[#0b0b0c] shadow-[0_18px_50px_rgba(0,0,0,.10)] dark:border-white/[.08]">
  <header class="flex h-14 shrink-0 items-center border-b border-white/[.07] px-4">
    <div class="flex min-w-0 items-center gap-3">
      <div class="flex h-7 w-7 items-center justify-center rounded-md bg-white/[.07] text-white/[.75]">
        <TerminalIcon size={14} strokeWidth={1.8} />
      </div>
      <div class="min-w-0">
        <h1 class="text-[13px] font-semibold tracking-[-.01em] text-white/[.90]">Terminal</h1>
        <p class="truncate text-[10px] text-white/[.35]">
          {terminals.length} {terminals.length === 1 ? 'session' : 'sessions'}
        </p>
      </div>
    </div>

    <div class="ml-auto flex items-center gap-2">
      {#if activeTerminal}
        <div class="hidden max-w-72 items-center rounded-md border border-white/[.07] bg-white/[.025] px-2.5 py-1.5 text-[10px] text-white/[.40] md:flex">
          <span class="truncate">{activeTerminal.cwd}</span>
        </div>
      {/if}
      <button
        type="button"
        class="flex h-8 items-center gap-1.5 rounded-md bg-white/[.92] px-3 text-[11px] font-medium text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        on:click={createTerminal}
        disabled={creating}
      >
        <Plus size={13} strokeWidth={2} />
        New terminal
      </button>
    </div>
  </header>

  <div class="flex min-h-0 flex-1">
    <aside class="flex w-52 shrink-0 flex-col border-r border-white/[.07] bg-[#0d0d0e]">
      <div class="flex h-9 items-center px-3 text-[9px] font-semibold uppercase tracking-[.12em] text-white/[.28]">
        Sessions
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {#if loading}
          {#each Array(3) as _}
            <div class="mb-1 h-9 animate-pulse rounded-md bg-white/[.035]"></div>
          {/each}
        {:else if terminals.length === 0}
          <button
            type="button"
            class="mx-2 mt-4 w-[calc(100%-1rem)] rounded-lg border border-dashed border-white/[.10] px-3 py-4 text-center text-[10px] text-white/[.32] transition hover:border-white/[.18] hover:text-white/[.55]"
            on:click={createTerminal}
          >
            Create a terminal
          </button>
        {:else}
          {#each terminals as item}
            <button
              type="button"
              class="group mb-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition {item.id === activeId ? 'bg-white/[.075] text-white/[.88]' : 'text-white/[.42] hover:bg-white/[.04] hover:text-white/[.70]'}"
              on:click={() => openTerminal(item.id)}
            >
              <Circle
                size={7}
                fill={item.status === 'running' ? 'currentColor' : 'none'}
                strokeWidth={1.5}
                class={item.status === 'running' ? 'text-[#91a67b]' : 'text-white/[.25]'}
              />
              <span class="min-w-0 flex-1 truncate text-[11px]">{item.title}</span>
              <span
                role="button"
                tabindex="0"
                class="rounded p-1 opacity-0 transition hover:bg-white/[.08] hover:text-white group-hover:opacity-100"
                on:click|stopPropagation={() => closeTerminal(item.id)}
                on:keydown={(event) => event.key === 'Enter' && closeTerminal(item.id)}
                aria-label="Close terminal"
              >
                <X size={12} strokeWidth={1.8} />
              </span>
            </button>
          {/each}
        {/if}
      </div>

      <div class="border-t border-white/[.07] px-3 py-2.5">
        <div class="flex items-center gap-2 text-[9px] text-white/[.28]">
          <span class="h-1.5 w-1.5 rounded-full {socketState === 'connected' ? 'bg-[#91a67b]' : 'bg-white/[.22]'}"></span>
          {socketState === 'connected' ? 'Connected' : socketState === 'connecting' ? 'Connecting' : 'Disconnected'}
        </div>
      </div>
    </aside>

    <main class="relative flex min-w-0 flex-1 flex-col bg-[#0b0b0c]">

      <div class="min-h-0 flex-1 p-4">
        <div
          bind:this={terminalElement}
          class="h-full w-full overflow-hidden rounded-lg border border-white/[.055] bg-[#0b0b0c] px-2 py-2"
        ></div>
      </div>

      {#if error}
        <div class="absolute bottom-4 left-5 right-5 rounded-md border border-white/[.08] bg-[#151516] px-3 py-2 text-[10px] text-white/[.55]">
          {error}
        </div>
      {/if}
    </main>
  </div>
</div>
