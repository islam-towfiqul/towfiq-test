import { useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownUp, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui-kit/button';
import { Badge } from '@/components/ui-kit/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui-kit/popover';
import { Checkbox } from '@/components/ui-kit/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui-kit/dropdown-menu';
import { KanbanSearchInput } from './kanban-search-input';
import { useKanbanStore } from '../hooks/use-kanban-store';
import type { KanbanSortOrder } from '../types/kanban.types';

export type SortOrder = KanbanSortOrder;

export const KanbanToolbar = memo(function KanbanToolbar() {
  const allLabels = useKanbanStore((state) => state.allLabels);
  const labelFilterNames = useKanbanStore((state) => state.labelFilterNames);
  const setLabelFilterNames = useKanbanStore((state) => state.setLabelFilterNames);
  const sortOrder = useKanbanStore((state) => state.sortOrder);
  const setSortOrder = useKanbanStore((state) => state.setSortOrder);

  const { t } = useTranslation();

  const handleSortChange = useCallback(
    (order: KanbanSortOrder) => {
      setSortOrder(order);
    },
    [setSortOrder]
  );

  const toggleLabelFilter = useCallback(
    (labelName: string) => {
      const prev = useKanbanStore.getState().labelFilterNames;
      const next = new Set(prev);
      if (next.has(labelName)) next.delete(labelName);
      else next.add(labelName);
      setLabelFilterNames(Array.from(next));
    },
    [setLabelFilterNames]
  );

  const clearLabelFilters = useCallback(() => {
    setLabelFilterNames([]);
  }, [setLabelFilterNames]);

  return (
    <div className="mb-3 flex shrink-0 items-center gap-2">
      <KanbanSearchInput />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={sortOrder !== 'none' ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5"
          >
            <ArrowDownUp className="h-3.5 w-3.5" />
            {sortOrder === 'asc'
              ? t('DUE_DATE_EARLIEST_FIRST')
              : sortOrder === 'desc'
                ? t('DUE_DATE_LATEST_FIRST')
                : t('SORT')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem onClick={() => handleSortChange('asc')}>
            {t('DUE_DATE_EARLIEST_FIRST')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSortChange('desc')}>
            {t('DUE_DATE_LATEST_FIRST')}
          </DropdownMenuItem>
          {sortOrder !== 'none' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleSortChange('none')}>
                <X className="h-3.5 w-3.5" />
                {t('CLEAR_SORT')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {allLabels.length > 0 && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                {t('FILTER')}
                {labelFilterNames.length > 0 && (
                  <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded bg-primary text-[10px] font-semibold text-white">
                    {labelFilterNames.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-2">
              <div className="mb-2 flex items-center justify-between px-2 pt-1">
                <span className="text-xs font-semibold text-high-emphasis">{t('LABELS')}</span>
                {labelFilterNames.length > 0 && (
                  <button
                    type="button"
                    className="text-xs text-medium-emphasis hover:text-high-emphasis"
                    onClick={clearLabelFilters}
                  >
                    {t('CLEAR_ALL')}
                  </button>
                )}
              </div>
              <div className="flex flex-col">
                {allLabels.map((label) => {
                  const isActive = labelFilterNames.includes(label.name);
                  return (
                    <button
                      key={label.name}
                      type="button"
                      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent"
                      onClick={() => toggleLabelFilter(label.name)}
                    >
                      <Checkbox checked={isActive} />
                      <span
                        className="h-4 w-4 shrink-0 rounded"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="truncate text-sm">{label.name}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {labelFilterNames.length > 0 && (
            <div className="flex items-center gap-1.5">
              {allLabels
                .filter((l) => labelFilterNames.includes(l.name))
                .map((label) => (
                  <Badge
                    key={label.name}
                    className="cursor-pointer select-none border-none text-white"
                    style={{ backgroundColor: label.color }}
                    onClick={() => toggleLabelFilter(label.name)}
                  >
                    {label.name}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
});
