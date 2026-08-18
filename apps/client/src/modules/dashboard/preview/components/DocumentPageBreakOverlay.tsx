export function DocumentPageBreakOverlay({
  positions,
}: {
  positions: number[];
}) {
  if (positions.length === 0) {
    return null;
  }

  return (
    <div
      className="document-page-break-overlay document-page-break-overlay-document"
      aria-hidden="true"
    >
      {positions.map((position, index) => (
        <div
          className="document-page-break-marker"
          key={`${position}-${index}`}
          style={{ top: position }}
        >
          <span>Possible page break</span>
        </div>
      ))}
    </div>
  );
}
