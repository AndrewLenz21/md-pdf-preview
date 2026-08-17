// @vitest-environment jsdom

import { fireEvent, render } from "@testing-library/react";
import { useMemo, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isValidMeasurement,
  useBlockMeasurements,
} from "./useBlockMeasurements";

class TestResizeObserver {
  observe() {}

  disconnect() {}
}

function MeasurementHarness({
  unitIds,
  renderedIds = unitIds,
  heights,
  layoutKey,
}: {
  unitIds: string[];
  renderedIds?: string[];
  heights: Record<string, number>;
  layoutKey: string;
}) {
  const measureRoot = useRef<HTMLDivElement>(null);
  const units = useMemo(
    () =>
      unitIds.map((id) => ({
        id,
        parentBlockId: id,
        source: "",
        splittingStrategy: "atomic" as const,
      })),
    [unitIds],
  );
  const state = useBlockMeasurements({ units, measureRoot, layoutKey });

  return (
    <>
      <div ref={measureRoot}>
        {renderedIds.map((id) => (
          <div
            key={id}
            data-document-measure-block={id}
            data-measure-height={heights[id]}
          />
        ))}
      </div>
      <output
        data-complete={String(state.isComplete)}
        data-invalid-unit-ids={state.invalidUnitIds.join(",")}
        data-measurements={JSON.stringify(state.measurements)}
      />
    </>
  );
}

function ParagraphMeasurementHarness({
  renderedCandidateIds,
}: {
  renderedCandidateIds: string[];
}) {
  const measureRoot = useRef<HTMLDivElement>(null);
  const units = useMemo(
    () => [
      {
        id: "paragraph-1",
        parentBlockId: "block-1",
        source: "one two",
        splittingStrategy: "paragraph" as const,
      },
    ],
    [],
  );
  const state = useBlockMeasurements({
    units,
    measureRoot,
    layoutKey: "paragraph-layout",
  });

  return (
    <>
      <div ref={measureRoot}>
        <div
          data-document-measure-block="paragraph-1"
          data-measure-height="20"
        />
        {renderedCandidateIds.map((id, index) => (
          <div
            key={id}
            data-document-measure-paragraph-candidate={id}
            data-measure-height={String((index + 1) * 10)}
          />
        ))}
      </div>
      <output
        data-complete={String(state.isComplete)}
        data-invalid-unit-ids={state.invalidUnitIds.join(",")}
        data-paragraph-profiles={JSON.stringify(state.paragraphProfiles)}
      />
    </>
  );
}

function ListMeasurementHarness() {
  const measureRoot = useRef<HTMLDivElement>(null);
  const units = useMemo(
    () => [
      {
        id: "list-1",
        parentBlockId: "block-1",
        source: "- Alpha\n- Beta\n- Gamma",
        splittingStrategy: "list" as const,
        listMetadata: {
          ordered: false,
          start: 1,
          spread: false,
          items: [
            { index: 0, from: 0, to: 7 },
            { index: 1, from: 8, to: 15 },
            { index: 2, from: 16, to: 23 },
          ],
        },
      },
    ],
    [],
  );
  const state = useBlockMeasurements({
    units,
    measureRoot,
    layoutKey: "list-layout",
  });

  return (
    <>
      <div ref={measureRoot}>
        <div
          data-document-measure-block="list-1"
          data-measure-height="70"
        >
          <ul>
            <li data-measure-height="20" data-measure-top="0">
              Alpha
              <ul>
                <li data-measure-height="99" data-measure-top="20">
                  Nested
                </li>
              </ul>
            </li>
            <li data-measure-height="20" data-measure-top="25">Beta</li>
            <li data-measure-height="20" data-measure-top="50">Gamma</li>
          </ul>
        </div>
      </div>
      <output
        data-complete={String(state.isComplete)}
        data-invalid-unit-ids={state.invalidUnitIds.join(",")}
        data-list-profiles={JSON.stringify(state.listProfiles)}
      />
    </>
  );
}

