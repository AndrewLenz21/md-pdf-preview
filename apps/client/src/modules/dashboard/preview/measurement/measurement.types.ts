import type { ListLayoutMetadata } from "@/modules/dashboard/document/model/list.types";
import type { CodeLayoutMetadata } from "@/modules/dashboard/document/model/code.types";
import type {
  BlankSpaceLayoutMetadata,
  DocumentLayoutUnitKind,
} from "../components/paper-preview/pagination/pagination.types";

export type TableMeasurement = {
  headerHeight: number;
  rowHeight: number;
  overhead: number;
};

export type MeasuredLayoutUnit = {
  id: string;
  height: number;
  table?: TableMeasurement;
};

export type ParagraphMeasurementCandidate = {
  id: string;
  unitId: string;
  parentBlockId: string;
  sourceOffset: number;
  source: string;
  content?: string;
};

export type ParagraphMeasurementUnit = {
  id: string;
  parentBlockId: string;
  source: string;
  splittingStrategy: "paragraph" | "callout";
  measurementSource?: string;
};

export type BlockMeasurementUnit = {
  id: string;
  parentBlockId: string;
  source: string;
  kind?: DocumentLayoutUnitKind;
  splittingStrategy:
    | "atomic"
    | "paragraph"
    | "callout"
    | "list"
    | "code"
    | "blankSpace";
  measurementSource?: string;
  listMetadata?: ListLayoutMetadata;
  codeMetadata?: CodeLayoutMetadata;
  blankSpaceMetadata?: BlankSpaceLayoutMetadata;
  calloutContent?: string;
};

export type ListMeasurementUnit = BlockMeasurementUnit & {
  splittingStrategy: "list";
  listMetadata: ListLayoutMetadata;
};

export type CodeMeasurementUnit = BlockMeasurementUnit & {
  splittingStrategy: "code";
  codeMetadata: CodeLayoutMetadata;
};

export type BlankSpaceMeasurementUnit = BlockMeasurementUnit & {
  splittingStrategy: "blankSpace";
  blankSpaceMetadata: BlankSpaceLayoutMetadata;
};

export type ParagraphFitPoint = {
  sourceOffset: number;
  height: number;
  isLineBoundary: boolean;
};

export type ParagraphMeasurementProfile = {
  unitId: string;
  parentBlockId: string;
  sourceLength: number;
  fullHeight: number;
  fitPoints: ParagraphFitPoint[];
};

export type MeasuredListItem = {
  index: number;
  sourceRange: {
    from: number;
    to: number;
  };
  height: number;
  gapAfter: number;
};

export type ListMeasurementProfile = {
  unitId: string;
  parentBlockId: string;
  ordered: boolean;
  start: number;
  itemCount: number;
  fullHeight: number;
  overhead: number;
  items: MeasuredListItem[];
};

export type MeasuredCodeLine = {
  index: number;
  sourceRange: {
    from: number;
    to: number;
  };
  height: number;
  gapAfter: number;
};

export type CodeMeasurementProfile = {
  unitId: string;
  parentBlockId: string;
  lineCount: number;
  fullHeight: number;
  overhead: number;
  lines: MeasuredCodeLine[];
  lineHeightPrefix: number[];
  gapPrefix: number[];
};

export type BlankSpaceMeasurementProfile = {
  unitId: string;
  parentBlockId: string;
  lineCount: number;
  fullHeight: number;
  lineHeight: number;
};

export type BlockMeasurementState = {
  measurements: MeasuredLayoutUnit[];
  paragraphProfiles: ParagraphMeasurementProfile[];
  listProfiles: ListMeasurementProfile[];
  codeProfiles: CodeMeasurementProfile[];
  blankSpaceProfiles: BlankSpaceMeasurementProfile[];
  isComplete: boolean;
  invalidUnitIds: string[];
};
