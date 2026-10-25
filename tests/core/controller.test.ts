import { describe, it, expect } from "vitest";
import { DocumentController } from "../../src/extension/controller";
import { parseXmlDocument } from "../../src/core/parser";
import type { ParseResult } from "../../src/core/model";
import { validateMessage, snapshotModel } from "../../src/shared/protocol";

describe("document version and message boundaries", () => {
  it("immediately invalidates old navigation and ignores late parse results", async () => {
    const pending: ((r: ParseResult) => void)[] = [];
    const received: unknown[] = [];
    const controller = new DocumentController(
      "test",
      {
        parse: () => new Promise((resolve) => pending.push(resolve)),
        cancel() {},
        dispose() {},
      },
      (r) => received.push(r),
    );
    const first = controller.update("<old/>", 1);
    const second = controller.update("<new/>", 2);
    expect(pending).toHaveLength(2);
    pending[1]!(parseXmlDocument("<new/>", "test", 2));
    await second;
    expect(controller.current(2)?.elementCount).toBe(1);
    pending[0]!(parseXmlDocument("<old/>", "test", 1));
    await first;
    expect(
      Object.values(controller.current(2)!.nodes).some((n) => n.name === "old"),
    ).toBe(false);
    expect(controller.current(1)).toBeUndefined();
    const third = controller.update("<bad>", 3);
    expect(controller.current(2)).toBeUndefined();
    pending[2]!(parseXmlDocument("<bad>", "test", 3));
    await third;
    expect(controller.current(3)).toBeUndefined();
    expect(received).toHaveLength(5); // 3 loading + latest success + latest error
  });
  it("validates untrusted webview messages without accepting arbitrary source paths", () => {
    expect(
      validateMessage({ type: "reveal", version: 2, nodeId: "n12" }),
    ).toEqual({ type: "reveal", version: 2, nodeId: "n12" });
    expect(validateMessage({ type: "ready" })).toEqual({ type: "ready" });
    for (const value of [
      null,
      3,
      { type: "reveal", version: NaN, nodeId: "x" },
      { type: "search", query: "x".repeat(1001), version: 1, requestId: 1 },
      { type: "reveal", version: 1, uri: "file:///secret", nodeId: "x" },
      { type: "executeCommand", command: "x" },
    ])
      expect(validateMessage(value)).toBeUndefined();
  });
  it("sends bounded summaries without mutating the authoritative model", () => {
    const r = parseXmlDocument(
      `<r secret="${"a".repeat(1000)}">${"b".repeat(1000)}</r>`,
    );
    if (!r.ok) throw new Error(r.error.message);
    const snapshot = snapshotModel(r.model);
    const leaf = Object.values(snapshot.nodes).find((n) => n.kind === "text")!;
    expect(leaf.value.length).toBeLessThanOrEqual(240);
    expect(
      Object.values(snapshot.nodes).find((n) => n.name === "r")!.attributes[0]!
        .value.length,
    ).toBeLessThanOrEqual(240);
    expect(
      Object.values(r.model.nodes).find((n) => n.kind === "text")!.value,
    ).toHaveLength(1000);
  });
});
