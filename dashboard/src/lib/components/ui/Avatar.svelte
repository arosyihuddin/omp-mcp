<script lang="ts">
  interface Props {
    name: string;
    /** Semantic color key stored in the profile (`accent`, `info`, `success`, `warning`, `danger`). */
    color?: string | null;
    size?: 'sm' | 'md' | 'lg';
    class?: string;
  }

  let { name, color = 'accent', size = 'md', class: className }: Props = $props();

  const avatarColors: Record<string, string> = {
    accent: 'bg-accent/15 text-accent-hover',
    info: 'bg-info/15 text-info',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-danger/15 text-danger',
  };
  const sizes = { sm: 'h-6 w-6 text-xs', md: 'h-8 w-8 text-sm', lg: 'h-12 w-12 text-md' };

  const initials = $derived(
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('') || '?',
  );
</script>

<span
  aria-hidden="true"
  class={['inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium', avatarColors[color ?? ''] ?? avatarColors.accent, sizes[size], className]}
>
  {initials}
</span>
