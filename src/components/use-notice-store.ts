import { create } from 'zustand';

/** An optional action a Notice can carry. Used for Queue-removal Undo (ADR 0007 amendment);
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
 * once near the root (same layering as the MiniPlayer, see ADR 0005). Reserved for background
 * actions with no surface of their own to report into (a failed star / playlist edit), distinct
 * from `QueryState`'s full-surface error and from the blocking re-auth modal. See ADR 0007.
 */
export const useNoticeStore = create<NoticeState>((set) => ({
  current: null,
  // An action-less Notice never displaces one that carries an action (e.g. Undo): the user would
  // lose the only chance to use it. The action-less message is dropped; it lasts only seconds.
  show: (message, action) =>
    set((state) =>
      state.current?.action && !action ? state : { current: { id: nextId++, message, action } },
    ),
  dismiss: () => set({ current: null }),
}));

/** Fire a notice from non-React code — the global MutationCache handler's entry point. */
export function showNotice(message: string, action?: NoticeAction): void {
  useNoticeStore.getState().show(message, action);
}
