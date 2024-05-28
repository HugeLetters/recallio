import { execAsync } from "scripts/utils";

export default function main() {
  return execAsync("pnpm drizzle-kit generate").then(console.log).catch(console.error);
}
