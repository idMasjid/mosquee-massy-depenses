import { DivergingBar, BarTooltip } from "@/components/budget/consumption-bar";
import { consumptionPct } from "@/lib/consumption";
import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";

export type DivergingBarDatum = {
  label: string;
  budget: number;
  realise: number;
  engage: number;
  restant: number;
};

export function DivergingBarList({ data }: { data: DivergingBarDatum[] }) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {data.map((d) => {
        const good = d.restant >= 0;
        const pct = consumptionPct(d.budget, d.realise + d.engage, d.restant);
        return (
          <div key={d.label} className="flex items-center gap-3 py-2.5">
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
                <BarTooltip
                  title={d.label}
                  budgetCents={d.budget}
                  realiseCents={d.realise}
                  engageCents={d.engage}
                  restantCents={d.restant}
                />
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
      })}
    </div>
  );
}
