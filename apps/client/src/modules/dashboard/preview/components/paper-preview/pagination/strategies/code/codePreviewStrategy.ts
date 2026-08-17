import type { CodeMeasurementProfile } from "@/modules/dashboard/preview/measurement/measurement.types";

import {
  findLargestFittingCodeFragment,
  getCodeFragmentHeight,
} from "./codeMeasurement";
import { createCodeFragment } from "./codeFragments";
import type {
  PreviewStrategy,
  PreviewStrategyContext,
  PreviewStrategyResult,
} from "../previewStrategy.types";
import type { DocumentLayoutUnit } from "../../pagination.types";

type CodePreviewStrategyOptions = {
  codeProfiles: Map<string, CodeMeasurementProfile>;
  getFallbackHeight: (unit: DocumentLayoutUnit) => number | undefined;
};

function isUsableCodeProfile(
  unit: DocumentLayoutUnit,
  profile: CodeMeasurementProfile | undefined,
) {
  return (
    profile !== undefined &&
    unit.codeMetadata !== undefined &&
    profile.unitId === unit.id &&
    profile.lineCount === unit.codeMetadata.lines.length
  );
}

function createAtomicFallback(
  unit: DocumentLayoutUnit,
  getFallbackHeight: CodePreviewStrategyOptions["getFallbackHeight"],
): PreviewStrategyResult {
  return {
    type: "fragment",
    fragment: unit,
    height: getFallbackHeight(unit) ?? 0,
  };
}

export function createCodePreviewStrategy({
  codeProfiles,
  getFallbackHeight,
}: CodePreviewStrategyOptions): PreviewStrategy {
  return {
    name: "code",
    getFirstFragmentHeight: (unit) => {
      const profile = codeProfiles.get(unit.id);
      const usableProfile = isUsableCodeProfile(unit, profile)
        ? profile
        : undefined;

      if (!usableProfile) {
        return getFallbackHeight(unit) ?? null;
      }

      return getCodeFragmentHeight(usableProfile, 0, 1);
    },
    createSession: (unit) => {
      const profile = codeProfiles.get(unit.id);
      const usableProfile = isUsableCodeProfile(unit, profile)
        ? profile
        : undefined;
      let fromLine = 0;
      let completed = false;

      if (!usableProfile) {
        return {
          hasRemaining: () => !completed,
          fit: () => {
            completed = true;
            return createAtomicFallback(unit, getFallbackHeight);
          },
        };
      }

      if (usableProfile.lineCount === 0) {
        return {
          hasRemaining: () => !completed,
          fit: () => {
            completed = true;
            return {
              type: "fragment",
              fragment: unit,
              height: usableProfile.fullHeight,
            };
          },
        };
      }

      return {
        hasRemaining: () => fromLine < usableProfile.lineCount,
        fit: ({ availableHeight, hasPageContent }: PreviewStrategyContext) => {
          const remainingHeight = getCodeFragmentHeight(
            usableProfile,
            fromLine,
            usableProfile.lineCount,
          );

          if (remainingHeight !== null && remainingHeight <= availableHeight) {
            const fragment =
              fromLine === 0
                ? unit
                : createCodeFragment(unit, fromLine, usableProfile.lineCount);

            fromLine = usableProfile.lineCount;

            return {
              type: "fragment",
              fragment,
              height: remainingHeight,
            };
          }

          const fit = findLargestFittingCodeFragment(
            usableProfile,
            fromLine,
            availableHeight,
          );

          if (!fit) {
            fromLine = usableProfile.lineCount;
            return createAtomicFallback(unit, getFallbackHeight);
          }

          if (fit.isOversized && hasPageContent) {
            return { type: "break" };
          }

          fromLine = fit.toLine;

          return {
            type: "fragment",
            fragment: createCodeFragment(unit, fit.fromLine, fit.toLine),
            height: fit.height,
          };
        },
      };
    },
  };
}
