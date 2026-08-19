import { AuthActions } from "./AuthActions";

export function NavbarActions() {
  return (
    <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
      <AuthActions />
    </div>
  );
}
