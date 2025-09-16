// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

const providers = [] as NextAuthOptions["providers"];

// Add Google if env vars exist
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

// Add GitHub if env vars exist (optional)
if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "database" },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",

  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
        (session.user as any).username = (user as any).username ?? null;
      }
      return session;
    },
  },

  /**
   * Events: keep only supported hooks.
   * (NextAuth 4.24.x does not include an "error" event in EventCallbacks.)
   */
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

  /**
   * Use NextAuth's logger for errors / warnings / debug.
   * This replaces the unsupported events.error handler.
   */
  logger: {
    error(code, ...metadata) {
      console.error("[next-auth][logger][error]", code, ...metadata);
    },
    warn(code, ...metadata) {
      console.warn("[next-auth][logger][warn]", code, ...metadata);
    },
    debug(code, ...metadata) {
      // You can silence this in production if it's noisy.
      if (process.env.NODE_ENV !== "production") {
        console.log("[next-auth][logger][debug]", code, ...metadata);
      }
    },
  },
};
