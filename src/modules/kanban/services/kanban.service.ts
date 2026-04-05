import { graphqlClient } from '@/lib/graphql-client';
import { GET_KANBANS_QUERY, GET_KANBAN_LISTS_QUERY } from '../graphql/queries';
import {
  INSERT_KANBAN_MUTATION,
  UPDATE_KANBAN_MUTATION,
  DELETE_KANBAN_MUTATION,
  UPDATE_KANBAN_LIST_MUTATION,
  DELETE_KANBAN_LIST_MUTATION,
  INSERT_KANBAN_LIST_MUTATION,
} from '../graphql/mutations';
import type {
  GetKanbansResponse,
  GetKanbanListsResponse,
  KanbanQueryParams,
} from '../types/kanban.types';

export interface InsertKanbanInput {
  title: string;
  description?: string;
  labels?: string[];
  dueDate?: string | null;
  list: string;
}

export interface InsertKanbanResponse {
  insertKanban: {
    acknowledged: boolean;
    totalImpactedData: number;
    itemId: string;
  };
}

export const insertKanban = async (input: InsertKanbanInput): Promise<InsertKanbanResponse> => {
  const response = await graphqlClient.mutate<InsertKanbanResponse>({
    query: INSERT_KANBAN_MUTATION,
    variables: { input },
  });

  const data = (response as any)?.data ?? response;

  if (!data?.insertKanban) {
    throw new Error('Failed to insert kanban card');
  }

  return data as InsertKanbanResponse;
};

export interface UpdateKanbanInput {
  title?: string;
  description?: string;
  labels?: string[];
  dueDate?: string | null;
  list?: string;
}

export interface UpdateKanbanResponse {
  updateKanban: {
    acknowledged: boolean;
    totalImpactedData: number;
    itemId: string;
  };
}

export const updateKanban = async (
  itemId: string,
  input: UpdateKanbanInput
): Promise<UpdateKanbanResponse> => {
  const response = await graphqlClient.mutate<UpdateKanbanResponse>({
    query: UPDATE_KANBAN_MUTATION,
    variables: {
      filter: JSON.stringify({ _id: itemId }),
      input,
    },
  });

  const data = (response as any)?.data ?? response;

  if (!data?.updateKanban) {
    throw new Error('Failed to update kanban card');
  }

  return data as UpdateKanbanResponse;
};

export interface DeleteKanbanResponse {
  deleteKanban: {
    acknowledged: boolean;
    totalImpactedData: number;
    itemId: string;
  };
}

export const deleteKanban = async (itemId: string): Promise<DeleteKanbanResponse> => {
  const response = await graphqlClient.mutate<DeleteKanbanResponse>({
    query: DELETE_KANBAN_MUTATION,
    variables: { filter: JSON.stringify({ _id: itemId }) },
  });

  const data = (response as any)?.data ?? response;

  if (!data?.deleteKanban) {
    throw new Error('Failed to delete kanban card');
  }

  return data as DeleteKanbanResponse;
};

export interface UpdateKanbanListResponse {
  updateKanbanList: {
    acknowledged: boolean;
    totalImpactedData: number;
    itemId: string;
  };
}

export const updateKanbanList = async (
  columnId: string,
  title: string
): Promise<UpdateKanbanListResponse> => {
  const response = await graphqlClient.mutate<UpdateKanbanListResponse>({
    query: UPDATE_KANBAN_LIST_MUTATION,
    variables: {
      filter: JSON.stringify({ _id: columnId }),
      input: { title },
    },
  });

  const data = (response as any)?.data ?? response;

  if (!data?.updateKanbanList) {
    throw new Error('Failed to update kanban list');
  }

  return data as UpdateKanbanListResponse;
};

export interface DeleteKanbanListResponse {
  deleteKanbanList: {
    acknowledged: boolean;
    totalImpactedData: number;
    itemId: string;
  };
}

export const deleteKanbanList = async (columnId: string): Promise<DeleteKanbanListResponse> => {
  const response = await graphqlClient.mutate<DeleteKanbanListResponse>({
    query: DELETE_KANBAN_LIST_MUTATION,
    variables: { filter: JSON.stringify({ _id: columnId }) },
  });

  const data = (response as any)?.data ?? response;

  if (!data?.deleteKanbanList) {
    throw new Error('Failed to delete kanban list');
  }

  return data as DeleteKanbanListResponse;
};

export interface InsertKanbanListInput {
  title: string;
}

export interface InsertKanbanListResponse {
  insertKanbanList: {
    acknowledged: boolean;
    totalImpactedData: number;
    itemId: string;
  };
}

export const insertKanbanList = async (
  input: InsertKanbanListInput
): Promise<InsertKanbanListResponse> => {
  const response = await graphqlClient.mutate<InsertKanbanListResponse>({
    query: INSERT_KANBAN_LIST_MUTATION,
    variables: { input },
  });

  const data = (response as any)?.data ?? response;

  if (!data?.insertKanbanList) {
    throw new Error('Failed to insert kanban list');
  }

  return data as InsertKanbanListResponse;
};

export const getKanbanLists = async (params: KanbanQueryParams): Promise<GetKanbanListsResponse> => {
  const { pageNo, pageSize, filter = {}, sort = {} } = params;

  const input: Record<string, unknown> = { pageNo, pageSize };

  if (filter && Object.keys(filter).length > 0) {
    input.filter = JSON.stringify(filter);
  }

  if (sort && Object.keys(sort).length > 0) {
    input.sort = JSON.stringify(sort);
  }

  try {
    const response = await graphqlClient.query({
      query: GET_KANBAN_LISTS_QUERY,
      variables: { input },
    });

    const responseData = (response as any)?.data || (response as any);

    if (responseData && typeof responseData === 'object' && 'getKanbanLists' in responseData) {
      return responseData as GetKanbanListsResponse;
    }

    return {
      getKanbanLists: {
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        items: [],
      },
    };
  } catch (error) {
    console.error('Error fetching kanban lists:', error);
    return {
      getKanbanLists: {
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        items: [],
      },
    };
  }
};

export const getKanbans = async (params: KanbanQueryParams): Promise<GetKanbansResponse> => {
  const { pageNo, pageSize, filter = {}, sort = {} } = params;

  const input: Record<string, unknown> = { pageNo, pageSize };

  if (filter && Object.keys(filter).length > 0) {
    input.filter = JSON.stringify(filter);
  }

  if (sort && Object.keys(sort).length > 0) {
    input.sort = JSON.stringify(sort);
  }

  try {
    const response = await graphqlClient.query({
      query: GET_KANBANS_QUERY,
      variables: { input },
    });

    const responseData = (response as any)?.data || (response as any);

    if (responseData && typeof responseData === 'object' && 'getKanbans' in responseData) {
      return responseData as GetKanbansResponse;
    }

    return {
      getKanbans: {
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        items: [],
      },
    };
  } catch (error) {
    console.error('Error fetching kanbans:', error);
    return {
      getKanbans: {
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        items: [],
      },
    };
  }
};
