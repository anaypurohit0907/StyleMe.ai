/**
 * Opportunistic sync queue — the learning loop's outbox.
 *
 * The app is offline-first: recommendations and preference learning run on
 * the local engine. This queue persists the worker-bound half (wardrobe
 * snapshots, learn events, laundry events) as meta rows and drains it
 * best-effort whenever something is enqueued or Today reloads.
 *
 * Overflow policy: the queue holds at most MAX_JOBS entries; on a long
 * offline streak the OLDEST jobs are dropped first (bounded storage beats
 * unbounded growth — signals are delayed, and after a long silence the
 * freshest wardrobe snapshot and the most recent picks are the ones worth
 * keeping). Everything else survives until the worker accepts it.
 *
 * Concurrency: enqueue mutations are serialized through a promise chain,
 * and every job carries a stable id — the drain removes exactly the ids it
 * delivered, re-reading the row after the network awaits so a job enqueued
 * mid-drain is never clobbered (no lost-update window).
 */
import type { Garment, LaundryEvent, LearnEvent, WardrobeSync } from "@styleme/schema";
import { metaGet, metaSet } from "./db";
import { getDeviceId } from "./local";
import { sendLaundry, sendLearn, syncWardrobe } from "./api";

const QUEUE_KEY = "syncQueue";
const MAX_JOBS = 200;
/** Wardrobe snapshots are capped by the worker contract; keep the newest. */
const SYNC_CAP = 500;

export type SyncJob = {
  id: string;
} & (
  | { kind: "wardrobe"; sync: WardrobeSync }
  | { kind: "learn"; ev: LearnEvent }
  | { kind: "laundry"; ev: LaundryEvent }
);

/** Distributive Omit — keeps each job variant's own payload type. */
type NewSyncJob = SyncJob extends infer J ? (J extends { id: string } ? Omit<J, "id"> : never) : never;

function newJobId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readQueue(): Promise<SyncJob[]> {
  const raw = await metaGet(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SyncJob[];
    return Array.isArray(parsed) ? parsed.filter((j) => j && typeof j.id === "string") : [];
  } catch {
    return [];
  }
}

async function writeQueue(jobs: SyncJob[]): Promise<void> {
  // listGarments is newest-first; so is the drop policy here (oldest first).
  await metaSet(QUEUE_KEY, JSON.stringify(jobs.slice(0, MAX_JOBS)));
}

/** Serialize queue mutations so concurrent enqueues never lose each other. */
let mutationChain: Promise<void> = Promise.resolve();
function serialized<T>(op: () => Promise<T>): Promise<T> {
  const run = mutationChain.then(op, op);
  mutationChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Push a job and kick a background drain. Wardrobe snapshots replace any
 * pending one — the worker only ever needs the latest. */
export function enqueue(job: NewSyncJob): Promise<void> {
  return serialized(async () => {
    const withId = { ...job, id: newJobId() } as SyncJob;
    try {
      let jobs = await readQueue();
      if (job.kind === "wardrobe") jobs = jobs.filter((j) => j.kind !== "wardrobe");
      jobs.unshift(withId); // newest first; writeQueue trims the oldest tail
      await writeQueue(jobs);
    } catch {
      // Queue storage itself failed — logging must never break the flow.
      return;
    }
    void drain();
  });
}

/** Queue the current wardrobe as a sync snapshot (upserts only; client-side
 * deletes ride T-017 when the item sheet wires deletions). Newest first. */
export function enqueueWardrobe(garments: Garment[], ts: number): Promise<void> {
  return enqueue({
    kind: "wardrobe",
    sync: { upserts: garments.slice(0, SYNC_CAP), deletions: [], ts },
  });
}

export function enqueueLearn(ev: LearnEvent): Promise<void> {
  return enqueue({ kind: "learn", ev });
}

export function enqueueLaundry(ev: LaundryEvent): Promise<void> {
  return enqueue({ kind: "laundry", ev });
}

let draining = false;

/** Best-effort flush of everything pending. Never throws; the drain holds no
 * lock across network awaits — delivered ids are removed from a fresh read. */
export async function drain(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    const snapshot = await readQueue();
    if (snapshot.length === 0) return;
    const deviceId = await getDeviceId();
    const delivered: string[] = [];
    for (const job of snapshot) {
      try {
        if (job.kind === "learn") await sendLearn(deviceId, job.ev);
        else if (job.kind === "wardrobe") await syncWardrobe(deviceId, job.sync);
        else await sendLaundry(deviceId, job.ev);
        delivered.push(job.id);
      } catch {
        // Offline or auth-pending — the job stays for the next drain.
      }
    }
    if (delivered.length > 0) {
      await serialized(async () => {
        const current = await readQueue();
        const done = new Set(delivered);
        await writeQueue(current.filter((j) => !done.has(j.id)));
      });
    }
  } catch {
    // Storage/network trouble — the queue survives for the next attempt.
  } finally {
    draining = false;
  }
}
