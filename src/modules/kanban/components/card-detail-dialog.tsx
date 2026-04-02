import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Tag, Trash2, X } from 'lucide-react';
import { ConfirmationModal } from '@/components/core/confirmation-modal/confirmation-modal';
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
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (card && open) {
      setTitle(card.title);
      setDescription(card.description);
      setDueDate(card.dueDate ?? '');
      setShowLabelPicker(false);
      setNewLabelName('');
    }
  }, [card, open]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">{t('EDIT_CARD')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('EDIT_CARD_DESCRIPTION')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-medium-emphasis">
              {t('TITLE')}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('CARD_TITLE')}
              className="h-10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-medium-emphasis">
              {t('DESCRIPTION')}
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('ADD_DETAILED_DESCRIPTION')}
              rows={4}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-medium text-medium-emphasis">
                <Tag className="h-3.5 w-3.5" />
                {t('LABELS')}
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowLabelPicker(!showLabelPicker)}
              >
                {showLabelPicker ? t('CANCEL') : `+ ${t('ADD')}`}
              </Button>
            </div>

            {card.labels.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {card.labels.map((label) => (
                  <Badge
                    key={label.id}
                    className="cursor-default border-none text-white"
                    style={{ backgroundColor: label.color }}
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
                  placeholder={t('LABEL_NAME')}
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
                      className={`h-7 w-7 rounded-md transition-transform ${
                        selectedColor === c.value
                          ? 'scale-110 ring-2 ring-ring ring-offset-2'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                      onClick={() => setSelectedColor(c.value)}
                    />
                  ))}
                </div>
                <Button size="sm" className="h-7 text-xs" onClick={handleAddLabel}>
                  {t('ADD_LABEL')}
                </Button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-medium-emphasis">
                <Calendar className="h-3.5 w-3.5" />
              {t('DUE_DATE')}
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
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            {t('DELETE_CARD')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {t('CANCEL')}
            </Button>
            <Button size="sm" onClick={handleSave}>
              {t('SAVE')}
            </Button>
          </div>
        </div>
      </DialogContent>

      <ConfirmationModal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('DELETE_CARD')}
        description={t('DELETE_CARD_CONFIRM', { title: card.title })}
        onConfirm={() => {
          onDelete(card.id);
          onOpenChange(false);
        }}
        confirmText={t('DELETE')}
        cancelText={t('CANCEL')}
      />
    </Dialog>
  );
}
