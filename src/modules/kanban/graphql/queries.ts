export const GET_KANBANS_QUERY = `
  query GetKanbans($input: DynamicQueryInput) {
    getKanbans(input: $input) {
      totalCount
      totalPages
      hasNextPage
      hasPreviousPage
      items {
        ItemId
        CreatedDate
        CreatedBy
        LastUpdatedDate
        LastUpdatedBy
        IsDeleted
        Language
        OrganizationIds
        Tags
        DeletedDate
        title
        description
        labels
        dueDate
        list
        assignee
        board
      }
    }
  }
`;

export const GET_KANBAN_LISTS_QUERY = `
  query GetKanbanLists($input: DynamicQueryInput) {
    getKanbanLists(input: $input) {
      totalCount
      totalPages
      hasNextPage
      hasPreviousPage
      items {
        ItemId
        CreatedDate
        CreatedBy
        LastUpdatedDate
        LastUpdatedBy
        IsDeleted
        Language
        OrganizationIds
        Tags
        DeletedDate
        title
        board
      }
    }
  }
`;

export const GET_KANBAN_BOARDS_QUERY = `
  query GetKanbanBoards($input: DynamicQueryInput) {
    getKanbanBoards(input: $input) {
      totalCount
      totalPages
      hasNextPage
      hasPreviousPage
      items {
        items
        ItemId
        CreatedDate
        CreatedBy
        LastUpdatedDate
        Language
        LastUpdatedBy
        OrganizationIds
        Tags
        name
        description
      }
    }
  }
`;
