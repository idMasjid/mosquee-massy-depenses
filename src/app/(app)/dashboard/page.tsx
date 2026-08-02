import { getBudgetOverview, getStatusBreakdown, getMonthlySpend, getForecastSummary } from "@/lib/aggregations";
import { formatEUR, fromCents } from "@/lib/money";
import { StatTile } from "@/components/dashboard/stat-tile";
import { BudgetByProjectChart } from "@/components/dashboard/budget-by-project-chart";
import { StatusBreakdownChart } from "@/components/dashboard/status-breakdown-chart";
import { SpendTimeseriesChart, type SpendPoint } from "@/components/dashboard/spend-timeseries-chart";

function buildSpendSeries(monthly: { month: string; realiseCents: number }[], runRateCents: number): SpendPoint[] {
  const points: SpendPoint[] = [];
  let cumulative = 0;
  for (const m of monthly) {
    cumulative += m.realiseCents;
    points.push({ month: m.month, realise: fromCents(cumulative) });
  }

  const lastMonth = monthly.at(-1)?.month;
  const now = new Date();
  const currentKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const startKey = lastMonth ?? currentKey;
  const [startYear, startMonthNum] = startKey.split("-").map(Number);

  if (points.length > 0) {
    points[points.length - 1] = { ...points[points.length - 1], projection: points[points.length - 1].realise };
  }

  let projectionCumulative = cumulative;
  for (let i = 1; i <= 12 - startMonthNum; i++) {
    const date = new Date(Date.UTC(startYear, startMonthNum - 1 + i, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    projectionCumulative += runRateCents;
    points.push({ month: key, projection: fromCents(projectionCumulative) });
  }

  return points;
}

export default async function DashboardPage() {
  const [overview, statusBreakdown, monthly, forecast] = await Promise.all([
    getBudgetOverview(),
    getStatusBreakdown(),
    getMonthlySpend(),
    getForecastSummary(),
  ]);

  const byProject = new Map<string, { projectName: string; realise: number; engage: number; restant: number }>();
  for (const line of overview) {
    const entry = byProject.get(line.projectId) ?? {
      projectName: line.projectName,
      realise: 0,
      engage: 0,
      restant: 0,
    };
    entry.realise += line.realiseCents;
    entry.engage += line.engageCents;
    entry.restant += line.remainingCents;
    byProject.set(line.projectId, entry);
  }

  const spendSeries = buildSpendSeries(monthly, forecast.monthlyRunRateCents);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vue d&apos;ensemble des dépenses et du budget.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Budget total" value={formatEUR(forecast.totalBudgetCents)} />
        <StatTile label="Réalisé" value={formatEUR(forecast.totalRealiseCents)} />
        <StatTile label="Engagé (à venir/en attente/validé)" value={formatEUR(forecast.totalEngageCents)} />
        <StatTile
          label="Restant"
          value={formatEUR(forecast.totalRemainingCents)}
          tone={forecast.totalRemainingCents < 0 ? "critical" : "good"}
        />
      </div>

      <StatTile
        label="Projection fin d'exercice (si tout ce qui est engagé se réalise, au rythme actuel)"
        value={formatEUR(forecast.projectedYearEndCents)}
        hint={`Rythme mensuel moyen (3 derniers mois): ${formatEUR(forecast.monthlyRunRateCents)}`}
        tone={forecast.projectedYearEndCents > forecast.totalBudgetCents ? "warning" : "default"}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Budget par projet</h2>
          <BudgetByProjectChart data={[...byProject.values()]} />
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Répartition par statut</h2>
          <StatusBreakdownChart data={statusBreakdown} />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          Dépenses réalisées cumulées &amp; projection
        </h2>
        <SpendTimeseriesChart data={spendSeries} />
      </div>
    </div>
  );
}
