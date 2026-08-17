"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { setLocalAuthEnabled } from "@/lib/actions/user-actions";

export function LocalAuthToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  const onChange = (checked: boolean) => {
    startTransition(async () => {
      const result = await setLocalAuthEnabled(checked);
      if (result.success) {
        setEnabled(checked);
        toast.success(checked ? "Connexion email + mot de passe réactivée." : "Connexion email + mot de passe désactivée.");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <Checkbox checked={enabled} disabled={isPending} onCheckedChange={(v) => onChange(!!v)} />
      Autoriser la connexion par email + mot de passe
    </label>
  );
}
