import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface KanbanWorkspaceState {
  /** Active workspace board id (cards/lists are scoped to this). */
  activeBoardId: string | null;
  setActiveBoardId: (id: string | null) => void;
}

export const useKanbanWorkspaceStore = create<KanbanWorkspaceState>()(
  persist(
    (set) => ({
      activeBoardId: null,
      setActiveBoardId: (id) => set({ activeBoardId: id }),
    }),
    { name: 'kanban-workspace' }
  )
);
