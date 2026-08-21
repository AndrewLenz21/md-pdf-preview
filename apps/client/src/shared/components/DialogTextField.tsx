"use client";

import { useId } from "react";

/**
 * Renders the labeled text input shared by folder and document dialogs while
 * leaving value ownership and validation in the feature-specific component.
 */
export function DialogTextField({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const inputId = useId();

  return (
    <label htmlFor={inputId} className="block space-y-2">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <input
        id={inputId}
        autoFocus={autoFocus}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        placeholder={placeholder}
      />
    </label>
  );
}
