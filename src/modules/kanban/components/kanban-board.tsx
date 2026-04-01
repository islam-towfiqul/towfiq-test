import { useState, useCallback, useMemo } from 'react';
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
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Filter, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui-kit/button';
import { Input } from '@/components/ui-kit/input';
import { Card } from '@/components/ui-kit/card';
import { Badge } from '@/components/ui-kit/badge';
import { KanbanColumn } from './kanban-column';
import { CardDetailDialog } from './card-detail-dialog';
import { useKanbanStore } from '../hooks/use-kanban-store';
import type { KanbanCard as KanbanCardType, KanbanLabel } from '../types/kanban.types';

export function KanbanBoard() {
  const {
    columns,
    cards,
    addColumn,
    renameColumn,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    addLabel,
    removeLabel,
  } = useKanbanStore();

  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const editingCard = editingCardId ? cards[editingCardId] ?? null : null;
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [activeLabelFilters, setActiveLabelFilters] = useState<Set<string>>(new Set());

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
    const map: Record<string, KanbanCardType[]> = {};
    for (const col of columns) {
      const colCards = col.cardIds.map((id) => cards[id]).filter(Boolean);
      if (activeLabelFilters.size > 0) {
        map[col.id] = colCards.filter((card) =>
          card.labels.some((label) => activeLabelFilters.has(label.name))
        );
      } else {
        map[col.id] = colCards;
      }
    }
    return map;
  }, [columns, cards, activeLabelFilters]);

  const findColumnByCardId = useCallback(
    (cardId: string) => {
      return columns.find((col) => col.cardIds.includes(cardId));
    },
    [columns]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const cardId = active.id as string;
      if (cards[cardId]) {
        setActiveCard(cards[cardId]);
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

      if (activeColumn.id !== overColumnId) {
        const overColumn = columns.find((c) => c.id === overColumnId);
        if (!overColumn) return;

        let newIndex = overColumn.cardIds.length;
        if (!overId.startsWith('column-')) {
          newIndex = overColumn.cardIds.indexOf(overId);
          if (newIndex === -1) newIndex = overColumn.cardIds.length;
        }

        moveCard(activeId, activeColumn.id, overColumnId, newIndex);
      }
    },
    [columns, findColumnByCardId, moveCard]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCard(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      if (activeId === overId) return;

      const activeColumn = findColumnByCardId(activeId);
      if (!activeColumn) return;

      if (overId.startsWith('column-')) return;

      const overColumn = findColumnByCardId(overId);
      if (!overColumn) return;

      if (activeColumn.id === overColumn.id) {
        const newIndex = overColumn.cardIds.indexOf(overId);
        if (newIndex !== -1) {
          moveCard(activeId, activeColumn.id, overColumn.id, newIndex);
        }
      }
    },
    [findColumnByCardId, moveCard]
  );

  const handleEditCard = useCallback((card: KanbanCardType) => {
    setEditingCardId(card.id);
    setIsDialogOpen(true);
  }, []);

  const handleAddColumn = () => {
    const trimmed = newColumnTitle.trim();
    if (!trimmed) return;
    addColumn(trimmed);
    setNewColumnTitle('');
    setIsAddingColumn(false);
  };

  return (
    <div className="flex h-full flex-col">
      {allLabels.length > 0 && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-medium text-medium-emphasis">
            <Filter className="h-3.5 w-3.5" />
            Filter by label
          </span>
          {allLabels.map((label) => {
            const isActive = activeLabelFilters.has(label.name);
            return (
              <Badge
                key={label.name}
                className={`cursor-pointer select-none border-none text-white transition-opacity ${
                  isActive ? 'ring-2 ring-ring ring-offset-1' : ''
                } ${activeLabelFilters.size > 0 && !isActive ? 'opacity-40' : ''}`}
                style={{ backgroundColor: label.color }}
                onClick={() => toggleLabelFilter(label.name)}
              >
                {label.name}
              </Badge>
            );
          })}
          {activeLabelFilters.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-medium-emphasis"
              onClick={() => setActiveLabelFilters(new Set())}
            >
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto p-1 pb-4">
          <SortableContext
            items={columns.map((c) => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={columnCards[column.id] ?? []}
                onAddCard={addCard}
                onEditCard={handleEditCard}
                onDeleteCard={deleteCard}
                onRenameColumn={renameColumn}
                onDeleteColumn={deleteColumn}
              />
            ))}
          </SortableContext>

          {isAddingColumn ? (
            <div className="w-72 shrink-0 space-y-2">
              <Input
                placeholder="Enter list title..."
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
                className="h-9 text-sm"
              />
              <div className="flex gap-1">
                <Button size="sm" onClick={handleAddColumn}>
                  Add list
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setIsAddingColumn(false);
                    setNewColumnTitle('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="h-10 w-72 shrink-0 justify-start border-dashed text-medium-emphasis"
              onClick={() => setIsAddingColumn(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add another list
            </Button>
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
                      className="h-2 w-10 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                  ))}
                </div>
              )}
              <p className="text-sm font-medium text-high-emphasis">
                {activeCard.title}
              </p>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CardDetailDialog
        card={editingCard}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={updateCard}
        onDelete={deleteCard}
        onAddLabel={addLabel}
        onRemoveLabel={removeLabel}
      />
    </div>
  );
}
