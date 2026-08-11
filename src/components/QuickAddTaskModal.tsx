import { useState } from "react";
import type { FormEvent } from "react";
import type { Recurrence, TodoList } from "../types";
import { parseSmartDueDate } from "../lib/smartDate";
import { TaskComposer } from "./TaskComposer";

interface QuickAddTaskModalProps {
  lists: TodoList[];
  initialDueDate?: string | null;
  initialDueTime?: string | null;
  initialDurationMinutes?: number | null;
  onClose: () => void;
  onCreate: (
    listId: string,
    title: string,
    description: string,
    dueDate: string | null,
    recurrence: Recurrence,
    subtaskTitles: string[],
    dueTime: string | null,
    durationMinutes: number | null
  ) => void;
}

export function QuickAddTaskModal({
  lists,
  initialDueDate = null,
  initialDueTime = null,
  initialDurationMinutes = null,
  onClose,
  onCreate,
}: QuickAddTaskModalProps) {
  const inbox = lists.find((l) => l.is_inbox);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listId, setListId] = useState(inbox?.id ?? lists[0]?.id ?? "");
  const [dueDate, setDueDate] = useState<string | null>(initialDueDate);
  const [dueTime, setDueTime] = useState<string | null>(initialDueTime);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(initialDurationMinutes);
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [subtaskTitles, setSubtaskTitles] = useState<string[]>([]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const rawTitle = title.trim();
    if (!rawTitle || !listId) return;
    let finalTitle = rawTitle;
    let finalDueDate = dueDate;
    // An explicitly-picked date wins; only smart-parse the title for a date
    // phrase ("tomorrow", "next Thursday"...) when the date field was left
    // blank, so this never overrides an explicit user choice.
    if (!finalDueDate) {
      const parsed = parseSmartDueDate(rawTitle);
      if (parsed) {
        finalDueDate = parsed.dueDate;
        finalTitle = parsed.title || rawTitle;
      }
    }
    onCreate(listId, finalTitle, description.trim(), finalDueDate, recurrence, subtaskTitles, dueTime, durationMinutes);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 8, 23, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 24,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480 }}>
        <TaskComposer
          lists={lists}
          listId={listId}
          onListChange={setListId}
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          dueDate={dueDate}
          onDueDateChange={setDueDate}
          dueTime={dueTime}
          onDueTimeChange={setDueTime}
          durationMinutes={durationMinutes}
          onDurationMinutesChange={setDurationMinutes}
          recurrence={recurrence}
          onRecurrenceChange={setRecurrence}
          subtaskTitles={subtaskTitles}
          onAddSubtaskTitle={(t) => setSubtaskTitles((prev) => [...prev, t])}
          onRemoveSubtaskTitle={(i) => setSubtaskTitles((prev) => prev.filter((_, idx) => idx !== i))}
          onCancel={onClose}
          onSubmit={handleSubmit}
          autoFocus
        />
      </div>
    </div>
  );
}
