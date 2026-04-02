import { KanbanBoard } from '../components/kanban-board';

export const KanbanPage = () => {
  return (
    <div className="flex min-w-0 w-full flex-col overflow-hidden" style={{ height: 'calc(100dvh - 8.5rem)' }}>
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-high-emphasis">Kanban Board</h1>
          <p className="text-sm text-medium-emphasis">
            Organize your work with drag and drop
          </p>
        </div>
      </div>
      <KanbanBoard />
    </div>
  );
};
