"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/field";
import { credentialsSignIn, type LoginState } from "@/lib/actions/auth-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Connexion…" : "Se connecter"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(credentialsSignIn, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Mot de passe" htmlFor="password" required>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </Field>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
