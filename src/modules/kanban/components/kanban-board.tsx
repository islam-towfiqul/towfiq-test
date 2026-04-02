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

      if (activeId === overId) return;

      const activeColumn = findColumnByCardId(activeId);
      if (!activeColumn) return;

      // Only handle cross-column moves here
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

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      if (activeId === overId) return;

      const activeColumn = findColumnByCardId(activeId);
      if (!activeColumn) return;

      // Only handle same-column reordering here
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-medium-emphasis" />
          <input
            type="text"
            placeholder="Search cards..."
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
              {sortOrder === 'asc' ? 'Due: Earliest' : sortOrder === 'desc' ? 'Due: Latest' : 'Sort'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onClick={() => setSortOrder('asc')}>
              Due date: Earliest first
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder('desc')}>
              Due date: Latest first
            </DropdownMenuItem>
            {sortOrder !== 'none' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortOrder('none')}>
                  <X className="h-3.5 w-3.5" />
                  Clear sort
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
                Filter
                {activeLabelFilters.size > 0 && (
                  <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded bg-primary text-[10px] font-semibold text-white">
                    {activeLabelFilters.size}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-2">
              <div className="mb-2 flex items-center justify-between px-2 pt-1">
                <span className="text-xs font-semibold text-high-emphasis">Labels</span>
                {activeLabelFilters.size > 0 && (
                  <button
                    type="button"
                    className="text-xs text-medium-emphasis hover:text-high-emphasis"
                    onClick={() => setActiveLabelFilters(new Set())}
                  >
                    Clear all
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
                onAddCard={addCard}
                onEditCard={handleEditCard}
                onDeleteCard={deleteCard}
                onRenameColumn={renameColumn}
                onDeleteColumn={deleteColumn}
              />
            ))}
          </SortableContext>

          {isAddingColumn ? (
            <div className="w-72 shrink-0">
              <div className="rounded border bg-muted/40 p-2">
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
                  className="mb-2 h-9 text-sm"
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
                Add another list
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
