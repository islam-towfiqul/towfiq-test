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
      }
    }
  }
`;
