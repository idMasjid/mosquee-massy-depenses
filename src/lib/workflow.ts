import type { ExpenseStatus, Role } from "@/lib/constants";

type Transition = {
  from: ExpenseStatus;
  to: ExpenseStatus;
  roles: Role[];
  requiresNote?: boolean;
};

// Admins can always override into any state (logged as an "override" event).
// Bureau can override into any state except A_VENIR. Everything below is the
// base rule set for the other roles.
const TRANSITIONS: Transition[] = [
  { from: "IMPORT_A_VALIDER", to: "A_VENIR", roles: ["IT"] },
  { from: "IMPORT_A_VALIDER", to: "EN_ATTENTE", roles: ["IT"] },
  { from: "IMPORT_A_VALIDER", to: "REALISE", roles: ["IT"] },
  { from: "IMPORT_A_VALIDER", to: "ANNULE", roles: ["IT"] },
  { from: "A_VENIR", to: "EN_ATTENTE", roles: ["IT"] },
  { from: "A_VENIR", to: "ANNULE", roles: ["IT"] },
  { from: "EN_ATTENTE", to: "VALIDE", roles: ["BUREAU"] },
  { from: "EN_ATTENTE", to: "REJETE", roles: ["BUREAU"], requiresNote: true },
  { from: "EN_ATTENTE", to: "ANNULE", roles: ["IT"] },
  { from: "VALIDE", to: "REALISE", roles: ["IT"] },
  { from: "VALIDE", to: "ANNULE", roles: ["IT", "BUREAU"] },
];

export const CREATE_STATUSES: ExpenseStatus[] = ["A_VENIR", "EN_ATTENTE"];

export function canCreateWithStatus(role: Role, status: ExpenseStatus): boolean {
  if (role === "ADMIN") return true;
  if (role !== "IT") return false;
  return CREATE_STATUSES.includes(status);
}

export function canTransition(role: Role, from: ExpenseStatus, to: ExpenseStatus): boolean {
  if (from === to) return false;
  if (role === "ADMIN") return true;
  if (role === "BUREAU") return to !== "A_VENIR";
  return TRANSITIONS.some((t) => t.from === from && t.to === to && t.roles.includes(role));
}

export function availableTransitions(role: Role, from: ExpenseStatus): ExpenseStatus[] {
  if (role === "ADMIN") {
    return (
      ["A_VENIR", "EN_ATTENTE", "VALIDE", "REALISE", "REJETE", "ANNULE"] as ExpenseStatus[]
    ).filter((to) => to !== from);
  }
  if (role === "BUREAU") {
    return (
      ["EN_ATTENTE", "VALIDE", "REALISE", "REJETE", "ANNULE"] as ExpenseStatus[]
    ).filter((to) => to !== from);
  }
  return TRANSITIONS.filter((t) => t.from === from && t.roles.includes(role)).map((t) => t.to);
}

export function transitionRequiresNote(role: Role, from: ExpenseStatus, to: ExpenseStatus): boolean {
  const rule = TRANSITIONS.find((t) => t.from === from && t.to === to);
  if (rule?.requiresNote) return true;
  if (role === "ADMIN" || role === "BUREAU") {
    return !TRANSITIONS.some((t) => t.from === from && t.to === to);
  }
  return false;
}
