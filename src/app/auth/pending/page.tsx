import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthPendingPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-6">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Demande envoyée</h1>
        <p className="text-sm text-muted-foreground">
          Votre compte Google a bien été identifié, mais l&apos;accès doit être approuvé par un administrateur.
          Vous serez informé une fois votre compte activé.
        </p>
        <Button nativeButton={false} render={<Link href="/login" />}>
          Retour à la connexion
        </Button>
      </div>
    </div>
  );
}
