import { runTests } from "@vscode/test-electron";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
const local = "/Applications/Visual Studio Code.app/Contents/MacOS/Electron";
await import("./build.mjs");
await runTests({
  ...(process.env.VSCODE_EXECUTABLE
    ? { vscodeExecutablePath: process.env.VSCODE_EXECUTABLE }
    : existsSync(local)
      ? { vscodeExecutablePath: local }
      : { version: "stable" }),
  extensionDevelopmentPath: resolve("."),
  extensionTestsPath: resolve("dist/extension-tests.cjs"),
  launchArgs: [
    resolve("examples"),
    "--user-data-dir",
    resolve(".vscode-test/profile"),
    "--extensions-dir",
    resolve(".vscode-test/extensions"),
    "--skip-welcome",
    "--skip-release-notes",
    "--disable-workspace-trust",
    "--disable-extensions",
    "--remote-debugging-port=9337",
    "--remote-debugging-address=127.0.0.1",
  ],
});
