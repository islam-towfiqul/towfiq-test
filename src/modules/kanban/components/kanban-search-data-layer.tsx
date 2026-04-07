import { useEffect, useMemo, useRef } from 'react';
import { useGetKanbans } from '../hooks/use-kanban';
import { useKanbanStore } from '../hooks/use-kanban-store';
import type {
  GetKanbanListsResponse,
  KanbanCard as KanbanCardType,
  KanbanItem,
  KanbanLabel,
  KanbanListItem,
  KanbanSortOrder,
} from '../types/kanban.types';
import { LABEL_COLORS } from '../types/kanban.types';

function labelNameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length].value;
}

function apiListsToColumns(lists: KanbanListItem[]) {
  return lists.map((list, order) => ({
    id: list.ItemId,
    title: list.title,
    order,
    cardIds: [] as string[],
  }));
}

function apiItemsToCards(
  items: KanbanItem[],
  columns: { id: string }[]
): { cards: Record<string, KanbanCardType>; columnCardIds: Record<string, string[]> } {
  const cards: Record<string, KanbanCardType> = {};
  const columnCardIds: Record<string, string[]> = {};

  columns.forEach((col) => {
    columnCardIds[col.id] = [];
  });

  items.forEach((item, index) => {
    const col = columns.find((c) => c.id === item.list);
    if (!col) return;

    const cardLabels: KanbanLabel[] = (item.labels ?? []).map((name) => ({
      id: `label-${name}`,
      name,
      color: labelNameToColor(name),
    }));

    const cardId = item.ItemId || `card-api-${index}`;
    cards[cardId] = {
      id: cardId,
      title: item.title || '',
      description: item.description || '',
      columnId: col.id,
      labels: cardLabels,
      dueDate: item.dueDate ?? null,
      assigneeId: item.assigneeId ?? null,
      assigneeName: item.assigneeName ?? null,
      order: columnCardIds[col.id].length,
      createdAt: item.CreatedDate || new Date().toISOString(),
    };

    columnCardIds[col.id].push(cardId);
  });

  return { cards, columnCardIds };
}

/** After API sync, keep assignee fields from the previous store when the API omits them. */
function mergeAssigneesFromPrev(
  next: Record<string, KanbanCardType>,
  prev: Record<string, KanbanCardType>
): Record<string, KanbanCardType> {
  const out: Record<string, KanbanCardType> = {};
  for (const [id, card] of Object.entries(next)) {
    const p = prev[id];
    const apiHasAssignee =
      card.assigneeId != null && String(card.assigneeId).length > 0;
    out[id] = {
      ...card,
      assigneeId: apiHasAssignee ? card.assigneeId : (p?.assigneeId ?? null),
      assigneeName: apiHasAssignee
        ? (card.assigneeName ?? p?.assigneeName ?? null)
        : (p?.assigneeName ?? null),
    };
  }
  return out;
}

function collectLabels(cards: Record<string, KanbanCardType>): KanbanLabel[] {
  const map = new Map<string, KanbanLabel>();
  Object.values(cards).forEach((card) => {
    card.labels.forEach((label) => {
      if (!map.has(label.name)) map.set(label.name, label);
    });
  });
  return Array.from(map.values());
}

/** MongoDB-style filter for `getKanbans` dynamic query. */
function buildKanbanApiFilter(
  searchTrimmed: string,
  labelNames: string[]
): Record<string, unknown> {
  const parts: Record<string, unknown>[] = [];

  if (searchTrimmed) {
    parts.push({
      $or: [
        { title: { $regex: searchTrimmed, $options: 'i' } },
        { description: { $regex: searchTrimmed, $options: 'i' } },
      ],
    });
  }

  if (labelNames.length > 0) {
    parts.push({ labels: { $in: labelNames } });
  }

  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}

function buildKanbanApiSort(sortOrder: KanbanSortOrder): Record<string, unknown> {
  if (sortOrder === 'none') return {};
  if (sortOrder === 'asc') return { dueDate: 1 };
  return { dueDate: -1 };
}

interface KanbanSearchDataLayerProps {
  kanbanListsData: GetKanbanListsResponse | undefined;
  onInitialKanbansReady: () => void;
}

/**
 * Subscribes to search, label filters, and sort in the store; runs `getKanbans` with
 * merged `filter` / `sort`; syncs results into the Zustand board state.
 */
export function KanbanSearchDataLayer({
  kanbanListsData,
  onInitialKanbansReady,
}: KanbanSearchDataLayerProps) {
  const searchQuery = useKanbanStore((state) => state.searchQuery);
  const labelFilterNames = useKanbanStore((state) => state.labelFilterNames);
  const sortOrder = useKanbanStore((state) => state.sortOrder);

  const kanbanFilter = useMemo(
    () => buildKanbanApiFilter(searchQuery.trim(), labelFilterNames),
    [searchQuery, labelFilterNames]
  );

  const kanbanSort = useMemo(() => buildKanbanApiSort(sortOrder), [sortOrder]);

  const { data: kanbansData, isSuccess: kanbansQuerySuccess } = useGetKanbans({
    pageNo: 1,
    pageSize: 100,
    filter: kanbanFilter,
    sort: kanbanSort,
  });

  const readyNotifiedRef = useRef(false);
  const onReadyRef = useRef(onInitialKanbansReady);
  onReadyRef.current = onInitialKanbansReady;

  useEffect(() => {
    const lists = kanbanListsData?.getKanbanLists?.items;
    const items = kanbansData?.getKanbans?.items;

    if (!lists || !kanbansQuerySuccess) return;

    if (!readyNotifiedRef.current) {
      readyNotifiedRef.current = true;
      onReadyRef.current();
    }

    const hasTextSearch = searchQuery.trim().length > 0;

    if (hasTextSearch) {
      const existingColumns = useKanbanStore.getState().columns;
      const prevCards = useKanbanStore.getState().cards;
      const { cards: rawCards, columnCardIds } = apiItemsToCards(items ?? [], existingColumns);
      const apiCards = mergeAssigneesFromPrev(rawCards, prevCards);

      useKanbanStore.setState({
        cards: apiCards,
        columns: existingColumns.map((col) => ({
          ...col,
          cardIds: columnCardIds[col.id] ?? [],
        })),
      });
      return;
    }

    const apiColumns = apiListsToColumns(lists);
    const prevCards = useKanbanStore.getState().cards;
    const { cards: rawCards, columnCardIds } = apiItemsToCards(items ?? [], apiColumns);
    const apiCards = mergeAssigneesFromPrev(rawCards, prevCards);

    const shouldReplaceAllLabels =
      searchQuery.trim().length === 0 && labelFilterNames.length === 0;

    useKanbanStore.setState({
      columns: apiColumns.map((col) => ({
        ...col,
        cardIds: columnCardIds[col.id] ?? [],
      })),
      cards: apiCards,
      allLabels: shouldReplaceAllLabels
        ? collectLabels(apiCards)
        : useKanbanStore.getState().allLabels,
    });
  }, [
    kanbanListsData,
    kanbansData,
    kanbansQuerySuccess,
    searchQuery,
    labelFilterNames,
    sortOrder,
  ]);

  return null;
}
