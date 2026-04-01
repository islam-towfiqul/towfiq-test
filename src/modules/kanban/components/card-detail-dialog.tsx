import { useState } from 'react';
import { Calendar, Tag, Trash2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui-kit/dialog';
import { Input } from '@/components/ui-kit/input';
import { Textarea } from '@/components/ui-kit/textarea';
import { Button } from '@/components/ui-kit/button';
import { Badge } from '@/components/ui-kit/badge';
import type { KanbanCard, KanbanLabel } from '../types/kanban.types';
import { LABEL_COLORS } from '../types/kanban.types';

interface CardDetailDialogProps {
  card: KanbanCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (cardId: string, updates: Partial<KanbanCard>) => void;
  onDelete: (cardId: string) => void;
  onAddLabel: (cardId: string, label: KanbanLabel) => void;
  onRemoveLabel: (cardId: string, labelId: string) => void;
}

export function CardDetailDialog({
  card,
  open,
  onOpenChange,
  onSave,
  onDelete,
  onAddLabel,
  onRemoveLabel,
}: CardDetailDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(LABEL_COLORS[0].value);

  const resetForm = () => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description);
      setDueDate(card.dueDate ?? '');
    }
    setShowLabelPicker(false);
    setNewLabelName('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && card) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    if (!card) return;
    onSave(card.id, {
      title: title.trim() || card.title,
      description,
      dueDate: dueDate || null,
    });
    onOpenChange(false);
  };

  const handleAddLabel = () => {
    if (!card || !newLabelName.trim()) return;
    onAddLabel(card.id, {
      id: `label-${crypto.randomUUID()}`,
      name: newLabelName.trim(),
      color: selectedColor,
    });
    setNewLabelName('');
    setShowLabelPicker(false);
  };

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">Edit card</DialogTitle>
          <DialogDescription className="sr-only">
            Edit card details including title, description, labels, and due date
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-medium-emphasis">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card title"
              className="h-10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-medium-emphasis">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a more detailed description..."
              rows={4}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-medium text-medium-emphasis">
                <Tag className="h-3.5 w-3.5" />
                Labels
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowLabelPicker(!showLabelPicker)}
              >
                {showLabelPicker ? 'Cancel' : '+ Add'}
              </Button>
            </div>

            {card.labels.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {card.labels.map((label) => (
                  <Badge
                    key={label.id}
                    className={`${label.color} cursor-default border-none text-white`}
                  >
                    {label.name}
                    <button
                      type="button"
                      className="ml-1 hover:opacity-70"
                      onClick={() => onRemoveLabel(card.id, label.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {showLabelPicker && (
              <div className="rounded-md border p-3 space-y-2">
                <Input
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Label name"
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLabel();
                    }
                  }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {LABEL_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`h-7 w-7 rounded-md ${c.value} transition-transform ${
                        selectedColor === c.value
                          ? 'scale-110 ring-2 ring-ring ring-offset-2'
                          : 'hover:scale-105'
                      }`}
                      title={c.name}
                      onClick={() => setSelectedColor(c.value)}
                    />
                  ))}
                </div>
                <Button size="sm" className="h-7 text-xs" onClick={handleAddLabel}>
                  Add label
                </Button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-medium-emphasis">
              <Calendar className="h-3.5 w-3.5" />
              Due date
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={() => {
              onDelete(card.id);
              onOpenChange(false);
            }}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete card
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
