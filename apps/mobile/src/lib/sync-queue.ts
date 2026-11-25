/**
 * Opportunistic sync queue — the learning loop's outbox.
 *
 * The app is offline-first: recommendations and preference learning run on
 * the local engine. This queue persists the worker-bound half (wardrobe
 * snapshots, learn events, laundry events) as meta rows and drains it
 * best-effort whenever something is enqueued or Today reloads. A failed
 * drain (offline, worker down, auth pending) keeps the jobs for the next
 * attempt — a learning signal is never dropped, only delayed.
 */
import type { Garment, LaundryEvent, LearnEvent, WardrobeSync } from "@styleme/schema";
import { metaGet, metaSet } from "./db";
import { getDeviceId } from "./local";
import { sendLaundry, sendLearn, syncWardrobe } from "./api";

const QUEUE_KEY = "syncQueue";
/** Bounds growth on a long offline streak; oldest jobs drop first. */
const MAX_JOBS = 200;
/** Wardrobe snapshots are capped by the worker contract; slices keep us inside it. */
const SYNC_CAP = 500;

export type SyncJob =
  | { kind: "wardrobe"; sync: WardrobeSync }
  | { kind: "learn"; ev: LearnEvent }
  | { kind: "laundry"; ev: LaundryEvent };

async function readQueue(): Promise<SyncJob[]> {
  const raw = await metaGet(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SyncJob[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(jobs: SyncJob[]): Promise<void> {
  await metaSet(QUEUE_KEY, JSON.stringify(jobs.slice(-MAX_JOBS)));
}

let draining = false;

/** Push a job and kick a background drain. Wardrobe snapshots replace any
 * pending one — the worker only ever needs the latest. */
export async function enqueue(job: SyncJob): Promise<void> {
  try {
    let jobs = await readQueue();
    if (job.kind === "wardrobe") jobs = jobs.filter((j) => j.kind !== "wardrobe");
    jobs.push(job);
    await writeQueue(jobs);
  } catch {
    // Queue storage itself failed — logging must never break the flow.
    return;
  }
  void drain();
}

/** Queue the current wardrobe as a sync snapshot (upserts only; client-side
 * deletes ride T-017 when the item sheet wires deletions). */
export async function enqueueWardrobe(garments: Garment[], ts: number): Promise<void> {
  const recent = garments.slice(-SYNC_CAP);
  await enqueue({
    kind: "wardrobe",
    sync: { upserts: recent, deletions: [], ts },
  });
}

export async function enqueueLearn(ev: LearnEvent): Promise<void> {
  await enqueue({ kind: "learn", ev });
}

export async function enqueueLaundry(ev: LaundryEvent): Promise<void> {
  await enqueue({ kind: "laundry", ev });
}

/** Best-effort flush of everything pending. Never throws. */
export async function drain(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    const jobs = await readQueue();
    if (jobs.length === 0) return;
    const deviceId = await getDeviceId();
    const remaining: SyncJob[] = [];
    for (const job of jobs) {
      try {
        if (job.kind === "learn") await sendLearn(deviceId, job.ev);
        else if (job.kind === "wardrobe") await syncWardrobe(deviceId, job.sync);
        else await sendLaundry(deviceId, job.ev);
      } catch {
        remaining.push(job); // offline or auth-pending — retry on the next drain
      }
    }
    await writeQueue(remaining);
  } catch {
    // Storage/network trouble — the queue survives for the next attempt.
  } finally {
    draining = false;
  }
}