describe("useBlockMeasurements", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const height = Number(this.dataset.measureHeight ?? "0");
        const top = Number(this.dataset.measureTop ?? "0");

        return {
          bottom: top + height,
          height,
          left: 0,
          right: 0,
          toJSON: () => ({}),
          top,
          width: 0,
          x: 0,
          y: 0,
        };
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("accepts only finite non-negative heights", () => {
    expect(isValidMeasurement(0)).toBe(true);
    expect(isValidMeasurement(24)).toBe(true);
    expect(isValidMeasurement(Number.NaN)).toBe(false);
    expect(isValidMeasurement(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isValidMeasurement(Number.NEGATIVE_INFINITY)).toBe(false);
    expect(isValidMeasurement(-1)).toBe(false);
  });

  it("is incomplete when a required unit is missing", () => {
    const { container } = render(
      <MeasurementHarness
        unitIds={["unit-a", "unit-b"]}
        renderedIds={["unit-a"]}
        heights={{ "unit-a": 24 }}
        layoutKey="layout-a"
      />,
    );

    const output = container.querySelector("output");

    expect(output?.dataset.complete).toBe("false");
    expect(output?.dataset.invalidUnitIds).toBe("unit-b");
  });

  it("rejects invalid heights instead of converting them to zero", () => {
    const { container } = render(
      <MeasurementHarness
        unitIds={["unit-a"]}
        heights={{ "unit-a": Number.NaN }}
        layoutKey="layout-a"
      />,
    );

    const output = container.querySelector("output");

    expect(output?.dataset.complete).toBe("false");
    expect(output?.dataset.invalidUnitIds).toBe("unit-a");
    expect(output?.dataset.measurements).toBe("[]");
  });

  it("remeasures when the layout key changes", () => {
    const unitIds = ["unit-a"];
    const view = render(
      <MeasurementHarness
        unitIds={unitIds}
        heights={{ "unit-a": 24 }}
        layoutKey="layout-a"
      />,
    );

    view.rerender(
      <MeasurementHarness
        unitIds={unitIds}
        heights={{ "unit-a": 48 }}
        layoutKey="layout-b"
      />,
    );

    expect(view.container.querySelector("output")?.dataset.measurements).toBe(
      '[{"id":"unit-a","height":48}]',
    );
  });

  it("schedules another pass when a measurement image loads", () => {
    const requestAnimationFrame = vi.mocked(window.requestAnimationFrame);
    const { container } = render(
      <MeasurementHarness
        unitIds={["unit-a"]}
        heights={{ "unit-a": 24 }}
        layoutKey="layout-a"
      />,
    );
    const image = document.createElement("img");

    container.querySelector("div")?.append(image);
    const callsBeforeLoad = requestAnimationFrame.mock.calls.length;

    fireEvent.load(image);

    expect(requestAnimationFrame.mock.calls.length).toBeGreaterThan(
      callsBeforeLoad,
    );
  });

  it("collects complete browser geometry profiles for plain paragraphs", () => {
    const { container } = render(
      <ParagraphMeasurementHarness
        renderedCandidateIds={[
          "paragraph-1:paragraph:4",
          "paragraph-1:paragraph:7",
        ]}
      />,
    );

    const output = container.querySelector("output");

    expect(output?.dataset.complete).toBe("true");
    expect(output?.dataset.invalidUnitIds).toBe("");
    expect(output?.dataset.paragraphProfiles).toContain('"sourceOffset":7');
  });

  it("is incomplete when a paragraph candidate is missing", () => {
    const { container } = render(
      <ParagraphMeasurementHarness
        renderedCandidateIds={["paragraph-1:paragraph:4"]}
      />,
    );

    const output = container.querySelector("output");

    expect(output?.dataset.complete).toBe("false");
    expect(output?.dataset.invalidUnitIds).toBe("paragraph-1");
  });

  it("measures only direct top-level list items", () => {
    const { container } = render(<ListMeasurementHarness />);
    const output = container.querySelector("output");
    const profiles = JSON.parse(
      output?.dataset.listProfiles ?? "[]",
    ) as Array<{ itemCount: number; items: Array<{ height: number }> }>;

    expect(output?.dataset.complete).toBe("true");
    expect(output?.dataset.invalidUnitIds).toBe("");
    expect(profiles[0]?.itemCount).toBe(3);
    expect(profiles[0]?.items.map((item) => item.height)).toEqual([20, 20, 20]);
  });
});
