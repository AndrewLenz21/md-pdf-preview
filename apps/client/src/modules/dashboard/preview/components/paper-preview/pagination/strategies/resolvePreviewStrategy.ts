import type { CodeMeasurementProfile } from "@/modules/dashboard/preview/measurement/measurement.types";

import { createCodePreviewStrategy } from "./code/codePreviewStrategy";
import type { DocumentLayoutUnit } from "../pagination.types";
import type { PreviewStrategy } from "./previewStrategy.types";

type PreviewStrategyResolverOptions = {
  codeProfiles: Map<string, CodeMeasurementProfile>;
  getFallbackHeight: (unit: DocumentLayoutUnit) => number | undefined;
};

export function resolvePreviewStrategy(
  unit: DocumentLayoutUnit,
  options: PreviewStrategyResolverOptions,
): PreviewStrategy | null {
  switch (unit.splittingStrategy) {
    case "code":
      return createCodePreviewStrategy(options);
    case "paragraph":
    case "list":
    case "blankSpace":
    case "atomic":
    default:
      return null;
  }
}
