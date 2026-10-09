import { approvalsApi, errorMessage } from '$lib/api';
import { onServerEvents } from '$lib/api/events';
import type { Approval, ApprovalDecision } from '$lib/types';

class ApprovalsStore {
  items = $state<Approval[]>([]);
  loading = $state(true);
  error = $state('');
  actingId = $state('');
  clearing = $state(false);

  pending = $derived(this.items.filter((approval) => approval.status === 'pending'));
  history = $derived(this.items.filter((approval) => approval.status !== 'pending'));

  async load() {
    try {
      this.items = await approvalsApi.list();
      this.error = '';
    } catch (error) {
      this.error = errorMessage(error, 'Unable to load approvals');
    } finally {
      this.loading = false;
    }
  }

  async decide(id: string, decision: ApprovalDecision) {
    this.actingId = id;
    this.error = '';
    try {
      await approvalsApi.decide(id, decision);
      await this.load();
    } catch (error) {
      this.error = errorMessage(error, 'Unable to update approval');
    } finally {
      this.actingId = '';
    }
  }

  /** Returns true when the history was cleared. */
  async clearHistory(): Promise<boolean> {
    if (!this.history.length || this.clearing) return false;
    this.clearing = true;
    this.error = '';
    try {
      await approvalsApi.clear();
      await this.load();
      return true;
    } catch (error) {
      this.error = errorMessage(error, 'Unable to clear approval history');
      return false;
    } finally {
      this.clearing = false;
    }
  }

  /** Reload on realtime approval events. Returns a cleanup function. */
  watch() {
    return onServerEvents(['approval.created', 'approval.updated', 'approval.cleared'], () => void this.load());
  }
}

export const approvals = new ApprovalsStore();
