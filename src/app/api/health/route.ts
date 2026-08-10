import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Unauthenticated on purpose — polled by the Docker HEALTHCHECK and by
// Portainer, neither of which carries a session. Confirms both the HTTP
// server and the SQLite file (mounted volume) are reachable.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
