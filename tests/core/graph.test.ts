import { describe, it, expect } from "vitest";
import { parseXmlDocument } from "../../src/core/parser";
import {
  displayChildren,
  projectGraph,
  initialExpanded,
  revealNode,
  nodeAtOffset,
  searchModel,
  previewValue,
} from "../../src/core/graph";
function model(xml: string) {
  const r = parseXmlDocument(xml);
  if (!r.ok) throw new Error(r.error.message);
  return r.model;
}

describe("graph exploration", () => {
  it("starts with a bounded tree, respects collapse and preserves sibling order", () => {
    const m = model("<r><a><nested/></a><b/></r>");
    const g = projectGraph(m, { expanded: initialExpanded(m) });
    expect(g.nodes.map((n) => n.name)).toEqual(["XML document", "r", "a", "b"]);
    expect(g.edges).toHaveLength(3);
    const folded = projectGraph(m, { expanded: new Set(["document"]) });
    expect(folded.nodes.map((n) => n.name)).toEqual(["XML document", "r"]);
  });
  it("inlines leaf text but keeps mixed content, meaningful spaces and xml:space", () => {
    const m = model(
      '<r>\n  <leaf>a &amp; b</leaf>\n  <mixed>Hello <b>world</b> !</mixed><keep xml:space="preserve">\n <x/>\n </keep>\n</r>',
    );
    const leaf = Object.values(m.nodes).find((n) => n.name === "leaf")!;
    const mixed = Object.values(m.nodes).find((n) => n.name === "mixed")!;
    const keep = Object.values(m.nodes).find((n) => n.name === "keep")!;
    expect(displayChildren(m, leaf, {})).toEqual([]);
    expect(previewValue(m, leaf)).toBe("a & b");
    expect(displayChildren(m, mixed, {})).toHaveLength(3);
    expect(displayChildren(m, keep, {})).toHaveLength(3);
  });
  it("can show comments and declarations without exposing indentation by default", () => {
    const m = model('<?xml version="1.0"?><r>\n<!--hi--><x/>\n</r>');
    const r = Object.values(m.nodes).find((n) => n.name === "r")!;
    expect(displayChildren(m, r, {})).toHaveLength(1);
    expect(displayChildren(m, r, { showMetadata: true })).toHaveLength(2);
    expect(
      displayChildren(m, r, { showMetadata: true, showWhitespace: true }),
    ).toHaveLength(4);
  });
  it("finds values, attributes and hidden branches; reveals a paginated sibling", () => {
    const m = model(
      `<r>${Array.from({ length: 130 }, (_, i) => `<item id="${i}">value ${i}</item>`).join("")}</r>`,
    );
    const matches = searchModel(m, "value 129");
    expect(matches).toHaveLength(1);
    const reveal = revealNode(m, matches[0]!, initialExpanded(m), {});
    const g = projectGraph(m, {
      expanded: reveal.expanded,
      pages: reveal.pages,
    });
    expect(g.nodes.some((n) => n.id === reveal.id)).toBe(true);
    expect(m.nodes[reveal.id]!.attributes[0]!.value).toBe("129");
    expect(searchModel(m, "id")).toHaveLength(130);
    expect(searchModel(m, "")).toEqual([]);
  });
  it("enforces the visible node budget and permits subtree focus", () => {
    const m = model("<r><a/><b/><c/></r>");
    const expanded = new Set(Object.keys(m.nodes));
    const g = projectGraph(m, { expanded, maxVisible: 3 });
    expect(g.nodes).toHaveLength(3);
    expect(g.limited).toBe(true);
    const b = Object.values(m.nodes).find((n) => n.name === "b")!;
    expect(
      projectGraph(m, { expanded, focusId: b.id }).nodes.map((n) => n.name),
    ).toEqual(["b"]);
  });
  it("chooses the innermost source node, including inlined text and attributes", () => {
    const xml = '<r>😀<item id="42">text</item><item/></r>';
    const m = model(xml);
    expect(nodeAtOffset(m, xml.indexOf("42"))?.name).toBe("item");
    const text = nodeAtOffset(m, xml.indexOf("text") + 1)!;
    expect(text.kind).toBe("text");
    expect(revealNode(m, text.id, new Set(), {}).id).toBe(text.parentId);
    expect(nodeAtOffset(m, xml.length + 1)).toBeUndefined();
  });
});
it("reports whether a search matched names, attributes, namespaces or text", async () => {
  const { searchWithContext } = await import("../../src/core/graph");
  const parsed = parseXmlDocument(
    '<r xmlns="urn:orders"><item id="needle">content</item></r>',
  );
  if (!parsed.ok) throw Error(parsed.error.message);
  expect(
    Object.values(searchWithContext(parsed.model, "needle").contexts),
  ).toContain("attribute");
  expect(
    Object.values(searchWithContext(parsed.model, "content").contexts),
  ).toContain("text");
  expect(
    Object.values(searchWithContext(parsed.model, "urn:orders").contexts),
  ).toContain("namespace");
  expect(
    Object.values(searchWithContext(parsed.model, "item").contexts),
  ).toContain("name");
});
