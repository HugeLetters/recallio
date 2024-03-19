import "dotenv/config";

import { env } from "@/server/env/index.mjs";
import { filterMap } from "@/utils/array/filter";
import { Client } from "@upstash/qstash";

const client = new Client({ token: env.QSTASH_TOKEN });
const schedules = client.schedules;
const route = "api/file-cleanup";
const destination = `${env.NEXTAUTH_URL}/${route}`;

export default async function main() {
  if (env.NEXT_PUBLIC_NODE_ENV !== "production") return;

  await killSchedules();
  return await schedules.create({
    destination,
    cron: "0 0 * * 0", // every week
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
