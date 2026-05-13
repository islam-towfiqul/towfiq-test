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
  /** IAM user id when assigned; persisted locally and merged after API sync. */
  assigneeId: string | null;
  /** Display name for the assignee (denormalized for list view / offline merge). */
  assigneeName: string | null;
  order: number;
  createdAt: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  order: number;
  cardIds: string[];
}

/** Zustand-persisted board grid state (columns + cards). */
export interface KanbanBoardData {
  columns: KanbanColumn[];
  cards: Record<string, KanbanCard>;
  allLabels: KanbanLabel[];
}

/** Product “board” workspace — lists and cards belong to one board id. */
export interface KanbanWorkspaceBoard {
  ItemId: string;
  CreatedDate?: string;
  LastUpdatedDate?: string;
  CreatedBy?: string;
  Language?: string;
  LastUpdatedBy?: string;
  OrganizationIds?: string[];
  Tags?: string[];
  /** Card ids on this board (may be empty until cards exist). */
  items?: string[];
  name?: string;
  description?: string;
  /** Legacy field if an older API returned title instead of name. */
  title?: string;
}

export interface KanbanItem {
  ItemId: string;
  CreatedDate: string;
  CreatedBy: string;
  LastUpdatedDate: string;
  LastUpdatedBy: string;
  IsDeleted: boolean;
  Language: string;
  OrganizationIds: string[];
  Tags: string[];
  DeletedDate: string | null;
  title: string;
  description: string;
  labels: string[];
  dueDate: string | null;
  list: string; // listId — references KanbanListItem.ItemId
  /** Parent workspace board id (when backend supports it). */
  board?: string | null;
  /** Backend field (assignee display name). */
  assignee?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
}

export interface KanbanPaginatedResponse {
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: KanbanItem[];
}

export interface GetKanbansResponse {
  getKanbans: KanbanPaginatedResponse;
}

export interface KanbanBoardsPaginatedResponse {
  totalCount: number;
  pageNo?: number;
  pageSize?: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: KanbanWorkspaceBoard[];
}

export interface GetKanbanBoardsResponse {
  getKanbanBoards: KanbanBoardsPaginatedResponse;
}

/** Due-date sort for API `sort` JSON; `none` means omit sort (server default). */
export type KanbanSortOrder = 'none' | 'asc' | 'desc';

export interface KanbanQueryParams {
  pageNo: number;
  pageSize: number;
  filter?: Record<string, unknown>;
  sort?: Record<string, unknown>;
}

export interface KanbanListItem {
  ItemId: string;
  CreatedDate: string;
  CreatedBy: string;
  LastUpdatedDate: string;
  LastUpdatedBy: string;
  IsDeleted: boolean;
  Language: string;
  OrganizationIds: string[];
  Tags: string[];
  DeletedDate: string | null;
  title: string;
  /** Parent workspace board id. */
  board?: string | null;
}

export interface KanbanListsPaginatedResponse {
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: KanbanListItem[];
}

export interface GetKanbanListsResponse {
  getKanbanLists: KanbanListsPaginatedResponse;
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
