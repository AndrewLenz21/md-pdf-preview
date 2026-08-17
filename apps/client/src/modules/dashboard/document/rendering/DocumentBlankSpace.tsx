export function DocumentBlankSpace({
  lineCount,
  editable = false,
}: {
  lineCount: number;
  editable?: boolean;
}) {
  return (
    <div
      className="document-blank-space"
      aria-hidden={editable ? undefined : "true"}
      style={{
        "--document-blank-line-count": editable ? 1 : lineCount,
      } as React.CSSProperties}
    />
  );
}
