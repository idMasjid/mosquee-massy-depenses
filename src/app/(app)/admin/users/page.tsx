import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { getAppSettings } from "@/lib/settings";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewUserDialog } from "@/components/admin/new-user-dialog";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import { LocalAuthToggle } from "@/components/admin/local-auth-toggle";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";
import { ROLE_LABELS, type Role } from "@/lib/constants";

const LOGIN_EVENTS_WINDOW_DAYS = 30;
const LOGIN_EVENTS_LIMIT = 500;

const LOGIN_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  SUCCESS: { label: "Connecté", className: "text-emerald-600 dark:text-emerald-400" },
  DENIED: { label: "Refusé", className: "text-destructive" },
  PENDING: { label: "En attente", className: "text-amber-600 dark:text-amber-400" },
};

const LOGIN_PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  credentials: "Email + mot de passe",
};

const loginDateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export default async function AdminUsersPage() {
  await requireRole(["ADMIN"]);

  const since = daysAgo(LOGIN_EVENTS_WINDOW_DAYS);
  const [users, appSettings, loginEvents] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ isPending: "desc" }, { isActive: "desc" }, { name: "asc" }] }),
    getAppSettings(),
    prisma.loginEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: LOGIN_EVENTS_LIMIT,
    }),
  ]);
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
                {`${pendingCount} demande${pendingCount > 1 ? "s" : ""} en attente d'approbation`}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <LocalAuthToggle initialEnabled={appSettings.localAuthEnabled} />
          <NewUserDialog />
        </div>
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

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Connexions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tentatives de connexion des {LOGIN_EVENTS_WINDOW_DAYS} derniers jours.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Localisation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Aucune connexion enregistrée sur cette période.
                  </TableCell>
                </TableRow>
              ) : (
                loginEvents.map((event) => {
                  const status = LOGIN_STATUS_LABELS[event.status] ?? { label: event.status, className: "" };
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {loginDateFormatter.format(event.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{event.name ?? event.email}</div>
                        {event.name && <div className="text-xs text-muted-foreground">{event.email}</div>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {LOGIN_PROVIDER_LABELS[event.provider] ?? event.provider}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${status.className}`}>{status.label}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{event.ip ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{event.location ?? "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
