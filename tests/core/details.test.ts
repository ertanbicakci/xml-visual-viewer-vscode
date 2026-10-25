import { test, expect } from "vitest";
import { parseXmlDocument } from "../../src/core/parser";
import { detailSnapshot } from "../../src/shared/details";
test("bounds total details, including repeated namespace metadata and attributes", () => {
  const result = parseXmlDocument(
    `<r xmlns:p="urn:${"x".repeat(5000)}" ${Array.from({ length: 300 }, (_, i) => `p:a${i}="${"v".repeat(300)}"`).join(" ")}/>`,
  );
  if (!result.ok) throw Error(result.error.message);
  const node = Object.values(result.model.nodes).find((n) => n.name === "r")!;
  const details = detailSnapshot(node);
  expect(JSON.stringify(details).length).toBeLessThan(150000);
  expect(details.truncated).toBe(true);
  expect(details.attributeCount).toBe(301);
});
