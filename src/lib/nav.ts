import type { Role } from "@/lib/constants";
import { LayoutDashboard, Receipt, FolderKanban, FileText, Users } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: ["ADMIN", "IT", "BUREAU"] },
  { href: "/expenses", label: "Dépenses", icon: Receipt, roles: ["ADMIN", "IT", "BUREAU"] },
  { href: "/projects", label: "Projets & budgets", icon: FolderKanban, roles: ["ADMIN", "IT", "BUREAU"] },
  { href: "/rapports", label: "Récapitulatif", icon: FileText, roles: ["ADMIN", "IT", "BUREAU"] },
  { href: "/admin/users", label: "Utilisateurs", icon: Users, roles: ["ADMIN"] },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
