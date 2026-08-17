import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewUserDialog } from "@/components/admin/new-user-dialog";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";
import { ROLE_LABELS, type Role } from "@/lib/constants";

export default async function AdminUsersPage() {
  await requireRole(["ADMIN"]);

  const users = await prisma.user.findMany({
    orderBy: [{ isPending: "desc" }, { isActive: "desc" }, { name: "asc" }],
  });
  const pendingCount = users.filter((u) => u.isPending).length;

  return (
    <div className="flex flex-col gap-6">
      <StickyPageHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Utilisateurs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez les membres autorisés à se connecter et leur rôle.
            {pendingCount > 0 && (
              <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                {pendingCount} demande{pendingCount > 1 ? "s" : ""} en attente d&apos;approbation
              </span>
            )}
          </p>
        </div>
        <NewUserDialog />
      </StickyPageHeader>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>{ROLE_LABELS[user.role as Role]}</TableCell>
                <TableCell>
                  {user.isPending ? (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      En attente d&apos;approbation
                    </span>
                  ) : user.isPlaceholder ? (
                    <span className="text-xs text-muted-foreground">Compte historique (import)</span>
                  ) : user.isActive ? (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">Actif</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Désactivé</span>
                  )}
                </TableCell>
                <TableCell>
                  <EditUserDialog
                    user={{
                      id: user.id,
                      name: user.name,
                      email: user.email,
                      role: user.role as Role,
                      isActive: user.isActive,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
