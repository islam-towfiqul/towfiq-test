import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowDownUp, Filter, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui-kit/button';
import { Input } from '@/components/ui-kit/input';
import { Card } from '@/components/ui-kit/card';
import { Badge } from '@/components/ui-kit/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui-kit/popover';
import { Checkbox } from '@/components/ui-kit/checkbox';
import { Skeleton } from '@/components/ui-kit/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui-kit/dropdown-menu';
import { KanbanColumn } from './kanban-column';
import { CardDetailDialog } from './card-detail-dialog';
import { useKanbanStore } from '../hooks/use-kanban-store';
import {
  useGetKanbanLists,
  useGetKanbans,
  useInsertKanban,
  useUpdateKanban,
  useDeleteKanban,
  useUpdateKanbanList,
  useDeleteKanbanList,
  useInsertKanbanList,
} from '../hooks/use-kanban';
import type {
  KanbanCard as KanbanCardType,
  KanbanItem,
  KanbanListItem,
  KanbanLabel,
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

export function KanbanBoard() {
  const { t } = useTranslation();

  const { data: kanbanListsData, isLoading: isListsLoading } = useGetKanbanLists({
    pageNo: 1,
    pageSize: 100,
  });

  const { data: kanbansData, isLoading: isKanbansLoading } = useGetKanbans({
    pageNo: 1,
    pageSize: 100,
  });

  const { mutate: insertKanbanList, isPending: isInsertingList } = useInsertKanbanList();
  const { mutate: insertKanban } = useInsertKanban();
  const { mutate: updateKanban } = useUpdateKanban();
  const { mutate: deleteKanbanCard } = useDeleteKanban();
  const { mutate: updateKanbanListMutation } = useUpdateKanbanList();
  const { mutate: deleteKanbanListMutation } = useDeleteKanbanList();

  const {
    columns,
    cards,
    addColumn,
    renameColumn,
    deleteColumn,
    updateCard,
    deleteCard,
    moveCard,
    addLabel,
    removeLabel,
  } = useKanbanStore();

  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;

    const lists = kanbanListsData?.getKanbanLists?.items;
    const items = kanbansData?.getKanbans?.items;

    if (!lists) return;

    seededRef.current = true;

    const apiColumns = apiListsToColumns(lists);
    const { cards: apiCards, columnCardIds } = apiItemsToCards(items ?? [], apiColumns);

    const columnsWithCards = apiColumns.map((col) => ({
      ...col,
      cardIds: columnCardIds[col.id] ?? [],
    }));

    useKanbanStore.setState({ columns: columnsWithCards, cards: apiCards });
  }, [kanbanListsData, kanbansData]);

  const dragOriginColumnId = useRef<string | null>(null);

  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const editingCard = editingCardId ? cards[editingCardId] ?? null : null;
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [activeLabelFilters, setActiveLabelFilters] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const allLabels = useMemo(() => {
    const map = new Map<string, KanbanLabel>();
    Object.values(cards).forEach((card) => {
      card.labels.forEach((label) => {
        if (!map.has(label.name)) {
          map.set(label.name, label);
        }
      });
    });
    return Array.from(map.values());
  }, [cards]);

  const toggleLabelFilter = useCallback((labelName: string) => {
    setActiveLabelFilters((prev) => {
      const next = new Set(prev);
      if (next.has(labelName)) {
        next.delete(labelName);
      } else {
        next.add(labelName);
      }
      return next;
    });
  }, []);

  const columnCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const map: Record<string, KanbanCardType[]> = {};
    for (const col of columns) {
      let colCards = col.cardIds.map((id) => cards[id]).filter(Boolean);
      if (activeLabelFilters.size > 0) {
        colCards = colCards.filter((card) =>
          card.labels.some((label) => activeLabelFilters.has(label.name))
        );
      }
      if (query) {
        colCards = colCards.filter(
          (card) =>
            card.title.toLowerCase().includes(query) ||
            card.description.toLowerCase().includes(query)
        );
      }
      if (sortOrder !== 'none') {
        colCards = [...colCards].sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          return sortOrder === 'asc' ? diff : -diff;
        });
      }
      map[col.id] = colCards;
    }
    return map;
  }, [columns, cards, activeLabelFilters, searchQuery, sortOrder]);

  const findColumnByCardId = useCallback(
    (cardId: string) => columns.find((col) => col.cardIds.includes(cardId)),
    [columns]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const cardId = event.active.id as string;
      const card = cards[cardId];
      if (card) {
        setActiveCard(card);
        dragOriginColumnId.current = card.columnId;
      }
    },
    [cards]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      if (activeId === overId) return;

      const activeColumn = findColumnByCardId(activeId);
      if (!activeColumn) return;

      let overColumnId: string;
      if (overId.startsWith('column-')) {
        overColumnId = overId.replace('column-', '');
      } else {
        const overColumn = findColumnByCardId(overId);
        if (!overColumn) return;
        overColumnId = overColumn.id;
      }
      if (activeColumn.id === overColumnId) return;

      const overColumn = columns.find((c) => c.id === overColumnId);
      if (!overColumn) return;

      let newIndex: number;
      if (overId.startsWith('column-')) {
        newIndex = overColumn.cardIds.length;
      } else {
        newIndex = overColumn.cardIds.indexOf(overId);
        if (newIndex === -1) newIndex = overColumn.cardIds.length;
      }

      moveCard(activeId, activeColumn.id, overColumnId, newIndex);
    },
    [columns, findColumnByCardId, moveCard]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCard(null);

      const originColumnId = dragOriginColumnId.current;
      dragOriginColumnId.current = null;

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      if (activeId === overId) return;

      const activeColumn = findColumnByCardId(activeId);
      if (!activeColumn) return;

      // Cross-column drop: the card was already moved by handleDragOver;
      // fire the mutation to persist the new list.
      if (originColumnId && activeColumn.id !== originColumnId) {
        const card = useKanbanStore.getState().cards[activeId];
        if (card) {
          updateKanban({
            itemId: activeId,
            input: {
              title: card.title,
              description: card.description,
              labels: card.labels.map((l) => l.name),
              dueDate: card.dueDate,
              list: activeColumn.id,
            },
          });
        }
        return;
      }

      // Same-column reorder
      const overColumn = findColumnByCardId(overId);
      if (!overColumn || activeColumn.id !== overColumn.id) return;

      const oldIndex = activeColumn.cardIds.indexOf(activeId);
      const newIndex = overColumn.cardIds.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const newCardIds = arrayMove(activeColumn.cardIds, oldIndex, newIndex);
      useKanbanStore.setState((state) => ({
        columns: state.columns.map((col) =>
          col.id === activeColumn.id ? { ...col, cardIds: newCardIds } : col
        ),
      }));
    },
    [findColumnByCardId, updateKanban]
  );

  const handleEditCard = useCallback((card: KanbanCardType) => {
    setEditingCardId(card.id);
    setIsDialogOpen(true);
  }, []);

  const handleRenameColumn = useCallback(
    (columnId: string, title: string) => {
      updateKanbanListMutation(
        { columnId, title },
        { onSuccess: () => renameColumn(columnId, title) }
      );
    },
    [updateKanbanListMutation, renameColumn]
  );

  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      deleteKanbanListMutation(columnId, {
        onSuccess: () => deleteColumn(columnId),
      });
    },
    [deleteKanbanListMutation, deleteColumn]
  );

  const handleDeleteCard = useCallback(
    (cardId: string) => {
      deleteKanbanCard(cardId, {
        onSuccess: () => deleteCard(cardId),
      });
    },
    [deleteKanbanCard, deleteCard]
  );

  const handleSaveCard = useCallback(
    (cardId: string, updates: Partial<KanbanCardType>) => {
      const card = useKanbanStore.getState().cards[cardId];
      if (!card) return;

      const mergedCard = { ...card, ...updates };

      updateKanban(
        {
          itemId: cardId,
          input: {
            title: mergedCard.title,
            description: mergedCard.description,
            labels: mergedCard.labels.map((l) => l.name),
            dueDate: mergedCard.dueDate,
            list: mergedCard.columnId,
          },
        },
        {
          onSuccess: () => {
            updateCard(cardId, updates);
          },
        }
      );
    },
    [updateKanban, updateCard]
  );

  const handleAddCard = useCallback(
    (columnId: string, title: string) => {
      insertKanban(
        { title, list: columnId },
        {
          onSuccess: ({ insertKanban: result }) => {
            const cardId = result.itemId;
            useKanbanStore.setState((state) => {
              const column = state.columns.find((c) => c.id === columnId);
              if (!column) return state;
              const newCard = {
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
            });
          },
        }
      );
    },
    [insertKanban]
  );

  const handleAddColumn = () => {
    const trimmed = newColumnTitle.trim();
    if (!trimmed || isInsertingList) return;

    setNewColumnTitle('');
    setIsAddingColumn(false);

    insertKanbanList(
      { title: trimmed },
      { onSuccess: () => addColumn(trimmed) }
    );
  };

  if (isListsLoading || isKanbansLoading) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="mb-3 flex shrink-0 items-center gap-2">
          <Skeleton className="h-9 w-56 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
        <div className="flex items-start gap-4 overflow-x-auto p-1 pb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-72 shrink-0 space-y-2">
              <Skeleton className="h-8 w-full rounded" />
              <div className="rounded border bg-muted/40 p-2 space-y-2">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-20 w-full rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-medium-emphasis" />
          <input
            type="text"
            placeholder={t('SEARCH_CARDS')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-56 rounded-md border border-input bg-background pl-8 pr-8 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-medium-emphasis hover:text-high-emphasis"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={sortOrder !== 'none' ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
              {sortOrder === 'asc'
                ? t('DUE_EARLIEST')
                : sortOrder === 'desc'
                  ? t('DUE_LATEST')
                  : t('SORT')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onClick={() => setSortOrder('asc')}>
              {t('DUE_DATE_EARLIEST_FIRST')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder('desc')}>
              {t('DUE_DATE_LATEST_FIRST')}
            </DropdownMenuItem>
            {sortOrder !== 'none' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortOrder('none')}>
                  <X className="h-3.5 w-3.5" />
                  {t('CLEAR_SORT')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {allLabels.length > 0 && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  {t('FILTER')}
                  {activeLabelFilters.size > 0 && (
                    <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded bg-primary text-[10px] font-semibold text-white">
                      {activeLabelFilters.size}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-2">
                <div className="mb-2 flex items-center justify-between px-2 pt-1">
                  <span className="text-xs font-semibold text-high-emphasis">{t('LABELS')}</span>
                  {activeLabelFilters.size > 0 && (
                    <button
                      type="button"
                      className="text-xs text-medium-emphasis hover:text-high-emphasis"
                      onClick={() => setActiveLabelFilters(new Set())}
                    >
                      {t('CLEAR_ALL')}
                    </button>
                  )}
                </div>
                <div className="flex flex-col">
                  {allLabels.map((label) => {
                    const isActive = activeLabelFilters.has(label.name);
                    return (
                      <button
                        key={label.name}
                        type="button"
                        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent"
                        onClick={() => toggleLabelFilter(label.name)}
                      >
                        <Checkbox checked={isActive} />
                        <span
                          className="h-4 w-4 shrink-0 rounded"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="truncate text-sm">{label.name}</span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            {activeLabelFilters.size > 0 && (
              <div className="flex items-center gap-1.5">
                {allLabels
                  .filter((l) => activeLabelFilters.has(l.name))
                  .map((label) => (
                    <Badge
                      key={label.name}
                      className="cursor-pointer select-none border-none text-white"
                      style={{ backgroundColor: label.color }}
                      onClick={() => toggleLabelFilter(label.name)}
                    >
                      {label.name}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex min-h-0 flex-1 items-start gap-4 overflow-x-auto overflow-y-hidden p-1 pb-4">
          <SortableContext
            items={columns.map((c) => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column, index) => (
              <KanbanColumn
                key={column.id}
                column={column}
                colorIndex={index}
                cards={columnCards[column.id] ?? []}
                onAddCard={handleAddCard}
                onEditCard={handleEditCard}
                onDeleteCard={handleDeleteCard}
                onRenameColumn={handleRenameColumn}
                onDeleteColumn={handleDeleteColumn}
              />
            ))}
          </SortableContext>

          {isAddingColumn ? (
            <div className="w-72 shrink-0">
              <div className="rounded border bg-muted/40 p-2">
                <Input
                  placeholder={t('ENTER_LIST_TITLE')}
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddColumn();
                    } else if (e.key === 'Escape') {
                      setIsAddingColumn(false);
                      setNewColumnTitle('');
                    }
                  }}
                  autoFocus
                  className="mb-2 h-9 text-sm"
                />
                <div className="flex gap-1">
                  <Button size="sm" onClick={handleAddColumn} disabled={isInsertingList}>
                    {isInsertingList ? t('ADDING') : t('ADD_LIST')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={isInsertingList}
                    onClick={() => {
                      setIsAddingColumn(false);
                      setNewColumnTitle('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-72 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddingColumn(true)}
                className="group flex w-full items-center gap-2 rounded border border-dashed border-border bg-muted/20 px-3 py-2 text-sm text-medium-emphasis transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded border border-dashed border-current">
                  <Plus className="h-3.5 w-3.5" />
                </span>
                {t('ADD_ANOTHER_LIST')}
              </button>
            </div>
          )}
        </div>

        <DragOverlay>
          {activeCard ? (
            <Card className="w-72 rotate-3 bg-card p-3 shadow-lg">
              {activeCard.labels.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {activeCard.labels.map((label) => (
                    <span
                      key={label.id}
                      className="inline-flex items-center rounded px-2.5 py-0.5 text-[11px] font-medium leading-5 text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm font-medium text-high-emphasis">{activeCard.title}</p>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CardDetailDialog
        card={editingCard}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
        onAddLabel={addLabel}
        onRemoveLabel={removeLabel}
      />
    </div>
  );
}
