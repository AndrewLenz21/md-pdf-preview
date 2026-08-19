import type { DocumentBlock } from "@/modules/dashboard/document/model/document-block.types";
import { DocumentBlockRenderer } from "@/modules/dashboard/document";
import { getDocumentPageHeight } from "@/modules/dashboard/document/utils";

import type { PaperPreviewDimensions } from "./paper-sizes";

import type { DocumentPagePlan } from "./pagination/paginateDocument";
import { PageFragmentRenderer } from "./PageFragmentRenderer";
import { getPaperContentCssVariables } from "./paper-sizes";
import { PaperFooter } from "./PaperFooter";
import type { PaperPageSourceRange } from "./pageSource";
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
  pageSourceRange,
  onPageMarkdownChange,
}: {
  blocks: DocumentBlock[];
  definitions: string[];
  documentTitle: string;
  pageIndex: number;
  pagePlan: DocumentPagePlan;
  paperDimensions: PaperPreviewDimensions;
  animateEntry: boolean;
  previewEditing?: PreviewEditingController;
  pageSourceRange?: PaperPageSourceRange | null;
  onPageMarkdownChange?: (markdown: string) => void;
}) {
  const pageHeight = getDocumentPageHeight(
    pagePlan.contentHeight,
    paperDimensions,
  );
  const blockMap = new Map(blocks.map((block) => [block.id, block]));
  const renderedFragments = pagePlan.fragments.map((fragment) => {
    const parentBlock = blockMap.get(fragment.parentBlockId);
    const canEdit =
      parentBlock !== undefined &&
      (previewEditing?.canEditFragment(fragment, parentBlock) ?? false);
    const isActiveEditor =
      parentBlock !== undefined &&
      (previewEditing?.isEditableFragment(fragment, parentBlock) ?? false);
    const fragmentKey = isActiveEditor
      ? `${fragment.parentBlockId}:active:${fragment.kind}`
      : fragment.id;
    const isPendingBlank = false;

    return parentBlock ? (
      <div
        key={fragmentKey}
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
          canEdit || isPendingBlank ? "true" : undefined
        }
        data-preview-blank-fragment={
          isPendingBlank ? "true" : undefined
        }
        data-preview-fragment-id={fragment.id}
        data-document-block-start={parentBlock.range.start}
        data-document-source-from={fragment.sourceRange.from}
        data-document-source-to={fragment.sourceRange.to}
        onClick={
          canEdit && previewEditing
            ? (event) =>
                previewEditing.onFragmentMouseDown(
                  event,
                  fragment,
                  parentBlock,
                )
            : undefined
        }
      >
        <PageFragmentRenderer
          fragment={fragment}
          parentBlock={parentBlock}
          definitions={definitions}
          editableBlankSpace={isPendingBlank}
          activeEditor={
            isActiveEditor && previewEditing ? (
              <DocumentEditor
                markdown={fragment.source}
                zoom={100}
                variant="preview"
                fallback={
                  <DocumentBlockRenderer
                    block={{
                      ...parentBlock,
                      id: fragment.id,
                      source: fragment.source,
                      editable: fragment.editable,
                      keepWithNext: false,
                      callout:
                        parentBlock.callout &&
                        (fragment.continuation === "middle" ||
                          fragment.continuation === "end")
                          ? { ...parentBlock.callout, icon: undefined }
                          : parentBlock.callout,
                    }}
                    calloutContent={fragment.calloutContent}
                    definitions={definitions}
                  />
                }
                onEditorMount={(editor, root) => {
                  previewEditing.onEditorMount(
                    editor,
                    root,
                    fragment,
                    parentBlock,
                  );
                }}
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
            ) : undefined
          }
        />
      </div>
    ) : null;
  });
  const isPageEditorActive =
    !pagePlan.fragments.some((fragment) => fragment.kind === "table") &&
    pageSourceRange != null &&
    onPageMarkdownChange !== undefined &&
    pagePlan.fragments.some((fragment) => {
      const parentBlock = blockMap.get(fragment.parentBlockId);

      return (
        parentBlock !== undefined &&
        (previewEditing?.isEditableFragment(fragment, parentBlock) ?? false)
      );
    });

  return (
    <section
      className={`document-page-frame ${pagePlan.isOversized ? "document-page-oversized" : ""} ${animateEntry ? "dashboard-paper-page-enter" : ""}`}
      data-document-page={pageIndex + 1}
      style={{
        width: paperDimensions.width,
        height: pageHeight * paperDimensions.scale,
          "--document-print-width": paperDimensions.printWidth,
          "--document-print-height": paperDimensions.printHeight,
          "--paper-page-entry-delay": `${pageIndex * 70}ms`,
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
          {isPageEditorActive && pageSourceRange && onPageMarkdownChange ? (
            <DocumentEditor
              markdown={pageSourceRange.markdown}
              zoom={100}
              variant="preview"
              page
              fallback={<>{renderedFragments}</>}
              onEditorMount={(editor) =>
                previewEditing?.onPageEditorMount?.(
                  editor,
                  pageSourceRange.from,
                  pageSourceRange.markdown,
                )
              }
              onMarkdownChange={(pageMarkdown) => {
                previewEditing?.onPageEditorChange?.(
                  pageSourceRange.from,
                  pageSourceRange.markdown,
                  pageMarkdown,
                );
                onPageMarkdownChange(pageMarkdown);
              }}
            />
          ) : (
            renderedFragments
          )}
        </div>
        <PaperFooter
          documentTitle={documentTitle}
          pageNumber={pageIndex + 1}
        />
      </article>
    </section>
  );
}
