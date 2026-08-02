import type { ExpenseStatus, Role } from "@/lib/constants";

type Transition = {
  from: ExpenseStatus;
  to: ExpenseStatus;
  roles: Role[];
  requiresNote?: boolean;
};

// Admins can always override into any state (logged as an "override" event) —
// everything below is the non-admin rule set.
const TRANSITIONS: Transition[] = [
  { from: "A_VENIR", to: "EN_ATTENTE", roles: ["IT"] },
  { from: "A_VENIR", to: "ANNULE", roles: ["IT"] },
  { from: "EN_ATTENTE", to: "VALIDE", roles: ["BUREAU"] },
  { from: "EN_ATTENTE", to: "REJETE", roles: ["BUREAU"], requiresNote: true },
  { from: "EN_ATTENTE", to: "ANNULE", roles: ["IT"] },
  { from: "VALIDE", to: "REALISE", roles: ["IT"] },
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
  return TRANSITIONS.some((t) => t.from === from && t.to === to && t.roles.includes(role));
}

export function availableTransitions(role: Role, from: ExpenseStatus): ExpenseStatus[] {
  if (role === "ADMIN") {
    return (
      ["A_VENIR", "EN_ATTENTE", "VALIDE", "REALISE", "REJETE", "ANNULE"] as ExpenseStatus[]
    ).filter((to) => to !== from);
  }
  return TRANSITIONS.filter((t) => t.from === from && t.roles.includes(role)).map((t) => t.to);
}

export function transitionRequiresNote(role: Role, from: ExpenseStatus, to: ExpenseStatus): boolean {
  const rule = TRANSITIONS.find((t) => t.from === from && t.to === to);
  if (rule?.requiresNote) return true;
  return role === "ADMIN" && !TRANSITIONS.some((t) => t.from === from && t.to === to);
}
