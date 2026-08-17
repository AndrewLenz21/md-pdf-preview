export function PaperFooter({
  documentTitle,
  pageNumber,
}: {
  documentTitle: string;
  pageNumber: number;
}) {
  return (
    <footer className="document-page-footer" aria-hidden="true">
      <span className="truncate">{documentTitle}</span>
      <span className="shrink-0 tabular-nums">{pageNumber}</span>
    </footer>
  );
}
