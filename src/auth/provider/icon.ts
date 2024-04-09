import type { Icon } from "@/image/icon";
import type { Assert, Equals } from "@/utils/type";
import DiscordIcon from "~icons/logos/discord-icon";
import GoogleIcon from "~icons/logos/google-icon";
import LinkedinIcon from "~icons/logos/linkedin-icon";
import GithubIcon from "~icons/mdi/github";
import type { Provider } from ".";

export const providerIcons = [
  ["discord", DiscordIcon],
  ["github", GithubIcon],
  ["google", GoogleIcon],
  ["linkedin", LinkedinIcon],
] satisfies Array<[Provider, Icon]>;

type _ = Assert<Equals<(typeof providerIcons)[number][0], Provider>>;
