import { useMemo } from 'react';
import { useGetUsers } from '@/modules/task-manager/hooks/use-task-manager';

export interface KanbanMemberOption {
  id: string;
  name: string;
  imageUrl?: string;
}

export function useKanbanMemberOptions(): KanbanMemberOption[] {
  const { data: usersResponse } = useGetUsers({ page: 0, pageSize: 100 });

  return useMemo(() => {
    if (!usersResponse?.data?.length) return [];
    return usersResponse.data.map((user) => ({
      id: user.itemId,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
        user.userName ||
        user.email ||
        'Unknown User',
      imageUrl: user.profileImageUrl ?? undefined,
    }));
  }, [usersResponse]);
}
