"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import {
  DocumentBlockRenderer,
  DocumentBlankSpace,
  parseMarkdownDocument,
} from "@/modules/dashboard/document";
import type { DocumentBlock } from "@/modules/dashboard/document/model/document-block.types";
import {
  getParagraphMeasurementCandidates,
  useBlockMeasurements,
} from "@/modules/dashboard/preview/measurement";

import type { PaperPreviewDimensions } from "./paper-sizes";
import type { PreviewEditingController } from "../../editing/previewEditing.types";

import {
  createDocumentLayoutUnits,
  getLayoutUnitBlock,
} from "./pagination/documentLayout";
import { paginateDocument } from "./pagination/paginateDocument";
import type { DocumentPagePlan } from "./pagination/paginateDocument";
import { getPaperContentCssVariables } from "./paper-sizes";
import { PaperPage } from "./PaperPage";
import {
  getPaperPageSourceRange,
  replacePaperPageSource,
} from "./pageSource";

export function PaperPreview({
  documentTitle,
  markdown,
  paperDimensions,
  previewEditing,
  onContentChange,
}: {
  documentTitle: string;
  markdown: string;
  paperDimensions: PaperPreviewDimensions;
  previewEditing?: PreviewEditingController;
  onContentChange?: (markdown: string) => void;
}) {
  const measureRoot = useRef<HTMLDivElement>(null);
  const [lastReadyPages, setLastReadyPages] = useState<{
    blocks: DocumentBlock[];
    definitions: string[];
    pages: DocumentPagePlan[];
  } | null>(null);
  const parsedDocument = useMemo(
    () => parseMarkdownDocument(markdown),
    [markdown],
  );
  const layoutUnits = useMemo(
    () => createDocumentLayoutUnits(parsedDocument.blocks, markdown),
    [markdown, parsedDocument.blocks],
  );
  const layoutUnitById = useMemo(
    () => new Map(layoutUnits.map((unit) => [unit.id, unit])),
    [layoutUnits],
  );
  const measurementUnits = useMemo(
      () =>
      layoutUnits.map((unit) => ({
        id: unit.id,
        parentBlockId: unit.parentBlock.id,
        kind: unit.kind,
        source: unit.source,
        splittingStrategy: unit.splittingStrategy,
         listMetadata: unit.listMetadata,
         codeMetadata: unit.codeMetadata,
         blankSpaceMetadata: unit.blankSpaceMetadata,
         calloutContent: unit.calloutContent,
         measurementSource: unit.calloutContent,
      })),
    [layoutUnits],
  );
  const paragraphMeasurementCandidates = useMemo(
    () => measurementUnits.flatMap(getParagraphMeasurementCandidates),
    [measurementUnits],
  );
  const pageContentHeight = paperDimensions.contentHeight;
  const layoutKey = JSON.stringify({
    markdown,
    baseWidth: paperDimensions.baseWidth,
    baseHeight: paperDimensions.baseHeight,
    contentWidth: paperDimensions.contentWidth,
    contentHeight: paperDimensions.contentHeight,
    margins: paperDimensions.margins,
    footerHeight: paperDimensions.footerHeight,
    blockGap: paperDimensions.blockGap,
  });
  const {
    measurements,
    paragraphProfiles,
    listProfiles,
    codeProfiles,
    blankSpaceProfiles,
    invalidUnitIds,
  } = useBlockMeasurements({
    units: measurementUnits,
    measureRoot,
    layoutKey,
  });
  const measurementById = new Map(
    measurements.map((measurement) => [measurement.id, measurement.height]),
  );
  const hasBaseMeasurements =
    measurementById.size === measurementUnits.length &&
    measurementUnits.every((unit) => measurementById.has(unit.id));
  // Keep valid block geometry usable when a specialized profile fails validation.
  const paginationLayoutUnits = useMemo(() => {
    const invalidUnitIdSet = new Set(invalidUnitIds);

    return layoutUnits.map((unit) =>
      invalidUnitIdSet.has(unit.id) &&
      unit.splittingStrategy !== "atomic" &&
      unit.splittingStrategy !== "code"
        ? { ...unit, splittingStrategy: "atomic" as const }
        : unit,
    );
  }, [invalidUnitIds, layoutUnits]);
  const pages = useMemo(
    () =>
      hasBaseMeasurements
        ? paginateDocument(
            paginationLayoutUnits,
            measurements,
            pageContentHeight,
            paperDimensions.blockGap,
            paragraphProfiles,
            listProfiles,
            codeProfiles,
            blankSpaceProfiles,
          )
        : [],
    [
      hasBaseMeasurements,
      paginationLayoutUnits,
      measurements,
      pageContentHeight,
      paperDimensions.blockGap,
      paragraphProfiles,
      listProfiles,
      codeProfiles,
      blankSpaceProfiles,
    ],
  );
  useEffect(() => {
    if (hasBaseMeasurements) {
      startTransition(() => {
        setLastReadyPages({
          blocks: parsedDocument.blocks,
          definitions: parsedDocument.definitions,
          pages,
        });
      });
    }
  }, [hasBaseMeasurements, pages, parsedDocument.blocks, parsedDocument.definitions]);

  const visiblePageState = hasBaseMeasurements
    ? {
        blocks: parsedDocument.blocks,
        definitions: parsedDocument.definitions,
        pages,
      }
    : lastReadyPages;
  const hasVisiblePages = visiblePageState !== null;
  const isRendering = !hasBaseMeasurements;

  return (
    <div
      className={`document-pagination-root ${hasVisiblePages ? "document-pagination-ready" : "document-pagination-pending"}`}
      aria-busy={isRendering}
      data-document-invalid-measurements={
        process.env.NODE_ENV !== "production" && invalidUnitIds.length > 0
          ? invalidUnitIds.join(",")
          : undefined
      }
      style={getPaperContentCssVariables(paperDimensions) as React.CSSProperties}
    >
      {isRendering ? (
        <div
          className="document-preview-rendering-overlay"
          role="status"
          aria-live="polite"
        >
          <div className="document-preview-rendering-card">
            <span className="document-preview-rendering-spinner" aria-hidden="true" />
            <span>
              {hasVisiblePages ? "Updating preview..." : "Rendering preview..."}
            </span>
          </div>
        </div>
      ) : null}
      <div
        ref={measureRoot}
        className="document-measure-surface"
        aria-hidden="true"
        style={{
          width: paperDimensions.baseWidth,
          ...getPaperContentCssVariables(paperDimensions),
        } as React.CSSProperties}
      >
        <div
          className="document-page-content"
          style={getPaperContentCssVariables(paperDimensions) as React.CSSProperties}
        >
          {layoutUnits.map((unit) => {
            const isBlankSpace = unit.kind === "blankSpace";

            return (
              <div
                key={unit.id}
                className={isBlankSpace ? "document-blank-space-root" : undefined}
                data-document-blank-boundary={
                  isBlankSpace ? unit.blankSpaceMetadata?.boundary : undefined
                }
                data-document-blank-start={
                  isBlankSpace
                    ? unit.blankSpaceMetadata?.startLine
                    : undefined
                }
                data-document-measure-block={unit.id}
                data-document-measure-list={
                  unit.splittingStrategy === "list" ? unit.id : undefined
                }
                data-document-measure-code={
                  unit.splittingStrategy === "code" ? unit.id : undefined
                }
                data-document-measure-blank-space={
                  isBlankSpace ? unit.id : undefined
                }
                data-document-measure-height={
                  process.env.NODE_ENV !== "production"
                    ? measurementById.get(unit.id)
                    : undefined
                }
              >
                {isBlankSpace ? (
                  <DocumentBlankSpace
                    lineCount={unit.blankSpaceMetadata?.lineCount ?? 0}
                  />
                ) : (
                   <DocumentBlockRenderer
                     block={getLayoutUnitBlock(unit)}
                     calloutContent={unit.calloutContent}
                     definitions={parsedDocument.definitions}
                   />
                )}
              </div>
            );
          })}
        </div>
        <div className="document-page-content">
          {paragraphMeasurementCandidates.map((candidate) => {
            const unit = layoutUnitById.get(candidate.unitId);

            return unit ? (
              <div
                key={candidate.id}
                data-document-measure-paragraph-candidate={candidate.id}
                style={{ display: "flow-root" }}
              >
                <DocumentBlockRenderer
                  block={{
                    ...getLayoutUnitBlock(unit),
                    id: candidate.id,
                    source: candidate.source,
                  }}
                  calloutContent={candidate.content}
                  definitions={parsedDocument.definitions}
                />
              </div>
            ) : null;
          })}
        </div>
      </div>

      <div
        className={`document-pages ${hasVisiblePages ? "document-pages-ready" : "document-pages-pending"}`}
      >
        {visiblePageState?.pages.map((pagePlan, pageIndex) => {
          const pageSourceRange = getPaperPageSourceRange(
            pagePlan,
            visiblePageState.blocks,
            markdown,
          );

          return (
            <PaperPage
              key={pagePlan.id}
              blocks={visiblePageState.blocks}
              definitions={visiblePageState.definitions}
              documentTitle={documentTitle}
              pageIndex={pageIndex}
              pagePlan={pagePlan}
              paperDimensions={paperDimensions}
              animateEntry
              pageSourceRange={pageSourceRange}
                onPageMarkdownChange={
                  pageSourceRange && onContentChange
                    ? (pageMarkdown) =>
                        onContentChange(
                        replacePaperPageSource(
                          markdown,
                          pageSourceRange,
                          pageMarkdown,
                        ),
                      )
                  : undefined
              }
              previewEditing={hasVisiblePages ? previewEditing : undefined}
            />
          );
        })}
      </div>

      <div className="document-print-fallback" aria-hidden="true">
        <div
          className="document-page-content"
          style={getPaperContentCssVariables(paperDimensions) as React.CSSProperties}
        >
          {parsedDocument.blocks.map((block) => (
            <div key={block.id} data-document-block-root={block.id}>
              <DocumentBlockRenderer
                block={block}
                definitions={parsedDocument.definitions}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
