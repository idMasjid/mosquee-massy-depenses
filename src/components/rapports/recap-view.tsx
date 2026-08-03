"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronRight, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatTile } from "@/components/dashboard/stat-tile";
import { ConsumptionBar, BarTooltip } from "@/components/budget/consumption-bar";
import { consumptionPct } from "@/lib/consumption";
import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";

export type RecapRow = {
  id: string;
  projectName: string;
  rubrique: string;
  productTitle: string | null;
  budgetCents: number;
  realiseCents: number;
  engageCents: number;
  restantCents: number;
};

type SortKey = "budget" | "realise" | "engage" | "restant";
type FilterMode = "all" | "over" | "under";
type CentsField = "budgetCents" | "realiseCents" | "engageCents" | "restantCents";

const SORT_FIELD: Record<SortKey, CentsField> = {
  budget: "budgetCents",
  realise: "realiseCents",
  engage: "engageCents",
  restant: "restantCents",
};

function StatusPill({ good, className }: { good: boolean; className?: string }) {
  return (
    <Badge
      variant={good ? "outline" : "destructive"}
      className={cn(
        good &&
          "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 print:border-emerald-300 print:bg-white print:text-emerald-700",
        !good && "print:border-red-300 print:bg-white print:text-red-700",
        className,
      )}
    >
      {good ? "Dans le budget" : "Dépassé"}
    </Badge>
  );
}

function SortButton({
  label,
  sortKey,
  current,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  current: { key: SortKey | null; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = current.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "text-right text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground",
        active && "text-foreground",
        className,
      )}
    >
      {label} {active && (current.dir === "asc" ? "▲" : "▼")}
    </button>
  );
}

