import Link from "next/link";
import { Button } from "@/components/ui/button";

const MESSAGES: Record<string, string> = {
  AccessDenied:
    "Ce compte Google n'est pas autorisé à accéder à l'application. Contactez un administrateur pour être ajouté.",
  Default: "Une erreur est survenue lors de la connexion. Merci de réessayer.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = MESSAGES[error ?? "Default"] ?? MESSAGES.Default;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-6">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Accès refusé</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button nativeButton={false} render={<Link href="/login" />}>Retour à la connexion</Button>
      </div>
    </div>
  );
}
