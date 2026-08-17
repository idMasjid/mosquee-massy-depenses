import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const PRIVATE_IP_PREFIXES = ["10.", "172.16.", "192.168.", "127.", "::1"];

async function getClientIp(): Promise<string | null> {
  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return hdrs.get("x-real-ip");
}

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PREFIXES.some((prefix) => ip.startsWith(prefix));
}

async function resolveLocation(ip: string | null): Promise<string | null> {
  if (!ip || isPrivateIp(ip)) return null;
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = (await res.json()) as { status: string; country?: string; city?: string };
    if (data.status !== "success") return null;
    return [data.city, data.country].filter(Boolean).join(", ") || null;
  } catch {
    // Service de géolocalisation indisponible/hors quota : on garde juste l'IP.
    return null;
  }
}

export async function logLoginEvent(params: {
  email: string;
  name?: string | null;
  provider: "google" | "credentials";
  status: "SUCCESS" | "DENIED" | "PENDING";
}): Promise<void> {
  try {
    const hdrs = await headers();
    const ip = await getClientIp();
    const location = await resolveLocation(ip);
    await prisma.loginEvent.create({
      data: {
        email: params.email,
        name: params.name ?? null,
        provider: params.provider,
        status: params.status,
        ip,
        location,
        userAgent: hdrs.get("user-agent"),
      },
    });
  } catch {
    // Le suivi des connexions ne doit jamais faire échouer une connexion réelle.
  }
}
