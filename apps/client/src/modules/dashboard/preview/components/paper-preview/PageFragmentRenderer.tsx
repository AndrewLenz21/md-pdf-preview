import {
  DocumentBlankSpace,
  DocumentBlockRenderer,
} from "@/modules/dashboard/document";
import type { ReactNode } from "react";
import type { DocumentBlock } from "@/modules/dashboard/document/model/document-block.types";

import type { PageFragment } from "./pagination/pagination.types";

export function PageFragmentRenderer({
  fragment,
  parentBlock,
  definitions,
  editableBlankSpace = false,
  activeEditor,
}: {
  fragment: PageFragment;
  parentBlock: DocumentBlock;
  definitions: string[];
  editableBlankSpace?: boolean;
  activeEditor?: ReactNode;
}) {
  if (fragment.kind === "blankSpace") {
    return (
      <DocumentBlankSpace
        lineCount={fragment.blankSpace?.lineCount ?? 0}
        editable={editableBlankSpace}
      />
    );
  }

  if (activeEditor) {
    return activeEditor;
  }

  const callout =
    parentBlock.callout &&
    (fragment.continuation === "middle" || fragment.continuation === "end")
      ? { ...parentBlock.callout, icon: undefined }
      : parentBlock.callout;

  return (
    <DocumentBlockRenderer
      block={{
        ...parentBlock,
        id: fragment.id,
        source: fragment.source,
        editable: fragment.editable,
        keepWithNext: false,
        callout,
      }}
      calloutContent={fragment.calloutContent}
      definitions={definitions}
    />
  );
}
