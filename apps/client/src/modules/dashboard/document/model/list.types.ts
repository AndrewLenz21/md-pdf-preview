export type ListItemSourceRange = {
  index: number;
  from: number;
  to: number;
};

export type ListLayoutMetadata = {
  ordered: boolean;
  start: number;
  spread: boolean;
  items: ListItemSourceRange[];
};
