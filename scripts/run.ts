import "dotenv/config";

import { hasProperty } from "@/utils/object";

const scriptName = process.argv[2];
async function run() {
  const script: unknown = await import(`scripts/${scriptName}.ts`);
  if (!hasProperty(script, "default")) {
    throw Error(`Script "${scriptName}" has no default export`);
  }

  const main = script.default;
  if (typeof main !== "function") {
    throw Error(`Script "${scriptName}" default export is not a function`);
  }
  const result: unknown = main();
  return result;
}

run()
  .then((result) => console.log(`${scriptName}: `, result))
  .catch((e) => {
    throw e;
  });
