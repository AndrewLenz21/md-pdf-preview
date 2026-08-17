"use client";

import { useLayoutEffect, type RefObject } from "react";

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) {
    return;
  }

  const canvas = textarea.closest<HTMLElement>(".document-preview-canvas");
  const windowScroll = {
    left: window.scrollX,
    top: window.scrollY,
  };
  const canvasScroll = canvas
    ? {
        left: canvas.scrollLeft,
        top: canvas.scrollTop,
      }
    : null;

  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;

  if (canvas && canvasScroll) {
    canvas.scrollLeft = canvasScroll.left;
    canvas.scrollTop = canvasScroll.top;
  }

  if (window.scrollX !== windowScroll.left || window.scrollY !== windowScroll.top) {
    window.scrollTo({
      left: windowScroll.left,
      top: windowScroll.top,
      behavior: "auto",
    });
  }
}

export function MarkdownSourceEditor({
  documentTitle,
  markdown,
  zoom,
  textareaRef,
  onMarkdownChange,
}: {
  documentTitle: string;
  markdown: string;
  zoom: number;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onMarkdownChange: (markdown: string) => void;
}) {
  const zoomFactor = zoom / 100;

  useLayoutEffect(() => {
    resizeTextarea(textareaRef.current);
  }, [markdown, textareaRef, zoom]);

  useLayoutEffect(() => {
    const handleResize = () => resizeTextarea(textareaRef.current);

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [textareaRef]);

  return (
    <div className="markdown-workspace" aria-label={`${documentTitle} Markdown source`}>
      <div className="markdown-editor-column">
        <textarea
          ref={textareaRef}
          value={markdown}
          rows={1}
          onInput={(event) => resizeTextarea(event.currentTarget)}
          onChange={(event) => onMarkdownChange(event.currentTarget.value)}
          placeholder="Start writing or paste Markdown..."
          aria-label={`${documentTitle} Markdown source`}
          spellCheck={false}
          wrap="soft"
          style={{
            "--markdown-editor-font-size": `${15 * zoomFactor}px`,
          } as React.CSSProperties}
          className="markdown-source-editor"
        />
      </div>
    </div>
  );
}
