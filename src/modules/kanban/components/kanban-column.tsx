import { useState, useMemo, memo, type KeyboardEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
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
import { ConfirmationModal } from '@/components/core/confirmation-modal/confirmation-modal';
import { KanbanCard } from './kanban-card';
import { useKanbanStore } from '../hooks/use-kanban-store';
import type { KanbanMemberOption } from '../hooks/use-kanban-member-options';
import type { KanbanCard as KanbanCardType, KanbanColumn as KanbanColumnType } from '../types/kanban.types';

const COLUMN_ACCENT_COLORS = [
  { dot: '#6366f1', badge: 'bg-indigo-100 text-indigo-700' },
  { dot: '#f59e0b', badge: 'bg-amber-100 text-amber-700' },
  { dot: '#10b981', badge: 'bg-emerald-100 text-emerald-700' },
  { dot: '#ef4444', badge: 'bg-red-100 text-red-700' },
  { dot: '#8b5cf6', badge: 'bg-violet-100 text-violet-700' },
  { dot: '#3b82f6', badge: 'bg-blue-100 text-blue-700' },
  { dot: '#ec4899', badge: 'bg-pink-100 text-pink-700' },
  { dot: '#14b8a6', badge: 'bg-teal-100 text-teal-700' },
];

interface KanbanColumnProps {
  column: KanbanColumnType;
  colorIndex: number;
  members: KanbanMemberOption[];
  onAddCard: (columnId: string, title: string) => void;
  onEditCard: (card: KanbanCardType) => void;
  onDeleteCard: (cardId: string) => void;
  onAssigneeChange: (
    cardId: string,
    assigneeId: string | null,
    assigneeName: string | null
  ) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

export const KanbanColumn = memo(function KanbanColumn({
  column,
  colorIndex,
  members,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onAssigneeChange,
  onRenameColumn,
  onDeleteColumn,
}: KanbanColumnProps) {
  const { t } = useTranslation();
  const accent = COLUMN_ACCENT_COLORS[colorIndex % COLUMN_ACCENT_COLORS.length];
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(column.title);
  const [showDeleteColumnConfirm, setShowDeleteColumnConfirm] = useState(false);

  const assigneeFilterIds = useKanbanStore((state) => state.assigneeFilterIds);

  const cards = useKanbanStore(
    useShallow((state) =>
      column.cardIds.map((id) => state.cards[id]).filter(Boolean) as KanbanCardType[]
    )
  );

  const visibleCards = useMemo(() => {
    if (assigneeFilterIds.length === 0) return cards;
    const selectedNames = new Set(
      members
        .filter((m) => assigneeFilterIds.includes(m.id))
        .map((m) => m.name.trim())
        .filter(Boolean)
    );

    return cards.filter((c) => {
      // Prefer id match when we have it.
      if (c.assigneeId && assigneeFilterIds.includes(c.assigneeId)) return true;

      // Some APIs persist only a name (no id). Fall back to name matching.
      const n = c.assigneeName?.trim();
      if (!n) return false;
      return selectedNames.has(n);
    });
  }, [cards, assigneeFilterIds, members]);

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
    <div className="flex max-h-full w-72 shrink-0 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between rounded-t px-1 py-1">
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
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: accent.dot }}
            />
            <h3 className="text-sm font-semibold text-high-emphasis">
              {column.title}
            </h3>
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${accent.badge}`}>
              {visibleCards.length}
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
              {t('RENAME')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setShowDeleteColumnConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              {t('DELETE')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-0 flex-1 flex-col rounded border bg-muted/40 p-2 transition-colors ${
          isOver ? 'border-primary/40 bg-primary/5' : 'border-transparent'
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          <SortableContext
            items={visibleCards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {visibleCards.map((card) => (
              <KanbanCard
                key={card.id}
                card={card}
                members={members}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
                onAssigneeChange={onAssigneeChange}
              />
            ))}
          </SortableContext>

          {visibleCards.length === 0 && !isAdding && (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <div
                onClick={() => setIsAdding(true)}
                className="cursor-pointer flex h-10 w-10 items-center justify-center rounded border-2 border-dashed border-border text-medium-emphasis"
              >
                <Plus className="h-4 w-4" />
              </div>
              <p className="text-xs text-medium-emphasis">{t('NO_CARDS_YET')}</p>
              {/* <p className="text-[11px] text-low-emphasis">{t('CLICK_BELOW_TO_ADD_ONE')}</p> */}
            </div>
          )}
        </div>

        {isAdding ? (
          <div className="mt-2 shrink-0 space-y-2">
            <Input
              placeholder={t('TITLE')}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleAddKeyDown}
              autoFocus
              className="h-9 text-sm"
            />
            <div className="flex gap-1">
              <Button size="sm" onClick={handleAddCard}>
                {t('ADD')}
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
            className="mt-2 w-full shrink-0 justify-start rounded px-3 py-2 text-primary hover:opacity-90"
            style={{ backgroundColor: 'hsl(var(--primary-50))' }}
            onClick={() => setIsAdding(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t('ADD_A_CARD')}
          </Button>
        )}
      </div>

      <ConfirmationModal
        open={showDeleteColumnConfirm}
        onOpenChange={setShowDeleteColumnConfirm}
        title={t('DELETE_CARD')}
        description={t('DELETE_LIST_CONFIRM', { title: column.title })}
        onConfirm={() => onDeleteColumn(column.id)}
        confirmText={t('DELETE')}
        cancelText={t('CANCEL')}
      />
    </div>
  );
});
