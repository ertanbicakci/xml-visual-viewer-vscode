import { readFile, readdir, writeFile } from "node:fs/promises";
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const entries = [];
for (const [path, info] of Object.entries(lock.packages)) {
  if (!path.startsWith("node_modules/") || info.dev) continue;
  const pkg = JSON.parse(await readFile(`${path}/package.json`, "utf8"));
  const files = (await readdir(path)).filter((file) =>
    /^(licen[cs]e|copying)(\.|$)/i.test(file),
  );
  const licenses = await Promise.all(
    files.map((file) => readFile(`${path}/${file}`, "utf8")),
  );
  if (!licenses.length)
    throw new Error(`No license file found for ${pkg.name}`);
  entries.push(
    `${pkg.name} ${pkg.version}\nLicense: ${pkg.license ?? info.license}\nSource: ${typeof pkg.repository === "string" ? pkg.repository : (pkg.repository?.url ?? pkg.homepage ?? "")}\n\n${licenses.join("\n\n")}`,
  );
}
entries.sort();
await writeFile(
  "THIRD_PARTY_NOTICES.txt",
  "Third-party packages used by XML Viewer\nGenerated from the locked runtime dependency tree.\n\nELK.js is distributed unmodified under EPL-2.0; its corresponding source is available at https://github.com/kieler/elkjs/tree/v0.12.0 and https://www.eclipse.org/elk/. The bundled upstream worker is included as dist/webview/layout-worker.js.\n\n" +
    entries.join("\n\n" + "=".repeat(72) + "\n\n") +
    "\n",
);
console.log(`Wrote notices for ${entries.length} runtime packages.`);
