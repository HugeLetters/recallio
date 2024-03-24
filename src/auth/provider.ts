import type { Icon } from "@/image/icon";
import type { Entries, NonEmptyArray } from "@/utils/array";
import type { OAuthProviderType } from "next-auth/providers";
import DiscordIcon from "~icons/logos/discord-icon";
import GoogleIcon from "~icons/logos/google-icon";
import LinkedinIcon from "~icons/logos/linkedin-icon";
import GithubIcon from "~icons/mdi/github";

const providerRecord = {
  discord: DiscordIcon,
  github: GithubIcon,
  google: GoogleIcon,
  linkedin: LinkedinIcon,
} satisfies Partial<Record<OAuthProviderType, Icon>>;
export const providerIcons = Object.entries(providerRecord) as Entries<typeof providerRecord>;
export const providers = Object.keys(providerRecord) as NonEmptyArray<keyof typeof providerRecord>;
export type Provider = keyof typeof providerRecord;
