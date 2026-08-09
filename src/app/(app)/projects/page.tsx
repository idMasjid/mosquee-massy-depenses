import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { getAvailableExerciceYears, getBudgetOverview } from "@/lib/aggregations";
import { parseExerciceParam } from "@/lib/exercice";
import { ExerciceFilter } from "@/components/exercice/exercice-filter";
import { NewBudgetLineDialog } from "@/components/projects/new-budget-line-dialog";
import { SortableProjectsList } from "@/components/projects/sortable-projects-list";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ exercices?: string }>;
}) {
  const session = await requireSession();
  const canManage = session.user.role === "ADMIN" || session.user.role === "IT";

  const { exercices } = await searchParams;
  const selection = parseExerciceParam(exercices);

  const [projects, availableYears, overview, allowedRubriques] = await Promise.all([
    prisma.project.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
    getAvailableExerciceYears(),
    getBudgetOverview(selection),
    prisma.allowedRubrique.findMany({ orderBy: [{ order: "asc" }, { rubrique: "asc" }] }),
  ]);

  const linesByProject = new Map<string, typeof overview>();
  for (const line of overview) {
    const list = linesByProject.get(line.projectId) ?? [];
    list.push(line);
    linesByProject.set(line.projectId, list);
  }

  const projectsWithLines = projects.map((project) => ({
    project: { id: project.id, name: project.name, description: project.description, isActive: project.isActive },
    lines: linesByProject.get(project.id) ?? [],
  }));

  return (
    <div className="flex flex-col gap-6">
      <StickyPageHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivi des budgets alloués par projet et catégorie.
          </p>
        </div>
        <div className="flex gap-2">
          <ExerciceFilter availableYears={availableYears} selection={selection} />
          {canManage && (
            <NewBudgetLineDialog
              projects={projects.filter((p) => p.isActive).map((p) => ({ id: p.id, name: p.name }))}
              allowedRubriques={allowedRubriques.map((r) => ({ id: r.id, projectId: r.projectId, rubrique: r.rubrique }))}
            />
          )}
        </div>
      </StickyPageHeader>

      <SortableProjectsList
        projectsWithLines={projectsWithLines}
        canManage={canManage}
        allowedRubriques={allowedRubriques.map((r) => ({ id: r.id, projectId: r.projectId, rubrique: r.rubrique }))}
      />
    </div>
  );
}
