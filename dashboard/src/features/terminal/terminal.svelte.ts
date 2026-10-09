import { errorMessage, terminalsApi } from '$lib/api';
import type { TerminalInfo } from '$lib/types';
import { readString, storageKeys, writeString } from '$lib/utils/storage';

export type SocketState = 'connecting' | 'connected' | 'closed';

/** The imperative surface of TerminalViewport that the controller needs. */
export interface TerminalViewHandle {
  write(data: string): void;
  reset(): void;
  focus(): void;
  refit(): void;
}

interface ServerMessage {
  type: string;
  data?: string;
  output?: string;
  terminal?: TerminalInfo;
  exitCode?: number;
  message?: string;
}

/** Owns the terminal list and the WebSocket bridge to the active PTY session. */
export class TerminalController {
  terminals = $state<TerminalInfo[]>([]);
  activeId = $state('');
  socketState = $state<SocketState>('closed');
  loading = $state(true);
  creating = $state(false);
  error = $state('');

  active = $derived(this.terminals.find((item) => item.id === this.activeId));

  private socket: WebSocket | null = null;
  private view: TerminalViewHandle | null = null;
  private lastResize = '';

  attach(view: TerminalViewHandle) {
    this.view = view;
  }

  async init() {
    try {
      this.terminals = await terminalsApi.list();
      const savedActiveId = readString(storageKeys.terminalActiveId);
      this.activeId = this.terminals.some((item) => item.id === savedActiveId)
        ? savedActiveId!
        : (this.terminals[0]?.id ?? '');
      writeString(storageKeys.terminalActiveId, this.activeId);
    } catch (error) {
      this.error = errorMessage(error, 'Unable to load terminals');
    } finally {
      this.loading = false;
    }
    if (this.activeId) this.connect(this.activeId);
  }

  async create() {
    this.creating = true;
    this.error = '';
    try {
      const terminal = await terminalsApi.create();
      this.terminals = [terminal, ...this.terminals];
      this.activeId = terminal.id;
      writeString(storageKeys.terminalActiveId, terminal.id);
      this.connect(terminal.id);
    } catch (error) {
      this.error = errorMessage(error, 'Unable to create terminal');
    } finally {
      this.creating = false;
    }
  }

  async close(id: string) {
    try {
      await terminalsApi.close(id);
      this.terminals = this.terminals.filter((item) => item.id !== id);
      if (this.activeId !== id) return;
      this.activeId = this.terminals[0]?.id ?? '';
      writeString(storageKeys.terminalActiveId, this.activeId);
      if (this.activeId) {
        this.view?.reset();
        this.connect(this.activeId);
      } else {
        this.disconnect();
        this.view?.reset();
      }
    } catch (error) {
      this.error = errorMessage(error, 'Unable to close terminal');
    }
  }

  open(id: string) {
    if (id === this.activeId && this.socketState !== 'closed') return;
    this.activeId = id;
    writeString(storageKeys.terminalActiveId, id);
    this.view?.reset();
    this.connect(id);
  }

  sendInput = (data: string) => {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify({ type: 'input', data }));
  };

  sendResize = (cols: number, rows: number) => {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    const size = `${cols}x${rows}`;
    if (size === this.lastResize) return;
    this.lastResize = size;
    this.socket.send(JSON.stringify({ type: 'resize', cols, rows }));
  };

  dispose() {
    this.disconnect();
    this.view = null;
  }

  private disconnect() {
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.socketState = 'closed';
  }

  private connect(id: string) {
    this.disconnect();
    this.lastResize = '';
    this.socketState = 'connecting';

    const socket = new WebSocket(terminalsApi.socketUrl(id));
    this.socket = socket;
    // Handlers of a superseded socket must not touch shared state.
    const current = () => this.socket === socket;
    const settle = () =>
      requestAnimationFrame(() => {
        this.view?.refit();
        this.view?.focus();
      });

    socket.onopen = () => {
      if (!current()) return;
      this.socketState = 'connected';
      settle();
    };

    socket.onmessage = (event) => {
      if (!current()) return;
      let payload: ServerMessage;
      try {
        payload = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }

      switch (payload.type) {
        case 'snapshot':
          if (payload.terminal) {
            const info = payload.terminal;
            this.terminals = this.terminals.map((item) => (item.id === id ? info : item));
          }
          this.view?.reset();
          if (payload.output) this.view?.write(payload.output);
          settle();
          break;
        case 'output':
          if (payload.data) this.view?.write(payload.data);
          break;
        case 'exit':
          this.terminals = this.terminals.map((item) =>
            item.id === id ? { ...item, status: 'exited', exitCode: payload.exitCode } : item,
          );
          break;
        case 'error':
          this.error = payload.message ?? payload.data ?? 'Terminal connection error';
          break;
      }
    };

    socket.onclose = () => {
      if (current()) this.socketState = 'closed';
    };

    socket.onerror = () => {
      if (!current()) return;
      this.socketState = 'closed';
      this.error = 'Terminal connection failed';
    };
  }
}
