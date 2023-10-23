import type { StrictOmit } from "@/utils";
import * as BaseSwitch from "@radix-ui/react-switch";
import type { Session } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import { forwardRef } from "react";
import StarIcon from "~icons/typcn/star-full-outline";
import BlankAvatarBg from "@/assets/blank-avatar.png";

type PrimaryButtonProps<T extends boolean> = { asLink?: T } & ComponentPropsWithoutRef<
  T extends true ? typeof Link : "button"
>;
export function PrimaryButton<T extends boolean = false>({
  asLink,
  className,
  children,
  ...restProps
}: PropsWithChildren<PrimaryButtonProps<T>>) {
  const Component = asLink ? Link : "button";

  return (
    // @ts-expect-error TYPESCRIPT SHUT UP, YOU DONT KNOW WHAT ARE YOU TALKING ABOUT
    <Component
      type={!asLink ? "button" : undefined}
      {...restProps}
      className={`rounded-xl bg-app-green px-2.5 py-3.5 text-white transition-[transform,filter] active:brightness-110 motion-safe:active:scale-95 ${className}`}
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
    <div className={`aspect-square h-full w-full ${className}`}>
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
