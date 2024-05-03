import type { Session } from "next-auth";

export const placeholderSession: Readonly<Session> = { expires: "", user: { id: "", name: "" } };
export const placeholderUser = placeholderSession.user;
