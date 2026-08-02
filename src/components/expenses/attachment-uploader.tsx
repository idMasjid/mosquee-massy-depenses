"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadAttachment, deleteAttachment } from "@/lib/actions/attachment-actions";

export type AttachmentItem = {
  id: string;
  fileName: string;
  sizeBytes: number;
  createdAt: Date;
  uploadedBy: { name: string };
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function AttachmentUploader({
  expenseId,
  attachments,
  canDelete,
}: {
  expenseId: string;
  attachments: AttachmentItem[];
  canDelete: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.set("expenseId", expenseId);
    formData.set("file", file);
    const result = await uploadAttachment(formData);
    setUploading(false);
    if (result.success) {
      toast.success("Pièce jointe ajoutée.");
    } else {
      toast.error(result.error);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    const result = await deleteAttachment(id);
    if (result.success) {
      toast.success("Pièce jointe supprimée.");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {attachments.length === 0 && <p className="text-sm text-muted-foreground">Aucune pièce jointe.</p>}
      <ul className="flex flex-col gap-2">
        {attachments.map((a) => (
          <li key={a.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <a
              href={`/api/attachments/${a.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 truncate underline underline-offset-2"
            >
              {a.fileName}
            </a>
            <span className="shrink-0 text-xs text-muted-foreground">{formatSize(a.sizeBytes)}</span>
            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDelete(a.id)}
                aria-label="Supprimer"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" />
          {uploading ? "Envoi…" : "Ajouter une pièce jointe"}
        </Button>
      </div>
    </div>
  );
}
