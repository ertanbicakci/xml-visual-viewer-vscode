import { createTestEnvironment } from "./test-environment.mjs";
import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { runTests, runVSCodeCommand } from "@vscode/test-electron";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
const packaged = process.argv.includes("--package");
const local = "/Applications/Visual Studio Code.app/Contents/MacOS/Code";
await import("./build.mjs");
const environment = await createTestEnvironment();
const manifest = JSON.parse(await readFile("package.json", "utf8"));
const artifacts = resolve("artifacts/extension-host");
await mkdir(artifacts, { recursive: true });
try {
  let developmentPath = resolve(".");
  if (packaged) {
    developmentPath = resolve(environment.root, "driver");
    await mkdir(developmentPath, { recursive: true });
    await writeFile(
      resolve(developmentPath, "package.json"),
      JSON.stringify({
        name: "xml-viewer-test-driver",
        publisher: "local",
        version: "0.0.1",
        engines: { vscode: "^1.96.0" },
        main: "index.cjs",
      }),
    );
    await writeFile(
      resolve(developmentPath, "index.cjs"),
      "exports.activate = () => {};",
    );
    await runVSCodeCommand(
      [
        "--install-extension",
        resolve(`${manifest.name}-${manifest.version}.vsix`),
        "--force",
        "--user-data-dir",
        environment.userData,
        "--extensions-dir",
        environment.extensions,
      ],
      { version: process.env.VSCODE_VERSION ?? "stable" },
    );
  }
  await runTests({
    extensionTestsEnv: {
      XML_VIEWER_CDP_URL: `http://127.0.0.1:${environment.port}`,
      XML_VIEWER_TEST_ARTIFACTS: artifacts,
      XML_VIEWER_TEST_TEMP: environment.root,
      XML_VIEWER_EXTENSION_ID: manifest.publisher + "." + manifest.name,
      XML_VIEWER_PACKAGE_TEST: packaged ? "true" : "false",
      XML_VIEWER_INSTALLED_ROOT: environment.extensions,
      XML_VIEWER_REPORT_DIR: resolve("artifacts"),
    },
    ...(packaged
      ? { version: process.env.VSCODE_VERSION ?? "stable" }
      : process.env.VSCODE_EXECUTABLE
        ? { vscodeExecutablePath: process.env.VSCODE_EXECUTABLE }
        : process.env.VSCODE_VERSION
          ? { version: process.env.VSCODE_VERSION }
          : existsSync(local)
            ? { vscodeExecutablePath: local }
            : { version: "stable" }),
    extensionDevelopmentPath: developmentPath,
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
