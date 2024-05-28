import "dotenv/config";

import { env } from "@/server/env/index.mjs";
import { filterMap } from "@/utils/array/filter";
import { Client } from "@upstash/qstash";

const client = new Client({ token: env.QSTASH_TOKEN });
const schedules = client.schedules;

type CronData = { route: string; cron: string };
export async function createCron({ route, cron }: CronData) {
  if (env.NEXT_PUBLIC_NODE_ENV !== "production") return;

  const destination = `${env.NEXTAUTH_URL}/${route}`;
  await killSchedules(route);
  return await schedules.create({ destination, cron, retries: 1 });
}

function killSchedules(route: string) {
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
