import { describe, expect, it } from "vitest";

import {
  createParagraphMeasurementProfile,
  getLargestFittingParagraphPrefix,
  getParagraphMeasurementCandidates,
  getParagraphSegmentHeight,
} from "./paragraphMeasurement";

const unit = {
  id: "paragraph-1",
  parentBlockId: "block-1",
  source: "First second third fourth",
  splittingStrategy: "paragraph" as const,
};

function createProfile() {
  const candidates = getParagraphMeasurementCandidates(unit);

  return createParagraphMeasurementProfile({
    unitId: unit.id,
    parentBlockId: unit.parentBlockId,
    sourceLength: unit.source.length,
    candidates,
    heights: new Map(
      candidates.map((candidate, index) => [candidate.id, (index + 1) * 10]),
    ),
  });
}

describe("paragraph measurement profiles", () => {
  it("creates direct prefixes only at word boundaries", () => {
    const candidates = getParagraphMeasurementCandidates(unit);

    expect(candidates.map((candidate) => candidate.source)).toEqual([
      "First ",
      "First second ",
      "First second third ",
      unit.source,
    ]);
    expect(candidates.every((candidate) => unit.source.startsWith(candidate.source))).toBe(
      true,
    );
  });

  it("rejects incomplete or non-monotonic browser geometry", () => {
    const candidates = getParagraphMeasurementCandidates(unit);
    const incomplete = createParagraphMeasurementProfile({
      unitId: unit.id,
      parentBlockId: unit.parentBlockId,
      sourceLength: unit.source.length,
      candidates,
      heights: new Map([[candidates[0].id, 10]]),
    });
    const nonMonotonic = createParagraphMeasurementProfile({
      unitId: unit.id,
      parentBlockId: unit.parentBlockId,
      sourceLength: unit.source.length,
      candidates,
      heights: new Map(
        candidates.map((candidate, index) => [
          candidate.id,
          index === 1 ? 5 : (index + 1) * 10,
        ]),
      ),
    });

    expect(incomplete).toBeNull();
    expect(nonMonotonic).toBeNull();
  });

  it("selects the largest prefix that fits and marks an oversized first word", () => {
    const profile = createProfile();

    expect(profile).not.toBeNull();

    if (!profile) {
      return;
    }

    expect(getLargestFittingParagraphPrefix(profile, 0, 25)).toMatchObject({
      point: { sourceOffset: 13 },
      height: 20,
      isOversized: false,
    });
    expect(getParagraphSegmentHeight(profile, 13, profile.sourceLength)).toBe(
      20,
    );
    expect(getLargestFittingParagraphPrefix(profile, 0, 5)).toMatchObject({
      point: { sourceOffset: 6 },
      height: 10,
      isOversized: true,
    });
  });
});
