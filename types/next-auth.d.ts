// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string; // <- add id to the session user
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
  }
}
