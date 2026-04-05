export const INSERT_KANBAN_MUTATION = `
  mutation InsertKanban($input: KanbanInsertInput!) {
    insertKanban(input: $input) {
      acknowledged
      totalImpactedData
      itemId
    }
  }
`;

export const UPDATE_KANBAN_MUTATION = `
  mutation UpdateKanban($filter: String!, $input: KanbanUpdateInput!) {
    updateKanban(filter: $filter, input: $input) {
      acknowledged
      totalImpactedData
      itemId
    }
  }
`;

export const DELETE_KANBAN_MUTATION = `
  mutation DeleteKanban($filter: String!) {
    deleteKanban(filter: $filter) {
      acknowledged
      totalImpactedData
      itemId
    }
  }
`;

export const UPDATE_KANBAN_LIST_MUTATION = `
  mutation UpdateKanbanList($filter: String!, $input: KanbanListUpdateInput!) {
    updateKanbanList(filter: $filter, input: $input) {
      acknowledged
      totalImpactedData
      itemId
    }
  }
`;

export const DELETE_KANBAN_LIST_MUTATION = `
  mutation DeleteKanbanList($filter: String!) {
    deleteKanbanList(filter: $filter) {
      acknowledged
      totalImpactedData
      itemId
    }
  }
`;

export const INSERT_KANBAN_LIST_MUTATION = `
  mutation InsertKanbanList($input: KanbanListInsertInput!) {
    insertKanbanList(input: $input) {
      acknowledged
      totalImpactedData
      itemId
    }
  }
`;
