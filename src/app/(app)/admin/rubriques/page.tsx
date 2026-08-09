import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { NewRubriqueDialog } from "@/components/admin/new-rubrique-dialog";
import { SortableRubriquesList } from "@/components/admin/sortable-rubriques-list";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";

export default async function AdminRubriquesPage() {
  await requireRole(["ADMIN", "IT"]);

  const [projects, allowedRubriques, budgetLines] = await Promise.all([
    prisma.project.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
    prisma.allowedRubrique.findMany({ orderBy: [{ order: "asc" }, { rubrique: "asc" }] }),
    prisma.budgetLine.findMany({ select: { projectId: true, rubrique: true } }),
  ]);

  const lineCountByKey = new Map<string, number>();
  for (const bl of budgetLines) {
    const key = `${bl.projectId}::${bl.rubrique}`;
    lineCountByKey.set(key, (lineCountByKey.get(key) ?? 0) + 1);
  }

  const rubriquesByProject = new Map<string, typeof allowedRubriques>();
  for (const r of allowedRubriques) {
    const list = rubriquesByProject.get(r.projectId) ?? [];
    list.push(r);
    rubriquesByProject.set(r.projectId, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <StickyPageHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catégories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Combinaisons Projet / Catégorie autorisées — seules celles listées ici peuvent être choisies lors de
            la création d&apos;une ligne budgétaire ou d&apos;une dépense.
          </p>
        </div>
        <NewRubriqueDialog
          projects={[...projects].sort((a, b) => a.name.localeCompare(b.name, "fr")).map((p) => ({ id: p.id, name: p.name }))}
        />
      </StickyPageHeader>

      {projects.length === 0 && <p className="text-sm text-muted-foreground">Aucun projet pour l&apos;instant.</p>}

      {projects.map((project) => {
        const rubriques = rubriquesByProject.get(project.id) ?? [];
        return (
          <div key={project.id} className="rounded-xl border bg-card">
            <div className="border-b p-4">
              <h2 className="font-semibold">{project.name}</h2>
            </div>
            <SortableRubriquesList
              projectId={project.id}
              rubriques={rubriques.map((r) => ({
                id: r.id,
                rubrique: r.rubrique,
                lineCount: lineCountByKey.get(`${project.id}::${r.rubrique}`) ?? 0,
              }))}
            />
          </div>
        );
      })}
    </div>
  );
}
