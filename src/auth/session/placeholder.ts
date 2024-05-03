import type { Session } from "next-auth";

export const placeholderSession: Readonly<Session> = { expires: "_", user: { id: "_", name: "_" } };
export const placeholderUser = placeholderSession.user;
