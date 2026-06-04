export default function Home() {
  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm space-y-3">
        <p className="text-sm font-medium text-foreground/60">Project scaffold</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Baseball Stat Tracker
        </h1>
        <p className="text-base leading-7 text-foreground/70">
          Next.js, TypeScript, Tailwind CSS, shadcn/ui, and Prisma are ready for
          the first OpenSpec-approved feature.
        </p>
      </div>
    </main>
  );
}
