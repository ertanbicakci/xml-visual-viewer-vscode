import { encodeModel, decodeModel } from "../../src/shared/model-codec";
import { expect, it } from "vitest";
import { parseXmlDocument } from "../../src/core/parser";

it("does not duplicate long ancestor paths and namespace strings in serialized models", () => {
  const root = "r".repeat(1000);
  const source = `<${root} xmlns="urn:${"u".repeat(1000)}">${"<x/>".repeat(300)}</${root}>`;
  const result = parseXmlDocument(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(
    new TextEncoder().encode(JSON.stringify(result.model)).byteLength,
  ).toBeLessThan(160_000);
  const child = Object.values(result.model.nodes).find(
    (node) => node.name === "x",
  )!;
  expect(child.path).toBe(`/${root}[1]/x[1]`);
  expect(Object.getOwnPropertyDescriptor(child, "path")?.enumerable).toBe(
    false,
  );
});

it("enforces a derived-model byte budget independently of input bytes", () => {
  const result = parseXmlDocument(
    "<r>" + "<x/>".repeat(30) + "</r>",
    "test",
    1,
    { maxModelBytes: 1024 } as any,
  );
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe("limit");
});

it("bounds attribute allocation independently of the element count", () => {
  const result = parseXmlDocument('<r a="1" b="2"/>', "test", 1, {
    maxAttributes: 1,
  } as any);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe("limit");
});

it("round-trips complete source mappings and recreates computed paths after worker transfer", () => {
  const parsed = parseXmlDocument(
    '<r xmlns:p="urn:one"><p:x key="&amp;">😀</p:x><p:x/></r>',
    "file:///test.xml",
    7,
  );
  if (!parsed.ok) throw Error(parsed.error.message);
  const restored = decodeModel(structuredClone(encodeModel(parsed.model)));
  const second = Object.values(restored.nodes).filter(
    (n) => n.name === "p:x",
  )[1]!;
  expect(second.path).toBe("/r[1]/p:x[2]");
  expect(restored.version).toBe(7);
  expect(encodeModel(restored)).toEqual(encodeModel(parsed.model));
});
