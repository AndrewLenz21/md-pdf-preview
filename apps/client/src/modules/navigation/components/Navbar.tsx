import { NavbarActions } from "./NavbarActions";
import { NavbarLinks } from "./NavbarLinks";
import { NavbarLogo } from "./NavbarLogo";
import { MobileNavigation } from "./MobileNavigation";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <NavbarLogo />
        <NavbarLinks />
        <div className="hidden justify-self-end lg:block">
          <NavbarActions />
        </div>
        <MobileNavigation />
      </div>
    </header>
  );
}
