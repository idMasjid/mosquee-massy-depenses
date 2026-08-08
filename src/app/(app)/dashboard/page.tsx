import { prisma } from "@/lib/prisma";
import { getBudgetOverview, getMonthlySpend, getForecastSummary } from "@/lib/aggregations";
import { formatEUR, fromCents } from "@/lib/money";
import { StatTile } from "@/components/dashboard/stat-tile";
import { DashboardProjectPanels } from "@/components/dashboard/dashboard-project-panels";
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
  const [overview, monthly, forecast, dashboardProjects, allowedRubriques] = await Promise.all([
    getBudgetOverview(),
    getMonthlySpend(),
    getForecastSummary(),
    prisma.project.findMany({ orderBy: [{ dashboardOrder: "asc" }, { name: "asc" }], select: { id: true } }),
    prisma.allowedRubrique.findMany({ select: { id: true, projectId: true, rubrique: true, dashboardOrder: true } }),
  ]);
  // Independent from the Projets page's own order — reordering "Budget par
  // projet" below only moves things on this dashboard.
  const dashboardRank = new Map(dashboardProjects.map((p, i) => [p.id, i]));
  const allowedRubriqueByKey = new Map(allowedRubriques.map((r) => [`${r.projectId}::${r.rubrique}`, r]));

  const byProject = new Map<
    string,
    { projectName: string; budget: number; realise: number; engage: number; restant: number }
  >();
  const rubriqueBudgets = new Map<
    string,
    {
      id: string;
      projectId: string;
      projectName: string;
      rubrique: string;
      dashboardOrder: number;
      budget: number;
      realise: number;
      engage: number;
      restant: number;
    }
  >();
  for (const line of overview) {
    const entry = byProject.get(line.projectId) ?? {
      projectName: line.projectName,
      budget: 0,
      realise: 0,
      engage: 0,
      restant: 0,
    };
    entry.budget += line.budgetedAmountHTCents;
    entry.realise += line.realiseCents;
    entry.engage += line.engageCents;
    entry.restant += line.remainingCents;
    byProject.set(line.projectId, entry);

    const rubriqueKey = `${line.projectId}::${line.rubrique}`;
    const allowed = allowedRubriqueByKey.get(rubriqueKey);
    const rubriqueEntry = rubriqueBudgets.get(rubriqueKey) ?? {
      id: allowed?.id ?? rubriqueKey,
      projectId: line.projectId,
      projectName: line.projectName,
      rubrique: line.rubrique,
      dashboardOrder: allowed?.dashboardOrder ?? 0,
      budget: 0,
      realise: 0,
      engage: 0,
      restant: 0,
    };
    rubriqueEntry.budget += line.budgetedAmountHTCents;
    rubriqueEntry.realise += line.realiseCents;
    rubriqueEntry.engage += line.engageCents;
    rubriqueEntry.restant += line.remainingCents;
    rubriqueBudgets.set(rubriqueKey, rubriqueEntry);
  }

  const byProjectSorted = [...byProject.entries()].sort(
    (a, b) => (dashboardRank.get(a[0]) ?? 0) - (dashboardRank.get(b[0]) ?? 0),
  );

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

      <DashboardProjectPanels
        projectBudgets={byProjectSorted.map(([id, p]) => ({ id, label: p.projectName, ...p }))}
        rubriqueData={[...rubriqueBudgets.values()]}
      />

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          Dépenses réalisées cumulées &amp; projection
        </h2>
        <SpendTimeseriesChart data={spendSeries} />
      </div>
    </div>
  );
}
