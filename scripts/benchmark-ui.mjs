import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { cpus, platform, release, arch } from "node:os";
import { spawn } from "node:child_process";
await import("./build.mjs");
let server;
try {
  await fetch("http://127.0.0.1:4173/");
} catch {
  server = spawn(process.execPath, ["scripts/preview.mjs"], {
    stdio: "ignore",
  });
  for (let i = 0; i < 40; i++) {
    try {
      await fetch("http://127.0.0.1:4173/");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}
const browser = await chromium.launch();
const ready = (page) =>
  page.waitForSelector(
    '.viewer[data-state="ready"] .react-flow:not([inert]) .react-flow__node',
    { timeout: 30000 },
  );
const painted = (page) =>
  page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
const summarize = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    samples: sorted.length,
    medianMs: +sorted[Math.floor(sorted.length / 2)].toFixed(1),
    p95Ms: +sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(1),
  };
};
const results = [];
try {
  for (const [profile, count] of [
    ["standard", 1000],
    ["large", 16000],
  ]) {
    const xml = `<catalog>${Array.from({ length: count }, (_, i) => `<item id="row-${i}"><name>${"XML visualization ".repeat(10)}${i}</name></item>`).join("")}</catalog>`;
    const open = [],
      search = [],
      update = [],
      heaps = [];
    for (let sample = 0; sample < 5; sample++) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 960 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await page.route("**/examples/catalog.xml", (route) =>
        route.fulfill({ contentType: "application/xml", body: xml }),
      );
      let start = performance.now();
      await page.goto("http://127.0.0.1:4173/");
      await ready(page);
      await painted(page);
      open.push(performance.now() - start);
      start = performance.now();
      await page.getByRole("searchbox").fill(`row-${count - 1}`);
      await page
        .getByTestId("node-inspector")
        .filter({ hasText: `row-${count - 1}` })
        .waitFor();
      await ready(page);
      await painted(page);
      search.push(performance.now() - start);
      start = performance.now();
      await page.evaluate(
        (text) => window.xmlViewerDemo.update(text),
        xml.replace("<catalog>", '<catalog updated="true">'),
      );
      await page.waitForSelector(
        '.viewer[data-document-version="2"][data-state="ready"]',
      );
      await ready(page);
      await painted(page);
      update.push(performance.now() - start);
      const cdp = await context.newCDPSession(page);
      await cdp.send("Performance.enable");
      const metrics = await cdp.send("Performance.getMetrics");
      heaps.push(
        metrics.metrics.find((m) => m.name === "JSHeapUsedSize")?.value ?? 0,
      );
      await context.close();
    }
    results.push({
      profile,
      bytes: Buffer.byteLength(xml),
      nodes: count * 3 + 2,
      coldOpen: summarize(open),
      searchLastElement: summarize(search),
      sourceUpdate: summarize(update),
      maxBrowserMainHeapMiB: +(Math.max(...heaps) / 1024 / 1024).toFixed(1),
    });
  }
  const report = {
    measuredAt: new Date().toISOString(),
    os: `${platform()} ${release()} ${arch()}`,
    cpu: cpus()[0]?.model,
    browser: await browser.version(),
    scope:
      "Standalone browser harness. Cold browser context to interactive graph and two animation frames; includes asset loading, synchronous harness parsing, wire encoding/decoding, ELK worker and rendering. Search includes its 160ms debounce. Source updates exclude the Extension Host 400ms debounce and IPC; use extension-performance reports for actual VS Code opening. Heap is Chromium main renderer only, excluding workers and Extension Host. Five samples are indicative, not a performance guarantee.",
    results,
  };
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    "artifacts/benchmark-ui.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  server?.kill();
}
