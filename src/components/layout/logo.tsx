import { cn } from "@/lib/utils";

// The source logo is black linework on a transparent background, so it disappears
// against a dark sidebar/card — a white badge keeps it legible in both themes.
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-md bg-white p-1", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mosquee.png" alt="Mosquée de Massy" className="h-full w-auto" />
    </span>
  );
}
