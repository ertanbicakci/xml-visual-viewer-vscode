import { it, expect } from "vitest";
import { resolve } from "node:path";
import { WorkerParser } from "../../src/extension/worker-parser";
const worker = resolve("dist/parse-worker.cjs");
it("parses XML off the calling thread and returns versioned source mappings", async () => {
  const parser = new WorkerParser(worker);
  try {
    const result = await parser.parse("<r>😀<x/></r>", "file:///worker.xml", 4);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.model.version).toBe(4);
      expect(
        Object.values(result.model.nodes).find((n) => n.name === "x")!.range,
      ).toEqual({ start: 5, end: 9 });
    }
  } finally {
    parser.dispose();
  }
});
it("cancels obsolete work and terminates jobs exceeding the time budget", async () => {
  const parser = new WorkerParser(worker, 1);
  try {
    const first = parser.parse("<r/>", "test", 1);
    const rejected = expect(first).rejects.toThrow("cancelled");
    parser.cancel();
    await rejected;
    const result = await parser.parse("<r/>", "test", 2);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("limit");
  } finally {
    parser.dispose();
  }
});
