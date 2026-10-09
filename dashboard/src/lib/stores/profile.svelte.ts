import { errorMessage, profileApi } from '$lib/api';
import type { Profile } from '$lib/types';

/** The dashboard owner's profile, persisted in the control-plane database. */
class ProfileStore {
  data = $state<Profile | null>(null);

  get name() {
    return this.data?.displayName ?? '';
  }

  async load() {
    try {
      this.data = await profileApi.get();
    } catch {
      /* keep the placeholder until the server answers */
    }
  }

  /** Optimistic update. Returns an error message, or `null` on success. */
  async save(input: { displayName: string; role: string; avatarColor: string }): Promise<string | null> {
    const before = this.data;
    if (before) this.data = { ...before, ...input, role: input.role || null };
    try {
      this.data = await profileApi.update(input);
      return null;
    } catch (error) {
      this.data = before;
      return errorMessage(error, 'Unable to save profile');
    }
  }
}

export const profile = new ProfileStore();
