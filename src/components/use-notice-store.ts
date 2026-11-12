import { create } from 'zustand';

/** An optional action a Notice can carry. Used for Queue-removal Undo;
 *  failure Notices carry none — their redo affordance is already on screen. */
export type NoticeAction = { label: string; onPress: () => void };

export type Notice = {
  /** Monotonic id, so re-showing the same message still re-triggers the auto-dismiss timer. */
  id: number;
  message: string;
  action?: NoticeAction;
};

type NoticeState = {
  current: Notice | null;
  show: (message: string, action?: NoticeAction) => void;
  dismiss: () => void;
};

let nextId = 1;

/**
 * Drives the app-level `Notice` — one transient, auto-dismissing, non-blocking message, mounted
 * once near the root (same layering as the MiniPlayer). Reserved for background
 * actions with no surface of their own to report into (a failed star / playlist edit), distinct
 * from `QueryState`'s full-surface error and from the blocking re-auth modal.
 */
export const useNoticeStore = create<NoticeState>((set) => ({
  current: null,
  show: (message, action) => set({ current: { id: nextId++, message, action } }),
  dismiss: () => set({ current: null }),
}));

/** Fire a notice from non-React code — the global MutationCache handler's entry point. */
export function showNotice(message: string, action?: NoticeAction): void {
  useNoticeStore.getState().show(message, action);
}

/** Fire a success confirmation ("Added to Queue"). Unlike {@link showNotice} it yields to a Notice
 *  that carries an action (e.g. Queue-removal Undo) so the confirmation can't swallow the user's
 *  only chance to use it; failures keep using `showNotice` and always show. */
export function showConfirmation(message: string): void {
  if (useNoticeStore.getState().current?.action) return;
  showNotice(message);
}
