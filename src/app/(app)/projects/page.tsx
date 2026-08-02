import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { getBudgetOverview } from "@/lib/aggregations";
import { formatEUR } from "@/lib/money";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { NewBudgetLineDialog } from "@/components/projects/new-budget-line-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ProjectsPage() {
  const session = await requireSession();
  const canManage = session.user.role === "ADMIN" || session.user.role === "IT";

  const [projects, overview] = await Promise.all([
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    getBudgetOverview(),
  ]);

  const linesByProject = new Map<string, typeof overview>();
  for (const line of overview) {
    const list = linesByProject.get(line.projectId) ?? [];
    list.push(line);
    linesByProject.set(line.projectId, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projets &amp; budgets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivi des budgets alloués par projet et rubrique.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <NewProjectDialog />
            <NewBudgetLineDialog projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
          </div>
        )}
      </div>

      {projects.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun projet pour l&apos;instant.</p>
      )}

      {projects.map((project) => {
        const lines = linesByProject.get(project.id) ?? [];
        const totalBudget = lines.reduce((s, l) => s + l.budgetedAmountHTCents, 0);
        const totalSpent = lines.reduce((s, l) => s + l.realiseCents + l.engageCents, 0);

        return (
          <div key={project.id} className="rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
              <div>
                <h2 className="font-semibold">{project.name}</h2>
                {project.description && (
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatEUR(totalSpent)} / {formatEUR(totalBudget)}
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rubrique</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Réalisé</TableHead>
                    <TableHead className="text-right">Engagé</TableHead>
                    <TableHead className="text-right">Restant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Aucune ligne budgétaire.
                      </TableCell>
                    </TableRow>
                  )}
                  {lines.map((line) => (
                    <TableRow key={line.budgetLineId}>
                      <TableCell>{line.rubrique}</TableCell>
                      <TableCell className="text-muted-foreground">{line.productTitle ?? "—"}</TableCell>
                      <TableCell className="text-right">{formatEUR(line.budgetedAmountHTCents)}</TableCell>
                      <TableCell className="text-right">{formatEUR(line.realiseCents)}</TableCell>
                      <TableCell className="text-right">{formatEUR(line.engageCents)}</TableCell>
                      <TableCell
                        className={`text-right ${line.remainingCents < 0 ? "text-destructive" : ""}`}
                      >
                        {formatEUR(line.remainingCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
