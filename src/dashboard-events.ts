export type DashboardEventType =
  | "approval.created"
  | "approval.updated"
  | "approval.cleared"
  | "session.created"
  | "session.updated"
  | "session.removed";

export type DashboardEvent = {
  type: DashboardEventType;
  data?: unknown;
};

type Listener = (event: DashboardEvent) => void;

const listeners = new Set<Listener>();

export function subscribeDashboardEvents(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitDashboardEvent(event: DashboardEvent) {
  for (const listener of listeners) listener(event);
}
