import { useState, type KeyboardEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui-kit/button';
import { Input } from '@/components/ui-kit/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui-kit/dropdown-menu';
import { KanbanCard } from './kanban-card';
import type {
  KanbanCard as KanbanCardType,
  KanbanColumn as KanbanColumnType,
} from '../types/kanban.types';

interface KanbanColumnProps {
  column: KanbanColumnType;
  cards: KanbanCardType[];
  onAddCard: (columnId: string, title: string) => void;
  onEditCard: (card: KanbanCardType) => void;
  onDeleteCard: (cardId: string) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

export function KanbanColumn({
  column,
  cards,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onRenameColumn,
  onDeleteColumn,
}: KanbanColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(column.title);

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: 'column', column },
  });

  const handleAddCard = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    onAddCard(column.id, trimmed);
    setNewTitle('');
    setIsAdding(false);
  };

  const handleAddKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCard();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTitle('');
    }
  };

  const handleRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== column.title) {
      onRenameColumn(column.id, trimmed);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRename();
    } else if (e.key === 'Escape') {
      setRenameValue(column.title);
      setIsRenaming(false);
    }
  };

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        {isRenaming ? (
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleRenameKeyDown}
            autoFocus
            className="h-8 text-sm font-semibold"
          />
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-high-emphasis">
              {column.title}
            </h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-medium-emphasis">
              {cards.length}
            </span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setRenameValue(column.title);
                setIsRenaming(true);
              }}
            >
              <Pencil className="h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDeleteColumn(column.id)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col rounded-lg border bg-muted/40 p-2 transition-colors ${
          isOver ? 'border-primary/40 bg-primary/5' : 'border-transparent'
        }`}
      >
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          <SortableContext
            items={cards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {cards.map((card) => (
              <KanbanCard
                key={card.id}
                card={card}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
              />
            ))}
          </SortableContext>

          {cards.length === 0 && !isAdding && (
            <p className="py-8 text-center text-xs text-medium-emphasis">
              No cards yet
            </p>
          )}
        </div>

        {isAdding ? (
          <div className="mt-2 space-y-2">
            <Input
              placeholder="Enter a title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleAddKeyDown}
              autoFocus
              className="h-9 text-sm"
            />
            <div className="flex gap-1">
              <Button size="sm" onClick={handleAddCard}>
                Add card
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewTitle('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-medium-emphasis"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add a card
          </Button>
        )}
      </div>
    </div>
  );
}