export function RecapView({ rows }: { rows: RecapRow[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<{ key: SortKey | null; dir: "asc" | "desc" }>({ key: null, dir: "desc" });
  const [openSet, setOpenSet] = useState<Set<string>>(new Set());

  const projectOrder = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const r of rows) {
      if (!seen.has(r.projectName)) {
        seen.add(r.projectName);
        names.push(r.projectName);
      }
    }
    return names.sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const printSnapshot = useRef<{ search: string; filter: FilterMode; openSet: Set<string> } | null>(null);

  useEffect(() => {
    function beforePrint() {
      printSnapshot.current = { search, filter, openSet: new Set(openSet) };
      setSearch("");
      setFilter("all");
      setOpenSet(new Set(projectOrder));
    }
    function afterPrint() {
      if (!printSnapshot.current) return;
      setSearch(printSnapshot.current.search);
      setFilter(printSnapshot.current.filter);
      setOpenSet(printSnapshot.current.openSet);
      printSnapshot.current = null;
    }
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, [search, filter, openSet, projectOrder]);

  const totals = useMemo(() => {
    const budgetCents = rows.reduce((s, r) => s + r.budgetCents, 0);
    const realiseCents = rows.reduce((s, r) => s + r.realiseCents, 0);
    const engageCents = rows.reduce((s, r) => s + r.engageCents, 0);
    const restantCents = budgetCents - realiseCents - engageCents;
    const pctUsed = budgetCents ? Math.round(((realiseCents + engageCents) / budgetCents) * 100) : 0;
    return { budgetCents, realiseCents, engageCents, restantCents, pctUsed };
  }, [rows]);

  const overruns = useMemo(
    () => [...rows.filter((r) => r.restantCents < 0)].sort((a, b) => a.restantCents - b.restantCents),
    [rows],
  );

  const matchesFilter = (r: RecapRow) => {
    if (filter === "over") return r.restantCents < 0;
    if (filter === "under") return r.restantCents >= 0;
    return true;
  };
  const term = search.trim().toLowerCase();
  const matchesSearch = (r: RecapRow) =>
    !term || `${r.projectName} ${r.rubrique} ${r.productTitle ?? ""}`.toLowerCase().includes(term);

  const groups = useMemo(() => {
    let list = projectOrder
      .map((projectName) => {
        const allRows = rows.filter((r) => r.projectName === projectName);
        const visibleRows = allRows.filter((r) => matchesFilter(r) && matchesSearch(r));
        const budgetCents = allRows.reduce((s, r) => s + r.budgetCents, 0);
        const realiseCents = allRows.reduce((s, r) => s + r.realiseCents, 0);
        const engageCents = allRows.reduce((s, r) => s + r.engageCents, 0);
        const restantCents = budgetCents - realiseCents - engageCents;
        return { projectName, allRows, visibleRows, budgetCents, realiseCents, engageCents, restantCents };
      })
      .filter((g) => g.visibleRows.length > 0);

    if (sort.key) {
      const field = SORT_FIELD[sort.key];
      const dirMul = sort.dir === "asc" ? 1 : -1;
      list = list.map((g) => ({
        ...g,
        visibleRows: [...g.visibleRows].sort((a, b) => ((a[field] as number) - (b[field] as number)) * dirMul),
      }));
      list = [...list].sort((a, b) => (a[field] - b[field]) * dirMul);
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectOrder, rows, filter, term, sort]);

  function handleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));
  }

  function toggleGroup(name: string, open: boolean) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (open) next.add(name);
      else next.delete(name);
      return next;
    });
  }

  const allOpen = groups.length > 0 && groups.every((g) => openSet.has(g.projectName) || !!term);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Budget total" value={formatEUR(totals.budgetCents)} />
        <div className="rounded-xl border bg-card p-4 print:border-neutral-300 print:bg-white">
          <p className="text-sm text-muted-foreground">Réalisé</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatEUR(totals.realiseCents)}</p>
          <ConsumptionBar
            pct={Math.min(totals.pctUsed, 100)}
            good
            tooltip={
              <BarTooltip
                title="Budget total"
                budgetCents={totals.budgetCents}
                realiseCents={totals.realiseCents}
                engageCents={totals.engageCents}
                restantCents={totals.restantCents}
              />
            }
            className="mt-3 w-full [&>div]:bg-primary print:[&>div]:bg-neutral-700"
          />
        </div>
        <StatTile label="Engagé" value={formatEUR(totals.engageCents)} />
        <StatTile
          label="Restant"
          value={formatEUR(totals.restantCents)}
          tone={totals.restantCents < 0 ? "critical" : "good"}
        />
      </div>

      {overruns.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm print:border-red-300 print:bg-red-50">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive print:text-red-700" />
          <p>
            <strong className="text-destructive print:text-red-700">{overruns.length} ligne{overruns.length > 1 ? "s" : ""}</strong>{" "}
            dépassent leur budget, pour un dépassement cumulé de{" "}
            <strong className="text-destructive print:text-red-700">
              {formatEUR(overruns.reduce((s, r) => s + r.restantCents, 0))}
            </strong>
            . Les plus marquées : {overruns.slice(0, 3).map((r) => `${r.productTitle ?? r.rubrique} (${formatEUR(r.restantCents)})`).join(" · ")}.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Rechercher un projet, une rubrique ou un produit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:max-w-xs"
          />
          <div className="flex overflow-hidden rounded-lg border">
            {(
              [
                { key: "all", label: "Tout" },
                { key: "over", label: "Dépassements" },
                { key: "under", label: "Dans le budget" },
              ] as { key: FilterMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFilter(opt.key)}
                className={cn(
                  "border-l px-3 py-1.5 text-sm first:border-l-0",
                  filter === opt.key
                    ? "bg-accent font-medium text-accent-foreground"
                    : "bg-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenSet(allOpen ? new Set() : new Set(groups.map((g) => g.projectName)))}
          >
            {allOpen ? "Tout replier" : "Tout déplier"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            Exporter en PDF
          </Button>
        </div>

        <div className="hidden grid-cols-[1fr_7rem_7rem_7rem_11rem_8rem] gap-3 px-4 md:grid">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Projet</span>
          <SortButton label="Budgétisé" sortKey="budget" current={sort} onSort={handleSort} />
          <SortButton label="Réalisé" sortKey="realise" current={sort} onSort={handleSort} />
          <SortButton label="Engagé" sortKey="engage" current={sort} onSort={handleSort} />
          <SortButton label="Restant" sortKey="restant" current={sort} onSort={handleSort} />
        </div>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune ligne ne correspond à la recherche.</p>
      )}

      <div className="flex flex-col gap-3">
        {groups.map((g) => {
          const good = g.restantCents >= 0;
          const pct = consumptionPct(g.budgetCents, g.realiseCents + g.engageCents, g.restantCents);
          const isOpen = openSet.has(g.projectName) || !!term;
          const partial = g.visibleRows.length !== g.allRows.length;

          return (
            <details
              key={g.projectName}
              open={isOpen}
              onToggle={(e) => toggleGroup(g.projectName, (e.target as HTMLDetailsElement).open)}
              className="group rounded-xl border bg-card print:break-inside-auto print:border-neutral-300 print:bg-white"
            >
              <summary className="list-none cursor-pointer p-4 [&::-webkit-details-marker]:hidden print:cursor-default print:break-inside-avoid print:break-after-avoid">
                {/* Desktop: single-row grid */}
                <div className="hidden grid-cols-[1fr_7rem_7rem_7rem_11rem_8rem] items-center gap-3 md:grid print:grid">
                  <span className="flex items-center gap-2 font-semibold">
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 print:hidden" />
                    {g.projectName}
                    <span className="text-xs font-normal text-muted-foreground">
                      {partial ? `${g.visibleRows.length}/${g.allRows.length} lignes` : `${g.allRows.length} ligne${g.allRows.length > 1 ? "s" : ""}`}
                    </span>
                  </span>
                  <span className="text-right text-sm tabular-nums">{formatEUR(g.budgetCents)}</span>
                  <span className="text-right text-sm tabular-nums">{formatEUR(g.realiseCents)}</span>
                  <span className="text-right text-sm tabular-nums">{formatEUR(g.engageCents)}</span>
                  <span className="flex flex-col items-end gap-1.5">
                    <span className={cn("text-right text-sm font-semibold tabular-nums", good ? "text-emerald-600 dark:text-emerald-400 print:text-emerald-700" : "text-destructive print:text-red-700")}>
                      {formatEUR(g.restantCents)}
                    </span>
                    <ConsumptionBar
                      pct={pct}
                      good={good}
                      tooltip={
                        <BarTooltip
                          title={g.projectName}
                          budgetCents={g.budgetCents}
                          realiseCents={g.realiseCents}
                          engageCents={g.engageCents}
                          restantCents={g.restantCents}
                        />
                      }
                      className="w-20"
                    />
                  </span>
                  <StatusPill good={good} className="justify-self-end" />
                </div>

                {/* Mobile: stacked card */}
                <div className="flex flex-col gap-3 md:hidden print:hidden">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center font-semibold">
                      <ChevronRight className="mr-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                      {g.projectName}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {partial ? `${g.visibleRows.length}/${g.allRows.length} lignes` : `${g.allRows.length} ligne${g.allRows.length > 1 ? "s" : ""}`}
                      </span>
                    </span>
                    <StatusPill good={good} className="shrink-0" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Budgétisé</p>
                      <p className="tabular-nums">{formatEUR(g.budgetCents)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Réalisé</p>
                      <p className="tabular-nums">{formatEUR(g.realiseCents)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Engagé</p>
                      <p className="tabular-nums">{formatEUR(g.engageCents)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ConsumptionBar
                      pct={pct}
                      good={good}
                      tooltip={
                        <BarTooltip
                          title={g.projectName}
                          budgetCents={g.budgetCents}
                          realiseCents={g.realiseCents}
                          engageCents={g.engageCents}
                          restantCents={g.restantCents}
                        />
                      }
                      className="flex-1"
                    />
                    <span className={cn("shrink-0 text-sm font-semibold tabular-nums", good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                      {formatEUR(g.restantCents)}
                    </span>
                  </div>
                </div>
              </summary>

              <div className="hidden overflow-x-auto border-t px-2 md:block print:block print:break-inside-auto">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Rubrique</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead className="w-28 text-right">
                        <SortButton label="Budgétisé" sortKey="budget" current={sort} onSort={handleSort} className="print:hidden" />
                        <span className="hidden print:inline">Budgétisé</span>
                      </TableHead>
                      <TableHead className="w-28 text-right">
                        <SortButton label="Réalisé" sortKey="realise" current={sort} onSort={handleSort} className="print:hidden" />
                        <span className="hidden print:inline">Réalisé</span>
                      </TableHead>
                      <TableHead className="w-28 text-right">
                        <SortButton label="Engagé" sortKey="engage" current={sort} onSort={handleSort} className="print:hidden" />
                        <span className="hidden print:inline">Engagé</span>
                      </TableHead>
                      <TableHead className="w-44 text-right">
                        <SortButton label="Restant" sortKey="restant" current={sort} onSort={handleSort} className="print:hidden" />
                        <span className="hidden print:inline">Restant</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.visibleRows.map((r) => {
                      const rowGood = r.restantCents >= 0;
                      const rowPct = consumptionPct(r.budgetCents, r.realiseCents + r.engageCents, r.restantCents);
                      return (
                        <TableRow key={r.id} className="print:break-inside-avoid">
                          <TableCell className="whitespace-normal break-words text-muted-foreground">{r.rubrique}</TableCell>
                          <TableCell className="whitespace-normal break-words font-medium">{r.productTitle ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatEUR(r.budgetCents)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatEUR(r.realiseCents)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatEUR(r.engageCents)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <ConsumptionBar
                                pct={rowPct}
                                good={rowGood}
                                tooltip={
                                  <BarTooltip
                                    title={r.productTitle ?? r.rubrique}
                                    budgetCents={r.budgetCents}
                                    realiseCents={r.realiseCents}
                                    engageCents={r.engageCents}
                                    restantCents={r.restantCents}
                                  />
                                }
                                className="w-16"
                              />
                              <span
                                className={cn(
                                  "min-w-16 text-right font-semibold tabular-nums",
                                  rowGood ? "text-emerald-600 dark:text-emerald-400 print:text-emerald-700" : "text-destructive print:text-red-700",
                                )}
                              >
                                {formatEUR(r.restantCents)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: card list */}
              <div className="flex flex-col gap-2 border-t p-3 md:hidden print:hidden">
                {g.visibleRows.map((r) => {
                  const rowGood = r.restantCents >= 0;
                  const rowPct = consumptionPct(r.budgetCents, r.realiseCents + r.engageCents, r.restantCents);
                  return (
                    <div key={r.id} className="rounded-lg border bg-background p-3 text-sm">
                      <p className="font-medium">{r.productTitle ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.rubrique}</p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Budgétisé</p>
                          <p className="tabular-nums">{formatEUR(r.budgetCents)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Réalisé</p>
                          <p className="tabular-nums">{formatEUR(r.realiseCents)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Engagé</p>
                          <p className="tabular-nums">{formatEUR(r.engageCents)}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <ConsumptionBar
                          pct={rowPct}
                          good={rowGood}
                          tooltip={
                            <BarTooltip
                              title={r.productTitle ?? r.rubrique}
                              budgetCents={r.budgetCents}
                              realiseCents={r.realiseCents}
                              engageCents={r.engageCents}
                              restantCents={r.restantCents}
                            />
                          }
                          className="flex-1"
                        />
                        <span
                          className={cn(
                            "shrink-0 text-sm font-semibold tabular-nums",
                            rowGood ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                          )}
                        >
                          {formatEUR(r.restantCents)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {rows.length} ligne{rows.length > 1 ? "s" : ""} de dépenses · {projectOrder.length} projet{projectOrder.length > 1 ? "s" : ""}
      </p>
    </div>
  );
}
