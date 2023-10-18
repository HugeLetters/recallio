import type { Session } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import { forwardRef } from "react";
import StarIcon from "~icons/typcn/star-full-outline";

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
    <div className={className}>
      {user.image ? (
        <Image
          src={user.image}
          alt="your profile pic"
          width={64}
          height={64}
          className="h-full w-full rounded-full"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-app-green text-white">
          {getInitials(user.name)}
        </div>
      )}
    </div>
  );
}
