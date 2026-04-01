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
  { name: 'Green', value: 'bg-emerald-500' },
  { name: 'Yellow', value: 'bg-amber-400' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Red', value: 'bg-red-500' },
  { name: 'Purple', value: 'bg-violet-500' },
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Sky', value: 'bg-sky-400' },
  { name: 'Pink', value: 'bg-pink-500' },
] as const;
