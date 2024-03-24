import { tw } from "@/styles/tw";
import type { StrictOmit } from "@/utils/object";
import * as BaseSwitch from "@radix-ui/react-switch";
import type { PropsWithChildren } from "react";
import { forwardRef } from "react";

type SwitchProps = StrictOmit<BaseSwitch.SwitchProps, "className" | "children">;
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function _(props, ref) {
  return (
    <BaseSwitch.Root
      {...props}
      ref={ref}
      className="group flex w-14 rounded-full bg-zinc-500/20 p-1 transition-colors focus-visible:outline-app-green-500 data-[state=checked]:bg-app-green-500 data-[state=checked]:focus-visible:outline-lime-950"
    >
      <div className="transition-[flex-grow] group-data-[state=checked]:grow" />
      <BaseSwitch.Thumb className="block aspect-square h-7 rounded-full bg-white drop-shadow-md" />
    </BaseSwitch.Root>
  );
});

interface LabeledSwitchProps extends SwitchProps {
  className?: string;
}
export const LabeledSwitch = forwardRef<HTMLButtonElement, PropsWithChildren<LabeledSwitchProps>>(
  function _({ children, className, ...switchProps }, ref) {
    return (
      <label
        // Inside of forms switch appends a hidden sr-only checkbox input which can screw up the layout - 'relative' mititgates the damage somewhat
        className={tw("relative flex items-center justify-between rounded-lg px-4 py-2", className)}
      >
        {children}
        <Switch
          {...switchProps}
          ref={ref}
        />
      </label>
    );
  },
);
