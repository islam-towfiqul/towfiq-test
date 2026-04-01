import { KanbanBoard } from '../components/kanban-board';

export const KanbanPage = () => {
  return (
    <div className="flex h-[calc(100vh-8rem)] w-full flex-col">
      <div className="mb-4 flex items-center justify-between">
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
