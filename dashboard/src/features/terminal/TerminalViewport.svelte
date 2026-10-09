<script lang="ts">
  import { onMount } from 'svelte';
  import { FitAddon } from '@xterm/addon-fit';
  import { Terminal } from '@xterm/xterm';
  import '@xterm/xterm/css/xterm.css';
  import { theme } from '$lib/stores/theme.svelte';
  import { xtermThemes } from './themes';

  interface Props {
    ondata: (data: string) => void;
    onresize: (cols: number, rows: number) => void;
    class?: string;
  }

  let { ondata, onresize, class: className }: Props = $props();

  let host = $state<HTMLDivElement>();
  let term: Terminal | undefined;
  let fit: FitAddon | undefined;

  // Imperative API used by the terminal controller (via bind:this).
  export function write(data: string) {
    term?.write(data);
  }
  export function reset() {
    term?.reset();
  }
  export function focus() {
    term?.focus();
  }
  export function refit() {
    if (!term || !fit) return;
    fit.fit();
    onresize(term.cols, term.rows);
  }

  // Follow the app theme live.
  $effect(() => {
    const palette = xtermThemes[theme.current];
    if (term) term.options.theme = palette;
  });

  onMount(() => {
    const instance = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily:
        '"JetBrainsMono Nerd Font", "Symbols Nerd Font Mono", "FiraCode Nerd Font", "Hack Nerd Font", "MesloLGS NF", "SFMono-Regular", Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      scrollback: 10000,
      theme: xtermThemes[theme.current],
      rightClickSelectsWord: true,
      scrollOnUserInput: true,
    });
    const fitAddon = new FitAddon();
    instance.loadAddon(fitAddon);
    instance.open(host!);
    instance.onData((data) => ondata(data));
    instance.onBinary((data) => ondata(data));
    // Keep key events inside the terminal (e.g. Escape must not reach app-level handlers).
    instance.attachCustomKeyEventHandler((event) => {
      if (event.key === 'Escape') event.preventDefault();
      event.stopPropagation();
      return true;
    });

    term = instance;
    fit = fitAddon;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(refit);
    });
    observer.observe(host!);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      instance.dispose();
      term = fit = undefined;
    };
  });
</script>

<div bind:this={host} class={['h-full w-full overflow-hidden px-3 py-2', className]}></div>
