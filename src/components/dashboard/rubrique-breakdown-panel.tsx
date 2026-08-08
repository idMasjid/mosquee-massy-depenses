"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DivergingBarList, type DivergingBarDatum } from "@/components/dashboard/diverging-bar-list";
import { SortableGroup, useSortableItem, DragHandle } from "@/components/ui/sortable";
import { reorderRubriquesDashboard } from "@/lib/actions/rubrique-actions";

export type ProjectRubriqueBudgetDatum = {
  id: string;
  projectId: string;
  projectName: string;
  rubrique: string;
  dashboardOrder: number;
  budget: number;
  realise: number;
  engage: number;
  restant: number;
};

type ProjectRef = { id: string; name: string };

const PROJECT_FILTER_STORAGE_KEY = "dashboard-categorie-breakdown-project-filter";

function toRubriqueList(rows: ProjectRubriqueBudgetDatum[]): DivergingBarDatum[] {
  const totals = new Map<string, DivergingBarDatum & { dashboardOrder: number }>();
  for (const r of rows) {
    const entry = totals.get(r.id) ?? {
      id: r.id,
      label: r.rubrique,
      dashboardOrder: r.dashboardOrder,
      budget: 0,
      realise: 0,
      engage: 0,
      restant: 0,
    };
    entry.budget += r.budget;
    entry.realise += r.realise;
    entry.engage += r.engage;
    entry.restant += r.restant;
    totals.set(r.id, entry);
  }
  return [...totals.values()].sort((a, b) => a.dashboardOrder - b.dashboardOrder);
}

export function RubriqueBreakdownPanel({
  data,
  projects,
  onReorderProjects,
}: {
  data: ProjectRubriqueBudgetDatum[];
  // Already in the order to display — the "Budget par projet" panel owns the
  // single shared project order (manual drag or "Dépassement" sort) so both
  // panels stay in sync without a page refresh.
  projects: ProjectRef[];
  // Absent (or undefined) while a non-manual sort is active upstream —
  // dragging projects here is disabled in that case, same as during a filter.
  onReorderProjects?: (orderedIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openSet, setOpenSet] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [, startTransition] = useTransition();

  const [dataState, setDataState] = useState(data);
  const [prevData, setPrevData] = useState(data);
  if (data !== prevData) {
    setPrevData(data);
    setDataState(data);
  }

  // Reading localStorage during render would desync from the server-rendered HTML
  // (hydration mismatch), so the restore has to happen post-mount in an effect.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROJECT_FILTER_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setSelected(new Set(JSON.parse(raw)));
    } catch {
      // ignore malformed/unavailable storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(PROJECT_FILTER_STORAGE_KEY, JSON.stringify([...selected]));
  }, [selected, hydrated]);

  function toggleProject(projectId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  // Reordering project groups only makes sense against the full, unfiltered
  // list, and only while the upstream order is the manual one.
  const canDragProjects = selected.size === 0 && !!onReorderProjects;
  const visibleProjects = selected.size === 0 ? projects : projects.filter((p) => selected.has(p.id));

  const groups = useMemo(
    () =>
      visibleProjects
        .map((p) => ({
          projectId: p.id,
          projectName: p.name,
          rows: toRubriqueList(dataState.filter((d) => d.projectId === p.id)),
        }))
        .filter((g) => g.rows.length > 0),
    [visibleProjects, dataState],
  );

  const isOpen = (projectId: string) => (selected.size > 0 ? true : openSet.has(projectId));
  const allOpen = groups.length > 0 && groups.every((g) => openSet.has(g.projectId));

  function toggleOpen(projectId: string, open: boolean) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (open) next.add(projectId);
      else next.delete(projectId);
      return next;
    });
  }

  function handleReorder(projectId: string, orderedIds: string[]) {
    const previous = dataState;
    const byId = new Map(dataState.filter((d) => d.projectId === projectId).map((d) => [d.id, d]));
    const reordered = orderedIds.map((id) => byId.get(id)!);
    const next: ProjectRubriqueBudgetDatum[] = [];
    let inserted = false;
    for (const d of dataState) {
      if (d.projectId === projectId) {
        if (!inserted) {
          next.push(...reordered);
          inserted = true;
        }
      } else {
        next.push(d);
      }
    }
    setDataState(next);
    startTransition(async () => {
      const result = await reorderRubriquesDashboard(projectId, orderedIds);
      if (!result.success) {
        toast.error(result.error);
        setDataState(previous);
      }
    });
  }

  const triggerLabel =
    selected.size === 0
      ? "Tous les projets"
      : selected.size === 1
        ? (projects.find((p) => selected.has(p.id))?.name ?? "1 projet")
        : `${selected.size} projets sélectionnés`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" className="max-w-56 justify-between gap-2">
                <span className="truncate">{triggerLabel}</span>
                <ChevronDown className="size-3.5 shrink-0 opacity-60" />
              </Button>
            }
          />
          <PopoverContent align="start" className="w-64 p-1.5">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-accent"
            >
              Tous les projets
            </button>
            <div className="my-1.5 h-px bg-border" />
            <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
              {projects.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleProject(p.id)} />
                  <span className="truncate">{p.name}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {selected.size === 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenSet(allOpen ? new Set() : new Set(groups.map((g) => g.projectId)))}
          >
            {allOpen ? "Tout replier" : "Tout déplier"}
          </Button>
        )}
      </div>

      {!canDragProjects && (
        <p className="text-xs text-muted-foreground">
          {selected.size > 0
            ? 'Le glisser-déposer des projets est désactivé pendant un filtre — revenez à "Tous les projets" pour réorganiser.'
            : "Le glisser-déposer des projets est désactivé pendant le tri par dépassement."}
        </p>
      )}

      <SortableGroup ids={groups.map((g) => g.projectId)} onReorder={onReorderProjects ?? (() => {})}>
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <RubriqueGroup
              key={g.projectId}
              g={g}
              isOpen={isOpen(g.projectId)}
              onToggle={(open) => toggleOpen(g.projectId, open)}
              canDrag={canDragProjects}
              onLineReorder={handleReorder}
            />
          ))}
        </div>
      </SortableGroup>
    </div>
  );
}

function RubriqueGroup({
  g,
  isOpen,
  onToggle,
  canDrag,
  onLineReorder,
}: {
  g: { projectId: string; projectName: string; rows: DivergingBarDatum[] };
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  canDrag: boolean;
  onLineReorder: (projectId: string, orderedIds: string[]) => void;
}) {
  const { setNodeRef, style, dragHandleProps } = useSortableItem(g.projectId);

  return (
    <details
      ref={setNodeRef}
      style={style}
      open={isOpen}
      onToggle={(e) => onToggle((e.target as HTMLDetailsElement).open)}
      className="group rounded-xl border bg-card"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
        {canDrag && (
          <span onClick={(e) => e.preventDefault()}>
            <DragHandle dragHandleProps={dragHandleProps} />
          </span>
        )}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        {g.projectName}
        <span className="text-xs font-normal text-muted-foreground">
          {g.rows.length} catégorie{g.rows.length > 1 ? "s" : ""}
        </span>
      </summary>
      <div className="border-t px-4">
        <DivergingBarList data={g.rows} onReorder={(ids) => onLineReorder(g.projectId, ids)} />
      </div>
    </details>
  );
}
