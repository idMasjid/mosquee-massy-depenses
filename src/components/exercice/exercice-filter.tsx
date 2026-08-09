"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CURRENT_EXERCICE_YEAR, serializeExerciceSelection, type ExerciceSelection } from "@/lib/exercice";

export function ExerciceFilter({
  availableYears,
  selection,
}: {
  availableYears: number[];
  selection: ExerciceSelection;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isAll = selection === "all";
  const selectedYears = isAll ? [] : selection;

  function apply(next: ExerciceSelection) {
    const params = new URLSearchParams(searchParams.toString());
    const isDefault = next !== "all" && next.length === 1 && next[0] === CURRENT_EXERCICE_YEAR;
    if (isDefault) params.delete("exercices");
    else params.set("exercices", serializeExerciceSelection(next));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function toggleYear(year: number) {
    const base = isAll ? availableYears : selectedYears;
    const set = new Set(base);
    if (set.has(year)) set.delete(year);
    else set.add(year);
    const next = [...set].sort((a, b) => b - a);
    apply(next.length ? next : [CURRENT_EXERCICE_YEAR]);
  }

  const triggerLabel = isAll
    ? "Tous les exercices"
    : selectedYears.length === 1
      ? `Exercice ${selectedYears[0]}`
      : `${selectedYears.length} exercices`;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="justify-between gap-2">
            <span>{triggerLabel}</span>
            <ChevronDown className="size-3.5 shrink-0 opacity-60" />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-52 p-1.5">
        <button
          type="button"
          onClick={() => apply([CURRENT_EXERCICE_YEAR])}
          className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-accent"
        >
          Exercice en cours ({CURRENT_EXERCICE_YEAR})
        </button>
        <button
          type="button"
          onClick={() => apply("all")}
          className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-accent"
        >
          Toutes les années
        </button>
        <div className="my-1.5 h-px bg-border" />
        <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {availableYears.map((year) => (
            <label
              key={year}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Checkbox checked={isAll || selectedYears.includes(year)} onCheckedChange={() => toggleYear(year)} />
              <span>{year}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
