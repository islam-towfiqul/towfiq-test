export interface KanbanLabel {
  id: string;
  name: string;
  color: string;
}

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  columnId: string;
  labels: KanbanLabel[];
  dueDate: string | null;
  order: number;
  createdAt: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  order: number;
  cardIds: string[];
}

export interface KanbanBoard {
  columns: KanbanColumn[];
  cards: Record<string, KanbanCard>;
}

export const LABEL_COLORS = [
  { name: 'Green', value: '#10b981' },
  { name: 'Yellow', value: '#fbbf24' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Sky', value: '#38bdf8' },
  { name: 'Pink', value: '#ec4899' },
] as const;
