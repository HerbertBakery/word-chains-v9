// app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs"; // Prisma needs Node runtime

import NextAuth, { type NextAuthOptions } from "next-auth";
import baseAuthOptions from "../../../../lib/auth"; // if your lib/auth exports named, change to { authOptions as baseAuthOptions }

// If your lib/auth exports `authOptions` as a named export, use:
// import { authOptions as baseAuthOptions } from "../../../../lib/auth";

const authOptions: NextAuthOptions = {
  ...baseAuthOptions,
  callbacks: {
    // Keep any existing callbacks you had in lib/auth
    ...(baseAuthOptions.callbacks ?? {}),

    // Ensure the JWT carries the user id
    async jwt(params) {
      const { token, user } = params as any;

      // Run your original jwt callback first (if present)
      let nextToken = token;
      if (baseAuthOptions.callbacks?.jwt) {
        nextToken = await (baseAuthOptions.callbacks.jwt as any)(params);
      }

      // Attach id (prefer user.id on sign-in)
      if (user?.id) {
        (nextToken as any).id = user.id;
      }

      return nextToken;
    },

    // Ensure session.user.id is present for server routes
    async session(params) {
      const { session, token } = params as any;

      // Run your original session callback first (if present)
      let nextSession = session;
      if (baseAuthOptions.callbacks?.session) {
        nextSession = await (baseAuthOptions.callbacks.session as any)(params);
      }

      if (nextSession?.user) {
        (nextSession.user as any).id =
          (token as any)?.id ?? token?.sub ?? (nextSession.user as any).id;
      }
      return nextSession;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
// Export authOptions so getServerSession(authOptions) works elsewhere
export { authOptions };
