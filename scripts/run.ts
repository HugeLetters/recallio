import { spawn } from "child_process";
import "dotenv/config";

spawn(`pnpm tsx scripts/${process.argv[2]}.ts`, {
  shell: true,
  stdio: "inherit",
});
