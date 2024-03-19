import BlankAvatarBg from "@/assets/blank-avatar.webp";
import { Image } from "@/image";
import { tw } from "@/styles/tw";
import type { StrictOmit } from "@/utils/object";
import type { Session } from "next-auth";
import type { ComponentPropsWithoutRef } from "react";

function getInitials(name: string) {
  const [first, second] = name.split(/[\s_+.-]/);
  return (first && second ? `${first.at(0)}${second.at(0)}` : name.slice(0, 2)).toUpperCase();
}
type UserPictureProps = {
  user: Pick<Session["user"], "image" | "name">;
} & StrictOmit<ComponentPropsWithoutRef<typeof Image>, "src" | "alt" | "children">;
export function UserPicture({ user, className, ...props }: UserPictureProps) {
  return (
    <div className={tw("aspect-square size-full", className)}>
      <Image
        src={user.image}
        alt=""
        width={100}
        height={100}
        className="size-full rounded-full object-cover shadow-around sa-o-10 sa-r-2"
        {...props}
      >
        <svg
          aria-hidden
          className="size-full rounded-full"
          viewBox="0 0 100 100"
        >
          <image
            href={BlankAvatarBg.src}
            className="size-full"
          />
          <text
            x="50"
            y="54"
            fontSize={40}
            textAnchor="middle"
            dominantBaseline="middle"
            className="select-none font-bold"
          >
            {getInitials(user.name)}
          </text>
        </svg>
      </Image>
    </div>
  );
}
