import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui-kit/card';
import { ConfirmationModal } from '@/components/core/confirmation-modal/confirmation-modal';
import type { KanbanCard as KanbanCardType } from '../types/kanban.types';

interface KanbanCardProps {
  card: KanbanCardType;
  onEdit: (card: KanbanCardType) => void;
  onDelete: (cardId: string) => void;
}

export function KanbanCard({ card, onEdit, onDelete }: KanbanCardProps) {
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

        {card.dueDate && (
          <div
            className={`mt-2 flex items-center gap-1 text-xs ${
              isOverdue ? 'text-red-500' : 'text-medium-emphasis'
            }`}
          >
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(card.dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        )}

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
        title="Delete card"
        description={`Are you sure you want to delete "${card.title}"? This action cannot be undone.`}
        onConfirm={() => onDelete(card.id)}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
