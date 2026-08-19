import type { DocumentFolderColor } from "@/modules/dashboard/document/model/document.types";

export const FOLDER_COLOR_OPTIONS: DocumentFolderColor[] = [
  "primary",
  "blue",
  "violet",
  "amber",
  "rose",
  "emerald",
];

export const FOLDER_ICON_COLOR_CLASSES: Record<DocumentFolderColor, string> = {
  primary: "text-primary",
  blue: "text-sky-500",
  violet: "text-violet-500",
  amber: "text-amber-500",
  rose: "text-rose-500",
  emerald: "text-emerald-500",
};

export const FOLDER_SWATCH_COLOR_CLASSES: Record<DocumentFolderColor, string> =
  {
    primary: "bg-primary",
    blue: "bg-sky-500",
    violet: "bg-violet-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    emerald: "bg-emerald-500",
  };
