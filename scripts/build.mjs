import { build } from "esbuild";
import { mkdir, access, copyFile } from "node:fs/promises";
const exists = async (path) =>
  access(path).then(
    () => true,
    () => false,
  );
await mkdir("dist/webview", { recursive: true });
for (const [entry, outfile] of [
  ["src/extension/parse-worker.ts", "dist/parse-worker.cjs"],
  ["src/extension/extension.ts", "dist/extension.cjs"],
  ["tests/extension/suite.ts", "dist/extension-tests.cjs"],
]) {
  if (await exists(entry))
    await build({
      entryPoints: [entry],
      outfile,
      bundle: true,
      platform: "node",
      format: "cjs",
      target: "node20",
      external: ["vscode", "@playwright/test"],
      sourcemap: true,
    });
}
await copyFile(
  "node_modules/elkjs/lib/elk-worker.min.js",
  "dist/webview/layout-worker.js",
);
for (const [entry, outfile] of [
  ["src/webview/main.tsx", "dist/webview/app.js"],
  ["src/demo/main.tsx", "dist/webview/demo.js"],
]) {
  if (await exists(entry))
    await build({
      entryPoints: [entry],
      outfile,
      bundle: true,
      platform: "browser",
      format: "iife",
      target: "chrome120",
      minify: true,
      sourcemap: true,
      define: { "process.env.NODE_ENV": '"production"' },
    });
}
console.log("Build complete.");
