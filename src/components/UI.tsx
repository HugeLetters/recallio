import BlankAvatarBg from "@/assets/blank-avatar.png";
import type { Icon, StrictOmit } from "@/utils";
import * as BaseSwitch from "@radix-ui/react-switch";
import type { Session } from "next-auth";
import type { OAuthProviderType } from "next-auth/providers";
import Image from "next/image";
import Link from "next/link";
import type { ComponentPropsWithRef, ComponentPropsWithoutRef, PropsWithChildren } from "react";
import { forwardRef } from "react";
import DiscordIcon from "~icons/logos/discord-icon";
import GoogleIcon from "~icons/logos/google-icon";
import LinkedinIcon from "~icons/logos/linkedin-icon";
import GithubIcon from "~icons/mdi/github";
import StarIcon from "~icons/typcn/star-full-outline";

const variantClass = {
  primary: "bg-app-green text-white",
  ghost:
    "bg-neutral-100 text-lime-950 outline outline-1 outline-neutral-400/30 focus-within:outline-2 focus-within:outline-neutral-400/70",
  destructive: "bg-red-800/10 text-red-800/80",
};
type ClickableProps<T extends boolean> = {
  asLink?: T;
  variant: keyof typeof variantClass;
} & ComponentPropsWithoutRef<T extends true ? typeof Link : "button">;
export function Clickable<T extends boolean = false>({
  variant,
  asLink,
  className,
  children,
  ...restProps
}: PropsWithChildren<ClickableProps<T>>) {
  const Component = asLink ? Link : "button";

  return (
    // @ts-expect-error TYPESCRIPT SHUT UP, YOU DONT KNOW WHAT ARE YOU TALKING ABOUT
    <Component
      type={!asLink ? "button" : undefined}
      {...restProps}
      className={`rounded-xl px-2.5 py-3.5 transition active:brightness-110 motion-safe:active:scale-95 ${
        variantClass[variant]
      } ${className ?? ""}`}
    >
      {children}
    </Component>
  );
}

type StarProps = { highlight?: boolean };
export function Star({ highlight }: StarProps) {
  return (
    <StarIcon className={`h-full w-full ${highlight ? "text-amber-400" : "text-neutral-300"}`} />
  );
}

type ImageInputProps = ComponentPropsWithoutRef<"input"> & { isImageSet: boolean };
export const ImageInput = forwardRef<HTMLInputElement, ImageInputProps>(function ImageInput(
  { children, className, isImageSet, ...inputAttributes },
  ref
) {
  return (
    <label className={`cursor-pointer focus-within:outline ${className ?? ""}`}>
      {children}
      <input
        {...inputAttributes}
        className="sr-only"
        accept="image/*"
        type="file"
        value={isImageSet ? undefined : ""}
        ref={ref}
      />
    </label>
  );
});

function getInitials(name: string) {
  const [first, second] = name.split(/[\s_+.-]/);
  return (first && second ? `${first.at(0)}${second.at(0)}` : name.slice(0, 2)).toUpperCase();
}
type UserPicProps = { user: Session["user"]; className?: string };
export function UserPic({ user, className }: UserPicProps) {
  return (
    <div className={`aspect-square h-full w-full select-none ${className ?? ""}`}>
      {user.image ? (
        <Image
          src={user.image}
          alt="your avatar"
          width={100}
          height={100}
          className="h-full w-full rounded-full object-cover shadow-around sa-o-10 sa-r-2"
        />
      ) : (
        <div
          className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full"
          aria-label="your avatar placeholder"
        >
          <Image
            src={BlankAvatarBg}
            alt=""
          />
          <span className="absolute text-2xl font-bold">{getInitials(user.name)}</span>
        </div>
      )}
    </div>
  );
}

type SwitchProps = StrictOmit<BaseSwitch.SwitchProps, "className">;
export function Switch(props: SwitchProps) {
  return (
    <BaseSwitch.Root
      {...props}
      className={`group flex w-14 rounded-full bg-zinc-500/20 p-1 transition-colors data-[state=checked]:bg-app-green`}
    >
      <div className="transition-[flex-grow] group-data-[state=checked]:grow" />
      <BaseSwitch.Thumb className="block aspect-square h-7 rounded-full bg-white drop-shadow-md" />
    </BaseSwitch.Root>
  );
}

const providerRecord: Partial<Record<OAuthProviderType, Icon>> = {
  discord: DiscordIcon,
  github: GithubIcon,
  google: GoogleIcon,
  linkedin: LinkedinIcon,
};
export const providers = Object.entries(providerRecord);

type WithLabelProps = { label: string; className?: string };
export function WithLabel({ children, label, className }: PropsWithChildren<WithLabelProps>) {
  return (
    <label className={`flex flex-col ${className ?? ""}`}>
      <p className="p-2 text-sm">{label}</p>
      {children}
    </label>
  );
}

type InputProps = ComponentPropsWithRef<"input">;
export function Input({ ref, className, ...inputProps }: InputProps) {
  return (
    <input
      ref={ref}
      className={`rounded-lg p-3 outline outline-1 outline-app-green focus-within:outline-2 ${
        className ?? ""
      }`}
      {...inputProps}
    />
  );
}
