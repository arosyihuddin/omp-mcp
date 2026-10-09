<script lang="ts">
  interface Props {
    code: string;
    tone?: 'default' | 'danger';
    class?: string;
  }

  let { code, tone = 'default', class: className }: Props = $props();
</script>

<pre
  class={[
    'overflow-auto whitespace-pre-wrap break-words rounded-md border p-3 font-mono text-xs leading-relaxed',
    tone === 'danger' ? 'border-danger/25 bg-danger/5 text-danger' : 'border-line bg-canvas text-fg-muted',
    className ?? 'max-h-64',
  ]}>{code}</pre>
