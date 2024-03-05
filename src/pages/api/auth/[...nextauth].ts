import NextAuth from "next-auth";
import { authOptions } from "@/server/auth";

// todo - check for auth in middleware and codegen accessible routes? if not, then SSR I guess
export default NextAuth(authOptions);
