import { useState, useCallback, useMemo, useRef, memo } from 'react';
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
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui-kit/button';
import { Input } from '@/components/ui-kit/input';
import { Card } from '@/components/ui-kit/card';
import { Skeleton } from '@/components/ui-kit/skeleton';
import { KanbanColumn } from './kanban-column';
import { KanbanToolbar } from './kanban-toolbar';
import { CardDetailDialog } from './card-detail-dialog';
import { KanbanSearchDataLayer } from './kanban-search-data-layer';
import { useKanbanStore } from '../hooks/use-kanban-store';
import {
  useGetKanbanLists,
  useInsertKanban,
  useUpdateKanban,
  useDeleteKanban,
  useUpdateKanbanList,
  useDeleteKanbanList,
  useInsertKanbanList,
} from '../hooks/use-kanban';
import type {
  KanbanCard as KanbanCardType,
  KanbanColumn as KanbanColumnType,
} from '../types/kanban.types';

/** Resolve which list column a drag is over (droppable id, column id, or card id). */
function resolveOverColumnId(overId: string, cols: KanbanColumnType[]): string | undefined {
  if (overId.startsWith('column-')) {
    return overId.slice('column-'.length);
  }
  if (cols.some((c) => c.id === overId)) {
    return overId;
  }
  return cols.find((col) => col.cardIds.includes(overId))?.id;
}

interface KanbanBoardDndProps {
  onAddCard: (columnId: string, title: string) => void;
  onEditCard: (card: KanbanCardType) => void;
  onDeleteCard: (cardId: string) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

const KanbanBoardDnd = memo(function KanbanBoardDnd({
  onAddCard,
  onEditCard,
  onDeleteCard,
  onRenameColumn,
  onDeleteColumn,
}: KanbanBoardDndProps) {
  const { t } = useTranslation();
  const columns = useKanbanStore((state) => state.columns);

  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const dragOriginColumnId = useRef<string | null>(null);

  const { mutate: insertKanbanList, isPending: isInsertingList } = useInsertKanbanList();
  const addColumn = useKanbanStore((state) => state.addColumn);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

  const findColumnByCardId = useCallback(
    (cardId: string) => columns.find((col) => col.cardIds.includes(cardId)),
    [columns]
  );

  const moveCard = useKanbanStore((state) => state.moveCard);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const cardId = event.active.id as string;
    const card = useKanbanStore.getState().cards[cardId];
    if (card) {
      setActiveCard(card);
      dragOriginColumnId.current = card.columnId;
    }
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      if (activeId === overId) return;

      const activeColumn = findColumnByCardId(activeId);
      if (!activeColumn) return;

      const overColumnId = resolveOverColumnId(overId, columns);
      if (!overColumnId) return;
      if (activeColumn.id === overColumnId) return;

      const overColumn = columns.find((c) => c.id === overColumnId);
      if (!overColumn) return;

      const droppedOnColumnSurface =
        overId.startsWith('column-') || columns.some((c) => c.id === overId);

      let newIndex: number;
      if (droppedOnColumnSurface) {
        newIndex = overColumn.cardIds.length;
      } else {
        newIndex = overColumn.cardIds.indexOf(overId);
        if (newIndex === -1) newIndex = overColumn.cardIds.length;
      }

      moveCard(activeId, activeColumn.id, overColumnId, newIndex);
    },
    [columns, findColumnByCardId, moveCard]
  );

  const { mutate: updateKanbanMutation } = useUpdateKanban();

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCard(null);

      const originColumnId = dragOriginColumnId.current;
      dragOriginColumnId.current = null;

      const activeId = active.id as string;
      let state = useKanbanStore.getState();
      let card = state.cards[activeId];
      if (!card) return;

      // If dragOver skipped the last move, apply it from `over` before we read final column.
      if (over) {
        const overId = over.id as string;
        const targetColumnId = resolveOverColumnId(overId, state.columns);
        if (
          targetColumnId &&
          originColumnId &&
          originColumnId !== targetColumnId &&
          card.columnId === originColumnId
        ) {
          const toCol = state.columns.find((c) => c.id === targetColumnId);
          if (toCol) {
            const droppedOnColumnSurface =
              overId.startsWith('column-') ||
              state.columns.some((c) => c.id === overId);
            let insertIndex = toCol.cardIds.length;
            if (!droppedOnColumnSurface) {
              const idx = toCol.cardIds.indexOf(overId);
              if (idx !== -1) insertIndex = idx;
            }
            moveCard(activeId, card.columnId, targetColumnId, insertIndex);
            state = useKanbanStore.getState();
            card = state.cards[activeId];
            if (!card) return;
          }
        }
      }

