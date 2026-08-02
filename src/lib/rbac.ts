import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/lib/constants";
import type { Session } from "next-auth";

export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.isActive) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(roles: Role[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    redirect("/dashboard?error=forbidden");
  }
  return session;
}

// For API route handlers, which should return a 401/403 response instead of redirecting.
export async function getApiSession(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user?.isActive) return null;
  return session;
}

export function hasRole(session: Session | null, roles: Role[]): boolean {
  return !!session?.user && roles.includes(session.user.role);
}
