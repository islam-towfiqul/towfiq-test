import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { ProtectedFragment } from '@/state/store/auth/protected-fragment';
import { Button } from '@/components/ui-kit/button';
import { Input } from '@/components/ui-kit/input';
import { Textarea } from '@/components/ui-kit/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui-kit/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui-kit/select';
import { useGetKanbanBoards, useInsertKanbanBoard } from '../hooks/use-kanban';
import { useKanbanWorkspaceStore } from '../hooks/use-kanban-workspace-store';

export function KanbanWorkspacePicker() {
  const { t } = useTranslation();
  const activeBoardId = useKanbanWorkspaceStore((s) => s.activeBoardId);
  const setActiveBoardId = useKanbanWorkspaceStore((s) => s.setActiveBoardId);

  const { data: boardsData, isLoading } = useGetKanbanBoards({
    pageNo: 1,
    pageSize: 100,
  });

  const boards = useMemo(
    () => boardsData?.getKanbanBoards?.items ?? [],
    [boardsData]
  );

  const { mutate: insertBoard, isPending: isCreating } = useInsertKanbanBoard();

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    if (boards.length === 0) {
      setActiveBoardId(null);
      return;
    }
    if (activeBoardId && boards.some((b) => b.ItemId === activeBoardId)) return;
    setActiveBoardId(boards[0].ItemId);
  }, [boards, activeBoardId, setActiveBoardId]);

  const handleCreate = useCallback(() => {
    const name = newTitle.trim();
    if (!name) return;
    insertBoard(
      {
        name,
        description: newDescription.trim(),
        items: [],
      },
      {
        onSuccess: ({ insertKanbanBoard: result }) => {
          setNewTitle('');
          setNewDescription('');
          setCreateOpen(false);
          setActiveBoardId(result.itemId);
        },
      }
    );
  }, [insertBoard, newTitle, newDescription, setActiveBoardId]);

  return (
    <>
      <div className="flex mt-2 mr-2 flex-wrap items-center justify-start gap-2 sm:flex-nowrap sm:justify-end">
        {/* <LayoutGrid className="h-4 w-4 shrink-0 text-medium-emphasis" aria-hidden /> */}
        <Select
          value={activeBoardId ?? ''}
          onValueChange={(v) => setActiveBoardId(v || null)}
          disabled={isLoading || boards.length === 0}
        >
          <SelectTrigger className="h-9 w-[min(100%,260px)] sm:w-[260px]">
            <SelectValue
              placeholder={
                boards.length === 0
                  ? t('NO_BOARDS_YET', { defaultValue: 'No boards yet' })
                  : t('SELECT_BOARD', { defaultValue: 'Select board' })
              }
            />
          </SelectTrigger>
          <SelectContent>
            {boards.map((b) => (
              <SelectItem key={b.ItemId} value={b.ItemId}>
                {b.name?.trim() || b.title || b.ItemId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ProtectedFragment roles={['admin']}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1 px-3"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t('NEW_BOARD', { defaultValue: 'New board' })}
          </Button>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('CREATE_BOARD', { defaultValue: 'Create board' })}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t('BOARD_NAME', { defaultValue: 'Board name' })}
                  className="h-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) {
                      e.preventDefault();
                      handleCreate();
                    }
                  }}
                />
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={t('DESCRIPTION', { defaultValue: 'Description' })}
                  rows={3}
                  className="min-h-[80px] resize-y"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  {t('CANCEL')}
                </Button>
                <Button type="button" onClick={handleCreate} disabled={isCreating || !newTitle.trim()}>
                  {isCreating ? t('ADDING') : t('ADD')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </ProtectedFragment>
      </div>
    </>
  );
}
