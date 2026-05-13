import { useTranslation } from 'react-i18next';
import { KanbanBoard } from '../components/kanban-board';
import { KanbanWorkspacePicker } from '../components/kanban-workspace-picker';
import { useKanbanWorkspaceStore } from '../hooks/use-kanban-workspace-store';

export const KanbanPage = () => {
  const { t } = useTranslation();
  const activeBoardId = useKanbanWorkspaceStore((s) => s.activeBoardId);

  return (
    <div
      className="flex w-full min-w-0 flex-col overflow-hidden"
      style={{ height: 'calc(100dvh - 8.5rem)' }}
    >
      <div className="mb-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold leading-tight text-high-emphasis">
          {t('KANBAN_BOARD')}
        </h1>
        <div className="sm:pl-4">
          <KanbanWorkspacePicker />
        </div>
      </div>

      {activeBoardId ? (
        <KanbanBoard />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <p className="text-sm text-medium-emphasis">
            {t('SELECT_OR_CREATE_BOARD_HINT', {
              defaultValue: 'Select a board above, or ask an administrator to create one.',
            })}
          </p>
        </div>
      )}
    </div>
  );
};
