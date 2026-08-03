// Shared DataTransfer MIME type for dragging a task (todo) row — used to
// distinguish a task drag from any other kind of drag that might land on the
// same drop target in the future.
export const TODO_DRAG_MIME = "application/x-todo-id";

// Sidebar reordering: separate MIME types per drag kind so a list drag and a
// folder drag never get mistaken for each other on the same drop target.
export const TODO_LIST_DRAG_MIME = "application/x-todo-list-id";
export const TODO_FOLDER_DRAG_MIME = "application/x-todo-folder-id";

// Leads/Pipeline board cards, dragged between columns.
export const LEAD_CARD_DRAG_MIME = "application/x-lead-card-id";
export const PIPELINE_CARD_DRAG_MIME = "application/x-pipeline-card-id";
