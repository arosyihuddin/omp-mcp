import { errorMessage, toolsApi } from '$lib/api';
import type { Tool } from '$lib/types';

class ToolsStore {
  items = $state<Tool[]>([]);
  loading = $state(true);
  error = $state('');
  updating = $state<ReadonlySet<string>>(new Set());

  async load() {
    this.error = '';
    try {
      this.items = await toolsApi.list();
    } catch (error) {
      this.error = errorMessage(error, 'Unable to load tools');
    } finally {
      this.loading = false;
    }
  }

  async toggleExposure(tool: Tool) {
    if (this.updating.has(tool.name)) return;
    this.updating = new Set(this.updating).add(tool.name);
    this.error = '';
    try {
      const updated = await toolsApi.setExposed(tool.name, !tool.exposed);
      this.items = this.items.map((item) => (item.name === tool.name ? updated : item));
    } catch (error) {
      this.error = errorMessage(error, 'Unable to update tool exposure');
    } finally {
      const next = new Set(this.updating);
      next.delete(tool.name);
      this.updating = next;
    }
  }
}

export const tools = new ToolsStore();
