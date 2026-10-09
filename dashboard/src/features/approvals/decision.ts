import { Ban, CircleCheck, Clock3, TimerOff, type LucideIcon } from '@lucide/svelte';
import type { Approval } from '$lib/types';

export function decisionLabel(approval: Approval): string {
  switch (approval.status) {
    case 'approved':
      return approval.sessionId ? 'Allowed for session' : 'Allowed once';
    case 'denied':
      return 'Denied';
    case 'expired':
      return 'Expired';
    default:
      return 'Cancelled';
  }
}

export function decisionIcon(approval: Approval): LucideIcon {
  switch (approval.status) {
    case 'approved':
      return CircleCheck;
    case 'denied':
      return Ban;
    case 'expired':
      return TimerOff;
    default:
      return Clock3;
  }
}

export function decisionTextClass(approval: Approval): string {
  if (approval.status === 'approved') return 'text-success';
  if (approval.status === 'denied') return 'text-danger';
  return 'text-fg-faint';
}
