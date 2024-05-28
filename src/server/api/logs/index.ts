import { createTRPCRouter } from "@/server/api/trpc";
import { errorLogsRouter } from "./error";

export const logsRouter = createTRPCRouter({
  error: errorLogsRouter,
});
