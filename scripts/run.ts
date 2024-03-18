import "dotenv/config";

import { hasProperty } from "@/utils/object";

async function run() {
  const scriptName = process.argv[2];
  const script: unknown = await import(`scripts/${scriptName}.ts`);
  if (!hasProperty(script, "default")) {
    throw Error(`Script "${scriptName}" has no default export`);
  }

  const main = script.default;
  if (typeof main !== "function") {
    throw Error(`Script "${scriptName}" default export is not a function`);
  }
  const val: unknown = main();
  return val;
}

run().catch(console.error);
