import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { NewRubriqueDialog } from "@/components/admin/new-rubrique-dialog";
import { EditRubriqueDialog } from "@/components/admin/edit-rubrique-dialog";
import { DeleteRubriqueButton } from "@/components/admin/delete-rubrique-button";

export default async function AdminRubriquesPage() {
  await requireRole(["ADMIN", "IT"]);

  const [projects, allowedRubriques, budgetLines] = await Promise.all([
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    prisma.allowedRubrique.findMany({ orderBy: { rubrique: "asc" } }),
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catégories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Combinaisons Projet / Catégorie autorisées — seules celles listées ici peuvent être choisies lors de
            la création d&apos;une ligne budgétaire ou d&apos;une dépense.
          </p>
        </div>
        <NewRubriqueDialog projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
      </div>

      {projects.length === 0 && <p className="text-sm text-muted-foreground">Aucun projet pour l&apos;instant.</p>}

      {projects.map((project) => {
        const rubriques = rubriquesByProject.get(project.id) ?? [];
        return (
          <div key={project.id} className="rounded-xl border bg-card">
            <div className="border-b p-4">
              <h2 className="font-semibold">{project.name}</h2>
            </div>
            {rubriques.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Aucune catégorie autorisée pour ce projet.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {rubriques.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                    <span>{r.rubrique}</span>
                    <div className="flex items-center gap-1">
                      <EditRubriqueDialog
                        id={r.id}
                        rubrique={r.rubrique}
                        lineCount={lineCountByKey.get(`${project.id}::${r.rubrique}`) ?? 0}
                      />
                      <DeleteRubriqueButton
                        id={r.id}
                        rubrique={r.rubrique}
                        lineCount={lineCountByKey.get(`${project.id}::${r.rubrique}`) ?? 0}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
