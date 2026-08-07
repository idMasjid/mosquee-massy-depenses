import { redirect } from "next/navigation";
import { auth, signIn, isGoogleSignInEnabled } from "@/auth";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/layout/logo";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.isActive) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-6">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <Logo className="mb-3 h-16" />
          <h1 className="text-xl font-semibold">Gestion des dépenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Mosquée de Massy</p>
        </div>

        <LoginForm />

        {isGoogleSignInEnabled && (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              ou
              <div className="h-px flex-1 bg-border" />
            </div>
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <Button type="submit" variant="outline" className="w-full">
                Se connecter avec Google
              </Button>
            </form>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          L&apos;accès est réservé aux membres autorisés par un administrateur.
        </p>
      </div>
    </div>
  );
}
