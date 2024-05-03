import Link from "next/link";
import BrokenEggshellIcon from "~icons/custom/broken-eggshell";
import { ButtonLike } from "./button";

type ErrorProps = { message?: string };
export function Error({ message: error }: ErrorProps) {
  const splitError = error ? splitSentence(error) : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col items-center justify-center gap-3 p-4 text-center">
      <BrokenEggshellIcon className="size-full px-10" />
      <div className="space-y-2 py-4">
        {!!splitError && (
          <div className="text-balance text-xl font-medium">
            <p>{splitError[0]}</p>
            <p>{splitError[1]}</p>
          </div>
        )}
        <p className="text-sm">Please try again</p>
      </div>
      <ButtonLike>
        <Link
          href="/profile"
          className="primary mt-3 w-2/5"
        >
          Go to homepage
        </Link>
      </ButtonLike>
    </div>
  );
}

function splitSentence(string: string) {
  const splitIndex = Math.ceil(string.length / 2);
  const [first, second] = [string.slice(0, splitIndex), string.slice(splitIndex)];
  const [middle, ...rest] = second.split(" ");

  return [first + middle, rest.join(" ")] as const;
}
