import type { DocumentBlock } from "@/modules/dashboard/document/model/document-block.types";

import type { PaperPreviewDimensions } from "./paper-sizes";

import { getDocumentPageHeight } from "./pagination/document-layout";
import type { DocumentPagePlan } from "./pagination/paginateDocument";
import { PageFragmentRenderer } from "./PageFragmentRenderer";
import { getPaperContentCssVariables } from "./paper-sizes";
import { PaperFooter } from "./PaperFooter";
import type { PreviewEditingController } from "../../editing/previewEditing.types";
import { DocumentEditor } from "../document-editor/DocumentEditor";

export function PaperPage({
  blocks,
  definitions,
  documentTitle,
  pageIndex,
  pagePlan,
  paperDimensions,
  animateEntry,
  previewEditing,
}: {
  blocks: DocumentBlock[];
  definitions: string[];
  documentTitle: string;
  pageIndex: number;
  pagePlan: DocumentPagePlan;
  paperDimensions: PaperPreviewDimensions;
  animateEntry: boolean;
  previewEditing?: PreviewEditingController;
}) {
  const pageHeight = getDocumentPageHeight(
    pagePlan.contentHeight,
    paperDimensions,
  );
  const blockMap = new Map(blocks.map((block) => [block.id, block]));

  return (
    <section
      className={`document-page-frame ${pagePlan.isOversized ? "document-page-oversized" : ""} ${animateEntry ? "dashboard-paper-page-enter" : ""}`}
      data-document-page={pageIndex + 1}
      style={{
        width: paperDimensions.width,
        height: pageHeight * paperDimensions.scale,
        "--document-print-width": paperDimensions.printWidth,
        "--document-print-height": paperDimensions.printHeight,
      } as React.CSSProperties}
      aria-label={`Page ${pageIndex + 1}`}
    >
      <article
        className="document-page-sheet"
        style={{
          width: paperDimensions.baseWidth,
          height: pageHeight,
          transform: `scale(${paperDimensions.scale})`,
          transformOrigin: "top left",
          ...getPaperContentCssVariables(paperDimensions),
        } as React.CSSProperties}
      >
        <div className="document-page-content">
          {pagePlan.fragments.map((fragment) => {
            const parentBlock = blockMap.get(fragment.parentBlockId);
            const isEditable =
              parentBlock !== undefined &&
              (previewEditing?.isEditableFragment(fragment, parentBlock) ?? false);
            const isPendingBlank = false;
            return parentBlock ? (
              <div
                key={fragment.id}
                className={
                  fragment.kind === "blankSpace"
                    ? "document-blank-space-root"
                    : undefined
                }
                data-document-blank-boundary={
                  fragment.kind === "blankSpace"
                    ? fragment.blankSpace?.boundary
                    : undefined
                }
                data-document-blank-start={
                  fragment.kind === "blankSpace"
                    ? fragment.blankSpace?.startLine
                    : undefined
                }
                data-document-block-root={fragment.id}
                data-preview-editable-fragment={
                  isEditable || isPendingBlank ? "true" : undefined
                }
                data-preview-blank-fragment={
                  isPendingBlank ? "true" : undefined
                }
                data-preview-fragment-id={fragment.id}
                data-document-block-start={parentBlock.range.start}
                data-document-source-from={fragment.sourceRange.from}
                data-document-source-to={fragment.sourceRange.to}
              >
                <PageFragmentRenderer
                  fragment={fragment}
                  parentBlock={parentBlock}
                  definitions={definitions}
                  editableBlankSpace={isPendingBlank}
                    activeEditor={
                      isEditable && previewEditing
                      ? (
                          <DocumentEditor
                            markdown={fragment.source}
                            zoom={100}
                            variant="preview"
                            onEditorMount={(editor, root) =>
                              previewEditing.onEditorMount(
                                editor,
                                root,
                                fragment,
                                parentBlock,
                              )
                            }
                            onEditorUpdate={(editor, root) =>
                              previewEditing.onEditorChange(
                                editor,
                                root,
                                fragment,
                                parentBlock,
                              )
                            }
                            onEditorKeyDown={(event) =>
                              previewEditing.onEditorKeyDown(
                                event,
                                event.currentTarget,
                                fragment,
                                parentBlock,
                              )
                            }
                          />
                        )
                      : undefined
                  }
                />
              </div>
            ) : null;
          })}
        </div>
        <PaperFooter
          documentTitle={documentTitle}
          pageNumber={pageIndex + 1}
        />
      </article>
    </section>
  );
}
