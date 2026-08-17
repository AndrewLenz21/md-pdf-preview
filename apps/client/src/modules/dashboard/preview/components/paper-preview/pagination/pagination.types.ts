import type {
  DocumentBlock,
  DocumentBlockKind,
} from "@/modules/dashboard/document/model/document-block.types";
import type { ListLayoutMetadata } from "@/modules/dashboard/document/model/list.types";
import type { CodeLayoutMetadata } from "@/modules/dashboard/document/model/code.types";

export type DocumentLayoutUnitKind =
  | "block"
  | "paragraphFragment"
  | "listFragment"
  | "tableRow"
  | "codeFragment"
  | "blankSpace";

export type LayoutUnitSourceRange = {
  /** Relative to the parent block for content units and [from, to). */
  from: number;
  to: number;
};

export type SourceRepresentation = "direct" | "reconstructed";

export type LayoutUnitSplittingStrategy =
  | "atomic"
  | "paragraph"
  | "list"
  | "code"
  | "blankSpace";

export type DocumentSourceRange = {
  from: number;
  to: number;
};

export type BlankSpaceLayoutMetadata = {
  boundary: "leading" | "between" | "trailing";
  lineCount: number;
  startLine: number;
  totalLineCount: number;
  /** Document-level source ownership; lineRanges are relative to the unit source. */
  sourceRange: DocumentSourceRange;
  lineRanges: LayoutUnitSourceRange[];
};

export type PageFragmentKind = DocumentBlockKind | "blankSpace";

export type PageFragmentContinuation = "none" | "start" | "middle" | "end";

export type PageFragment = {
  id: string;
  parentBlockId: string;
  kind: PageFragmentKind;
  source: string;
  sourceRange: LayoutUnitSourceRange;
  sourceRepresentation: SourceRepresentation;
  continuation: PageFragmentContinuation;
  editable: boolean;
  blankSpace?: {
    boundary: "leading" | "between" | "trailing";
    lineCount: number;
    startLine: number;
    totalLineCount: number;
    sourceRange: DocumentSourceRange;
  };
};

export type DocumentLayoutUnit = {
  id: string;
  parentBlock: DocumentBlock;
  kind: DocumentLayoutUnitKind;
  source: string;
  sourceRange: LayoutUnitSourceRange;
  sourceRepresentation: SourceRepresentation;
  splittingStrategy: LayoutUnitSplittingStrategy;
  listMetadata?: ListLayoutMetadata;
  codeMetadata?: CodeLayoutMetadata;
  blankSpaceMetadata?: BlankSpaceLayoutMetadata;
  tableHeader?: string;
  tableRow?: string;
  keepWithNext: boolean;
};
