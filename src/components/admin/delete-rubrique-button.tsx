"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteAllowedRubrique } from "@/lib/actions/rubrique-actions";

export function DeleteRubriqueButton({ id, rubrique, lineCount }: { id: string; rubrique: string; lineCount: number }) {
  const [isPending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      const result = await deleteAllowedRubrique(id);
      if (!result.success) {
        toast.error(result.error);
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Retirer ${rubrique}`} disabled={isPending} />}
      >
        <Trash2 className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer « {rubrique} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            {lineCount > 0
              ? `${lineCount} ligne${lineCount > 1 ? "s" : ""} budgétaire${lineCount > 1 ? "s" : ""} existante${lineCount > 1 ? "s" : ""} utilise${lineCount > 1 ? "nt" : ""} déjà cette catégorie et ne sera${lineCount > 1 ? "" : "z"} pas affectée${lineCount > 1 ? "s" : ""}. Elle ne sera simplement plus proposée pour de nouvelles lignes ou dépenses.`
              : "Elle ne sera plus proposée pour de nouvelles lignes budgétaires ou dépenses."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={isPending}>
            Retirer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
