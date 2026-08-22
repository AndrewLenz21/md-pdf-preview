import {
  Archive,
  BookOpen,
  Briefcase,
  Calendar,
  Code2,
  Folder,
  Heart,
  Image as ImageIcon,
  Key,
  Lightbulb,
  Map,
  Music,
  Star,
  Target,
  Users,
  Wrench,
} from "lucide-react";

import {
  DEFAULT_DOCUMENT_FOLDER_ICON,
  type DocumentFolderIcon,
} from "@/modules/dashboard/document/model/document.types";

export const FOLDER_ICON_OPTIONS: DocumentFolderIcon[] = [
  "folder",
  "briefcase",
  "book",
  "code",
  "lightbulb",
  "archive",
  "star",
  "target",
  "calendar",
  "image",
  "music",
  "heart",
  "users",
  "map",
  "key",
  "wrench",
];

export const FOLDER_ICON_LABELS: Record<DocumentFolderIcon, string> = {
  folder: "Folder",
  briefcase: "Briefcase",
  book: "Book",
  code: "Code",
  lightbulb: "Ideas",
  archive: "Archive",
  star: "Favorite",
  target: "Goals",
  calendar: "Calendar",
  image: "Images",
  music: "Music",
  heart: "Important",
  users: "Team",
  map: "Places",
  key: "Access",
  wrench: "Tools",
};

export function FolderIcon({
  icon = DEFAULT_DOCUMENT_FOLDER_ICON,
  className,
  strokeWidth = 1.7,
}: {
  icon?: DocumentFolderIcon;
  className?: string;
  strokeWidth?: number;
}) {
  switch (icon) {
    case "briefcase":
      return <Briefcase className={className} strokeWidth={strokeWidth} />;
    case "book":
      return <BookOpen className={className} strokeWidth={strokeWidth} />;
    case "code":
      return <Code2 className={className} strokeWidth={strokeWidth} />;
    case "lightbulb":
      return <Lightbulb className={className} strokeWidth={strokeWidth} />;
    case "archive":
      return <Archive className={className} strokeWidth={strokeWidth} />;
    case "star":
      return <Star className={className} strokeWidth={strokeWidth} />;
    case "target":
      return <Target className={className} strokeWidth={strokeWidth} />;
    case "calendar":
      return <Calendar className={className} strokeWidth={strokeWidth} />;
    case "image":
      return <ImageIcon className={className} strokeWidth={strokeWidth} />;
    case "music":
      return <Music className={className} strokeWidth={strokeWidth} />;
    case "heart":
      return <Heart className={className} strokeWidth={strokeWidth} />;
    case "users":
      return <Users className={className} strokeWidth={strokeWidth} />;
    case "map":
      return <Map className={className} strokeWidth={strokeWidth} />;
    case "key":
      return <Key className={className} strokeWidth={strokeWidth} />;
    case "wrench":
      return <Wrench className={className} strokeWidth={strokeWidth} />;
    case "folder":
    default:
      return <Folder className={className} strokeWidth={strokeWidth} />;
  }
}
