import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { getItem, removeItem, setItem } from '@/api/kv-storage';

type QueueSidebarSettings = { collapsed: boolean };

type QueueSidebarState = QueueSidebarSettings & {
  toggle: () => void;
};

const jsonStorage = createJSONStorage<QueueSidebarSettings>(
  (): StateStorage => ({ getItem, setItem, removeItem }),
);

/** Whether the wide layout's Queue sidebar is collapsed to its rail. Expanded by default, and
 *  durable. kvStorage is synchronous, so `persist` hydrates at creation. */
export const useQueueSidebarStore = create<QueueSidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((state) => ({ collapsed: !state.collapsed })),
    }),
    {
      name: 'music-player-queue-sidebar',
      version: 1,
      storage: jsonStorage,
      partialize: (state): QueueSidebarSettings => ({ collapsed: state.collapsed }),
    },
  ),
);
