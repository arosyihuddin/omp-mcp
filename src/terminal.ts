import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { resolve, relative, sep } from "node:path";
import { config } from "./lib/config";

export type TerminalStatus = "running" | "exited";

export type TerminalInfo = {
  id: string;
  title: string;
  cwd: string;
  status: TerminalStatus;
  createdAt: string;
  updatedAt: string;
  exitCode?: number;
};

type TerminalRecord = TerminalInfo & {
  process: ReturnType<typeof Bun.spawn>;
  pty: Bun.Terminal;
  clients: Set<Bun.ServerWebSocket<{ terminalId: string }>>;
  output: string;
};

const MAX_BUFFER = 256 * 1024;
const TERMINAL_ROOT = resolve(process.env.OMP_TERMINAL_ROOT ?? homedir());

function workspaceCwd(input?: string) {
  const root = TERMINAL_ROOT;
  const target = resolve(root, input ?? ".");
  const rel = relative(root, target);
  if (rel === ".." || rel.startsWith(`..${sep}`) || rel.startsWith(sep)) {
    throw new Error("Terminal cwd is outside the terminal root");
  }
  return target;
}

function safeWrite(terminal: Bun.Terminal, data: string) {
  try {
    terminal.write(data);
  } catch {}
}


class TerminalManager {
  private terminals = new Map<string, TerminalRecord>();

  list(): TerminalInfo[] {
    return [...this.terminals.values()]
      .map(({ process: _process, clients: _clients, output: _output, ...info }) => info)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: string) {
    const terminal = this.terminals.get(id);
    if (!terminal) return undefined;
    const { process: _process, clients: _clients, output: _output, ...info } = terminal;
    return info;
  }

  create(cwd?: string, title?: string) {
    const target = workspaceCwd(cwd);
    const id = randomUUID();
    const now = new Date().toISOString();
    const decoder = new TextDecoder();
    let record: TerminalRecord | undefined;
    const process = Bun.spawn(

      ["/bin/bash", "--noprofile", "--norc", "-i"],
      {
        cwd: target,
        env: {
          ...processEnv(),
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
        },
        terminal: {
          cols: 120,
          rows: 30,
          data: (_pty, data) => {
            const text = decoder.decode(data, { stream: true });
            if (record && text) this.broadcast(record, text);
          },

        },
      },
    );


    const terminal: TerminalRecord = {
      id,
      title: title?.trim() || `Terminal ${this.terminals.size + 1}`,
      cwd: target,
      status: "running",
      createdAt: now,
      updatedAt: now,
      process,
      pty: process.terminal!,
      clients: new Set(),
      output: "",
    };

    this.terminals.set(id, terminal);
    record = terminal;
    void this.watchExit(terminal);
    return this.get(id)!;
  }

  attach(ws: Bun.ServerWebSocket<{ terminalId: string }>, id: string) {
    const terminal = this.terminals.get(id);
    if (!terminal) {
      ws.send(JSON.stringify({ type: "error", message: "Unknown terminal" }));
      ws.close(1008, "Unknown terminal");
      return;
    }
    terminal.clients.add(ws);
    ws.send(JSON.stringify({
      type: "snapshot",
      terminal: this.get(id),
      output: terminal.output,
    }));
  }

  detach(ws: Bun.ServerWebSocket<{ terminalId: string }>) {
    const terminal = this.terminals.get(ws.data.terminalId);
    terminal?.clients.delete(ws);
  }

  input(id: string, data: string) {
    const terminal = this.terminals.get(id);
    if (!terminal || terminal.status !== "running") return false;
    safeWrite(terminal.pty, data);
    return true;
  }


  resize(id: string, cols: number, rows: number) {
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 20 || cols > 300 || rows < 5 || rows > 100) {
      return false;
    }
    const terminal = this.terminals.get(id);
    if (!terminal || terminal.status !== "running") return false;
    try {
      terminal.pty.resize(cols, rows);
    } catch {
      return false;
    }
    return true;
  }


  dispose(id: string) {
    const terminal = this.terminals.get(id);
    if (!terminal) return false;
    try {
      terminal.pty.close();
    } catch {}
    try {
      terminal.process.kill("SIGTERM");
    } catch {}
    this.terminals.delete(id);
    for (const client of terminal.clients) {
      try { client.close(1000, "Terminal disposed"); } catch {}
    }
    terminal.clients.clear();
    return true;
  }



  private async watchExit(terminal: TerminalRecord) {
    const exitCode = await terminal.process.exited;
    if (!this.terminals.has(terminal.id)) return;
    terminal.status = "exited";
    terminal.exitCode = exitCode;
    terminal.updatedAt = new Date().toISOString();
    this.broadcast(terminal, `\r\n[process exited with code ${exitCode}]\r\n`);
    this.broadcastJson(terminal, { type: "exit", exitCode });
  }

  private broadcast(terminal: TerminalRecord, text: string) {
    terminal.output = (terminal.output + text).slice(-MAX_BUFFER);
    terminal.updatedAt = new Date().toISOString();
    for (const client of terminal.clients) {
      try {
        client.send(JSON.stringify({ type: "output", data: text }));
      } catch {
        terminal.clients.delete(client);
      }
    }
  }

  private broadcastJson(terminal: TerminalRecord, message: Record<string, unknown>) {
    for (const client of terminal.clients) {
      try { client.send(JSON.stringify(message)); } catch { terminal.clients.delete(client); }
    }
  }
}

function processEnv() {
  return { ...Bun.env };
}

export const terminalManager = new TerminalManager();
