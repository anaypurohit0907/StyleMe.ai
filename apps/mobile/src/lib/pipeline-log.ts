/**
 * Structured logging that survives release builds.
 *
 * Three sinks:
 *  - in-memory ring for the in-app ScanLog card,
 *  - Metro / console in dev,
 *  - app-specific external file on Android (`adb pull` / `tail -f`),
 *    falling back to documentDirectory on iOS/Expo Go.
 *
 * Release APKs drop console output from logcat, so the file is the source of
 * truth for a test session. Logging must never break a scan: writes are
 * best-effort and rotate at 2 MB.
 */
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { Directory, File, Paths } from "expo-file-system";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface PipelineLogEntry {
  id: number;
  text: string;
}

const MAX_ENTRIES = 240;
const FILE_LIMIT = 2 * 1024 * 1024;
const LOG_NAME = "styleme.log";

let seq = 0;
let entries: PipelineLogEntry[] = [];
let pending: string[] = [];
let flushing = false;
let initialized = false;
let externalUnavailable = false;
let cachedDir: Directory | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function packageName(): string {
  return Constants.expoConfig?.android?.package ?? "com.o_anay.styleme";
}

/**
 * Android app-specific external files dir — readable by adb without root.
 * iOS/Expo Go use the app document directory instead.
 */
async function target(): Promise<Directory> {
  if (Platform.OS === "android" && !externalUnavailable) {
    try {
      const dir = new Directory(
        `file:///storage/emulated/0/Android/data/${packageName()}/files`,
      );
      if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
      return dir;
    } catch {
      externalUnavailable = true;
    }
  }
  return Paths.document;
}

async function rotateIfNeeded(file: File, dir: Directory): Promise<void> {
  if (!file.exists || file.size <= FILE_LIMIT) return;
  const backup = new File(dir, `${LOG_NAME}.1`);
  try {
    if (backup.exists) backup.delete();
    await file.move(backup);
  } catch {
    // Keep appending if rotation fails.
  }
}

function nowStamp(): string {
  return new Date().toISOString();
}

function append(stage: string, message: string, level: LogLevel): void {
  const tag = level === "info" ? "" : ` ${level.toUpperCase()}`;
  const text = `${nowStamp()} [${stage}]${tag} ${message}`;
  entries = [...entries.slice(-(MAX_ENTRIES - 1)), { id: ++seq, text }];
  emit();
  // Dev builds: visible in Metro. Release: the file sink below is authoritative.
  console.log(`[StyleMe] ${text}`);
  pending.push(text);
  void flush();
}

/** Append an informational line. */
export function log(stage: string, message: string): void {
  append(stage, message, "info");
}

export function logWarn(stage: string, message: string): void {
  append(stage, message, "warn");
}

export function logError(stage: string, message: string): void {
  append(stage, message, "error");
}

async function appendLine(dir: Directory, batch: string): Promise<void> {
  // Expo SDK 58: File.write() does not create a missing file, and
  // File.create() fails its canWrite() permission check when the external
  // file does not exist yet. Directory.createFile() validates the (existing,
  // writable) directory and then creates the file — the only bootstrap that
  // works on external storage. Device-verified by Yves (T-036).
  let file = new File(dir, LOG_NAME);
  if (!file.exists) {
    dir.createFile(LOG_NAME, "text/plain");
    file = new File(dir, LOG_NAME);
  }
  await file.write(batch, { append: true });
}

async function flush(): Promise<void> {
  if (flushing || pending.length === 0) return;
  flushing = true;
  const batch = `${pending.join("\n")}\n`;
  pending = [];
  try {
    if (!cachedDir) cachedDir = await target();
    const file = new File(cachedDir, LOG_NAME);
    await rotateIfNeeded(file, cachedDir);
    await appendLine(cachedDir, batch);
  } catch {
    // Retry once on the internal document directory, then drop silently.
    try {
      externalUnavailable = true;
      cachedDir = Paths.document;
      await appendLine(cachedDir, batch);
    } catch {
      // Disk logging is diagnostic only.
    }
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
    if (!cachedDir) cachedDir = await target();
    const initial = new File(cachedDir, LOG_NAME);
    await rotateIfNeeded(initial, cachedDir);
    const file = new File(cachedDir, LOG_NAME);
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

/** Absolute pull path for docs/testers (Android external dir when available). */
export function logFileHint(): string {
  if (Platform.OS === "android" && !externalUnavailable) {
    return `/sdcard/Android/data/${packageName()}/files/${LOG_NAME}`;
  }
  return new File(Paths.document, LOG_NAME).uri;
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
    logError(stage, `${label} FAILED (${Date.now() - start}ms): ${errorText(err)}`);
    throw err;
  }
}
