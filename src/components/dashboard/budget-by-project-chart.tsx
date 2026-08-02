"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CHART_COLORS } from "@/lib/chart-colors";
import { fromCents } from "@/lib/money";

const chartConfig = {
  realise: { label: "Réalisé", theme: CHART_COLORS.good },
  engage: { label: "Engagé", theme: CHART_COLORS.blue },
  restant: { label: "Restant", theme: CHART_COLORS.neutralBaseline },
} satisfies ChartConfig;

export type ProjectBudgetDatum = {
  projectName: string;
  realise: number;
  engage: number;
  restant: number;
};

export function BudgetByProjectChart({ data }: { data: ProjectBudgetDatum[] }) {
  const chartData = data.map((d) => ({
    projectName: d.projectName,
    realise: fromCents(d.realise),
    engage: fromCents(d.engage),
    restant: Math.max(fromCents(d.restant), 0),
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={(v) => `${v}€`} />
        <YAxis
          type="category"
          dataKey="projectName"
          width={140}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="realise" stackId="a" fill="var(--color-realise)" radius={[4, 0, 0, 4]} />
        <Bar dataKey="engage" stackId="a" fill="var(--color-engage)" />
        <Bar dataKey="restant" stackId="a" fill="var(--color-restant)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
