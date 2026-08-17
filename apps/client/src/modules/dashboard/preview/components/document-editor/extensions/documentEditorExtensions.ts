import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";

import { Callout } from "./Callout";
import { BlankSpace } from "./BlankSpace";
import { SourceBlock } from "./SourceBlock";
import { TaskInput } from "./TaskInput";

export function createDocumentEditorExtensions() {
  return [
    StarterKit.configure({
      link: false,
    }),
    Link.configure({
      autolink: true,
      linkOnPaste: true,
      openOnClick: false,
    }),
    Image.configure({
      inline: false,
      allowBase64: false,
    }),
    TaskList.configure({
      HTMLAttributes: { class: "document-task-list" },
    }),
    TaskItem.configure({
      nested: true,
      HTMLAttributes: { class: "document-task-item" },
    }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Callout,
    BlankSpace,
    SourceBlock,
    TaskInput,
  ];
}

export const documentEditorExtensions = createDocumentEditorExtensions();
