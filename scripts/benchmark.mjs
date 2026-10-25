import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { cpus, platform, release, arch } from "node:os";
await mkdir("artifacts", { recursive: true });
await build({
  entryPoints: ["src/core/parser.ts"],
  outfile: "artifacts/parser.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
});
const { parseXmlDocument } = createRequire(import.meta.url)(
  "../artifacts/parser.cjs",
);
const rows = [];
for (const [name, count] of [
  ["standard", 1000],
  ["large", 16_000],
]) {
  const text = `<catalog>${Array.from({ length: count }, (_, i) => `<item id="${i}"><name>${"XML visualization ".repeat(10)}${i}</name></item>`).join("")}</catalog>`;
  const times = [];
  let sample;
  for (let i = 0; i < 12; i++) {
    const start = performance.now();
    const parsed = parseXmlDocument(text, "benchmark.xml", i);
    const elapsed = performance.now() - start;
    if (!parsed.ok) throw new Error(parsed.error.message);
    if (i > 1) times.push(elapsed);
    sample = parsed.model;
  }
  times.sort((a, b) => a - b);
  rows.push({
    profile: name,
    bytes: Buffer.byteLength(text),
    nodes: sample.nodeCount,
    elements: sample.elementCount,
    samples: times.length,
    medianMs: +times[Math.floor(times.length / 2)].toFixed(2),
    p95Ms: +times[Math.ceil(times.length * 0.95) - 1].toFixed(2),
  });
}
const report = {
  measuredAt: new Date().toISOString(),
  node: process.version,
  os: `${platform()} ${release()} ${arch()}`,
  cpu: cpus()[0]?.model,
  scope:
    "Parser and model only. Does not include worker startup, IPC, graph layout or rendering.",
  results: rows,
};
await writeFile(
  "artifacts/benchmark.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
