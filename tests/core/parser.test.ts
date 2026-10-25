import { describe, it, expect } from "vitest";
import { parseXmlDocument } from "../../src/core/parser";
import type { XmlModel } from "../../src/core/model";

function model(source: string): XmlModel {
  const result = parseXmlDocument(source, "file:///test.xml", 7);
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.model;
}

describe("XML model and source positions", () => {
  it("keeps comment text searchable without duplicating all text on the document node", () => {
    const m = model("<!-- Live update integration test --><r>value</r>");
    expect(
      Object.values(m.nodes).find((n) => n.kind === "comment")!.value,
    ).toBe(" Live update integration test ");
    expect(m.nodes[m.rootId]!.value).toBe("");
  });
  it("keeps repeated siblings separate and mixed content in source order", () => {
    const m = model("<root><p>Hello <b>world</b>!</p><p/></root>");
    const ps = Object.values(m.nodes).filter((n) => n.name === "p");
    expect(ps).toHaveLength(2);
    expect(ps.map((n) => n.path)).toEqual(["/root[1]/p[1]", "/root[1]/p[2]"]);
    expect(ps[0]!.children.map((id) => m.nodes[id]!.kind)).toEqual([
      "text",
      "element",
      "text",
    ]);
    expect(m.version).toBe(7);
  });

  it("maps element and attribute spans to original UTF-16 source including emoji, CRLF and entities", () => {
    const source =
      '<root>😀\r\n<item key = "a&amp;😀">İstanbul &amp; İzmir</item></root>';
    const m = model(source);
    const item = Object.values(m.nodes).find((n) => n.name === "item")!;
    const attr = item.attributes[0]!;
    expect(source.slice(item.range.start, item.range.end)).toBe(
      '<item key = "a&amp;😀">İstanbul &amp; İzmir</item>',
    );
    expect(source.slice(item.nameRange.start, item.nameRange.end)).toBe("item");
    expect(source.slice(attr.nameRange.start, attr.nameRange.end)).toBe("key");
    expect(source.slice(attr.valueRange.start, attr.valueRange.end)).toBe(
      "a&amp;😀",
    );
    expect(attr.value).toBe("a&😀");
    expect(m.nodes[item.children[0]!]!.value).toBe("İstanbul & İzmir");
  });

  it("resolves scoped namespaces without applying default namespaces to plain attributes", () => {
    const m = model(
      '<r xmlns="urn:a" xmlns:p="urn:p"><p:x id="1" p:id="2"/><x xmlns="urn:b"/><x/></r>',
    );
    const xs = Object.values(m.nodes).filter((n) => n.localName === "x");
    expect(xs.map((n) => n.namespaceUri)).toEqual(["urn:p", "urn:b", "urn:a"]);
    expect(xs[0]!.attributes.map((a) => a.namespaceUri)).toEqual(["", "urn:p"]);
  });

  it("preserves CDATA, comments, processing instructions and xml:space", () => {
    const m = model(
      '<?xml version="1.0"?><?work yes?><r xml:space="preserve">  <![CDATA[<safe>]]><!--note--><x xml:space="default"> </x></r>',
    );
    const kinds = Object.values(m.nodes).map((n) => n.kind);
    expect(kinds).toEqual(
      expect.arrayContaining(["xmldecl", "pi", "cdata", "comment", "text"]),
    );
    const r = Object.values(m.nodes).find((n) => n.name === "r")!;
    const x = Object.values(m.nodes).find((n) => n.name === "x")!;
    expect(r.preserveSpace).toBe(true);
    expect(x.preserveSpace).toBe(false);
    expect(m.nodes[r.children[0]!]!.value).toBe("  ");
  });

  it.each(["<r><x></r>", "<a/><b/>", '<r a="1" a="2"/>', "<r>&unknown;</r>"])(
    "reports malformed XML: %s",
    (source) => {
      const r = parseXmlDocument(source);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("syntax");
    },
  );

  it.each([
    "<p:x/>",
    '<r xmlns:p="u" xmlns:q="u" p:a="1" q:a="2"/>',
    '<r xmlns:xml="wrong"/>',
    '<r xmlns:p=""/>',
    "<toString:x/>",
    "<__proto__:x/>",
    '<p:-x xmlns:p="u"/>',
    '<r xmlns:9p="u"/>',
  ])("rejects invalid namespace bindings: %s", (source) => {
    const r = parseXmlDocument(source);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("namespace");
  });

  it("rejects DOCTYPE and XML 1.1 but permits their text inside comments/CDATA", () => {
    for (const source of [
      '<!DOCTYPE r SYSTEM "file:///etc/passwd"><r/>',
      '<?xml version="1.1"?><r/>',
    ]) {
      const r = parseXmlDocument(source);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("unsupported");
    }
    model("<r><!-- <!DOCTYPE r> --><![CDATA[<!DOCTYPE r>]]></r>");
  });

  it("enforces byte, depth and node budgets and distinguishes empty input", () => {
    for (const [source, limits] of [
      ["<r>😀</r>", { maxBytes: 10 }],
      ["<r><a><b/></a></r>", { maxDepth: 2 }],
      ["<r><a/><b/></r>", { maxNodes: 3 }],
    ] as const) {
      const r = parseXmlDocument(source, "test", 1, limits);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("limit");
    }
    const r = parseXmlDocument(" \r\n ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("empty");
  });
});
