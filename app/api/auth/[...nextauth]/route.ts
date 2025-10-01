// app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs"; // Prisma needs Node runtime

import NextAuth from "next-auth";
import { authOptions as base } from "../../../../lib/auth";

const handler = NextAuth({
  ...base,
  callbacks: {
    ...base.callbacks,

    // === Force users to hit /onboarding after OAuth completes ===
    async redirect({ url, baseUrl }) {
      // Allow same-origin absolute URLs
      try {
        const dest = new URL(url, baseUrl); // handles relative urls too

        // If NextAuth would otherwise send the user to the site root,
        // send them to /onboarding instead. Your onboarding page then
        // decides whether to show the username form or bounce to /packs.
        if (dest.origin === baseUrl && (dest.pathname === "/" || dest.pathname === "")) {
          return `${baseUrl}/onboarding`;
        }

        // Keep relative paths working (e.g. callbackUrl=/packs)
        if (url.startsWith("/")) return `${baseUrl}${url}`;

        // Same-origin absolute URLs are fine as-is
        if (dest.origin === baseUrl) return dest.toString();

        // Fallback: always bring them to onboarding
        return `${baseUrl}/onboarding`;
      } catch {
        // If URL parsing fails, be safe and land on onboarding
        return `${baseUrl}/onboarding`;
      }
    },

    // === Your existing JWT callback (kept intact) ===
    async jwt(args) {
      const baseToken = base.callbacks?.jwt
        ? await base.callbacks.jwt(args as any)
        : args.token;

      const token: any = baseToken ?? {};

      if (args.user?.id) {
        token.id = (args.user as any).id;
      }

      if (args.user && (args.user as any).username) {
        token.username = (args.user as any).username;
      }

      if (args.trigger === "update" && (args.session as any)?.username) {
        token.username = (args.session as any).username;
      }

      return token;
    },

    // === Your existing session callback (kept intact) ===
    async session(args) {
      const session = base.callbacks?.session
        ? await base.callbacks.session(args as any)
        : args.session;

      const t: any = args.token as any;

      if (session?.user) {
        (session.user as any).id =
          t?.id ?? args.token?.sub ?? (session.user as any).id;

        (session.user as any).username =
          t?.username ?? (session.user as any).username ?? null;
      }

      return session;
    },
  },
});

export { handler as GET, handler as POST };
