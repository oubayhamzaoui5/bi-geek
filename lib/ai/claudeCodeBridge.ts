import { spawn, type ChildProcessWithoutNullStreams } from "child_process";

type PendingRequest = {
  prompt: string;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type BridgeState = {
  process: ChildProcessWithoutNullStreams | null;
  queue: PendingRequest[];
  active: PendingRequest | null;
  buffer: string;
  starting: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __biGeekClaudeCodeBridge: BridgeState | undefined;
}

const DEFAULT_TIMEOUT_MS = 180_000;

function getState(): BridgeState {
  if (!globalThis.__biGeekClaudeCodeBridge) {
    globalThis.__biGeekClaudeCodeBridge = {
      process: null,
      queue: [],
      active: null,
      buffer: "",
      starting: false,
    };
  }
  return globalThis.__biGeekClaudeCodeBridge;
}

function buildArgs(): string[] {
  return [
    "-p",
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--verbose",
    "--replay-user-messages",
    "--tools",
    "",
  ];
}

function rejectAll(state: BridgeState, error: Error) {
  if (state.active) {
    clearTimeout(state.active.timeout);
    state.active.reject(error);
    state.active = null;
  }

  for (const req of state.queue.splice(0)) {
    clearTimeout(req.timeout);
    req.reject(error);
  }
}

function sendNext(state: BridgeState) {
  if (!state.process || state.active || state.queue.length === 0) return;

  state.active = state.queue.shift() ?? null;
  if (!state.active) return;

  const input = {
    type: "user",
    message: {
      role: "user",
      content: [{ type: "text", text: state.active.prompt }],
    },
  };

  state.process.stdin.write(`${JSON.stringify(input)}\n`);
}

function handleLine(state: BridgeState, line: string) {
  if (!line.trim()) return;

  let event: any;
  try {
    event = JSON.parse(line);
  } catch {
    return;
  }

  if (event.type !== "result") return;

  const active = state.active;
  if (!active) return;

  clearTimeout(active.timeout);
  state.active = null;

  if (event.is_error) {
    active.reject(new Error(event.result || event.api_error_status || "Claude Code request failed."));
  } else {
    active.resolve(String(event.result ?? ""));
  }

  sendNext(state);
}

function ensureProcess(state: BridgeState) {
  if (state.process || state.starting) return;
  state.starting = true;

  const command = process.env.CLAUDE_CODE_COMMAND || "claude";
  const cwd = process.env.CLAUDE_CODE_CWD || process.cwd();
  const child = spawn(command, buildArgs(), {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });

  state.process = child;
  state.starting = false;

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  child.stdout.on("data", (chunk: string) => {
    state.buffer += chunk;
    const lines = state.buffer.split(/\r?\n/);
    state.buffer = lines.pop() ?? "";
    for (const line of lines) handleLine(state, line);
  });

  child.stderr.on("data", (chunk: string) => {
    console.warn("Claude Code bridge stderr:", chunk);
  });

  child.on("error", (err) => {
    state.process = null;
    state.starting = false;
    rejectAll(state, err instanceof Error ? err : new Error(String(err)));
  });

  child.on("exit", (code, signal) => {
    state.process = null;
    state.starting = false;
    state.buffer = "";
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    rejectAll(state, new Error(`Claude Code bridge exited (${reason}).`));
  });
}

export function askClaudeCode(prompt: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  const state = getState();
  ensureProcess(state);

  return new Promise((resolve, reject) => {
    const req: PendingRequest = {
      prompt,
      resolve,
      reject,
      timeout: setTimeout(() => {
        if (state.active === req) {
          state.active = null;
        } else {
          state.queue = state.queue.filter((item) => item !== req);
        }
        reject(new Error("Claude Code request timed out."));
        sendNext(state);
      }, timeoutMs),
    };

    state.queue.push(req);
    sendNext(state);
  });
}

export function stopClaudeCodeBridge() {
  const state = getState();
  state.process?.kill();
  state.process = null;
  state.active = null;
  state.queue = [];
  state.buffer = "";
  state.starting = false;
}
