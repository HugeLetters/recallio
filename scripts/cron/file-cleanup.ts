import "dotenv/config";

import { env } from "@/env/index.mjs";
import { Client } from "@upstash/qstash";
import { getBaseUrl } from "@/browser";
import { filterMap } from "@/utils/array/filter";

const client = new Client({ token: env.QSTASH_TOKEN });
const schedules = client.schedules;
const route = "api/file-cleanup";
const url = getBaseUrl();
const destination = `${url}/${route}`;

export default async function main() {
  if (env.NEXT_PUBLIC_NODE_ENV !== "production") return;

  await killSchedules();
  return await schedules.create({
    destination,
    // todo - test this on an hourly setup maybe first?
    // cron: "0 0 * * 0", // every week
    cron: "0 * * * *", // every hour
    retries: 1,
  });
}

function killSchedules() {
  return schedules.list().then((tasks) => {
    return Promise.all(
      filterMap(
        tasks,
        (task, bad) =>
          URL.canParse(task.destination) && task.destination.endsWith(route) ? task : bad,
        ({ scheduleId }) => schedules.delete(scheduleId),
      ),
    );
  });
}
