// app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs"; // Prisma needs Node runtime

import NextAuth from "next-auth";
import { authOptions as base } from "../../../../lib/auth";

const handler = NextAuth({
  ...base,
  callbacks: {
    ...base.callbacks,

    // Ensure JWT carries id + username, and supports live session.update({ username })
    async jwt(args) {
      // Run your existing jwt callback first (if any)
      const baseToken = base.callbacks?.jwt
        ? await base.callbacks.jwt(args as any)
        : args.token;

      const token: any = baseToken ?? {};

      // Preserve your existing behavior: ensure id on JWT
      if (args.user?.id) {
        token.id = (args.user as any).id;
      }

      // On sign-in, copy username from the user record into the token
      if (args.user && (args.user as any).username) {
        token.username = (args.user as any).username;
      }

      // Support client-side live updates:
      // await update({ username }) will arrive here with trigger === "update"
      if (args.trigger === "update" && (args.session as any)?.username) {
        token.username = (args.session as any).username;
      }

      return token;
    },

    // Ensure session.user has id + username, so Header updates instantly
    async session(args) {
      // Run your existing session callback first (if any)
      const session = base.callbacks?.session
        ? await base.callbacks.session(args as any)
        : args.session;

      const t: any = args.token as any;

      if (session?.user) {
        // Preserve your existing id propagation
        (session.user as any).id =
          t?.id ?? args.token?.sub ?? (session.user as any).id;

        // NEW: expose username from token on the session
        (session.user as any).username =
          t?.username ?? (session.user as any).username ?? null;
      }

      return session;
    },
  },
});

export { handler as GET, handler as POST };
