import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";

export default async function AdminProjectsPage() {
  await requireRole(["ADMIN", "IT"]);

  const projects = await prisma.project.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <StickyPageHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Création des projets. Les montants budgétaires et l&apos;archivage se gèrent sur la page Budgets.
          </p>
        </div>
        <NewProjectDialog />
      </StickyPageHeader>

      <div className="rounded-xl border bg-card">
        {projects.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Aucun projet pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                <div>
                  <span className="font-medium">{p.name}</span>
                  {p.description && <span className="ml-2 text-muted-foreground">{p.description}</span>}
                </div>
                {!p.isActive && (
                  <span className="rounded-full border border-neutral-300 bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                    Archivé
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
