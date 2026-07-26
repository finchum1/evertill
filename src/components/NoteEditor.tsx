import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import type { CSSProperties, ReactNode } from "react";
import { LIST_COLORS, LIST_COLOR_HEX } from "../types";

interface NoteEditorProps {
  content: string;
  onBlur: (html: string) => void;
}

// Toolbar + Tiptap editor, split out of NoteModal.tsx the same way
// DealChecklist.tsx is split out of DealModal.tsx. The `onBlur` editor
// option fires exactly on focus-out, matching this app's established
// onBlur-save convention for every other text field (NoteModal's own
// title input, Pipeline/Deals fields).
export function NoteEditor({ content, onBlur }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: "Write a note…" }),
    ],
    content,
    onBlur: ({ editor }) => onBlur(editor.getHTML()),
  });

  if (!editor) return null;

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="note-editor-content" />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div style={toolbarStyle}>
      <TextButton
        label="H1"
        style={{ fontWeight: 800, fontSize: 11 }}
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      />
      <TextButton
        label="H2"
        style={{ fontWeight: 800, fontSize: 11 }}
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      />
      <Divider />
      <TextButton label="B" style={{ fontWeight: 800 }} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold" />
      <TextButton label="I" style={{ fontStyle: "italic" }} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic" />
      <TextButton
        label="U"
        style={{ textDecoration: "underline" }}
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      />
      <HighlightButton editor={editor} />
      <Divider />
      <IconButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
        <BulletListIcon />
      </IconButton>
      <IconButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
        <NumberedListIcon />
      </IconButton>
      <IconButton active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Checklist">
        <ChecklistIcon />
      </IconButton>
    </div>
  );
}

// Reuses the same 10-color LIST_COLOR_HEX palette as list/folder colors
// elsewhere in this app, rather than inventing a separate color set —
// same reasoning already applied to note folders and deal statuses.
function HighlightButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const active = editor.isActive("highlight");

  return (
    <div style={{ position: "relative" }}>
      <IconButton active={active} onClick={() => setOpen((o) => !o)} title="Highlight">
        <HighlightIcon />
      </IconButton>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={swatchPanelStyle}>
            <button
              type="button"
              title="No highlight"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().unsetHighlight().run();
                setOpen(false);
              }}
              style={noHighlightSwatchStyle}
            />
            {LIST_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().setHighlight({ color: LIST_COLOR_HEX[color] }).run();
                  setOpen(false);
                }}
                style={{ ...swatchStyle, background: LIST_COLOR_HEX[color] }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TextButton({
  label,
  style,
  active,
  onClick,
  title,
}: {
  label: string;
  style: CSSProperties;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{ ...buttonStyle, ...style, color: active ? "var(--accent)" : "var(--text-body)", background: active ? "var(--accent-subtle-bg)" : "none" }}
    >
      {label}
    </button>
  );
}

function IconButton({ children, active, onClick, title }: { children: ReactNode; active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{ ...buttonStyle, color: active ? "var(--accent)" : "var(--text-body)", background: active ? "var(--accent-subtle-bg)" : "none" }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)", margin: "2px 4px" }} />;
}

function BulletListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="2.5" cy="4" r="1" fill="currentColor" />
      <circle cx="2.5" cy="8" r="1" fill="currentColor" />
      <circle cx="2.5" cy="12" r="1" fill="currentColor" />
      <path d="M6 4H14M6 8H14M6 12H14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function NumberedListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <text x="0.5" y="5.2" fontSize="4.2" fill="currentColor" fontFamily="sans-serif">
        1
      </text>
      <text x="0.5" y="9.2" fontSize="4.2" fill="currentColor" fontFamily="sans-serif">
        2
      </text>
      <text x="0.5" y="13.2" fontSize="4.2" fill="currentColor" fontFamily="sans-serif">
        3
      </text>
      <path d="M6 4H14M6 8H14M6 12H14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.4 4.5L3.2 5.3L4.6 3.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="1.5" y="9.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4.5H14M7 11.5H14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function HighlightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path
        d="M9.5 2.5L13.5 6.5L7 13H3V9L9.5 2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M2 14.5H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 2,
  padding: "4px 2px 8px",
  flexWrap: "wrap",
};

const buttonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  border: "none",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
  flexShrink: 0,
};

const swatchPanelStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 8,
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  width: 132,
  zIndex: 50,
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
};

const swatchStyle: CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: "50%",
  border: "1px solid var(--border-strong)",
  cursor: "pointer",
  padding: 0,
};

const noHighlightSwatchStyle: CSSProperties = {
  ...swatchStyle,
  background: "none",
  position: "relative",
  overflow: "hidden",
  backgroundImage: "linear-gradient(to top right, transparent calc(50% - 1px), var(--danger) calc(50%), transparent calc(50% + 1px))",
};
