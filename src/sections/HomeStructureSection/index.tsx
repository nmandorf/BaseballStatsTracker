import {
  Blocks,
  Braces,
  Database,
  Layers3,
  Route,
} from "lucide-react";
import { InfoCard } from "@/components/InfoCard";

const structureItems = [
  {
    title: "Components",
    description:
      "Reusable cards, chips, app-bar controls, and compact display elements.",
    label: "/components",
    icon: Blocks,
    tone: "accent" as const,
  },
  {
    title: "Sections",
    description:
      "Mobile-first screen bands that compose the home app preview.",
    label: "/sections",
    icon: Layers3,
    tone: "default" as const,
  },
  {
    title: "Routes",
    description:
      "App Router pages keep route ownership separate from visual sections.",
    label: "/app",
    icon: Route,
    tone: "default" as const,
  },
  {
    title: "App logic",
    description:
      "Future calculations belong in dedicated modules after OpenSpec approval.",
    label: "/lib",
    icon: Braces,
    tone: "warning" as const,
  },
  {
    title: "Database",
    description:
      "Prisma can store approved records without owning scoring decisions.",
    label: "/prisma",
    icon: Database,
    tone: "success" as const,
  },
];

export function HomeStructureSection() {
  return (
    <section id="structure" className="bg-background py-10 sm:py-14">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
            Organization
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            A clean component map for the approved home surface.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
            The Stitch pass keeps the visual system cohesive while preserving
            the repo boundaries: pages compose sections, sections compose
            components, and future rules stay out of the home UI.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {structureItems.map((item, index) => (
            <InfoCard
              className="min-h-full"
              description={item.description}
              icon={item.icon}
              key={item.title}
              label={`${index + 1}. ${item.label}`}
              tone={item.tone}
              title={item.title}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
