<script lang="ts">
  interface Props {
    checked: boolean;
    label: string;
    disabled?: boolean;
    onchange?: (checked: boolean) => void;
  }

  let { checked, label, disabled = false, onchange }: Props = $props();
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  title={label}
  {disabled}
  onclick={() => onchange?.(!checked)}
  class={[
    'relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
    checked ? 'bg-accent' : 'bg-line-strong',
  ]}
>
  <span
    class={['inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[16px]' : 'translate-x-[2px]']}
  ></span>
</button>
