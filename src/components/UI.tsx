import BlankAvatarBg from "@/assets/blank-avatar.png";
import type { Icon, StrictOmit } from "@/utils";
import * as BaseSwitch from "@radix-ui/react-switch";
import type { Session } from "next-auth";
import type { OAuthProviderType } from "next-auth/providers";
import Image from "next/image";
import Link from "next/link";
import type {
  ComponentPropsWithRef,
  ComponentPropsWithoutRef,
  Key,
  PropsWithChildren,
  ReactNode,
} from "react";
import { Fragment, forwardRef, useEffect, useRef } from "react";
import DiscordIcon from "~icons/logos/discord-icon";
import GoogleIcon from "~icons/logos/google-icon";
import LinkedinIcon from "~icons/logos/linkedin-icon";
import GithubIcon from "~icons/mdi/github";
import StarIcon from "~icons/typcn/star-full-outline";

const variantClass: Record<"primary" | "ghost", string> = {
  primary: "bg-app-green text-white",
  ghost:
    "bg-neutral-100 text-lime-950 outline outline-1 outline-neutral-400/30 focus-within:outline-2  focus-within:outline-neutral-400/70",
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
      className={`rounded-xl px-2.5 py-3.5 transition-[transform,filter] active:brightness-110 motion-safe:active:scale-95 ${variantClass[variant]} ${className}`}
    >
      {children}
    </Component>
  );
}

type StarProps = { highlight?: boolean };
export function Star({ highlight }: StarProps) {
  return <StarIcon className={highlight ? "text-amber-400" : "text-neutral-300"} />;
}

type ImageInputProps = ComponentPropsWithoutRef<"input"> & { isImageSet: boolean };
export const ImageInput = forwardRef<HTMLInputElement, ImageInputProps>(function ImageInput(
  { children, className, isImageSet, ...inputAttributes },
  ref
) {
  return (
    <label className={`focus-within:outline ${className}`}>
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
    <div className={`aspect-square h-full w-full select-none ${className}`}>
      {user.image ? (
        <Image
          src={user.image}
          alt="your avatar"
          width={100}
          height={100}
          className="h-full w-full rounded-full object-cover drop-shadow-md"
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
    <label className={`flex flex-col ${className}`}>
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
      className={`rounded-lg p-3 outline outline-1 outline-app-green focus-within:outline-2 ${className}`}
      {...inputProps}
    />
  );
}

type InfiniteScrollProps<P, V> = {
  pages: P[];
  /** Retrieve values from a single page */
  getPageValues: (page: P) => V[];
  /** Render a element based on a individual value */
  children: (value: V) => ReactNode;
  /** Retireve unique list key from a value */
  getKey: (value: V) => Key;
  /** This will be invoked upon scrolling further to get more pages */
  getNextPage: () => void;
  /** This class will be applied to a wrapper div around an element which triggers getNextPage */
  className?: string;
};
export function InfiniteScroll<P, V>({
  pages,
  getPageValues,
  children,
  getKey,
  getNextPage,
  className,
}: InfiniteScrollProps<P, V>) {
  const lastPage = pages.at(-1);
  const lastElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lastElement.current) throw Error("No ref attached");

    const observer = new IntersectionObserver((events) => {
      events.forEach((event) => {
        if (event.target !== lastElement.current || !event.isIntersecting) return;
        getNextPage();
      });
    });
    observer.observe(lastElement.current);

    return () => {
      observer.disconnect();
    };
    // I don't want to enforce a getNextPage function to be stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  return (
    <>
      {pages.map((page) => {
        const isLastPage = page === lastPage;
        const values = getPageValues(page);
        const triggerValue = values.at(-values.length / 2) ?? values[0];

        return values.map((value) => {
          const isTriggerValue = isLastPage && value === triggerValue;
          const key = getKey(value);
          return isTriggerValue ? (
            <div
              className={`!relative ${className ?? ""}`}
              key={key}
            >
              {children(value)}
              {isTriggerValue && (
                <div
                  className="sr-only"
                  ref={lastElement}
                />
              )}
            </div>
          ) : (
            <Fragment key={key}>{children(value)}</Fragment>
          );
        });
      })}
    </>
  );
}
