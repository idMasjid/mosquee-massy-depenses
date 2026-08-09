import { cn } from "@/lib/utils";

// Pins a page's title/action-buttons row to the top of the <main> scroll
// area (see (app)/layout.tsx) so it stays visible while the content below
// scrolls — the negative margins/padding cancel out <main>'s own padding so
// the pinned block spans edge-to-edge with no gap above or at the sides.
export function StickyPageHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-4 -mt-4 border-b bg-background px-4 pt-4 pb-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
