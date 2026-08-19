"use client";

import { useLayoutEffect, useState } from "react";

import type {
  BlankSpaceMeasurementUnit,
  BlockMeasurementUnit,
  BlockMeasurementState,
  CodeMeasurementUnit,
  ListMeasurementUnit,
  MeasuredLayoutUnit,
  ParagraphMeasurementUnit,
} from "./measurement.types";
import {
  createParagraphMeasurementProfile,
  getParagraphMeasurementCandidates,
} from "./paragraphMeasurement";
import { createListMeasurementProfile } from "./listMeasurement";
import { measureCodeBlock } from "../components/paper-preview/pagination/strategies/code/codeMeasurement";

type UseBlockMeasurementsOptions = {
  units: BlockMeasurementUnit[];
  measureRoot: React.RefObject<HTMLDivElement | null>;
  layoutKey: string;
};

type CollectedMeasurements = BlockMeasurementState;

const INITIAL_MEASUREMENT_STATE: BlockMeasurementState = {
  measurements: [],
  paragraphProfiles: [],
  listProfiles: [],
  codeProfiles: [],
  blankSpaceProfiles: [],
  isComplete: false,
  invalidUnitIds: [],
};

export function isValidMeasurement(height: number) {
  return Number.isFinite(height) && height >= 0;
}

function collectMeasurements(
  root: HTMLDivElement,
  units: BlockMeasurementUnit[],
): CollectedMeasurements {
  const expectedIds = units.map((unit) => unit.id);
  const expectedIdSet = new Set(expectedIds);
  const measuredIds = new Set<string>();
  const invalidUnitIds = new Set<string>();
  const measurements: MeasuredLayoutUnit[] = [];
  const heightById = new Map<string, number>();
  const measuredBlockById = new Map<string, HTMLElement>();
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const paragraphUnits = units.filter(
    (unit): unit is ParagraphMeasurementUnit =>
      unit.splittingStrategy === "paragraph" ||
      unit.splittingStrategy === "callout",
  );
  const listUnits = units.filter(
    (unit): unit is ListMeasurementUnit =>
      unit.splittingStrategy === "list" && unit.listMetadata !== undefined,
  );
  const codeUnits = units.filter(
    (unit): unit is CodeMeasurementUnit =>
      unit.splittingStrategy === "code" && unit.codeMetadata !== undefined,
  );
  const blankSpaceUnits = units.filter(
    (unit): unit is BlankSpaceMeasurementUnit =>
      unit.splittingStrategy === "blankSpace" &&
      unit.blankSpaceMetadata !== undefined,
  );
  const paragraphCandidates = paragraphUnits.flatMap(
    getParagraphMeasurementCandidates,
  );
  const paragraphCandidateById = new Map(
    paragraphCandidates.map((candidate) => [candidate.id, candidate]),
  );
  const candidatesByUnitId = new Map<string, typeof paragraphCandidates>();

  paragraphCandidates.forEach((candidate) => {
    const unitCandidates = candidatesByUnitId.get(candidate.unitId) ?? [];
    unitCandidates.push(candidate);
    candidatesByUnitId.set(candidate.unitId, unitCandidates);
  });
  const candidateHeights = new Map<string, number>();

  root
    .querySelectorAll<HTMLElement>("[data-document-measure-block]")
    .forEach((element) => {
      const unitId = element.dataset.documentMeasureBlock ?? "";
      const height = element.getBoundingClientRect().height;

      if (
        !unitId ||
        !expectedIdSet.has(unitId) ||
        measuredIds.has(unitId) ||
        !isValidMeasurement(height)
      ) {
        invalidUnitIds.add(unitId || "<unknown>");
        return;
      }

      measuredIds.add(unitId);
      const unit = unitById.get(unitId);
      const tableElement =
        unit?.kind === "tableRow"
          ? element.querySelector<HTMLTableElement>("table")
          : null;
      const headerElement = tableElement?.querySelector<HTMLElement>("thead");
      const rowElement = tableElement?.querySelector<HTMLElement>("tbody tr");
      const tableRect = tableElement?.getBoundingClientRect();
      const headerHeight = headerElement?.getBoundingClientRect().height;
      const rowHeight = rowElement?.getBoundingClientRect().height;
      const table =
        tableRect &&
        headerHeight !== undefined &&
        rowHeight !== undefined &&
        isValidMeasurement(tableRect.height) &&
        isValidMeasurement(headerHeight) &&
        isValidMeasurement(rowHeight)
          ? {
              headerHeight,
              rowHeight,
              overhead: Math.max(0, height - tableRect.height),
            }
          : undefined;

      measurements.push({ id: unitId, height, table });
      heightById.set(unitId, height);
      measuredBlockById.set(unitId, element);
    });

  expectedIds.forEach((unitId) => {
    if (!measuredIds.has(unitId)) {
      invalidUnitIds.add(unitId);
    }
  });

  root
    .querySelectorAll<HTMLElement>(
      "[data-document-measure-paragraph-candidate]",
    )
    .forEach((element) => {
      const candidateId =
        element.dataset.documentMeasureParagraphCandidate ?? "";
      const height = element.getBoundingClientRect().height;
      const candidate = paragraphCandidateById.get(candidateId);

      if (
        !candidateId ||
        !candidate ||
        candidateHeights.has(candidateId) ||
        !isValidMeasurement(height)
      ) {
        invalidUnitIds.add(candidate?.unitId ?? (candidateId || "<unknown>"));
        return;
      }

      candidateHeights.set(candidateId, height);
    });

  const paragraphProfiles = paragraphUnits.flatMap((unit) => {
    const candidates = candidatesByUnitId.get(unit.id) ?? [];
    const profile = createParagraphMeasurementProfile({
      unitId: unit.id,
      parentBlockId: unit.parentBlockId,
      sourceLength: unit.measurementSource?.length ?? unit.source.length,
      candidates,
      heights: candidateHeights,
    });

    if (!profile) {
      invalidUnitIds.add(unit.id);
      return [];
    }

    return [profile];
  });
  const listProfiles = listUnits.flatMap((unit) => {
    const blockElement = measuredBlockById.get(unit.id);
    const listElement = blockElement?.querySelector("ul, ol");
    const expectedTagName = unit.listMetadata.ordered ? "OL" : "UL";
    const topLevelItems = listElement
      ? Array.from(listElement.children).filter(
          (child) => child.tagName === "LI",
        )
      : [];

    if (
      !blockElement ||
      !listElement ||
      listElement.tagName !== expectedTagName ||
      topLevelItems.length !== unit.listMetadata.items.length
    ) {
      invalidUnitIds.add(unit.id);
      return [];
    }

    const itemElements = topLevelItems as HTMLElement[];
    const itemRects = itemElements.map((item) => item.getBoundingClientRect());
    const items = itemRects.map((rect, index) => {
      const nextRect = itemRects[index + 1];
      const gapAfter = nextRect ? nextRect.top - rect.bottom : 0;

      return {
        index,
        sourceRange: unit.listMetadata.items[index],
        height: rect.height,
        gapAfter,
      };
    });
    const profile = createListMeasurementProfile({
      unitId: unit.id,
      parentBlockId: unit.parentBlockId,
      metadata: unit.listMetadata,
      fullHeight: heightById.get(unit.id) ?? Number.NaN,
      items,
    });

    if (!profile) {
      invalidUnitIds.add(unit.id);
      return [];
    }

    return [profile];
  });
  const codeProfiles = codeUnits.flatMap((unit) => {
    const blockElement = measuredBlockById.get(unit.id);
    const fullHeight = heightById.get(unit.id) ?? Number.NaN;
    const profile = blockElement
      ? measureCodeBlock(blockElement, unit, fullHeight)
      : null;

    if (!profile) {
      invalidUnitIds.add(unit.id);
      return [];
    }

    return [profile];
  });
  const blankSpaceProfiles = blankSpaceUnits.flatMap((unit) => {
    const fullHeight = heightById.get(unit.id) ?? Number.NaN;
    const lineCount = unit.blankSpaceMetadata.lineCount;
    const lineHeight = fullHeight / lineCount;

    if (
      !Number.isFinite(fullHeight) ||
      fullHeight < 0 ||
      !Number.isInteger(lineCount) ||
      lineCount <= 0 ||
      !Number.isFinite(lineHeight) ||
      lineHeight <= 0
    ) {
      invalidUnitIds.add(unit.id);
      return [];
    }

    return [
      {
        unitId: unit.id,
        parentBlockId: unit.parentBlockId,
        lineCount,
        fullHeight,
        lineHeight,
      },
    ];
  });

  return {
    measurements,
    paragraphProfiles,
    listProfiles,
    codeProfiles,
    blankSpaceProfiles,
    isComplete:
      invalidUnitIds.size === 0 &&
      measurements.length === units.length &&
      paragraphProfiles.length === paragraphUnits.length &&
      listProfiles.length === listUnits.length &&
      codeProfiles.length === codeUnits.length &&
      blankSpaceProfiles.length === blankSpaceUnits.length,
    invalidUnitIds: [...invalidUnitIds],
  };
}

