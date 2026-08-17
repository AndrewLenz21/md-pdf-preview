import { Navbar } from "@/modules/navigation";
import { locales } from "@/core/i18n";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main
        id="product"
        className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8"
      >
        <section className="w-full max-w-3xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Document workspace
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-foreground sm:text-6xl">
            Write once. Preview every page.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            A calm place to shape your documents and see how they will read when
            they leave the screen.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-px w-10 bg-border" />
            <span>Markdown in, printable clarity out.</span>
          </div>
        </section>
      </main>
    </div>
  );
}
