import { requireSession } from "@/lib/rbac";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const { user } = session;

  return (
    <div className="flex min-h-svh">
      <div className="print:hidden">
        <AppSidebar role={user.role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print:hidden">
          <Topbar
            user={{ name: user.name ?? user.email ?? "Utilisateur", email: user.email ?? "", image: user.image, role: user.role }}
          />
        </div>
        <main className="flex-1 overflow-x-hidden p-4 md:p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
