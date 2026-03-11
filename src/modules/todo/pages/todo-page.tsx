import type { KeyboardEventHandler } from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui-kit/input';
import { Button } from '@/components/ui-kit/button';
import { Checkbox } from '@/components/ui-kit/checkbox';

type TodoItem = {
  id: string;
  title: string;
  completed: boolean;
};

export const TodoPage = () => {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: trimmed, completed: false },
    ]);
    setValue('');
  };

  const handleToggle = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Add a new task"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button type="button" onClick={handleAdd} className="sm:w-auto w-full">
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-medium-emphasis">No tasks yet. Add your first todo.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
            >
              <button
                type="button"
                onClick={() => handleToggle(item.id)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => handleToggle(item.id)}
                />
                <span
                  className={`text-sm ${
                    item.completed ? 'line-through text-medium-emphasis' : 'text-high-emphasis'
                  }`}
                >
                  {item.title}
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(item.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

