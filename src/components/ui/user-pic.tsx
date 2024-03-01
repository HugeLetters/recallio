import BlankAvatarBg from "@/assets/blank-avatar.png";
import { tw } from "@/utils";
import type { StrictOmit } from "@/utils/type";
import type { Session } from "next-auth";
import Image from "next/image";
import type { ComponentPropsWithoutRef } from "react";

function getInitials(name: string) {
  const [first, second] = name.split(/[\s_+.-]/);
  return (first && second ? `${first.at(0)}${second.at(0)}` : name.slice(0, 2)).toUpperCase();
}
type UserPicProps = {
  user: Pick<Session["user"], "image" | "name">;
} & StrictOmit<ComponentPropsWithoutRef<typeof Image>, "src" | "alt" | "width" | "height">;
export function UserPic({ user, className, ...props }: UserPicProps) {
  return (
    <div className={tw("aspect-square size-full select-none", className)}>
      {user.image ? (
        <Image
          src={user.image}
          alt="your avatar"
          width={100}
          height={100}
          className="size-full rounded-full object-cover shadow-around sa-o-10 sa-r-2"
          {...props}
        />
      ) : (
        <div
          className="relative flex size-full items-center justify-center overflow-hidden rounded-full"
          aria-label="your avatar placeholder"
        >
          <Image
            src={BlankAvatarBg}
            alt=""
          />
          <span className="absolute font-bold">{getInitials(user.name)}</span>
        </div>
      )}
    </div>
  );
}
