import { createCron } from "./create";

const route = "api/logs-cleanup";
export default function main() {
  return createCron({
    route,
    cron: "0 0 * * 0", // every week
  });
}
