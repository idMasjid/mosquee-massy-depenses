"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setProjectActive } from "@/lib/actions/project-actions";

export function ArchiveProjectButton({ id, name, isActive }: { id: string; name: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const result = await setProjectActive(id, !isActive);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success(isActive ? "Projet archivé." : "Projet réactivé.");
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={isActive ? `Archiver ${name}` : `Réactiver ${name}`}
      onClick={onClick}
      disabled={isPending}
    >
      {isActive ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
    </Button>
  );
}
