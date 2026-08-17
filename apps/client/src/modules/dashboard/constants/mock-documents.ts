import type { MockDocument } from "../document/model/document.types";

const PROJECT_RESEARCH_MARKDOWN = `# Project Research

This working document collects the clearest product signals before they become a proposal.

<aside>
🎯 **Core idea:** Make it easy to move from a loose thought to a clear, printable document without leaving the workspace.
</aside>

## What we are learning

People return to a document when its context is visible at a glance. Recent work, source notes, and the current page should live together without competing for attention.

- Keep the first reading surface focused and calm.
- Make document history easy to scan from the left edge.
- Let the paper carry hierarchy instead of surrounding chrome.

## Open questions

1. Which export settings are essential for a first release?
2. How should long source material become structured notes?
3. When does a document need a second page?
`;

export const MOCK_DOCUMENTS: MockDocument[] = [
  {
    id: "project-research",
    title: "Project Research",
    group: "recent",
    updatedAt: "Edited today",
    content: PROJECT_RESEARCH_MARKDOWN,
  },
  {
    id: "product-proposal",
    title: "Product proposal",
    group: "recent",
    updatedAt: "Edited yesterday",
  },
  {
    id: "research-notes",
    title: "Research notes",
    group: "recent",
    updatedAt: "Edited 3 days ago",
  },
  {
    id: "meeting-notes",
    title: "Meeting notes",
    group: "documents",
    updatedAt: "Edited Monday",
  },
  {
    id: "architecture",
    title: "Architecture",
    group: "documents",
    updatedAt: "Edited last week",
  },
  {
    id: "roadmap",
    title: "Roadmap",
    group: "documents",
    updatedAt: "Edited last week",
  },
  {
    id: "ideas",
    title: "Ideas",
    group: "documents",
    updatedAt: "Edited 2 weeks ago",
  },
];

export const SELECTED_DOCUMENT_ID = "project-research";
