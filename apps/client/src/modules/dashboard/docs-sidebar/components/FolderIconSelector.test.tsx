// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ModalShell } from "@/shared/components/ModalShell";

import { FolderIconSelector } from "./FolderIconSelector";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("FolderIconSelector", () => {
  it("renders the desktop icon menu in a body portal outside the modal content", () => {
    render(
      <ModalShell
        open
        onClose={() => {}}
        title="New folder"
        closeLabel="Close folder dialog"
      >
        <FolderIconSelector
          icon="folder"
          onChange={() => {}}
          onOpenChange={() => {}}
        />
      </ModalShell>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Folder icon: Folder" }),
    );

    const menu = screen.getByRole("listbox", { name: "Folder icon options" });
    const modalContent = document.body.querySelector(".modal-shell-content");

    expect(modalContent).toBeTruthy();
    expect(modalContent?.contains(menu)).toBe(false);
    expect(menu.parentElement).toBe(document.body);
    expect(menu.className).toContain("fixed");
    expect(menu.className).toContain("z-[400]");
    expect(screen.getAllByRole("option")).toHaveLength(16);
  });

  it("applies the selected folder color to the trigger icon and updates it", () => {
    const { rerender } = render(
      <FolderIconSelector
        icon="folder"
        color="blue"
        onChange={() => {}}
        onOpenChange={() => {}}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Folder icon: Folder" }).className,
    ).toContain("text-sky-500");

    rerender(
      <FolderIconSelector
        icon="folder"
        color="rose"
        onChange={() => {}}
        onOpenChange={() => {}}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Folder icon: Folder" }).className,
    ).toContain("text-rose-500");
  });

  it("selects an icon and closes the menu with an exit animation", async () => {
    const onChange = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <FolderIconSelector
        icon="folder"
        onChange={onChange}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Folder icon: Folder" }),
    );
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    const menu = screen.getByRole("listbox", { name: "Folder icon options" });
    expect(menu.className).toContain("workspace-menu-popover-enter");

    fireEvent.click(
      screen.getByRole("option", { name: "Use Briefcase folder icon" }),
    );

    expect(onChange).toHaveBeenCalledWith("briefcase");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(
      screen.getByRole("listbox", { name: "Folder icon options" }).className,
    ).toContain("workspace-menu-popover-exit");

    await waitFor(() => {
      expect(
        screen.queryByRole("listbox", { name: "Folder icon options" }),
      ).toBeNull();
    });
  });
});
