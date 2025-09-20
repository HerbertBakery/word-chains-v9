// app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs"; // Prisma needs Node runtime

import NextAuth from "next-auth";
import { authOptions as base } from "../../../../lib/auth";

const handler = NextAuth({
  ...base,
  callbacks: {
    ...base.callbacks,
    async jwt(args) {
      // run your existing jwt callback first (if any)
      const token = base.callbacks?.jwt ? await base.callbacks.jwt(args as any) : args.token;
      if (args.user?.id) (token as any).id = (args.user as any).id; // ensure id on JWT
      return token;
    },
    async session(args) {
      // run your existing session callback first (if any)
      const session = base.callbacks?.session ? await base.callbacks.session(args as any) : args.session;
      if (session?.user) (session.user as any).id = (args.token as any)?.id ?? args.token?.sub ?? (session.user as any).id;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
