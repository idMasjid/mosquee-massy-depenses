"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, ChevronRight, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatTile } from "@/components/dashboard/stat-tile";
import { ConsumptionBar, DivergingBar, BarTooltip } from "@/components/budget/consumption-bar";
import { consumptionPct } from "@/lib/consumption";
import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { SortableGroup, useSortableItem, DragHandle } from "@/components/ui/sortable";
import { reorderProjectsRapports, reorderBudgetLinesRapports } from "@/lib/actions/project-actions";

export type RecapRow = {
  id: string;
  projectId: string;
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
  const [, startTransition] = useTransition();

  // Local, optimistically-reorderable mirror of `rows`. Manual drag-and-drop
  // only makes sense against the unfiltered/unsorted "natural" order, so this
  // is what group/line reordering below actually mutates.
  const [rowsState, setRowsState] = useState(rows);
  const [prevRows, setPrevRows] = useState(rows);
  if (rows !== prevRows) {
    setPrevRows(rows);
    setRowsState(rows);
  }

  const canDrag = !search.trim() && filter === "all" && !sort.key;

  // First-appearance order in `rowsState` follows the page's rapportsOrder
  // query (independent of the Projets page's own order), so no re-sort here.
  const projectOrder = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const r of rowsState) {
      if (!seen.has(r.projectId)) {
        seen.add(r.projectId);
        list.push({ id: r.projectId, name: r.projectName });
      }
    }
    return list;
  }, [rowsState]);

  const printSnapshot = useRef<{ search: string; filter: FilterMode; openSet: Set<string> } | null>(null);

  useEffect(() => {
    function beforePrint() {
      printSnapshot.current = { search, filter, openSet: new Set(openSet) };
      setSearch("");
      setFilter("all");
      setOpenSet(new Set(projectOrder.map((p) => p.id)));
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
    const budgetCents = rowsState.reduce((s, r) => s + r.budgetCents, 0);
    const realiseCents = rowsState.reduce((s, r) => s + r.realiseCents, 0);
    const engageCents = rowsState.reduce((s, r) => s + r.engageCents, 0);
    const restantCents = budgetCents - realiseCents - engageCents;
    const pctUsed = budgetCents ? Math.round(((realiseCents + engageCents) / budgetCents) * 100) : 0;
    return { budgetCents, realiseCents, engageCents, restantCents, pctUsed };
  }, [rowsState]);

  const overruns = useMemo(
    () => [...rowsState.filter((r) => r.restantCents < 0)].sort((a, b) => a.restantCents - b.restantCents),
    [rowsState],
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
      .map(({ id: projectId, name: projectName }) => {
        const allRows = rowsState.filter((r) => r.projectId === projectId);
        const visibleRows = allRows.filter((r) => matchesFilter(r) && matchesSearch(r));
        const budgetCents = allRows.reduce((s, r) => s + r.budgetCents, 0);
        const realiseCents = allRows.reduce((s, r) => s + r.realiseCents, 0);
        const engageCents = allRows.reduce((s, r) => s + r.engageCents, 0);
        const restantCents = budgetCents - realiseCents - engageCents;
        return { projectId, projectName, allRows, visibleRows, budgetCents, realiseCents, engageCents, restantCents };
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
  }, [projectOrder, rowsState, filter, term, sort]);

  function handleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));
  }

  function toggleGroup(projectId: string, open: boolean) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (open) next.add(projectId);
      else next.delete(projectId);
      return next;
    });
  }

  function handleGroupReorder(orderedProjectIds: string[]) {
    const previous = rowsState;
    const byProject = new Map<string, RecapRow[]>();
    for (const r of rowsState) {
      const list = byProject.get(r.projectId) ?? [];
      list.push(r);
      byProject.set(r.projectId, list);
    }
    const next = orderedProjectIds.flatMap((id) => byProject.get(id) ?? []);
    setRowsState(next);
    startTransition(async () => {
      const result = await reorderProjectsRapports(orderedProjectIds);
      if (!result.success) {
        toast.error(result.error);
        setRowsState(previous);
      }
    });
  }

  function handleLineReorder(projectId: string, orderedLineIds: string[]) {
    const previous = rowsState;
    const linesById = new Map(rowsState.filter((r) => r.projectId === projectId).map((r) => [r.id, r]));
    const reorderedLines = orderedLineIds.map((id) => linesById.get(id)!);
    const next: RecapRow[] = [];
    let inserted = false;
    for (const r of rowsState) {
      if (r.projectId === projectId) {
        if (!inserted) {
          next.push(...reorderedLines);
          inserted = true;
        }
      } else {
        next.push(r);
      }
    }
    setRowsState(next);
    startTransition(async () => {
      const result = await reorderBudgetLinesRapports(projectId, orderedLineIds);
      if (!result.success) {
        toast.error(result.error);
        setRowsState(previous);
      }
    });
  }

  const allOpen = groups.length > 0 && groups.every((g) => openSet.has(g.projectId) || !!term);

  const groupList = (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <RecapGroup
          key={g.projectId}
          g={g}
          isOpen={openSet.has(g.projectId) || !!term}
          onToggle={(open) => toggleGroup(g.projectId, open)}
          sort={sort}
          onSort={handleSort}
          canDrag={canDrag}
          onLineReorder={handleLineReorder}
        />
      ))}
    </div>
  );

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
            placeholder="Rechercher un projet, une catégorie ou un produit…"
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
            onClick={() => setOpenSet(allOpen ? new Set() : new Set(groups.map((g) => g.projectId)))}
          >
            {allOpen ? "Tout replier" : "Tout déplier"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            Exporter en PDF
          </Button>
        </div>

        {!canDrag && (
          <p className="text-xs text-muted-foreground">
            Le glisser-déposer est désactivé pendant une recherche, un filtre ou un tri par colonne — revenez à &quot;Tout&quot; sans tri pour réorganiser.
          </p>
        )}

        <div className="hidden grid-cols-[1.5rem_1fr_7rem_7rem_7rem_11rem_8rem] gap-3 px-4 md:grid">
          <span />
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

      <SortableGroup ids={groups.map((g) => g.projectId)} onReorder={handleGroupReorder}>
        {groupList}
      </SortableGroup>

      <p className="text-xs text-muted-foreground">
        {rowsState.length} ligne{rowsState.length > 1 ? "s" : ""} de dépenses · {projectOrder.length} projet{projectOrder.length > 1 ? "s" : ""}
      </p>
    </div>
  );
}

