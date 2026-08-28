// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";

import { MarkdownNameDialog } from "./MarkdownNameDialog";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("MarkdownNameDialog", () => {
  it("shows the Cloud name limit and sends long pasted text to the note body", () => {
    const onLongPaste = vi.fn();
    const onNameChange = vi.fn();
    const pastedText = "x".repeat(201);

    render(
      <NextIntlClientProvider locale="en" messages={{ Dashboard: messages }}>
        <MarkdownNameDialog
          open
          parentName="Cloud workspace"
          name=""
          source="cloud"
          onNameChange={onNameChange}
          onLongPaste={onLongPaste}
          onClose={() => {}}
          onSubmit={() => {}}
        />
      </NextIntlClientProvider>,
    );

    fireEvent.paste(screen.getByLabelText("File name"), {
      clipboardData: { getData: () => pastedText },
    });

    expect(screen.getByText("0 / 500")).toBeTruthy();
    expect(onLongPaste).toHaveBeenCalledWith(pastedText);
    expect(onNameChange).not.toHaveBeenCalled();
  });
});
