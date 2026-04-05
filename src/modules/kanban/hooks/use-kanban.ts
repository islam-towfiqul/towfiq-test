import { useGlobalQuery, useGlobalMutation } from '@/state/query-client/hooks';
import { useQueryClient } from '@tanstack/react-query';
import type { GetKanbansResponse, GetKanbanListsResponse, KanbanQueryParams } from '../types/kanban.types';
import {
  getKanbans,
  getKanbanLists,
  insertKanban,
  updateKanban,
  deleteKanban,
  updateKanbanList,
  deleteKanbanList,
  insertKanbanList,
  type InsertKanbanInput,
  type UpdateKanbanInput,
  type InsertKanbanListInput,
} from '../services/kanban.service';

export const useGetKanbanLists = (params: KanbanQueryParams) => {
  return useGlobalQuery<GetKanbanListsResponse>({
    queryKey: ['kanban-lists', params],
    queryFn: () => getKanbanLists(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useGetKanbans = (params: KanbanQueryParams) => {
  return useGlobalQuery<GetKanbansResponse>({
    queryKey: ['kanbans', params],
    queryFn: () => getKanbans(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useInsertKanban = () => {
  return useGlobalMutation({
    mutationFn: (input: InsertKanbanInput) => insertKanban(input),
    onError: (error) => {
      throw error;
    },
  });
};

export const useUpdateKanban = () => {
  return useGlobalMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: UpdateKanbanInput }) =>
      updateKanban(itemId, input),
    onError: (error) => {
      throw error;
    },
  });
};

export const useDeleteKanban = () => {
  return useGlobalMutation({
    mutationFn: (itemId: string) => deleteKanban(itemId),
    onError: (error) => {
      throw error;
    },
  });
};

export const useUpdateKanbanList = () => {
  return useGlobalMutation({
    mutationFn: ({ columnId, title }: { columnId: string; title: string }) =>
      updateKanbanList(columnId, title),
    onError: (error) => {
      throw error;
    },
  });
};

export const useDeleteKanbanList = () => {
  return useGlobalMutation({
    mutationFn: (columnId: string) => deleteKanbanList(columnId),
    onError: (error) => {
      throw error;
    },
  });
};

export const useInsertKanbanList = () => {
  const queryClient = useQueryClient();

  return useGlobalMutation({
    mutationFn: (input: InsertKanbanListInput) => insertKanbanList(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'kanban-lists',
      });
    },
    onError: (error) => {
      throw error;
    },
  });
};
