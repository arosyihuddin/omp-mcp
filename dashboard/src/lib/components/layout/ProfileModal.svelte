<script lang="ts">
  import { Avatar, Button, Input, Modal } from '$lib/components/ui';
  import { profile } from '$lib/stores/profile.svelte';

  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open, onclose }: Props = $props();

  const colors = [
    { key: 'accent', swatch: 'bg-accent', label: 'Indigo' },
    { key: 'info', swatch: 'bg-info', label: 'Blue' },
    { key: 'success', swatch: 'bg-success', label: 'Green' },
    { key: 'warning', swatch: 'bg-warning', label: 'Amber' },
    { key: 'danger', swatch: 'bg-danger', label: 'Red' },
  ];

  let displayName = $state('');
  let role = $state('');
  let avatarColor = $state('accent');
  let error = $state('');
  let saving = $state(false);

  $effect(() => {
    if (!open) return;
    displayName = profile.data?.displayName ?? '';
    role = profile.data?.role ?? '';
    avatarColor = profile.data?.avatarColor ?? 'accent';
    error = '';
  });

  async function submit() {
    if (!displayName.trim() || saving) return;
    saving = true;
    const message = await profile.save({ displayName: displayName.trim(), role: role.trim(), avatarColor });
    saving = false;
    if (message) error = message;
    else onclose();
  }
</script>

<Modal {open} title="Edit profile" width="max-w-sm" {onclose}>
  <div class="space-y-4 px-4 py-4">
    <div class="flex items-center gap-3">
      <Avatar name={displayName} color={avatarColor} size="lg" />
      <div class="flex gap-1.5" role="radiogroup" aria-label="Avatar color">
        {#each colors as color (color.key)}
          <button
            type="button"
            role="radio"
            aria-checked={avatarColor === color.key}
            aria-label={color.label}
            class={['h-6 w-6 rounded-full ring-offset-2 ring-offset-surface-raised transition-shadow', color.swatch, avatarColor === color.key ? 'ring-2 ring-fg-muted' : 'hover:ring-2 hover:ring-line-strong']}
            onclick={() => (avatarColor = color.key)}
          ></button>
        {/each}
      </div>
    </div>
    <div class="space-y-1.5">
      <label class="block text-sm text-fg-subtle" for="profile-name">Name</label>
      <Input id="profile-name" bind:value={displayName} maxlength={48} onkeydown={(event) => event.key === 'Enter' && submit()} />
    </div>
    <div class="space-y-1.5">
      <label class="block text-sm text-fg-subtle" for="profile-role">Role</label>
      <Input id="profile-role" bind:value={role} maxlength={48} placeholder="Administrator" onkeydown={(event) => event.key === 'Enter' && submit()} />
    </div>
    {#if error}<p class="text-sm text-danger" role="alert">{error}</p>{/if}
  </div>
  {#snippet footer()}
    <Button size="sm" onclick={onclose}>Cancel</Button>
    <Button size="sm" variant="primary" disabled={!displayName.trim() || saving} onclick={submit}>Save</Button>
  {/snippet}
</Modal>
