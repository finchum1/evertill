import { Node, mergeAttributes } from "@tiptap/core";

// Tiptap's official @tiptap/extension-details* packages don't have a stable
// release compatible with this app's @tiptap/core v3 line (their only v3
// build is pinned to a specific old beta core version, an unresolvable peer
// conflict) — so toggle/collapsible lists are hand-rolled here instead as
// three small nodes mirroring the same <details><summary>...</summary><div>
// ...</div></details> shape those packages would have produced.

export const ToggleSummary = Node.create({
  name: "toggleSummary",
  content: "inline*",
  parseHTML() {
    return [{ tag: "summary" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["summary", mergeAttributes(HTMLAttributes), 0];
  },
});

export const ToggleContent = Node.create({
  name: "toggleContent",
  content: "block+",
  parseHTML() {
    return [{ tag: "div.note-toggle-content" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "note-toggle-content" }), 0];
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggleItem: {
      insertToggleList: () => ReturnType;
    };
  }
}

export const ToggleItem = Node.create({
  name: "toggleItem",
  group: "block",
  content: "toggleSummary toggleContent",
  defining: true,
  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.hasAttribute("open"),
        renderHTML: (attrs) => (attrs.open ? { open: "" } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "details" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["details", mergeAttributes(HTMLAttributes, { class: "note-toggle" }), 0];
  },
  addCommands() {
    return {
      insertToggleList:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { open: true },
            content: [
              { type: "toggleSummary", content: [{ type: "text", text: "Toggle" }] },
              { type: "toggleContent", content: [{ type: "paragraph" }] },
            ],
          }),
    };
  },
  // Native <details>/<summary> click-to-toggle does not reliably fire inside
  // a contentEditable region (the same reason Tiptap's own TaskItem
  // extension wires its checkbox's toggle manually rather than trusting the
  // native <input type="checkbox">) — so a click on the disclosure marker is
  // handled by hand here: manually flip `dom.open` and write the new state
  // into the node's `open` attr, so editor.getHTML() (a headless
  // re-serialization of the doc, not a DOM read) reflects whichever state
  // the user last left it in. Clicks elsewhere on the summary fall through
  // to ProseMirror as normal, so the "Toggle" label stays editable text.
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement("details");
      dom.className = "note-toggle";
      if (node.attrs.open) dom.setAttribute("open", "");

      const MARKER_WIDTH = 20;
      dom.addEventListener("mousedown", (event) => {
        const target = event.target as HTMLElement;
        const summary = target.closest("summary");
        if (!summary || !dom.contains(summary)) return;
        const rect = summary.getBoundingClientRect();
        if (event.clientX - rect.left > MARKER_WIDTH) return;
        event.preventDefault();
        const pos = typeof getPos === "function" ? getPos() : undefined;
        if (typeof pos !== "number") return;
        const nextOpen = !dom.open;
        dom.open = nextOpen;
        editor.view.dispatch(editor.view.state.tr.setNodeAttribute(pos, "open", nextOpen));
      });

      return { dom, contentDOM: dom };
    };
  },
});
