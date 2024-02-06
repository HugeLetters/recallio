import type { Entries, NonEmptyArray } from "@/utils/array";
import type { Icon } from "@/utils/type";
import type { OAuthProviderType } from "next-auth/providers";
import { z } from "zod";
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
const providers = Object.keys(providerRecord) as NonEmptyArray<keyof typeof providerRecord>;

export const providerIcons = Object.entries(providerRecord) as Entries<typeof providerRecord>;
export const providerSchema = z.enum(providers, {
  errorMap(_, ctx) {
    return { message: ctx.defaultError.replace("Invalid enum value", "Invalid provider") };
  },
});
