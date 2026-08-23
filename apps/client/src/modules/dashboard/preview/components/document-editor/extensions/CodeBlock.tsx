import { textblockTypeInputRule } from "@tiptap/core";
import CodeBlock from "@tiptap/extension-code-block";
import { Check, Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";

const CODE_LANGUAGE_OPTIONS = [
  ["", "Plain text"],
  ["bash", "Bash"],
  ["c", "C"],
  ["cpp", "C++"],
  ["csharp", "C#"],
  ["css", "CSS"],
  ["go", "Go"],
  ["html", "HTML"],
  ["java", "Java"],
  ["javascript", "JavaScript"],
  ["json", "JSON"],
  ["kotlin", "Kotlin"],
  ["markdown", "Markdown"],
  ["php", "PHP"],
  ["python", "Python"],
  ["ruby", "Ruby"],
  ["rust", "Rust"],
  ["scss", "SCSS"],
  ["shell", "Shell"],
  ["sql", "SQL"],
  ["swift", "Swift"],
  ["typescript", "TypeScript"],
  ["xml", "XML"],
] as const;

function CodeBlockView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const language =
    typeof node.attrs.language === "string" ? node.attrs.language : "";
  const hasKnownLanguage = CODE_LANGUAGE_OPTIONS.some(
    ([value]) => value === language,
  );
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);

  useEffect(() => {
    if (menuOpen || !menuMounted) {
      return;
    }

    const timeoutId = window.setTimeout(() => setMenuMounted(false), 170);
    return () => window.clearTimeout(timeoutId);
  }, [menuMounted, menuOpen]);

  const copyCode = async () => {
    if (!navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(node.textContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <NodeViewWrapper
      className="document-code-block"
      onMouseLeave={() => setMenuOpen(false)}
    >
      <div
        className="document-code-block-toolbar"
        contentEditable={false}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => {
          event.stopPropagation();

          if (
            event.target instanceof HTMLElement &&
            event.target.closest("button")
          ) {
            event.preventDefault();
          }
        }}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <select
          aria-label="Code language"
          className="document-code-block-language"
          value={language}
          onChange={(event) =>
            updateAttributes({ language: event.target.value || null })
          }
        >
          {!hasKnownLanguage && language ? (
            <option value={language}>{language}</option>
          ) : null}
          {CODE_LANGUAGE_OPTIONS.map(([value, label]) => (
            <option key={value || "plain-text"} value={value}>
              {label}
            </option>
          ))}
        </select>
        <div className="document-code-block-actions">
          <button
            type="button"
            className="document-code-block-action"
            aria-label={copied ? "Code copied" : "Copy code"}
            title={copied ? "Code copied" : "Copy code"}
            onClick={() => void copyCode()}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </button>
          <div
            className={`document-code-block-menu${menuOpen ? " document-code-block-menu-open" : ""}`}
          >
            <button
              type="button"
              className="document-code-block-action"
              aria-expanded={menuOpen}
              aria-label="More code block options"
              title="More options"
              onClick={() => {
                if (menuOpen) {
                  setMenuOpen(false);
                  return;
                }

                setMenuMounted(true);
                setMenuOpen(true);
              }}
            >
              <MoreHorizontal aria-hidden="true" />
            </button>
            {menuMounted ? (
              <div className="document-code-block-menu-content">
                <button
                  type="button"
                  className="document-code-block-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    deleteNode();
                  }}
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <NodeViewContent<"pre">
        className={`document-code-block-content${language ? ` language-${language}` : ""}`}
      />
    </NodeViewWrapper>
  );
}

export const CodeBlockWithLanguage = CodeBlock.extend({
  addInputRules() {
    const parentInputRules = this.parent?.() ?? [];

    return [
      ...parentInputRules,
      textblockTypeInputRule({
        find: /^```([a-z]+)?$/,
        type: this.type,
        getAttributes: (match) => ({ language: match[1] ?? null }),
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView, {
      contentDOMElementTag: "pre",
    });
  },
});

export { CODE_LANGUAGE_OPTIONS };
