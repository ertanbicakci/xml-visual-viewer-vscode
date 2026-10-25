import type { XmlNode, XmlAttribute } from "../core/model";
export function detailSnapshot(node: XmlNode) {
  let remaining = 100_000,
    truncated = false;
  const take = (text: string, cap = 4096) => {
    const size = Math.min(remaining, cap);
    remaining -= Math.min(text.length, size);
    if (text.length <= size) return text;
    truncated = true;
    return text.slice(0, Math.max(0, size - 1)) + (size ? "…" : "");
  };
  const fields = (item: XmlNode | XmlAttribute) => ({
    name: take(item.name),
    prefix: take(item.prefix),
    localName: take(item.localName),
    namespaceUri: take(item.namespaceUri),
    value: take(item.value, 100_000),
  });
  const snapshot = {
    ...node,
    ...fields(node),
    attributes: [] as XmlAttribute[],
  };
  for (const attr of node.attributes) {
    if (remaining <= 0 || snapshot.attributes.length >= 200) {
      truncated = true;
      break;
    }
    snapshot.attributes.push({ ...attr, ...fields(attr) });
  }
  return { node: snapshot, truncated, attributeCount: node.attributes.length };
}
