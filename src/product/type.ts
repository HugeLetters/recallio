import type { RouterOutputs } from "@/trpc";

export type ReviewData = NonNullable<RouterOutputs["user"]["review"]["getOne"]>;
