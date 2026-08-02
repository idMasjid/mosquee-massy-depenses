import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/rbac";
import { storage } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) return new NextResponse("Not found", { status: 404 });

  const buffer = await storage.read(attachment.storedPath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
      "Content-Length": String(attachment.sizeBytes),
    },
  });
}
