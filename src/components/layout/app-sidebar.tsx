import Link from "next/link";
import { NavLinks } from "@/components/layout/nav-links";
import { Logo } from "@/components/layout/logo";
import type { Role } from "@/lib/constants";

export function AppSidebar({ role }: { role: Role }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Logo className="h-9" />
          <span className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">Dépenses</span>
            <span className="text-xs text-muted-foreground leading-tight">Mosquée de Massy</span>
          </span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks role={role} />
      </div>
    </aside>
  );
}
