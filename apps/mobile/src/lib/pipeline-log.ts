/**
 * Pipeline logging that survives release builds.
 *
 * Release APKs drop console output from logcat, so every step is also kept in
 * memory for an on-screen log card and appended to documentDirectory for the
 * next launch. Logging must never break a scan: all writes are best-effort.
 */
import { useSyncExternalStore } from "react";
import { File, Paths } from "expo-file-system";

export interface PipelineLogEntry {
  id: number;
  text: string;
}

const MAX_ENTRIES = 240;
const FILE_LIMIT = 512 * 1024;

let seq = 0;
let entries: PipelineLogEntry[] = [];
let pending: string[] = [];
let flushing = false;
let initialized = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function logFile(): File {
  return new File(Paths.document, "pipeline.log");
}

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

/** Append one line to the in-memory ring, the UI subscribers, and the log file. */
export function log(stage: string, message: string): void {
  const text = `${nowStamp()} ${stage}: ${message}`;
  entries = [...entries.slice(-(MAX_ENTRIES - 1)), { id: ++seq, text }];
  emit();
  // Still useful in dev builds / Expo Go.
  console.log(`[StyleMe] ${text}`);
  pending.push(text);
  void flush();
}

async function flush(): Promise<void> {
  if (flushing || pending.length === 0) return;
  flushing = true;
  const batch = `${pending.join("\n")}\n`;
  pending = [];
  try {
    const file = logFile();
    if (!file.exists) file.create();
    await file.write(batch, { append: true });
  } catch {
    // Disk logging is diagnostic only.
  } finally {
    flushing = false;
    if (pending.length > 0) void flush();
  }
}

/** Load the tail of the previous run's log so a crash still leaves evidence. */
export async function initPipelineLog(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    const file = logFile();
    if (!file.exists || file.size === 0) return;
    const text = await file.text();
    const lines = text.split("\n").filter(Boolean).slice(-40);
    if (lines.length === 0) return;
    const prior = lines.map((line) => ({ id: ++seq, text: line }));
    entries = [...prior, ...entries].slice(-MAX_ENTRIES);
    emit();
    if (file.size > FILE_LIMIT) {
      await file.write(`${lines.slice(-120).join("\n")}\n`);
    }
  } catch {
    // Previous log is optional.
  }
}

export function usePipelineLogs(): PipelineLogEntry[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => entries,
    () => entries,
  );
}

export function errorText(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

/** Reject instead of waiting forever. Underlying work may still finish later. */
export async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Log start/end/failure for one async step. */
export async function step<T>(
  stage: string,
  label: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  const start = Date.now();
  log(stage, `${label}...`);
  try {
    const result = await fn();
    log(stage, `${label} ok (${Date.now() - start}ms)`);
    return result;
  } catch (err) {
    log(stage, `${label} FAILED (${Date.now() - start}ms): ${errorText(err)}`);
    throw err;
  }
}
