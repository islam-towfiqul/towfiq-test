import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KanbanBoard, KanbanCard, KanbanColumn, KanbanLabel } from '../types/kanban.types';

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'col-todo', title: 'To Do', order: 0, cardIds: [] },
  { id: 'col-in-progress', title: 'In Progress', order: 1, cardIds: [] },
  { id: 'col-done', title: 'Done', order: 2, cardIds: [] },
];

interface KanbanState extends KanbanBoard {
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  addColumn: (title: string) => void;
  renameColumn: (columnId: string, title: string) => void;
  deleteColumn: (columnId: string) => void;
  moveColumn: (fromIndex: number, toIndex: number) => void;

  addCard: (columnId: string, title: string) => void;
  updateCard: (cardId: string, updates: Partial<Omit<KanbanCard, 'id' | 'createdAt'>>) => void;
  deleteCard: (cardId: string) => void;
  moveCard: (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    newIndex: number
  ) => void;

  addLabel: (cardId: string, label: KanbanLabel) => void;
  removeLabel: (cardId: string, labelId: string) => void;
}

export const useKanbanStore = create<KanbanState>()(
  persist(
    (set) => ({
      columns: DEFAULT_COLUMNS,
      cards: {},
      allLabels: [],
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),

      addColumn: (title) =>
        set((state) => ({
          columns: [
            ...state.columns,
            {
              id: `col-${crypto.randomUUID()}`,
              title,
              order: state.columns.length,
              cardIds: [],
            },
          ],
        })),

      renameColumn: (columnId, title) =>
        set((state) => ({
          columns: state.columns.map((col) =>
            col.id === columnId ? { ...col, title } : col
          ),
        })),

      deleteColumn: (columnId) =>
        set((state) => {
          const column = state.columns.find((c) => c.id === columnId);
          const newCards = { ...state.cards };
          column?.cardIds.forEach((id) => delete newCards[id]);
          return {
            columns: state.columns
              .filter((c) => c.id !== columnId)
              .map((c, i) => ({ ...c, order: i })),
            cards: newCards,
          };
        }),

      moveColumn: (fromIndex, toIndex) =>
        set((state) => {
          const cols = [...state.columns];
          const [moved] = cols.splice(fromIndex, 1);
          cols.splice(toIndex, 0, moved);
          return { columns: cols.map((c, i) => ({ ...c, order: i })) };
        }),

      addCard: (columnId, title) =>
        set((state) => {
          const cardId = `card-${crypto.randomUUID()}`;
          const column = state.columns.find((c) => c.id === columnId);
          if (!column) return state;

          const newCard: KanbanCard = {
            id: cardId,
            title,
            description: '',
            columnId,
            labels: [],
            dueDate: null,
            order: column.cardIds.length,
            createdAt: new Date().toISOString(),
          };

          return {
            cards: { ...state.cards, [cardId]: newCard },
            columns: state.columns.map((col) =>
              col.id === columnId
                ? { ...col, cardIds: [...col.cardIds, cardId] }
                : col
            ),
          };
        }),

      updateCard: (cardId, updates) =>
        set((state) => {
          const card = state.cards[cardId];
          if (!card) return state;
          return {
            cards: { ...state.cards, [cardId]: { ...card, ...updates } },
          };
        }),

      deleteCard: (cardId) =>
        set((state) => {
          const card = state.cards[cardId];
          if (!card) return state;
          const newCards = { ...state.cards };
          delete newCards[cardId];
          return {
            cards: newCards,
            columns: state.columns.map((col) =>
              col.id === card.columnId
                ? { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) }
                : col
            ),
          };
        }),

      moveCard: (cardId, fromColumnId, toColumnId, newIndex) =>
        set((state) => {
          const card = state.cards[cardId];
          if (!card) return state;

          const newColumns = state.columns.map((col) => {
            if (col.id === fromColumnId) {
              return { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) };
            }
            if (col.id === toColumnId) {
              const ids = col.cardIds.filter((id) => id !== cardId);
              ids.splice(newIndex, 0, cardId);
              return { ...col, cardIds: ids };
            }
            return col;
          });

          return {
            columns: newColumns,
            cards: {
              ...state.cards,
              [cardId]: { ...card, columnId: toColumnId, order: newIndex },
            },
          };
        }),

      addLabel: (cardId, label) =>
        set((state) => {
          const card = state.cards[cardId];
          if (!card) return state;
          if (card.labels.some((l) => l.id === label.id)) return state;
          return {
            cards: {
              ...state.cards,
              [cardId]: { ...card, labels: [...card.labels, label] },
            },
            allLabels: state.allLabels.some((l) => l.name === label.name)
              ? state.allLabels
              : [...state.allLabels, label],
          };
        }),

      removeLabel: (cardId, labelId) =>
        set((state) => {
          const card = state.cards[cardId];
          if (!card) return state;
          return {
            cards: {
              ...state.cards,
              [cardId]: {
                ...card,
                labels: card.labels.filter((l) => l.id !== labelId),
              },
            },
          };
        }),
    }),
    { name: 'kanban-storage' }
  )
);
