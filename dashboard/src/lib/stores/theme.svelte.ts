import { readString, storageKeys, writeString } from '$lib/utils/storage';

export type Theme = 'dark' | 'light';

class ThemeStore {
  current = $state<Theme>('dark');

  init() {
    this.apply(readString(storageKeys.theme) === 'light' ? 'light' : 'dark');
  }

  set(next: Theme) {
    this.apply(next);
    writeString(storageKeys.theme, next);
  }

  toggle() {
    this.set(this.current === 'dark' ? 'light' : 'dark');
  }

  private apply(theme: Theme) {
    this.current = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
  }
}

export const theme = new ThemeStore();
