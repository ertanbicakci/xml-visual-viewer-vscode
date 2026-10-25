import { readFile, mkdir, writeFile } from "node:fs/promises";
const manifest = JSON.parse(await readFile("package.json", "utf8"));
let readme = await readFile("README.md", "utf8");
// Marketplace resolves relative images through the repository URL. Until one
// exists, package a self-contained text README and retain images in the VSIX.
if (!manifest.repository) {
  readme = readme.replace(
    /!\[[^\]]*\]\((?!https?:)[^)]+\)/g,
    "A preview screenshot is included at `docs/images/preview.png` in the installed extension.",
  );
  readme = readme.replace(
    /\[([^\]]+)\]\((?!https?:|#)([^)]+)\)/g,
    "$1 (`$2` in the source repository)",
  );
}
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/package-readme.md", readme);
