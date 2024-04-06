import type { NonEmptyArray } from "@/utils/array";
import type { OAuthProviderType } from "next-auth/providers";

export const providers = [
  "discord",
  "github",
  "google",
  "linkedin",
] satisfies NonEmptyArray<OAuthProviderType>;
export type Provider = (typeof providers)[number];
