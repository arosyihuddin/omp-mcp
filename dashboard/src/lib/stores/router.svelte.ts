import { isWorkspaceRoute, resolveRoute, routes, type RouteId } from '$lib/routes';

class Router {
  current = $state<RouteId>('overview');

  get title() {
    return routes[this.current].title;
  }

  get inWorkspace() {
    return isWorkspaceRoute(this.current);
  }

  /** Start listening to browser history. Returns a cleanup function. */
  init() {
    this.current = resolveRoute(window.location.pathname);
    history.replaceState({}, '', routes[this.current].path);
    const onPopState = () => (this.current = resolveRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }

  navigate(id: RouteId) {
    if (id === this.current) return;
    this.current = id;
    history.pushState({}, '', routes[id].path);
  }

  /**
   * Click handler for real `<a href>` links: client-side navigation for plain
   * clicks, native behaviour (new tab, copy link…) for modified clicks.
   */
  link = (event: MouseEvent, id: RouteId) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    this.navigate(id);
  };
}

export const router = new Router();
