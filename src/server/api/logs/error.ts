import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/database/client";
import { log, logMaxLength } from "@/server/database/schema/logs";
import { ignore } from "@/utils";
import { z } from "zod";

const clientErrorSchema = z.object({ message: z.string(), stack: z.string().optional() });
const reportClientError = protectedProcedure
  .input(clientErrorSchema)
  .mutation(({ input, ctx: { session } }) => {
    return db
      .insert(log)
      .values({ log: createErrorLog(input), type: "error", user: session.user.id })
      .then(ignore);
  });

type ClientError = z.infer<typeof clientErrorSchema>;
function createErrorLog({ message, stack }: ClientError) {
  const log = message + stack;

  if (log.length <= logMaxLength) return log;
  return log.slice(0, logMaxLength);
}

export const errorLogsRouter = createTRPCRouter({
  reportClientError,
});
