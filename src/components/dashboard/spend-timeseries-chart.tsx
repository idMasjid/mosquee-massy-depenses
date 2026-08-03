"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
// "realise" matches the emerald used everywhere else for réalisé (ConsumptionBar,
// StatTile, status pie chart); "projection" stays neutral since it's an estimate,
// not a status.
const chartConfig = {
  realise: { label: "Cumul réalisé", theme: { light: "#059669", dark: "#34d399" } },
  projection: { label: "Projection", theme: { light: "var(--muted-foreground)", dark: "var(--muted-foreground)" } },
} satisfies ChartConfig;

export type SpendPoint = { month: string; realise?: number; projection?: number };

export function SpendTimeseriesChart({ data }: { data: SpendPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
      <AreaChart data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => `${v}€`} tickLine={false} axisLine={false} width={64} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          type="monotone"
          dataKey="realise"
          stroke="var(--color-realise)"
          fill="var(--color-realise)"
          fillOpacity={0.15}
          strokeWidth={2}
          connectNulls
        />
        <Area
          type="monotone"
          dataKey="projection"
          stroke="var(--color-projection)"
          fill="var(--color-projection)"
          fillOpacity={0.05}
          strokeWidth={2}
          strokeDasharray="5 4"
          connectNulls
        />
      </AreaChart>
    </ChartContainer>
  );
}
