import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "@auth/core/providers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import type { Role } from "@/lib/constants";

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Mot de passe", type: "password" },
    },
    async authorize(credentials) {
      const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : null;
      const password = typeof credentials?.password === "string" ? credentials.password : null;
      if (!email || !password) return null;

      const dbUser = await prisma.user.findUnique({ where: { email } });
      if (!dbUser || !dbUser.isActive || dbUser.isPlaceholder) return null;
      if (!verifyPassword(password, dbUser.passwordHash)) return null;

      return { id: dbUser.id, email: dbUser.email, name: dbUser.name, image: dbUser.image };
    },
  }),
];

// Google sign-in is optional for now — added automatically once AUTH_GOOGLE_ID/SECRET are configured.
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

export const isGoogleSignInEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Auth.js only auto-trusts the host in `next dev`; production (`next start`)
  // requires this explicitly, or every request 500s with UntrustedHost.
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  providers,
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      if (!dbUser || !dbUser.isActive || dbUser.isPlaceholder) {
        return "/auth/error?error=AccessDenied";
      }
      return true;
    },
    async jwt({ token }) {
      if (!token.email) return token;
      const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
      if (dbUser) {
        token.id = dbUser.id;
        token.role = dbUser.role;
        token.isActive = dbUser.isActive;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as Role) ?? "IT";
        session.user.isActive = (token.isActive as boolean) ?? false;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user?.isActive;
      const path = request.nextUrl.pathname;
      if (path.startsWith("/login") || path.startsWith("/auth")) return true;
      // Coarse gate: just require an active session here. Fine-grained role
      // checks (e.g. /admin/users is ADMIN-only, /admin/rubriques allows IT
      // too) live in each page/action via requireRole — keeping a second,
      // less granular role check here previously blocked IT from reaching
      // /admin/rubriques before its own requireRole(["ADMIN","IT"]) ran.
      return isLoggedIn;
    },
  },
});
