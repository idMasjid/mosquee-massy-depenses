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
  realise: { label: "Réalisé", theme: { light: "#059669", dark: "#34d399" } },
  engage: { label: "Engagé", theme: CHART_COLORS.blue },
  restant: { label: "Restant", theme: { light: "var(--muted)", dark: "var(--muted)" } },
} satisfies ChartConfig;

const BAR_SIZE = 22;
const ROW_HEIGHT = 44;

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

  const chartHeight = Math.max(160, chartData.length * ROW_HEIGHT + 40);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height: chartHeight }}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }} barSize={BAR_SIZE}>
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
        <Bar dataKey="realise" stackId="a" fill="var(--color-realise)" radius={[BAR_SIZE / 2, 0, 0, BAR_SIZE / 2]} />
        <Bar dataKey="engage" stackId="a" fill="var(--color-engage)" />
        <Bar dataKey="restant" stackId="a" fill="var(--color-restant)" radius={[0, BAR_SIZE / 2, BAR_SIZE / 2, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
