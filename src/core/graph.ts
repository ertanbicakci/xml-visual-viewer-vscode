import type { XmlModel, XmlNode } from "./model";
export interface GraphOptions {
  expanded: Set<string>;
  pages?: Record<string, number>;
  showMetadata?: boolean;
  showWhitespace?: boolean;
  maxVisible?: number;
  focusId?: string;
}
export interface GraphProjection {
  nodes: XmlNode[];
  edges: { id: string; source: string; target: string }[];
  limited: boolean;
}
export function displayChildren(
  model: XmlModel,
  node: XmlNode,
  options: Pick<GraphOptions, "showMetadata" | "showWhitespace">,
): string[] {
  const children = node.children.map((id) => model.nodes[id]!);
  const inlineText =
    node.kind === "element" &&
    children.length > 0 &&
    children.every((n) => n.kind === "text" || n.kind === "cdata");
  return children
    .filter((n) => {
      if (
        ["comment", "pi", "xmldecl"].includes(n.kind) &&
        !options.showMetadata
      )
        return false;
      if (inlineText && !options.showWhitespace && !options.showMetadata)
        return false;
      if (
        n.kind === "text" &&
        !n.preserveSpace &&
        !n.value.trim() &&
        /[\r\n]/.test(n.value) &&
        !options.showWhitespace
      )
        return false;
      return true;
    })
    .map((n) => n.id);
}
export function projectGraph(
  model: XmlModel,
  options: GraphOptions,
): GraphProjection {
  const result: GraphProjection = { nodes: [], edges: [], limited: false };
  const budget = options.maxVisible ?? 1000;
  const visit = (id: string, parent?: string) => {
    if (result.nodes.length >= budget) {
      result.limited = true;
      return;
    }
    const node = model.nodes[id];
    if (!node) return;
    result.nodes.push(node);
    if (parent)
      result.edges.push({ id: `${parent}-${id}`, source: parent, target: id });
    if (!options.expanded.has(id)) return;
    const children = displayChildren(model, node, options);
    for (const child of children.slice(0, (options.pages?.[id] ?? 1) * 100))
      visit(child, id);
  };
  visit(
    options.focusId && model.nodes[options.focusId]
      ? options.focusId
      : model.rootId,
  );
  return result;
}
export function initialExpanded(model: XmlModel, depth = 2): Set<string> {
  return new Set(
    Object.values(model.nodes)
      .filter((n) => n.depth < depth)
      .map((n) => n.id),
  );
}
export function revealNode(
  model: XmlModel,
  id: string,
  expanded: Set<string>,
  pages: Record<string, number>,
): { id: string; expanded: Set<string>; pages: Record<string, number> } {
  const nextExpanded = new Set(expanded),
    nextPages = { ...pages };
  const original = model.nodes[id];
  if (!original) return { id, expanded: nextExpanded, pages: nextPages };
  let node: XmlNode = original;
  // Leaf text is shown in its element's card rather than as a separate node.
  if (node.parentId && (node.kind === "text" || node.kind === "cdata")) {
    const parent: XmlNode = model.nodes[node.parentId]!;
    if (
      parent.children.every((child) =>
        ["text", "cdata"].includes(model.nodes[child]!.kind),
      )
    )
      node = parent;
  }
  const targetId = node.id;
  while (node.parentId) {
    const parent = model.nodes[node.parentId]!;
    nextExpanded.add(parent.id);
    // Use the raw index as an upper bound so hidden metadata can't hide a match.
    const page = Math.floor(parent.children.indexOf(node.id) / 100) + 1;
    nextPages[parent.id] = Math.max(nextPages[parent.id] ?? 1, page);
    node = parent;
  }
  const sameExpanded =
    nextExpanded.size === expanded.size &&
    [...nextExpanded].every((id) => expanded.has(id));
  const meaningfulPages = Object.fromEntries(
    Object.entries(nextPages).filter(([, page]) => page > 1),
  );
  const samePages =
    Object.keys(meaningfulPages).length ===
      Object.keys(pages).filter((key) => pages[key]! > 1).length &&
    Object.entries(meaningfulPages).every(([id, page]) => pages[id] === page);
  return {
    id: targetId,
    expanded: sameExpanded ? expanded : nextExpanded,
    pages: samePages ? pages : meaningfulPages,
  };
}
export function nodeAtOffset(
  model: XmlModel,
  offset: number,
): XmlNode | undefined {
  const visit = (node: XmlNode): XmlNode | undefined => {
    if (offset < node.range.start || offset >= node.range.end) return undefined;
    // Sibling source ranges are ordered and disjoint; binary search keeps cursor
    // navigation cheap even in documents with tens of thousands of siblings.
    let lo = 0,
      hi = node.children.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const child = model.nodes[node.children[mid]!]!;
      if (offset < child.range.start) hi = mid - 1;
      else if (offset >= child.range.end) lo = mid + 1;
      else return visit(child) ?? node;
    }
    return node;
  };
  return visit(model.nodes[model.rootId]!);
}
export type SearchContext = "name" | "namespace" | "attribute" | "text";
export function searchWithContext(
  model: XmlModel,
  query: string,
): { ids: string[]; contexts: Record<string, SearchContext> } {
  const needle = query.trim().toLocaleLowerCase();
  const result = {
    ids: [] as string[],
    contexts: {} as Record<string, SearchContext>,
  };
  if (!needle) return result;
  const cache = new Map<string, boolean>();
  const matches = (value: string) => {
    let found = cache.get(value);
    if (found === undefined) {
      found = value.toLocaleLowerCase().includes(needle);
      cache.set(value, found);
    }
    return found;
  };
  for (const node of Object.values(model.nodes)) {
    if (node.kind === "document") continue;
    const context: SearchContext | undefined = matches(node.name)
      ? "name"
      : matches(node.namespaceUri)
        ? "namespace"
        : matches(node.value)
          ? "text"
          : node.attributes.some(
                (a) =>
                  matches(a.name) ||
                  matches(a.value) ||
                  matches(a.namespaceUri),
              )
            ? "attribute"
            : undefined;
    if (context) {
      result.ids.push(node.id);
      result.contexts[node.id] = context;
    }
  }
  return result;
}
export function searchModel(model: XmlModel, query: string): string[] {
  return searchWithContext(model, query).ids;
}
export function previewValue(model: XmlModel, node: XmlNode): string {
  if (node.value) return node.value;
  if (
    node.children.every((id) =>
      ["text", "cdata"].includes(model.nodes[id]!.kind),
    )
  )
    return node.children.map((id) => model.nodes[id]!.value).join("");
  return "";
}
