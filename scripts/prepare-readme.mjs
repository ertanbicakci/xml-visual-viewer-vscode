import { readFile, mkdir, writeFile } from "node:fs/promises";
const manifest = JSON.parse(await readFile("package.json", "utf8"));
let readme = await readFile("README.md", "utf8");
// Marketplace resolves relative images through the repository URL. For local beta
// packages (including private repositories), keep a text README and retain images
// in the VSIX. Public Marketplace assets require publicly accessible HTTPS URLs.
if (!manifest.repository || manifest.publisher === "local") {
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
