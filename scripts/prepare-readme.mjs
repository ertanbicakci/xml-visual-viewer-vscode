import { readFile, mkdir, writeFile } from "node:fs/promises";
import { prepareReadme } from "./readme-content.mjs";
// Publisher registration does not establish public access to repository assets.
// Enable relative Marketplace assets explicitly after repository visibility is confirmed.
const readme = prepareReadme(
  await readFile("README.md", "utf8"),
  process.argv.includes("--public-repository"),
);
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/package-readme.md", readme);
