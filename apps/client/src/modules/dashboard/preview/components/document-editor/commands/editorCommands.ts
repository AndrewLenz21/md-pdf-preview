import type { Editor } from "@tiptap/core";

export type EditorCommand = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  execute: (editor: Editor) => void;
};

export const editorCommands: EditorCommand[] = [
  {
    id: "text",
    title: "Text",
    description: "Start with a normal paragraph",
    keywords: ["paragraph", "text"],
    execute: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: "heading-1",
    title: "Heading 1",
    description: "Large section heading",
    keywords: ["h1", "title"],
    execute: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: "heading-2",
    title: "Heading 2",
    description: "Medium section heading",
    keywords: ["h2", "section"],
    execute: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: "heading-3",
    title: "Heading 3",
    description: "Small section heading",
    keywords: ["h3", "subsection"],
    execute: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    id: "bullet-list",
    title: "Bulleted list",
    description: "Create a simple bullet list",
    keywords: ["bullet", "list", "unordered"],
    execute: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ordered-list",
    title: "Numbered list",
    description: "Create a numbered list",
    keywords: ["number", "ordered", "list"],
    execute: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "task-list",
    title: "To-do list",
    description: "Create a checklist",
    keywords: ["todo", "task", "checklist", "list"],
    execute: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: "quote",
    title: "Quote",
    description: "Add a blockquote",
    keywords: ["blockquote", "quotation"],
    execute: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "callout",
    title: "Callout",
    description: "Highlight an important idea",
    keywords: ["aside", "highlight", "note"],
    execute: (editor) =>
      editor
        .chain()
        .focus()
        .insertContent({
          type: "callout",
          attrs: { variant: "info" },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    id: "code",
    title: "Code",
    description: "Add a code block",
    keywords: ["code", "preformatted", "monospace"],
    execute: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "divider",
    title: "Divider",
    description: "Add a horizontal divider",
    keywords: ["hr", "horizontal", "rule", "line"],
    execute: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
];

export function findEditorCommands(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return editorCommands;
  }

  return editorCommands.filter((command) =>
    [command.title, command.description, ...command.keywords].some((value) =>
      value.toLowerCase().startsWith(normalizedQuery),
    ),
  );
}
