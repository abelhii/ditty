import type { SubsonicAuth } from '@/api/subsonic/types';
import { SubsonicApiError } from '@/api/subsonic/errors';
import type { Track } from '@/api/types';
import type { CollectionKind } from '@/features/downloads/downloads-db';
import type { DownloadRecord } from '@/features/downloads/download-rows';

export type DownloadItemStatus = 'queued' | 'downloading' | 'failed';

export type DownloadItem = {
  status: DownloadItemStatus;
  /** 0..1; 0 until the server reports a length. */
  progress: number;
};

export type DownloadContext = {
  /** Key from `serverKey()` — scopes rows and files to this server+user. */
  server: string;
  serverUrl: string;
  auth: SubsonicAuth;
};

export type FetchOptions = {
  signal: AbortSignal;
  onProgress: (fraction: number) => void;
};

/** Everything the manager touches outside itself, so the queue logic is testable without a device. */
export type DownloadManagerDeps = {
  concurrency: number;
  /** Total attempts per file, including the first. */
  maxAttempts: number;
  sleep: (ms: number) => Promise<void>;
  getContext: () => DownloadContext | null;
  audioUri: (context: DownloadContext, track: Track) => string;
  coverUri: (context: DownloadContext, coverArtId: string) => string;
  audioUrl: (context: DownloadContext, track: Track) => string;
  coverUrl: (context: DownloadContext, coverArtId: string) => string;
  /** Downloads `url` to `destUri`; resolves with the byte size. Must throw SubsonicApiError when
   *  the server answered with an API error body instead of audio. */
  fetchFile: (url: string, destUri: string, options: FetchOptions) => Promise<number>;
  deleteFile: (uri: string) => void;
  getDownload: (server: string, trackId: string) => DownloadRecord | null;
  saveDownload: (server: string, record: DownloadRecord) => void;
  addMembership: (server: string, kind: CollectionKind, collectionId: string, track: Track) => void;
  /** Mirrors queue state into the UI store; `null` removes the item. */
  setItem: (trackId: string, item: DownloadItem | null) => void;
  /** An auth rejection (code 40/41) — routes into Re-authentication. */
  onAuthError: () => void;
  /** Called once when the queue drains with failures. */
  notifyFailures: (failedCount: number) => void;
};

type Job = {
  /** Replaced on `resume()` — the token it was queued with is the one the server rejected. */
  context: DownloadContext;
  track: Track;
  controller: AbortController;
};

const BACKOFF_MS = 1000;

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isAuthError(error: unknown): boolean {
  return error instanceof SubsonicApiError && error.isAuthError;
}

export function createDownloadManager(deps: DownloadManagerDeps) {
  const pending: Job[] = [];
  const active = new Map<string, Job>();
  let paused = false;
  let failures = 0;

  async function fetchWithRetry(
    job: Job,
    url: string,
    destUri: string,
    onProgress: (fraction: number) => void,
  ): Promise<number> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await deps.fetchFile(url, destUri, { signal: job.controller.signal, onProgress });
      } catch (error) {
        deps.deleteFile(destUri);
        // Auth rejections and cancels are not transient — retrying can't help.
        if (isAuthError(error) || isAbort(error) || attempt >= deps.maxAttempts) throw error;
        await deps.sleep(BACKOFF_MS * 2 ** (attempt - 1));
        if (job.controller.signal.aborted) throw error;
      }
    }
  }

  async function run(job: Job): Promise<void> {
    const { context, track } = job;
    const audioDest = deps.audioUri(context, track);
    deps.setItem(track.id, { status: 'downloading', progress: 0 });
    try {
      const sizeBytes = await fetchWithRetry(job, deps.audioUrl(context, track), audioDest, (progress) =>
        deps.setItem(track.id, { status: 'downloading', progress }),
      );

      // Cover art is a nicety (offline lock-screen artwork); its failure must not fail the track.
      let coverPath: string | null = null;
      if (track.coverArtId) {
        const coverDest = deps.coverUri(context, track.coverArtId);
        try {
          await fetchWithRetry(job, deps.coverUrl(context, track.coverArtId), coverDest, () => {});
          coverPath = coverDest;
        } catch (error) {
          if (isAuthError(error) || isAbort(error)) throw error;
        }
      }

      deps.saveDownload(context.server, {
        track,
        filePath: audioDest,
        coverPath,
        sizeBytes,
        state: 'complete',
      });
      deps.setItem(track.id, null);
    } catch (error) {
      if (isAbort(error)) {
        deps.setItem(track.id, null);
      } else if (isAuthError(error)) {
        // Park the queue: every remaining request would be rejected the same way. `resume()` after
        // Re-authentication restarts it; this track stays failed so the user can retry it.
        paused = true;
        deps.setItem(track.id, { status: 'failed', progress: 0 });
        deps.onAuthError();
      } else {
        failures++;
        deps.setItem(track.id, { status: 'failed', progress: 0 });
      }
    }
  }

  function pump(): void {
    while (!paused && active.size < deps.concurrency && pending.length > 0) {
      const job = pending.shift()!;
      active.set(job.track.id, job);
      void run(job).finally(() => {
        active.delete(job.track.id);
        pump();
      });
    }
    if (active.size === 0 && pending.length === 0 && !paused && failures > 0) {
      const count = failures;
      failures = 0;
      deps.notifyFailures(count);
    }
  }

  return {
    /**
     * Queues `tracks` for download on behalf of an album/playlist/track. Membership is recorded
     * first so a shared track survives removal of one collection. Tracks already downloaded (or
     * already queued) are not fetched again.
     */
    enqueue(kind: CollectionKind, collectionId: string, tracks: Track[]): void {
      const context = deps.getContext();
      if (!context) return;
      for (const track of tracks) {
        deps.addMembership(context.server, kind, collectionId, track);
        const done = deps.getDownload(context.server, track.id);
        const alreadyQueued = active.has(track.id) || pending.some((j) => j.track.id === track.id);
        if (done?.state === 'complete' || alreadyQueued) continue;
        pending.push({ context, track, controller: new AbortController() });
        deps.setItem(track.id, { status: 'queued', progress: 0 });
      }
      pump();
    },

    /** Cancels a queued or active download and removes any partial file. */
    cancel(trackId: string): void {
      const index = pending.findIndex((j) => j.track.id === trackId);
      if (index >= 0) {
        pending.splice(index, 1);
        deps.setItem(trackId, null);
        return;
      }
      active.get(trackId)?.controller.abort();
    },

    /** Continues a queue parked by an auth rejection, after Re-authentication. */
    resume(): void {
      paused = false;
      const fresh = deps.getContext();
      if (fresh) for (const job of pending) job.context = fresh;
      pump();
    },
  };
}

export type DownloadManager = ReturnType<typeof createDownloadManager>;
