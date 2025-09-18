// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

const providers = [] as NextAuthOptions["providers"];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  // You are using database sessions — keep it
  session: { strategy: "database" },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",

  callbacks: {
    /**
     * With database sessions, `user` can be undefined in this callback
     * (especially in API routes). We must not read user.id blindly.
     * We compute an id from (user?.id || session.user.id || lookup by email).
     */
    async session({ session, user }) {
      if (!session.user) return session;

      let uid: string | null | undefined =
        (session.user as any).id || user?.id || null;

      // If still no id, try fetching by email once.
      if (!uid && session.user.email) {
        const u = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, username: true },
        });
        if (u) {
          uid = u.id;
          (session.user as any).username =
            (session.user as any).username ?? u.username ?? null;
        }
      }

      (session.user as any).id = uid ?? null;
      // Preserve username if already set by adapter; otherwise take from `user` when present.
      if ((session.user as any).username === undefined) {
        (session.user as any).username =
          (user as any)?.username ?? (session.user as any).username ?? null;
      }

      return session;
    },
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      console.log("[next-auth][event][signIn]", {
        userId: (user as any)?.id,
        provider: account?.provider,
        isNewUser: !!isNewUser,
      });
    },
    async signOut({ session }) {
      console.log("[next-auth][event][signOut]", {
        userId: session?.user ? (session.user as any).id : null,
      });
    },
    async createUser({ user }) {
      console.log("[next-auth][event][createUser]", { userId: (user as any)?.id });
    },
    async linkAccount({ user, account }) {
      console.log("[next-auth][event][linkAccount]", {
        userId: (user as any)?.id,
        provider: account?.provider,
      });
    },
    async session({ session }) {
      console.log("[next-auth][event][session]", {
        userId: session?.user ? (session.user as any).id : null,
      });
    },
  },

  logger: {
    error(code, ...metadata) {
      console.error("[next-auth][logger][error]", code, ...metadata);
    },
    warn(code, ...metadata) {
      console.warn("[next-auth][logger][warn]", code, ...metadata);
    },
    debug(code, ...metadata) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[next-auth][logger][debug]", code, ...metadata);
      }
    },
  },
};
