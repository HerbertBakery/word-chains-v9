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
   * Lightweight logging so we can see what went wrong during OAuth.
   * These events avoid printing tokens or full profiles.
   */
  events: {
    async signIn(message) {
      console.log("[next-auth][event][signIn]", {
        userId: message.user?.id,
        provider: (message.account as any)?.provider,
        isNewUser: (message.isNewUser ?? false),
      });
    },
    async signOut(message) {
      console.log("[next-auth][event][signOut]", {
        sessionToken: (message as any)?.sessionToken ? "present" : "none",
      });
    },
    async createUser(message) {
      console.log("[next-auth][event][createUser]", { userId: message.user?.id });
    },
    async linkAccount(message) {
      console.log("[next-auth][event][linkAccount]", {
        userId: message.user?.id,
        provider: (message.account as any)?.provider,
      });
    },
    async session(message) {
      console.log("[next-auth][event][session]", {
        userId: message.session?.user ? (message.session.user as any).id : null,
      });
    },
    async error(message) {
      // This is the key line that will show you callback/redirect/CSRF/config errors
      console.error("[next-auth][event][error]", {
        name: message?.name,
        message: message?.message,
        cause: (message as any)?.cause?.message,
      });
    },
  },
};
