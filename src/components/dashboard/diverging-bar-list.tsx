"use client";

import { DivergingBar, BarTooltip } from "@/components/budget/consumption-bar";
import { consumptionPct } from "@/lib/consumption";
import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { SortableGroup, useSortableItem, DragHandle } from "@/components/ui/sortable";

export type DivergingBarDatum = {
  id: string;
  label: string;
  budget: number;
  realise: number;
  engage: number;
  restant: number;
};

function BarRowContent({ d, dragHandleProps }: { d: DivergingBarDatum; dragHandleProps?: Record<string, unknown> }) {
  const good = d.restant >= 0;
  const pct = consumptionPct(d.budget, d.realise + d.engage, d.restant);
  return (
    <div className="flex items-center gap-3 py-2.5">
      {dragHandleProps && <DragHandle dragHandleProps={dragHandleProps} />}
      <span className="w-36 shrink-0 truncate text-sm font-medium" title={d.label}>
        {d.label}
      </span>
      <span
        className={cn(
          "w-11 shrink-0 text-right text-xs tabular-nums",
          good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
        )}
      >
        {pct}%
      </span>
      <DivergingBar
        pct={pct}
        tooltip={
          <BarTooltip title={d.label} budgetCents={d.budget} realiseCents={d.realise} engageCents={d.engage} restantCents={d.restant} />
        }
        className="h-5 flex-1"
      />
      <span
        className={cn(
          "w-24 shrink-0 text-right text-sm font-semibold tabular-nums",
          good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
        )}
      >
        {formatEUR(d.restant)}
      </span>
    </div>
  );
}

function SortableBarRow({ d }: { d: DivergingBarDatum }) {
  const { setNodeRef, style, dragHandleProps } = useSortableItem(d.id);
  return (
    <div ref={setNodeRef} style={style}>
      <BarRowContent d={d} dragHandleProps={dragHandleProps} />
    </div>
  );
}

export function DivergingBarList({
  data,
  onReorder,
}: {
  data: DivergingBarDatum[];
  onReorder?: (orderedIds: string[]) => void;
}) {
  if (onReorder) {
    return (
      <SortableGroup ids={data.map((d) => d.id)} onReorder={onReorder}>
        <div className="flex flex-col divide-y divide-border">
          {data.map((d) => (
            <SortableBarRow key={d.id} d={d} />
          ))}
        </div>
      </SortableGroup>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {data.map((d) => (
        <div key={d.id}>
          <BarRowContent d={d} />
        </div>
      ))}
    </div>
  );
}
