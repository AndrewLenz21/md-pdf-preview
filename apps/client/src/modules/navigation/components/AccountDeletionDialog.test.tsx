// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import enMessages from "../messages/en.json";
import esMessages from "../messages/es.json";
import itMessages from "../messages/it.json";

const intlState = vi.hoisted(() => ({
  messages: {} as Record<string, unknown>,
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const namespaceValue = namespace
      .split(".")
      .reduce<unknown>((value, segment) => {
        if (typeof value !== "object" || value === null) {
          return undefined;
        }
        return (value as Record<string, unknown>)[segment];
      }, intlState.messages);
    const resolve = (key: string) =>
      key.split(".").reduce<unknown>((value, segment) => {
        if (typeof value !== "object" || value === null) {
          return undefined;
        }
        return (value as Record<string, unknown>)[segment];
      }, namespaceValue);

    return (key: string) => String(resolve(key) ?? key);
  },
}));

import { AccountDeletionDialog } from "./AccountDeletionDialog";

afterEach(() => {
  document.body.innerHTML = "";
});

function renderDialog(messages: Record<string, unknown>, onConfirm = vi.fn()) {
  intlState.messages = { Navigation: messages };
  return {
    onConfirm,
    ...render(
      <AccountDeletionDialog
        open
        onClose={vi.fn()}
        onConfirm={onConfirm}
        isDeleting={false}
        error={null}
      />,
    ),
  };
}

describe("AccountDeletionDialog", () => {
  it("requires explicit confirmation and explains the permanent cloud deletion", () => {
    const { onConfirm } = renderDialog(enMessages);

    expect(
      screen.getByRole("heading", { name: "Delete account permanently?" }),
    ).toBeTruthy();
    expect(screen.getByText("This will permanently delete")).toBeTruthy();
    expect(screen.getByText("Your cloud workspace and synced documents")).toBeTruthy();
    expect(screen.getByText("Documents saved only in this browser")).toBeTruthy();
    expect(screen.getByText("Cancel", { selector: "button" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it.each([
    [esMessages, "Eliminar mi cuenta"],
    [itMessages, "Elimina il mio account"],
  ])("renders the destructive action in the translated locale", (messages, label) => {
    renderDialog(messages);

    expect(screen.getByRole("button", { name: label })).toBeTruthy();
  });

  it("cannot be dismissed while deletion is running", () => {
    intlState.messages = { Navigation: enMessages };
    const onClose = vi.fn();
    render(
      <AccountDeletionDialog
        open
        onClose={onClose}
        onConfirm={vi.fn()}
        isDeleting
        error={null}
      />,
    );

    fireEvent.click(screen.getByText("Cancel", { selector: "button" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Deleting account..." }),
    ).toHaveProperty("disabled", true);
  });
});
