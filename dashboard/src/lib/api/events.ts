/**
 * One shared EventSource for the whole app.
 *
 * Browsers cap concurrent connections per origin, and every page used to open
 * its own stream. Consumers now subscribe by event type; the connection is
 * created on the first subscription and closed with the last.
 */
type Handler = (event: MessageEvent) => void;

const handlers = new Map<string, Set<Handler>>();
const attached = new Set<string>();
let source: EventSource | null = null;
let subscribers = 0;

function dispatcher(type: string): Handler {
  return (event) => handlers.get(type)?.forEach((handler) => handler(event));
}

export function onServerEvent(type: string, handler: Handler): () => void {
  source ??= new EventSource('/api/events');
  subscribers += 1;

  let set = handlers.get(type);
  if (!set) handlers.set(type, (set = new Set()));
  set.add(handler);

  if (!attached.has(type)) {
    source.addEventListener(type, dispatcher(type));
    attached.add(type);
  }

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    handlers.get(type)?.delete(handler);
    subscribers -= 1;
    if (subscribers === 0) {
      source?.close();
      source = null;
      attached.clear();
      handlers.clear();
    }
  };
}

/** Subscribe to several event types with one handler. Returns a single cleanup. */
export function onServerEvents(types: string[], handler: Handler): () => void {
  const cleanups = types.map((type) => onServerEvent(type, handler));
  return () => cleanups.forEach((cleanup) => cleanup());
}
