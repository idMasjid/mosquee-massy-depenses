"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setBudgetLineActive } from "@/lib/actions/project-actions";

export function ArchiveBudgetLineButton({ id, label, isActive }: { id: string; label: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const result = await setBudgetLineActive(id, !isActive);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success(isActive ? "Ligne archivée." : "Ligne réactivée.");
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={isActive ? `Archiver ${label}` : `Réactiver ${label}`}
      onClick={onClick}
      disabled={isPending}
    >
      {isActive ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
    </Button>
  );
}
