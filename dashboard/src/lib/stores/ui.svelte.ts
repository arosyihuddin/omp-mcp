import { readString, storageKeys, writeString } from '$lib/utils/storage';

class UiStore {
  sidebarCollapsed = $state(false);
  mobileNavOpen = $state(false);

  init() {
    this.sidebarCollapsed = readString(storageKeys.sidebarCollapsed) === 'true';
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    writeString(storageKeys.sidebarCollapsed, String(this.sidebarCollapsed));
  }
}

export const ui = new UiStore();
