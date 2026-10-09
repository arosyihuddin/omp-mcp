<script lang="ts">
  interface Props {
    value?: string;
    /** Called with the trimmed value on Enter / blur. */
    oncommit: (value: string) => void;
    oncancel: () => void;
    label?: string;
    class?: string;
  }

  let { value = '', oncommit, oncancel, label = 'Name', class: className }: Props = $props();

  let text = $state('');
  let input = $state<HTMLInputElement>();
  let done = false;

  $effect(() => {
    text = value;
    input?.focus();
    const dot = value.lastIndexOf('.');
    input?.setSelectionRange(0, dot > 0 ? dot : value.length);
  });

  function commit() {
    if (done) return;
    done = true;
    const trimmed = text.trim();
    if (!trimmed || trimmed === value) oncancel();
    else oncommit(trimmed);
  }
  function cancel() {
    if (done) return;
    done = true;
    oncancel();
  }
</script>

<input
  bind:this={input}
  bind:value={text}
  aria-label={label}
  spellcheck="false"
  class={['h-7 min-w-0 flex-1 rounded border border-accent/60 bg-surface px-2 text-base text-fg outline-none ring-1 ring-accent/40', className]}
  onclick={(event) => event.stopPropagation()}
  onkeydown={(event) => {
    event.stopPropagation();
    if (event.key === 'Enter') commit();
    else if (event.key === 'Escape') cancel();
  }}
  onblur={commit}
/>
