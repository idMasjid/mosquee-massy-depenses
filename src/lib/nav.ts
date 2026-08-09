import type { Role } from "@/lib/constants";
import {
  LayoutDashboard,
  Receipt,
  FolderKanban,
  FileText,
  Tags,
  Users,
  Settings,
  Truck,
  CreditCard,
  ShoppingCart,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
};

export type NavGroup = {
  label: string;
  icon: typeof LayoutDashboard;
  children: NavItem[];
};

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const SETTINGS_ROLES: Role[] = ["ADMIN", "IT"];

export const NAV_ITEMS: NavEntry[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: ["ADMIN", "IT", "BUREAU", "LECTEUR"] },
  { href: "/expenses", label: "Dépenses", icon: Receipt, roles: ["ADMIN", "IT", "BUREAU", "LECTEUR"] },
  { href: "/projects", label: "Projets & budgets", icon: FolderKanban, roles: ["ADMIN", "IT", "BUREAU", "LECTEUR"] },
  { href: "/rapports", label: "Récapitulatif", icon: FileText, roles: ["ADMIN", "IT", "BUREAU", "LECTEUR"] },
  {
    label: "Paramétrage",
    icon: Settings,
    children: [
      { href: "/admin/rubriques", label: "Catégories", icon: Tags, roles: SETTINGS_ROLES },
      { href: "/admin/suppliers", label: "Fournisseurs", icon: Truck, roles: SETTINGS_ROLES },
      { href: "/admin/payment-types", label: "Types de paiement", icon: CreditCard, roles: SETTINGS_ROLES },
      { href: "/admin/purchase-types", label: "Types d'achat", icon: ShoppingCart, roles: SETTINGS_ROLES },
    ],
  },
  { href: "/admin/users", label: "Utilisateurs", icon: Users, roles: ["ADMIN"] },
];

export function navItemsForRole(role: Role): NavEntry[] {
  return NAV_ITEMS.flatMap<NavEntry>((entry) => {
    if (isNavGroup(entry)) {
      const children = entry.children.filter((child) => child.roles.includes(role));
      return children.length > 0 ? [{ ...entry, children }] : [];
    }
    return entry.roles.includes(role) ? [entry] : [];
  });
}
