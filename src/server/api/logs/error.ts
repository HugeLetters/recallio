import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/database/client";
import { log, logMaxLength } from "@/server/database/schema/logs";
import { ignore } from "@/utils";
import { z } from "zod";

const clientErrorSchema = z.object({ message: z.string(), stack: z.string().optional() });
const reportClientError = protectedProcedure
  .input(clientErrorSchema)
  .mutation(({ input, ctx: { session } }) => {
    // todo - logs should rotate, no more than 500 messages
    return db
      .insert(log)
      .values({ log: createErrorLog(input), type: "error", user: session.user.id })
      .then(ignore);
  });

type ClientError = z.infer<typeof clientErrorSchema>;
function createErrorLog(error: ClientError) {
  const log = formatErrorLog(error);

  if (log.length <= logMaxLength) return log;
  return log.slice(0, logMaxLength);
}

function formatErrorLog({ message, stack }: ClientError) {
  if (!stack) return message;
  const formattedStack = formatStack(stack);
  if (!formattedStack) return message;

  return message + "\n" + formattedStack;
}

function formatStack(stackString: string) {
  const [header, ...stack] = stackString.split("\n");
  if (!header) return null;

  const formattedHeader = header.replace(/:.+$/, "");
  const formattedStack = stack.map((stack) => stack.replace(/^\s*at /, "")).join("->");
  return `${formattedHeader}:${formattedStack}`;
}

export const errorLogsRouter = createTRPCRouter({
  reportClientError,
});
