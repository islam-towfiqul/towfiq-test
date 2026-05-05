import { useMemo, useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, ChevronDown, Pencil, Trash2, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui-kit/avatar';
import { Button } from '@/components/ui-kit/button';
import { Card } from '@/components/ui-kit/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui-kit/dropdown-menu';
import { ConfirmationModal } from '@/components/core/confirmation-modal/confirmation-modal';
import type { KanbanMemberOption } from '../hooks/use-kanban-member-options';
import type { KanbanCard as KanbanCardType } from '../types/kanban.types';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface KanbanCardProps {
  card: KanbanCardType;
  members: KanbanMemberOption[];
  onEdit: (card: KanbanCardType) => void;
  onDelete: (cardId: string) => void;
  onAssigneeChange: (
    cardId: string,
    assigneeId: string | null,
    assigneeName: string | null
  ) => void;
}

export const KanbanCard = memo(function KanbanCard({
  card,
  members,
  onEdit,
  onDelete,
  onAssigneeChange,
}: KanbanCardProps) {
  const { t, i18n } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isOverdue =
    card.dueDate && new Date(card.dueDate) < new Date() ? true : false;

  const assigneeOptions = useMemo(() => {
    const byId = new Map(members.map((m) => [m.id, m]));
    if (card.assigneeId && card.assigneeName && !byId.has(card.assigneeId)) {
      return [
        { id: card.assigneeId, name: card.assigneeName, imageUrl: undefined },
        ...members,
      ];
    }
    return members;
  }, [members, card.assigneeId, card.assigneeName]);

  const currentAssignee = useMemo(() => {
    // Backend may persist only the assignee name (no id). Show name-only assignees too.
    if (!card.assigneeId && !card.assigneeName) return null;

    if (card.assigneeId) {
      return (
        assigneeOptions.find((m) => m.id === card.assigneeId) ?? {
          id: card.assigneeId,
          name: card.assigneeName ?? card.assigneeId,
          imageUrl: undefined,
        }
      );
    }

    return {
      id: `name:${card.assigneeName}`,
      name: card.assigneeName ?? '',
      imageUrl: undefined,
    };
  }, [assigneeOptions, card.assigneeId, card.assigneeName]);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className="group relative cursor-grab rounded bg-card p-3 hover:shadow-md active:cursor-grabbing"
        onClick={() => onEdit(card)}
      >
        {card.labels.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1 pr-12">
            {card.labels.map((label) => (
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

        <p className="text-sm font-medium text-high-emphasis">{card.title}</p>

        {card.description && (
          <p className="mt-1 line-clamp-2 text-xs text-medium-emphasis">
            {card.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {card.dueDate && (
            <div
              className={`flex min-w-0 flex-1 items-center gap-1 text-xs ${
                isOverdue ? 'text-red-500' : 'text-medium-emphasis'
              }`}
            >
              <Calendar className="h-3 w-3 shrink-0" />
              <span>
                {new Date(card.dueDate).toLocaleDateString(i18n.language, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          <div
            className="ml-auto shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-1.5 font-normal"
                  aria-label={t('ASSIGNEE')}
                >
                  {currentAssignee ? (
                    <>
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={currentAssignee.imageUrl} alt="" />
                        <AvatarFallback className="text-[9px]">
                          {initialsFromName(currentAssignee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="max-w-[7rem] truncate text-xs">
                        {currentAssignee.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <UserRound className="h-3.5 w-3.5 text-medium-emphasis" />
                      <span className="text-xs text-medium-emphasis">
                        {t('ASSIGNEE')}
                      </span>
                    </>
                  )}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" onCloseAutoFocus={(e) => e.preventDefault()}>
                {assigneeOptions.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-medium-emphasis">
                    {t('NO_MEMBERS_FOUND')}
                  </div>
                ) : (
                  assigneeOptions.map((m) => (
                    <DropdownMenuItem
                      key={m.id}
                      className="gap-2"
                      onClick={() => onAssigneeChange(card.id, m.id, m.name)}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={m.imageUrl} alt="" />
                        <AvatarFallback className="text-[10px]">
                          {initialsFromName(m.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{m.name}</span>
                    </DropdownMenuItem>
                  ))
                )}
                {currentAssignee && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-medium-emphasis"
                      onClick={() => onAssigneeChange(card.id, null, null)}
                    >
                      {t('REMOVE')} {t('ASSIGNEE')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            className="rounded p-1 hover:bg-accent"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(card);
            }}
          >
            <Pencil className="h-3.5 w-3.5 text-medium-emphasis" />
          </button>
          <button
            type="button"
            className="rounded p-1 hover:bg-red-100"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </button>
        </div>
      </Card>

      <ConfirmationModal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('DELETE_CARD')}
        description={t('DELETE_CARD_CONFIRM', { title: card.title })}
        onConfirm={() => onDelete(card.id)}
        confirmText={t('DELETE')}
        cancelText={t('CANCEL')}
      />
    </div>
  );
});
