import type { Session } from "next-auth";

export const placeholderSession: Readonly<Session> = {
  expires: "_",
  user: {
    id: "_",
    name: "_",
    emailVerified: null,
    isBanned: false,
    role: null,
  },
};
export const placeholderUser = placeholderSession.user;
