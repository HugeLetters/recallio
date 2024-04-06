import { exec } from "node:child_process";
import { promisify } from "node:util";

export function execAsync(command: string) {
  return promisify(exec)(command).then(({ stderr, stdout }) => {
    if (stderr) {
      console.log(stdout);
      throw Error(stderr);
    }
    return stdout;
  });
}
