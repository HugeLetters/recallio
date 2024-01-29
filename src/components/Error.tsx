import BrokenEggshellIcon from "~icons/custom/broken-eggshell";
import { Button } from "./UI";
import { useRouter } from "next/router";

type ErrorProps = { errorMessage?: string };
export function Error({ errorMessage: error }: ErrorProps) {
  const router = useRouter();
  const splitError = error ? splitSentence(error) : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-app flex-col items-center justify-center gap-3 p-4 text-center text-lime-950">
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
      <Button
        onClick={router.back}
        role="navigation"
        aria-label="go back"
        className="primary mt-3 w-2/5"
      >
        Go back
      </Button>
    </div>
  );
}

function splitSentence(string: string) {
  const splitIndex = Math.ceil(string.length / 2);
  const [first, second] = [string.slice(0, splitIndex), string.slice(splitIndex)];
  const [middle, ...rest] = second.split(" ");

  return [first + middle, rest.join(" ")] as const;
}
