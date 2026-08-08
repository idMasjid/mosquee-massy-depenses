"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsumptionBar, BarTooltip } from "@/components/budget/consumption-bar";
import { consumptionPct } from "@/lib/consumption";
import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { SortableGroup, useSortableItem, DragHandle } from "@/components/ui/sortable";
import { reorderProjects, reorderBudgetLines } from "@/lib/actions/project-actions";
import { EditBudgetLineDialog } from "@/components/projects/edit-budget-line-dialog";
import { ArchiveProjectButton } from "@/components/projects/archive-project-button";
import { ArchiveBudgetLineButton } from "@/components/projects/archive-budget-line-button";
import type { BudgetLineTotal } from "@/lib/aggregations";

type ProjectSummary = { id: string; name: string; description: string | null; isActive: boolean };
type AllowedRubriqueSummary = { id: string; projectId: string; rubrique: string };
type LineWithConsumption = BudgetLineTotal & { good: boolean; pct: number };

export function SortableProjectsList({
  projectsWithLines,
  canManage,
  allowedRubriques,
}: {
  projectsWithLines: { project: ProjectSummary; lines: BudgetLineTotal[] }[];
  canManage: boolean;
  allowedRubriques: AllowedRubriqueSummary[];
}) {
  const [items, setItems] = useState(projectsWithLines);
  const [prevProjectsWithLines, setPrevProjectsWithLines] = useState(projectsWithLines);
  const [, startTransition] = useTransition();

  if (projectsWithLines !== prevProjectsWithLines) {
    setPrevProjectsWithLines(projectsWithLines);
    setItems(projectsWithLines);
  }

  const ids = items.map((i) => i.project.id);

  function handleReorder(orderedIds: string[]) {
    const previous = items;
    const reordered = orderedIds.map((id) => items.find((i) => i.project.id === id)!);
    setItems(reordered);
    startTransition(async () => {
      const result = await reorderProjects(orderedIds);
      if (!result.success) {
        toast.error(result.error);
        setItems(previous);
      }
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun projet pour l&apos;instant.</p>;
  }

  return (
    <SortableGroup ids={ids} onReorder={handleReorder}>
      <div className="flex flex-col gap-6">
        {items.map(({ project, lines }) => (
          <ProjectCard
            key={project.id}
            project={project}
            lines={lines}
            canManage={canManage}
            allowedRubriques={allowedRubriques}
          />
        ))}
      </div>
    </SortableGroup>
  );
}

function ProjectCard({
  project,
  lines,
  canManage,
  allowedRubriques,
}: {
  project: ProjectSummary;
  lines: BudgetLineTotal[];
  canManage: boolean;
  allowedRubriques: AllowedRubriqueSummary[];
}) {
  const { setNodeRef, style, dragHandleProps } = useSortableItem(project.id);

  const [lineItems, setLineItems] = useState(lines);
  const [prevLines, setPrevLines] = useState(lines);
  const [, startTransition] = useTransition();

  if (lines !== prevLines) {
    setPrevLines(lines);
    setLineItems(lines);
  }

  const linesWithConsumption: LineWithConsumption[] = lineItems.map((line) => ({
    ...line,
    good: line.remainingCents >= 0,
    pct: consumptionPct(line.budgetedAmountHTCents, line.realiseCents + line.engageCents, line.remainingCents),
  }));
  const totalBudget = lineItems.reduce((s, l) => s + l.budgetedAmountHTCents, 0);
  const totalRealise = lineItems.reduce((s, l) => s + l.realiseCents, 0);
  const totalEngage = lineItems.reduce((s, l) => s + l.engageCents, 0);
  const totalRestant = totalBudget - totalRealise - totalEngage;
  const totalGood = totalRestant >= 0;
  const totalPct = consumptionPct(totalBudget, totalRealise + totalEngage, totalRestant);

  const lineIds = lineItems.map((l) => l.budgetLineId);

  function handleLineReorder(orderedIds: string[]) {
    const previous = lineItems;
    const reordered = orderedIds.map((id) => lineItems.find((l) => l.budgetLineId === id)!);
    setLineItems(reordered);
    startTransition(async () => {
      const result = await reorderBudgetLines(project.id, orderedIds);
      if (!result.success) {
        toast.error(result.error);
        setLineItems(previous);
      }
    });
  }

  return (
    <div ref={setNodeRef} style={style} className={cn("rounded-xl border bg-card", !project.isActive && "opacity-60")}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div className="flex items-start gap-2">
          <DragHandle dragHandleProps={dragHandleProps} className="mt-1" />
          <div>
            <span className="flex items-center gap-2">
              <h2 className="font-semibold">{project.name}</h2>
              {!project.isActive && <Badge variant="outline">Archivé</Badge>}
            </span>
            {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex flex-col items-end gap-1.5">
            <span className="text-xs text-muted-foreground">
              {formatEUR(totalRealise + totalEngage)} / {formatEUR(totalBudget)}
            </span>
            <span
              className={cn(
                "text-right text-sm font-semibold tabular-nums",
                totalGood ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
              )}
            >
              {formatEUR(totalRestant)} restant
            </span>
          </span>
          <ConsumptionBar
            pct={totalPct}
            good={totalGood}
            tooltip={
              <BarTooltip
                title={project.name}
                budgetCents={totalBudget}
                realiseCents={totalRealise}
                engageCents={totalEngage}
                restantCents={totalRestant}
              />
            }
            className="w-24"
          />
          {canManage && <ArchiveProjectButton id={project.id} name={project.name} isActive={project.isActive} />}
        </div>
      </div>
      {lineItems.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">Aucune ligne budgétaire.</p>}

      {lineItems.length > 0 && (
        <SortableGroup ids={lineIds} onReorder={handleLineReorder}>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Réalisé</TableHead>
                  <TableHead className="text-right">Engagé</TableHead>
                  <TableHead className="text-right">Restant</TableHead>
                  {canManage && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {linesWithConsumption.map((line) => (
                  <BudgetLineRow key={line.budgetLineId} line={line} canManage={canManage} allowedRubriques={allowedRubriques} />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 p-3 md:hidden">
            {linesWithConsumption.map((line) => (
              <BudgetLineCard key={line.budgetLineId} line={line} canManage={canManage} allowedRubriques={allowedRubriques} />
            ))}
          </div>
        </SortableGroup>
      )}
    </div>
  );
}

function BudgetLineRow({
  line,
  canManage,
  allowedRubriques,
}: {
  line: LineWithConsumption;
  canManage: boolean;
  allowedRubriques: AllowedRubriqueSummary[];
}) {
  const { setNodeRef, style, dragHandleProps } = useSortableItem(line.budgetLineId);

  return (
    <TableRow ref={setNodeRef} style={style} className={cn(!line.isActive && "opacity-60")}>
      <TableCell>
        <DragHandle dragHandleProps={dragHandleProps} />
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-2">
          {line.rubrique}
          {!line.isActive && <Badge variant="outline">Archivée</Badge>}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">{line.productTitle ?? "—"}</TableCell>
      <TableCell className="text-right">{formatEUR(line.budgetedAmountHTCents)}</TableCell>
      <TableCell className="text-right">{formatEUR(line.realiseCents)}</TableCell>
      <TableCell className="text-right">{formatEUR(line.engageCents)}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <ConsumptionBar
            pct={line.pct}
            good={line.good}
            tooltip={
              <BarTooltip
                title={line.productTitle ?? line.rubrique}
                budgetCents={line.budgetedAmountHTCents}
                realiseCents={line.realiseCents}
                engageCents={line.engageCents}
                restantCents={line.remainingCents}
              />
            }
            className="w-16"
          />
          <span
            className={cn(
              "min-w-16 text-right font-semibold tabular-nums",
              line.good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
            )}
          >
            {formatEUR(line.remainingCents)}
          </span>
        </div>
      </TableCell>
      {canManage && (
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            <EditBudgetLineDialog
              line={{
                id: line.budgetLineId,
                projectId: line.projectId,
                rubrique: line.rubrique,
                productTitle: line.productTitle,
                budgetedAmountHTCents: line.budgetedAmountHTCents,
              }}
              allowedRubriques={allowedRubriques}
            />
            <ArchiveBudgetLineButton id={line.budgetLineId} label={line.productTitle ?? line.rubrique} isActive={line.isActive} />
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

function BudgetLineCard({
  line,
  canManage,
  allowedRubriques,
}: {
  line: LineWithConsumption;
  canManage: boolean;
  allowedRubriques: AllowedRubriqueSummary[];
}) {
  const { setNodeRef, style, dragHandleProps } = useSortableItem(line.budgetLineId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("rounded-lg border bg-background p-3 text-sm", !line.isActive && "opacity-60")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <DragHandle dragHandleProps={dragHandleProps} className="mt-0.5" />
          <div>
            <p className="font-medium">{line.productTitle ?? "—"}</p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              {line.rubrique}
              {!line.isActive && <Badge variant="outline">Archivée</Badge>}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            <EditBudgetLineDialog
              line={{
                id: line.budgetLineId,
                projectId: line.projectId,
                rubrique: line.rubrique,
                productTitle: line.productTitle,
                budgetedAmountHTCents: line.budgetedAmountHTCents,
              }}
              allowedRubriques={allowedRubriques}
            />
            <ArchiveBudgetLineButton id={line.budgetLineId} label={line.productTitle ?? line.rubrique} isActive={line.isActive} />
          </div>
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Budget</p>
          <p className="tabular-nums">{formatEUR(line.budgetedAmountHTCents)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Réalisé</p>
          <p className="tabular-nums">{formatEUR(line.realiseCents)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Engagé</p>
          <p className="tabular-nums">{formatEUR(line.engageCents)}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <ConsumptionBar
          pct={line.pct}
          good={line.good}
          tooltip={
            <BarTooltip
              title={line.productTitle ?? line.rubrique}
              budgetCents={line.budgetedAmountHTCents}
              realiseCents={line.realiseCents}
              engageCents={line.engageCents}
              restantCents={line.remainingCents}
            />
          }
          className="flex-1"
        />
        <span
          className={cn(
            "shrink-0 text-sm font-semibold tabular-nums",
            line.good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
          )}
        >
          {formatEUR(line.remainingCents)}
        </span>
      </div>
    </div>
  );
}
