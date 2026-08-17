import { AuthActions } from "./AuthActions";
import { LanguageSelector } from "./LanguageSelector";
import { ThemeMenu } from "./ThemeMenu";

export function NavbarActions() {
  return (
    <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
      <div className="hidden sm:block">
        <ThemeMenu />
      </div>
      <LanguageSelector />
      <span
        className="mx-1 hidden h-5 w-px bg-border sm:block"
        aria-hidden="true"
      />
      <AuthActions />
    </div>
  );
}