export function useBlockMeasurements({
  units,
  measureRoot,
  layoutKey,
}: UseBlockMeasurementsOptions): BlockMeasurementState {
  const [measurementState, setMeasurementState] = useState<{
    key: string;
    value: BlockMeasurementState;
  }>({
    key: "",
    value: INITIAL_MEASUREMENT_STATE,
  });
  useLayoutEffect(() => {
    const root = measureRoot.current;

    if (!root) {
      return;
    }

    let animationFrame: number | null = null;
    let disposed = false;
    const initialDevicePixelRatio = window.devicePixelRatio;
    const initialViewportScale = window.visualViewport?.scale ?? 1;

    const measure = () => {
      if (disposed) {
        return;
      }

      setMeasurementState({
        key: layoutKey,
        value: collectMeasurements(root, units),
      });
    };

    const scheduleMeasure = () => {
      if (disposed) {
        return;
      }

      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }

      animationFrame = window.requestAnimationFrame(measure);
    };

    const handleImageLoad = (event: Event) => {
      if (event.target instanceof HTMLImageElement) {
        scheduleMeasure();
      }
    };

    root.addEventListener("load", handleImageLoad, true);
    scheduleMeasure();

    if (
      Array.from(root.querySelectorAll("img")).some((image) => image.complete)
    ) {
      scheduleMeasure();
    }

    const observer = new ResizeObserver(() => {
      const browserScaleChanged =
        window.devicePixelRatio !== initialDevicePixelRatio ||
        (window.visualViewport?.scale ?? 1) !== initialViewportScale;

      if (!browserScaleChanged) {
        scheduleMeasure();
      }
    });
    observer.observe(root);
    void document.fonts?.ready.then(scheduleMeasure);

    return () => {
      disposed = true;
      root.removeEventListener("load", handleImageLoad, true);
      observer.disconnect();

      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [layoutKey, measureRoot, units]);

  const hasCurrentMeasurements = measurementState.key === layoutKey;

  return hasCurrentMeasurements
    ? measurementState.value
    : INITIAL_MEASUREMENT_STATE;
}
