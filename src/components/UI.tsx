import BlankAvatarBg from "@/assets/blank-avatar.png";
import { tw } from "@/utils";
import { getQueryParam, setQueryParam } from "@/utils/query";
import type { StrictOmit } from "@/utils/type";
import { Overlay, Root } from "@radix-ui/react-dialog";
import * as BaseSwitch from "@radix-ui/react-switch";
import type { Session } from "next-auth";
import Image from "next/image";
import { useRouter } from "next/router";
import type {
  ComponentPropsWithRef,
  ComponentPropsWithoutRef,
  PropsWithChildren,
  ReactNode,
} from "react";
import { forwardRef, useEffect, useRef } from "react";
import StarIcon from "~icons/typcn/star-full-outline";

type ClickableProps = ComponentPropsWithoutRef<"button">;
export const Button = forwardRef<HTMLButtonElement, PropsWithChildren<ClickableProps>>(
  function Button({ className, type, children, ...restProps }, ref) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={tw("btn", className)}
        {...restProps}
      >
        {children}
      </button>
    );
  },
);

type StarProps = { highlight?: boolean };
export function Star({ highlight }: StarProps) {
  return (
    <StarIcon className={tw("size-full", highlight ? "text-amber-400" : "text-neutral-400/20")} />
  );
}

type ImageInputProps = ComponentPropsWithoutRef<"input"> & { isImageSet: boolean };
export const ImageInput = forwardRef<HTMLInputElement, ImageInputProps>(function ImageInput(
  { children, className, isImageSet, ...inputAttributes },
  outerRef,
) {
  const innerRef = useRef<HTMLInputElement>(null);
  const ref = outerRef ?? innerRef;
  useEffect(() => {
    if (!("current" in ref) || !ref.current || isImageSet) return;
    ref.current.value = "";
  }, [isImageSet, ref]);

  return (
    <label className={tw("cursor-pointer", className)}>
      {children}
      <input
        {...inputAttributes}
        className="sr-only"
        accept="image/*"
        type="file"
        ref={ref}
      />
    </label>
  );
});

function getInitials(name: string) {
  const [first, second] = name.split(/[\s_+.-]/);
  return (first && second ? `${first.at(0)}${second.at(0)}` : name.slice(0, 2)).toUpperCase();
}
type UserPicProps = { user: Pick<Session["user"], "image" | "name">; className?: string };
export function UserPic({ user, className }: UserPicProps) {
  return (
    <div className={tw("aspect-square size-full select-none", className)}>
      {user.image ? (
        <Image
          src={user.image}
          alt="your avatar"
          width={100}
          height={100}
          className="size-full rounded-full object-cover shadow-around sa-o-10 sa-r-2"
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

type SwitchProps = StrictOmit<BaseSwitch.SwitchProps, "className">;
export function Switch(props: SwitchProps) {
  return (
    <BaseSwitch.Root
      {...props}
      className="group flex w-14 rounded-full bg-zinc-500/20 p-1 transition-colors focus-visible:outline-app-green data-[state=checked]:bg-app-green data-[state=checked]:focus-visible:outline-lime-950"
    >
      <div className="transition-[flex-grow] group-data-[state=checked]:grow" />
      <BaseSwitch.Thumb className="block aspect-square h-7 rounded-full bg-white drop-shadow-md" />
    </BaseSwitch.Root>
  );
}

type LabeledSwitchProps = { label: ReactNode; className?: string } & SwitchProps;
export function LabeledSwitch({ label, className, ...switchProps }: LabeledSwitchProps) {
  return (
    <label
      // Inside of forms switch appends a hidden sr-only checkbox input which can screw up the layout - this mititgates the damage somewhat
      className={tw("relative flex items-center justify-between rounded-lg px-4 py-2", className)}
    >
      {typeof label === "string" ? <span>{label}</span> : label}
      <Switch {...switchProps} />
    </label>
  );
}

type WithLabelProps = { label: string; className?: string };
export function WithLabel({ children, label, className }: PropsWithChildren<WithLabelProps>) {
  return (
    <label className={tw("flex flex-col", className)}>
      <p className="p-2 text-sm">{label}</p>
      {children}
    </label>
  );
}

type InputProps = ComponentPropsWithoutRef<"input">;
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...inputProps },
  ref,
) {
  return (
    <input
      ref={ref}
      className={tw(
        "rounded-lg p-3 outline outline-1 outline-app-green focus-within:outline-2",
        className,
      )}
      {...inputProps}
    />
  );
});

type AutoresizableInputProps = {
  initialContent: string;
  rootClassName?: string;
} & ComponentPropsWithoutRef<"textarea">;
export const AutoresizableInput = forwardRef<HTMLTextAreaElement, AutoresizableInputProps>(
  function AutoresizableInput(
    { initialContent, rootClassName, className, onChange, ...props },
    ref,
  ) {
    return (
      <div className={tw("overflow-hidden", rootClassName)}>
        <div
          className="relative flex after:invisible after:h-full after:w-full after:whitespace-pre-wrap after:break-words after:content-[attr(data-input)]"
          data-input={initialContent + "\n"}
        >
          <textarea
            ref={ref}
            className={tw(
              "absolute inset-0 size-full resize-none break-words outline-none",
              className,
            )}
            {...props}
            onChange={(e) => {
              onChange?.(e);

              const parent = e.target.parentElement;
              if (!parent) return;

              parent.dataset.input = e.target.value + "\n";
            }}
          />
        </div>
      </div>
    );
  },
);

export const DialogOverlay = forwardRef<
  HTMLDivElement,
  PropsWithChildren & ComponentPropsWithRef<typeof Overlay>
>(function DialogOverlay({ children, className, ...props }, ref) {
  return (
    <Overlay
      ref={ref}
      {...props}
      className={tw(
        "fixed inset-0 z-10 animate-fade-in bg-black/40 data-[state=closed]:animate-fade-out",
        className,
      )}
    >
      {children}
    </Overlay>
  );
});

export function useUrlDialog(queryKey: string) {
  const router = useRouter();
  const isOpen = getQueryParam(router.query[queryKey]);

  // persist query params on navigating back/forward
  useEffect(() => {
    function handler() {
      if (!isOpen) return;
      setQueryParam({ router, key: queryKey, value: null });
    }

    window.addEventListener("popstate", handler);
    return () => {
      window.removeEventListener("popstate", handler);
    };
  }, [isOpen, queryKey, router]);

  return {
    isOpen: !!isOpen,
    setIsOpen(this: void, open: boolean) {
      setQueryParam({ router, key: queryKey, value: open ? "true" : null, push: true });
    },
  };
}

type UrlDialogRootProps = { dialogQueryKey: string; onOpenChange?: (open: boolean) => void };
export function UrlDialogRoot({
  children,
  dialogQueryKey,
  onOpenChange,
}: PropsWithChildren<UrlDialogRootProps>) {
  const { isOpen, setIsOpen } = useUrlDialog(dialogQueryKey);
  return (
    <Root
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange?.(open);
        setIsOpen(open);
      }}
    >
      {children}
    </Root>
  );
}
