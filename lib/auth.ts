// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      if (session?.user) {
        (session.user as any).id = user.id;
        (session.user as any).username = (user as any).username ?? null;
      }
      return session;
    },
  },
  pages: {
    // After FIRST successful sign-in with DB adapter, send to onboarding
    newUser: "/onboarding",
  },
};
