import { expect, it } from "vitest";
import { parseXmlDocument } from "../../src/core/parser";
import { saveView, restoreView } from "../../src/core/view-state";
import { revealNode } from "../../src/core/graph";
const model = (xml: string) => {
  const r = parseXmlDocument(xml);
  if (!r.ok) throw Error(r.error.message);
  return r.model;
};
it("preserves selection, focus, expansion and paging across edits and insertion of keyed siblings", () => {
  const old = model(
    '<r><item id="a"><title>A</title></item><item id="b"><title>B</title></item></r>',
  );
  const b = Object.values(old.nodes).find((n) =>
    n.attributes.some((a) => a.value === "b"),
  )!;
  const title = old.nodes[b.children[0]!]!;
  const root = Object.values(old.nodes).find((n) => n.name === "r")!;
  const saved = saveView(old, {
    selected: title.id,
    focusId: b.id,
    expanded: new Set(["document", root.id, b.id]),
    pages: { [root.id]: 3 },
  });
  const next = model(
    '<r><item id="new"/><item id="a"><title>A</title></item><item id="b"><title>Updated B</title></item></r>',
  );
  const restored = restoreView(next, saved);
  expect(restored.selected).toBeDefined();
  expect(next.nodes[restored.selected!]!.path).toBe("/r[1]/item[3]/title[1]");
  expect(next.nodes[restored.focusId!]!.attributes[0]!.value).toBe("b");
  expect(restored.expanded.has(restored.focusId!)).toBe(true);
  expect(Object.values(restored.pages)).toContain(3);
});
it("clears ambiguous selection rather than picking a different identical sibling", () => {
  const old = model("<r><item/><item/></r>");
  const chosen = Object.values(old.nodes).find((n) => n.name === "item")!;
  const restored = restoreView(
    model("<r><item/><item/><item/></r>"),
    saveView(old, { selected: chosen.id, expanded: new Set(), pages: {} }),
  );
  expect(restored.selected).toBeUndefined();
  expect(restored.expanded.size).toBe(0);
});
it("matches unchanged unkeyed siblings by unique full-content fingerprint", () => {
  const old = model("<r><item>alpha</item><item>beta</item></r>");
  const chosen = Object.values(old.nodes).find(
    (n) => n.name === "item" && old.nodes[n.children[0]!]!.value === "beta",
  )!;
  const next = model("<r><item>beta</item><item>alpha</item></r>");
  const restored = restoreView(
    next,
    saveView(old, { selected: chosen.id, expanded: new Set(), pages: {} }),
  );
  expect(restored.selected).toBeDefined();
  expect(next.nodes[restored.selected!]!.path).toBe("/r[1]/item[1]");
});
it("keeps saved state bounded without repeating long XML names or namespace values", () => {
  const name = "r".repeat(1000);
  const m = model(
    `<${name} xmlns="urn:${"x".repeat(1000)}">${"<x/>".repeat(300)}</${name}>`,
  );
  const saved = saveView(m, {
    expanded: new Set(Object.keys(m.nodes)),
    pages: {},
  });
  expect(JSON.stringify(saved).length).toBeLessThan(256 * 1024);
  expect(JSON.stringify(saved)).not.toContain(name);
});
it("does not replace expansion/paging objects when a source target is already revealed", () => {
  const m = model("<r><x/></r>");
  const target = Object.values(m.nodes).find((n) => n.name === "x")!;
  const expanded = new Set(["document", target.parentId!]),
    pages = {};
  const reveal = revealNode(m, target.id, expanded, pages);
  expect(reveal.expanded).toBe(expanded);
  expect(reveal.pages).toBe(pages);
});
it("clears an identity that was duplicated in the old document even if only one remains", () => {
  const old = model('<r><item id="same">A</item><item id="same">B</item></r>');
  const chosen = Object.values(old.nodes).find((n) => n.name === "item")!;
  const restored = restoreView(
    model('<r><item id="same">B</item></r>'),
    saveView(old, { selected: chosen.id, expanded: new Set(), pages: {} }),
  );
  expect(restored.selected).toBeUndefined();
});