      // After dragOver, dnd-kit often reports over.id === active.id (drop on self). Persist
      // using actual store column vs origin — do not require active !== over.
      if (originColumnId && card.columnId !== originColumnId) {
        updateKanbanMutation({
          itemId: activeId,
          input: {
            title: card.title,
            description: card.description,
            labels: card.labels.map((l) => l.name),
            dueDate: card.dueDate,
            list: card.columnId,
          },
        });
        return;
      }

      // Same-column reorder only when over is another card
      if (!over) return;
      const overId = over.id as string;
      if (activeId === overId) return;

      const cols = useKanbanStore.getState().columns;
      const targetColumnId = resolveOverColumnId(overId, cols);
      if (!targetColumnId || card.columnId !== targetColumnId) return;
      if (overId.startsWith('column-') || cols.some((c) => c.id === overId)) return;

      const col = cols.find((c) => c.id === card.columnId);
      if (!col) return;
      const oldIndex = col.cardIds.indexOf(activeId);
      const newIndex = col.cardIds.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const newCardIds = arrayMove(col.cardIds, oldIndex, newIndex);
      useKanbanStore.setState((s) => ({
        columns: s.columns.map((c) =>
          c.id === card.columnId ? { ...c, cardIds: newCardIds } : c
        ),
      }));
    },
    [moveCard, updateKanbanMutation]
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex min-h-0 flex-1 items-start gap-4 overflow-x-auto overflow-y-hidden p-1 pb-4">
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          {columns.map((column, index) => (
            <KanbanColumn
              key={column.id}
              column={column}
              colorIndex={index}
              onAddCard={onAddCard}
              onEditCard={onEditCard}
              onDeleteCard={onDeleteCard}
              onRenameColumn={onRenameColumn}
              onDeleteColumn={onDeleteColumn}
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
  );
});

export function KanbanBoard() {
  const { data: kanbanListsData, isLoading: isListsLoading } = useGetKanbanLists({
    pageNo: 1,
    pageSize: 100,
  });

  const { mutate: insertKanban } = useInsertKanban();
  const { mutate: updateKanban } = useUpdateKanban();
  const { mutate: deleteKanbanCard } = useDeleteKanban();
  const { mutate: updateKanbanListMutation } = useUpdateKanbanList();
  const { mutate: deleteKanbanListMutation } = useDeleteKanbanList();

  const renameColumn = useKanbanStore((state) => state.renameColumn);
  const deleteColumn = useKanbanStore((state) => state.deleteColumn);
  const updateCard = useKanbanStore((state) => state.updateCard);
  const deleteCard = useKanbanStore((state) => state.deleteCard);
  const addLabel = useKanbanStore((state) => state.addLabel);
  const removeLabel = useKanbanStore((state) => state.removeLabel);

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const dialogCards = useKanbanStore((state) => (editingCardId ? state.cards : null));
  const editingCard = editingCardId && dialogCards ? (dialogCards[editingCardId] ?? null) : null;
  const [kanbansReady, setKanbansReady] = useState(false);

  const handleInitialKanbansReady = useCallback(() => {
    setKanbansReady(true);
  }, []);

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

  if (isListsLoading) {
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
      <KanbanSearchDataLayer
        kanbanListsData={kanbanListsData}
        onInitialKanbansReady={handleInitialKanbansReady}
      />

      {!kanbansReady ? (
        <>
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
        </>
      ) : (
        <>
          <KanbanToolbar />

          <KanbanBoardDnd
            onAddCard={handleAddCard}
            onEditCard={handleEditCard}
            onDeleteCard={handleDeleteCard}
            onRenameColumn={handleRenameColumn}
            onDeleteColumn={handleDeleteColumn}
          />
        </>
      )}

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
