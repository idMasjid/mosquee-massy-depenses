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

const STATUS_THEME: Record<ExpenseStatus, { light: string; dark: string }> = {
  A_VENIR: CHART_COLORS.neutralMuted,
  EN_ATTENTE: CHART_COLORS.warning,
  VALIDE: CHART_COLORS.blue,
  REALISE: CHART_COLORS.good,
  REJETE: CHART_COLORS.critical,
  ANNULE: CHART_COLORS.neutralSecondary,
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
