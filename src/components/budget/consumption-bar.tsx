"use client";

import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";

export function BarTooltip({
  title,
  budgetCents,
  realiseCents,
  engageCents,
  restantCents,
}: {
  title: string;
  budgetCents: number;
  realiseCents: number;
  engageCents: number;
  restantCents: number;
}) {
  const pctUsed = budgetCents > 0 ? Math.round(((realiseCents + engageCents) / budgetCents) * 100) : null;
  return (
    <div className="grid min-w-40 gap-1.5">
      <p className="font-medium">{title}</p>
      <div className="grid gap-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 shrink-0 rounded-[2px] bg-emerald-600" /> Réalisé
          </span>
          <span className="font-mono tabular-nums">{formatEUR(realiseCents)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 shrink-0 rounded-[2px] bg-blue-500" /> Engagé
          </span>
          <span className="font-mono tabular-nums">{formatEUR(engageCents)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 shrink-0 rounded-[2px] bg-muted-foreground/40" /> Restant
          </span>
          <span className={cn("font-mono tabular-nums", restantCents < 0 && "text-destructive")}>
            {formatEUR(restantCents)}
          </span>
        </div>
      </div>
      <p className="text-muted-foreground">
        {pctUsed !== null ? `${pctUsed}% du budget consommé` : "Aucun budget alloué"}
      </p>
    </div>
  );
}

export function ConsumptionBar({
  pct,
  good,
  tooltip,
  className,
}: {
  pct: number;
  good: boolean;
  tooltip?: ReactNode;
  className?: string;
}) {
  const width = Math.min(Math.abs(pct), 100);
  const trackClassName = cn("h-3 overflow-hidden rounded-full bg-muted print:bg-neutral-200", className);
  const fill = (
    <div
      className={cn(
        "h-full rounded-full",
        good ? "bg-emerald-600 print:bg-emerald-700" : "bg-destructive print:bg-red-600",
      )}
      style={{ width: `${width}%` }}
    />
  );

  if (!tooltip) {
    return <div className={trackClassName}>{fill}</div>;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<div className={trackClassName} />}>{fill}</TooltipTrigger>
      <TooltipContent className="print:hidden">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Diverging "restant" bar: grows left (red) from a centered zero-axis when over
 * budget, right (green) when budget remains. `pct` is the restant % (can exceed
 * ±100, visually clamped at ±100).
 */
export function DivergingBar({
  pct,
  tooltip,
  className,
}: {
  pct: number;
  tooltip?: ReactNode;
  className?: string;
}) {
  const good = pct >= 0;
  const magnitude = Math.min(Math.abs(pct), 100);
  const trackClassName = cn(
    "relative flex h-3 w-full overflow-hidden rounded-full bg-muted print:bg-neutral-200",
    className,
  );
  const bar = (
    <>
      <div className="absolute inset-y-0 left-1/2 z-10 w-px bg-border" />
      <div className="flex h-full w-1/2 justify-end">
        {!good && (
          <div
            className="h-full rounded-l-full bg-destructive print:bg-red-600"
            style={{ width: `${magnitude}%` }}
          />
        )}
      </div>
      <div className="flex h-full w-1/2 justify-start">
        {good && (
          <div
            className="h-full rounded-r-full bg-emerald-600 print:bg-emerald-700"
            style={{ width: `${magnitude}%` }}
          />
        )}
      </div>
    </>
  );

  if (!tooltip) {
    return <div className={trackClassName}>{bar}</div>;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<div className={trackClassName} />}>{bar}</TooltipTrigger>
      <TooltipContent className="print:hidden">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
