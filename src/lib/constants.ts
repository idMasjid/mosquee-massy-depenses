export const ROLES = ["ADMIN", "IT", "BUREAU"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  IT: "Équipe IT",
  BUREAU: "Bureau",
};

export const EXPENSE_STATUSES = [
  "A_VENIR",
  "EN_ATTENTE",
  "VALIDE",
  "REALISE",
  "REJETE",
  "ANNULE",
] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const STATUS_LABELS: Record<ExpenseStatus, string> = {
  A_VENIR: "À venir",
  EN_ATTENTE: "En attente",
  VALIDE: "Validé",
  REALISE: "Réalisé",
  REJETE: "Rejeté",
  ANNULE: "Annulé",
};

export const STATUS_COLORS: Record<ExpenseStatus, string> = {
  A_VENIR: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
  EN_ATTENTE: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  VALIDE: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  REALISE: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  REJETE: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  ANNULE: "bg-neutral-200 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700",
};

export const ENGAGED_STATUSES: ExpenseStatus[] = ["A_VENIR", "EN_ATTENTE", "VALIDE"];

export const LEGACY_PLACEHOLDER_EMAIL_DOMAIN = "import.mosquee-massy.local";
