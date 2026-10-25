import { readFile, mkdir, writeFile } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";
import { createHash } from "node:crypto";
// Inspect our generated VSIX without extracting or running anything from it.
const manifest = JSON.parse(await readFile("package.json", "utf8"));
const file = `${manifest.name}-${manifest.version}.vsix`;
const zip = await readFile(file);
let end = -1;
for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--)
  if (zip.readUInt32LE(i) === 0x06054b50) {
    end = i;
    break;
  }
if (end < 0) throw Error("VSIX has no ZIP directory");
const count = zip.readUInt16LE(end + 10),
  entries = new Map();
let at = zip.readUInt32LE(end + 16);
for (let i = 0; i < count; i++) {
  if (zip.readUInt32LE(at) !== 0x02014b50) throw Error("Invalid ZIP directory");
  const size = zip.readUInt32LE(at + 20),
    length = zip.readUInt16LE(at + 28),
    extra = zip.readUInt16LE(at + 30),
    comment = zip.readUInt16LE(at + 32);
  const name = zip.subarray(at + 46, at + 46 + length).toString("utf8");
  entries.set(name, {
    size,
    offset: zip.readUInt32LE(at + 42),
    method: zip.readUInt16LE(at + 10),
  });
  at += 46 + length + extra + comment;
}
const expected = [
  "[Content_Types].xml",
  "extension.vsixmanifest",
  "extension/package.json",
  "extension/readme.md",
  "extension/changelog.md",
  "extension/LICENSE.txt",
  "extension/THIRD_PARTY_NOTICES.txt",
  "extension/assets/icon.png",
  "extension/docs/images/preview.png",
  "extension/dist/extension.cjs",
  "extension/dist/parse-worker.cjs",
  "extension/dist/webview/app.js",
  "extension/dist/webview/app.css",
  "extension/dist/webview/layout-worker.js",
  ...["catalog", "soap", "pom", "mixed-content"].map(
    (name) => `extension/examples/${name}.xml`,
  ),
];
for (const name of entries.keys())
  if (!expected.includes(name))
    throw Error(`Unexpected package entry: ${name}`);
for (const name of expected)
  if (!entries.has(name)) throw Error(`Missing package entry: ${name}`);
const packaged = entries.get("extension/package.json");
const offset = packaged.offset;
const dataStart =
  offset + 30 + zip.readUInt16LE(offset + 26) + zip.readUInt16LE(offset + 28);
const data = zip.subarray(dataStart, dataStart + packaged.size);
const actual = JSON.parse(
  (packaged.method === 8 ? inflateRawSync(data) : data).toString("utf8"),
);
if (
  actual.version !== manifest.version ||
  actual.publisher !== manifest.publisher
)
  throw Error("Packaged identity differs from source");
const report = {
  file,
  version: actual.version,
  publisher: actual.publisher,
  bytes: zip.length,
  sha256: createHash("sha256").update(zip).digest("hex"),
  files: [...entries.keys()].sort(),
  scope:
    "Package structure and identity verified locally. Does not establish Marketplace registration or cross-platform runtime compatibility.",
};
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/package-report.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `Verified ${file}: ${count} files, ${zip.length} bytes, SHA-256 ${report.sha256}`,
);
