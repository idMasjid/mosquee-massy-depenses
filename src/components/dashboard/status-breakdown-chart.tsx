"use client";

import { Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CHART_COLORS } from "@/lib/chart-colors";
import { STATUS_LABELS, type ExpenseStatus } from "@/lib/constants";
import { fromCents } from "@/lib/money";

// Matches the emerald/destructive/amber scale used for consumption bars (StatTile,
// ConsumptionBar) and the blue already used for "Engagé" in the budget charts, so the
// same status reads the same color everywhere on the dashboard.
const STATUS_THEME: Record<ExpenseStatus, { light: string; dark: string }> = {
  A_VENIR: { light: "#64748b", dark: "#94a3b8" }, // slate-500 / slate-400
  EN_ATTENTE: { light: "#d97706", dark: "#fbbf24" }, // amber-600 / amber-400
  VALIDE: CHART_COLORS.blue,
  REALISE: { light: "#059669", dark: "#34d399" }, // emerald-600 / emerald-400
  REJETE: { light: "var(--destructive)", dark: "var(--destructive)" },
  ANNULE: { light: "#a3a3a3", dark: "#737373" }, // neutral-400 / neutral-500
};

const chartConfig = Object.fromEntries(
  (Object.keys(STATUS_LABELS) as ExpenseStatus[]).map((status) => [
    status,
    { label: STATUS_LABELS[status], theme: STATUS_THEME[status] },
  ]),
) satisfies ChartConfig;

export function StatusBreakdownChart({
  data,
}: {
  data: { status: ExpenseStatus; count: number; totalCents: number }[];
}) {
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({
      status: d.status,
      amount: fromCents(d.totalCents),
      count: d.count,
      fill: `var(--color-${d.status})`,
    }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
        <Pie data={chartData} dataKey="amount" nameKey="status" innerRadius={55} outerRadius={90} paddingAngle={2} />
        <ChartLegend content={<ChartLegendContent nameKey="status" />} />
      </PieChart>
    </ChartContainer>
  );
}