type Group = {
  projectId: string;
  projectName: string;
  allRows: RecapRow[];
  visibleRows: RecapRow[];
  budgetCents: number;
  realiseCents: number;
  engageCents: number;
  restantCents: number;
};

function RecapGroup({
  g,
  isOpen,
  onToggle,
  sort,
  onSort,
  canDrag,
  onLineReorder,
}: {
  g: Group;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  sort: { key: SortKey | null; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
  canDrag: boolean;
  onLineReorder: (projectId: string, orderedIds: string[]) => void;
}) {
  const { setNodeRef, style, dragHandleProps } = useSortableItem(g.projectId);
  const good = g.restantCents >= 0;
  const pct = consumptionPct(g.budgetCents, g.realiseCents + g.engageCents, g.restantCents);
  const partial = g.visibleRows.length !== g.allRows.length;
  const lineIds = g.visibleRows.map((r) => r.id);

  const rowsSection = (
    <>
      <div className="hidden overflow-x-auto border-t px-2 md:block print:block print:break-inside-auto">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              {canDrag && <TableHead className="w-6 print:hidden" />}
              <TableHead className="w-40">Catégorie</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead className="w-28 text-right">
                <SortButton label="Budgétisé" sortKey="budget" current={sort} onSort={onSort} className="print:hidden" />
                <span className="hidden print:inline">Budgétisé</span>
              </TableHead>
              <TableHead className="w-28 text-right">
                <SortButton label="Réalisé" sortKey="realise" current={sort} onSort={onSort} className="print:hidden" />
                <span className="hidden print:inline">Réalisé</span>
              </TableHead>
              <TableHead className="w-28 text-right">
                <SortButton label="Engagé" sortKey="engage" current={sort} onSort={onSort} className="print:hidden" />
                <span className="hidden print:inline">Engagé</span>
              </TableHead>
              <TableHead className="w-44 text-right">
                <SortButton label="Restant" sortKey="restant" current={sort} onSort={onSort} className="print:hidden" />
                <span className="hidden print:inline">Restant</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {g.visibleRows.map((r) => (
              <RecapLineRow key={r.id} r={r} canDrag={canDrag} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: card list */}
      <div className="flex flex-col gap-2 border-t p-3 md:hidden print:hidden">
        {g.visibleRows.map((r) => (
          <RecapLineCard key={r.id} r={r} canDrag={canDrag} />
        ))}
      </div>
    </>
  );

  return (
    <details
      ref={setNodeRef}
      style={style}
      open={isOpen}
      onToggle={(e) => onToggle((e.target as HTMLDetailsElement).open)}
      className="group rounded-xl border bg-card print:break-inside-auto print:border-neutral-300 print:bg-white"
    >
      <summary className="list-none cursor-pointer p-4 [&::-webkit-details-marker]:hidden print:cursor-default print:break-inside-avoid print:break-after-avoid">
        {/* Desktop: single-row grid */}
        <div className="hidden grid-cols-[1.5rem_1fr_7rem_7rem_7rem_11rem_8rem] items-center gap-3 md:grid print:grid">
          <span onClick={(e) => e.preventDefault()}>
            {canDrag && <DragHandle dragHandleProps={dragHandleProps} className="print:hidden" />}
          </span>
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
            <span className="flex items-center gap-1.5">
              <span className={cn("text-xs tabular-nums", good ? "text-emerald-600 dark:text-emerald-400 print:text-emerald-700" : "text-destructive print:text-red-700")}>
                {pct}%
              </span>
              <DivergingBar
                pct={pct}
                tooltip={
                  <BarTooltip title={g.projectName} budgetCents={g.budgetCents} realiseCents={g.realiseCents} engageCents={g.engageCents} restantCents={g.restantCents} />
                }
                className="h-5 w-20"
              />
            </span>
          </span>
          <StatusPill good={good} className="justify-self-end" />
        </div>

        {/* Mobile: stacked card */}
        <div className="flex flex-col gap-3 md:hidden print:hidden">
          <div className="flex items-start justify-between gap-2">
            <span className="flex items-center font-semibold">
              {canDrag && (
                <span onClick={(e) => e.preventDefault()} className="mr-1">
                  <DragHandle dragHandleProps={dragHandleProps} />
                </span>
              )}
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
            <span className={cn("shrink-0 text-xs tabular-nums", good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
              {pct}%
            </span>
            <DivergingBar
              pct={pct}
              tooltip={
                <BarTooltip title={g.projectName} budgetCents={g.budgetCents} realiseCents={g.realiseCents} engageCents={g.engageCents} restantCents={g.restantCents} />
              }
              className="h-5 flex-1"
            />
            <span className={cn("shrink-0 text-sm font-semibold tabular-nums", good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
              {formatEUR(g.restantCents)}
            </span>
          </div>
        </div>
      </summary>

      <SortableGroup ids={lineIds} onReorder={(ids) => onLineReorder(g.projectId, ids)}>
        {rowsSection}
      </SortableGroup>
    </details>
  );
}

function RecapLineRow({ r, canDrag }: { r: RecapRow; canDrag: boolean }) {
  const { setNodeRef, style, dragHandleProps } = useSortableItem(r.id);
  const rowGood = r.restantCents >= 0;
  const rowPct = consumptionPct(r.budgetCents, r.realiseCents + r.engageCents, r.restantCents);
  return (
    <TableRow ref={canDrag ? setNodeRef : undefined} style={canDrag ? style : undefined} className="print:break-inside-avoid">
      {canDrag && (
        <TableCell className="print:hidden">
          <DragHandle dragHandleProps={dragHandleProps} />
        </TableCell>
      )}
      <TableCell className="whitespace-normal break-words text-muted-foreground">{r.rubrique}</TableCell>
      <TableCell className="whitespace-normal break-words font-medium">{r.productTitle ?? "—"}</TableCell>
      <TableCell className="text-right tabular-nums">{formatEUR(r.budgetCents)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatEUR(r.realiseCents)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatEUR(r.engageCents)}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <span className={cn("text-xs tabular-nums", rowGood ? "text-emerald-600 dark:text-emerald-400 print:text-emerald-700" : "text-destructive print:text-red-700")}>
            {rowPct}%
          </span>
          <DivergingBar
            pct={rowPct}
            tooltip={
              <BarTooltip title={r.productTitle ?? r.rubrique} budgetCents={r.budgetCents} realiseCents={r.realiseCents} engageCents={r.engageCents} restantCents={r.restantCents} />
            }
            className="h-5 w-16"
          />
          <span className={cn("min-w-16 text-right font-semibold tabular-nums", rowGood ? "text-emerald-600 dark:text-emerald-400 print:text-emerald-700" : "text-destructive print:text-red-700")}>
            {formatEUR(r.restantCents)}
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}

function RecapLineCard({ r, canDrag }: { r: RecapRow; canDrag: boolean }) {
  const { setNodeRef, style, dragHandleProps } = useSortableItem(r.id);
  const rowGood = r.restantCents >= 0;
  const rowPct = consumptionPct(r.budgetCents, r.realiseCents + r.engageCents, r.restantCents);
  return (
    <div ref={canDrag ? setNodeRef : undefined} style={canDrag ? style : undefined} className="rounded-lg border bg-background p-3 text-sm">
      <div className="flex items-start gap-2">
        {canDrag && <DragHandle dragHandleProps={dragHandleProps} className="mt-0.5" />}
        <div className="flex-1">
          <p className="font-medium">{r.productTitle ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{r.rubrique}</p>
        </div>
      </div>
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
        <span className={cn("shrink-0 text-xs tabular-nums", rowGood ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
          {rowPct}%
        </span>
        <DivergingBar
          pct={rowPct}
          tooltip={
            <BarTooltip title={r.productTitle ?? r.rubrique} budgetCents={r.budgetCents} realiseCents={r.realiseCents} engageCents={r.engageCents} restantCents={r.restantCents} />
          }
          className="h-5 flex-1"
        />
        <span className={cn("shrink-0 text-sm font-semibold tabular-nums", rowGood ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
          {formatEUR(r.restantCents)}
        </span>
      </div>
    </div>
  );
}
