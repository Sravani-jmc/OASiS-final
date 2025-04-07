import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's unique ID */
      id: string;
      /** The user's username */
      username: string;
      /** Whether the user is an admin */
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    isAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    isAdmin: boolean;
  }
} 