"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { storage, ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/storage";
import type { ActionResult } from "@/lib/actions/expense-actions";

export async function uploadAttachment(formData: FormData): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "IT", "BUREAU"]);
  const expenseId = formData.get("expenseId");
  const file = formData.get("file");

  if (typeof expenseId !== "string" || !(file instanceof File)) {
    return { success: false, error: "Requête invalide." };
  }

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) return { success: false, error: "Dépense introuvable." };

  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return { success: false, error: "Type de fichier non autorisé (PDF ou image uniquement)." };
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return { success: false, error: "Fichier trop volumineux (max 10 Mo)." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storedPath = await storage.save(`expenses/${expenseId}`, file.name, buffer);

  await prisma.attachment.create({
    data: {
      expenseId,
      fileName: file.name,
      storedPath,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedById: session.user.id,
    },
  });

  revalidatePath(`/expenses/${expenseId}`);
  return { success: true };
}

export async function deleteAttachment(attachmentId: string): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "IT", "BUREAU"]);
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) return { success: false, error: "Pièce jointe introuvable." };

  const canDelete = session.user.role === "ADMIN" || attachment.uploadedById === session.user.id;
  if (!canDelete) return { success: false, error: "Action non autorisée." };

  await storage.delete(attachment.storedPath).catch(() => {});
  await prisma.attachment.delete({ where: { id: attachmentId } });

  revalidatePath(`/expenses/${attachment.expenseId}`);
  return { success: true };
}
