import { createTestEnvironment } from "./test-environment.mjs";
import { cp, mkdir, rm } from "node:fs/promises";
import { runTests } from "@vscode/test-electron";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
const local = "/Applications/Visual Studio Code.app/Contents/MacOS/Code";
await import("./build.mjs");
const environment = await createTestEnvironment();
const artifacts = resolve("artifacts/extension-host");
await mkdir(artifacts, { recursive: true });
try {
  await runTests({
    extensionTestsEnv: {
      XML_VIEWER_CDP_URL: `http://127.0.0.1:${environment.port}`,
      XML_VIEWER_TEST_ARTIFACTS: artifacts,
    },
    ...(process.env.VSCODE_EXECUTABLE
      ? { vscodeExecutablePath: process.env.VSCODE_EXECUTABLE }
      : process.env.VSCODE_VERSION
        ? { version: process.env.VSCODE_VERSION }
        : existsSync(local)
          ? { vscodeExecutablePath: local }
          : { version: "stable" }),
    extensionDevelopmentPath: resolve("."),
    extensionTestsPath: resolve("dist/extension-tests.cjs"),
    launchArgs: [
      resolve("examples"),
      "--user-data-dir",
      environment.userData,
      "--extensions-dir",
      environment.extensions,
      "--disable-gpu",
      "--new-window",
      "--skip-welcome",
      "--skip-release-notes",
      "--disable-workspace-trust",
      "--disable-extensions",
      `--remote-debugging-port=${environment.port}`,
      "--remote-debugging-address=127.0.0.1",
    ],
  });
} finally {
  if (existsSync(resolve(environment.userData, "logs")))
    await cp(
      resolve(environment.userData, "logs"),
      resolve(artifacts, "logs"),
      { recursive: true },
    );
  await rm(environment.root, { recursive: true, force: true });
}
