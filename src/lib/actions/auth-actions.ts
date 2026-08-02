"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export type LoginState = { error: string } | undefined;

export async function credentialsSignIn(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email ou mot de passe incorrect." };
    }
    throw error;
  }
}
