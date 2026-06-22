export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full border border-border px-4 py-1 text-sm text-muted-foreground">
        Outegro ID
      </span>
      <h1 className="max-w-2xl text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
        Sign in to Outegro
      </h1>
      <p className="max-w-md text-pretty text-muted-foreground">
        One account for every Outegro product.
      </p>
      <code className="rounded bg-accent px-3 py-1 text-accent-foreground text-sm">
        hello from id-web
      </code>
    </main>
  );
}
