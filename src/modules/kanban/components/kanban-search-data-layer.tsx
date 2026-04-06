import { useEffect, useMemo, useRef } from 'react';
import { useGetKanbans } from '../hooks/use-kanban';
import { useKanbanStore } from '../hooks/use-kanban-store';
import type {
  GetKanbanListsResponse,
  KanbanCard as KanbanCardType,
  KanbanItem,
  KanbanLabel,
  KanbanListItem,
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
      order: columnCardIds[col.id].length,
      createdAt: item.CreatedDate || new Date().toISOString(),
    };

    columnCardIds[col.id].push(cardId);
  });

  return { cards, columnCardIds };
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

interface KanbanSearchDataLayerProps {
  kanbanListsData: GetKanbanListsResponse | undefined;
  onInitialKanbansReady: () => void;
}

/**
 * Subscribes to `searchQuery` in the store, runs the kanbans query, and syncs API data into the store.
 * Renders nothing. Kept as a sibling of the toolbar so search-driven updates do not re-render the toolbar.
 */
export function KanbanSearchDataLayer({
  kanbanListsData,
  onInitialKanbansReady,
}: KanbanSearchDataLayerProps) {
  const searchQuery = useKanbanStore((state) => state.searchQuery);

  const kanbanFilter = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return {};
    return {
      $or: [
        { title: { $regex: trimmed, $options: 'i' } },
        { description: { $regex: trimmed, $options: 'i' } },
      ],
    };
  }, [searchQuery]);

  const { data: kanbansData, isSuccess: kanbansQuerySuccess } = useGetKanbans({
    pageNo: 1,
    pageSize: 100,
    filter: kanbanFilter,
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

    if (searchQuery.trim()) {
      const existingColumns = useKanbanStore.getState().columns;
      const { cards: apiCards, columnCardIds } = apiItemsToCards(items ?? [], existingColumns);

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
    const { cards: apiCards, columnCardIds } = apiItemsToCards(items ?? [], apiColumns);

    useKanbanStore.setState({
      columns: apiColumns.map((col) => ({
        ...col,
        cardIds: columnCardIds[col.id] ?? [],
      })),
      cards: apiCards,
      allLabels: collectLabels(apiCards),
    });
  }, [kanbanListsData, kanbansData, kanbansQuerySuccess, searchQuery]);

  return null;
}
