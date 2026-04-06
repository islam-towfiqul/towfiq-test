import { useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/modules/email/hooks/use-debounce';
import { useKanbanStore } from '../hooks/use-kanban-store';

interface KanbanSearchInputProps {
  debounceMs?: number;
}

export const KanbanSearchInput = memo(function KanbanSearchInput({
  debounceMs = 400,
}: KanbanSearchInputProps) {
  const { t } = useTranslation();
  const setSearchQuery = useKanbanStore((state) => state.setSearchQuery);
  const [value, setValue] = useState('');
  const debouncedValue = useDebounce(value.trim(), debounceMs);

  useEffect(() => {
    setSearchQuery(debouncedValue);
  }, [debouncedValue, setSearchQuery]);

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-medium-emphasis" />
      <input
        type="text"
        placeholder={t('SEARCH_CARDS')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 w-56 rounded-md border border-input bg-background pl-8 pr-8 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
      />
      {value && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-medium-emphasis hover:text-high-emphasis"
          onClick={() => setValue('')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
});
