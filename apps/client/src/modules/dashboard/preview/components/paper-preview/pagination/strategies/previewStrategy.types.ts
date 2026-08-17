import type { DocumentLayoutUnit } from "../pagination.types";

export type PreviewStrategyName =
  | "paragraph"
  | "list"
  | "code"
  | "table"
  | "blankSpace"
  | "atomic";

export type PreviewStrategyContext = {
  availableHeight: number;
  pageContentHeight: number;
  hasPageContent: boolean;
};

export type PreviewStrategyResult =
  | {
      type: "break";
    }
  | {
      type: "fragment";
      fragment: DocumentLayoutUnit;
      height: number;
    };

export type PreviewStrategySession = {
  hasRemaining: () => boolean;
  fit: (context: PreviewStrategyContext) => PreviewStrategyResult;
};

export type PreviewStrategy = {
  name: PreviewStrategyName;
  createSession: (
    unit: DocumentLayoutUnit,
  ) => PreviewStrategySession;
  getFirstFragmentHeight?: (unit: DocumentLayoutUnit) => number | null;
};
