import type { XmlAttribute, XmlModel, XmlNode } from "../core/model";
type TextKeys = "name" | "prefix" | "localName" | "namespaceUri" | "value";
type WireAttribute = Omit<XmlAttribute, TextKeys> & { text: number[] };
type WireNode = Omit<XmlNode, TextKeys | "path" | "attributes"> & {
  text: number[];
  attributes: WireAttribute[];
};
export interface WireModel extends Omit<XmlModel, "nodes"> {
  format: 1;
  strings: string[];
  nodes: WireNode[];
}

export function nodePath(model: XmlModel, id: string): string {
  const segments: string[] = [];
  let node = model.nodes[id];
  while (node?.parentId) {
    segments.push(
      `${node.kind === "element" ? node.name : "#" + node.kind}[${node.siblingIndex}]`,
    );
    node = model.nodes[node.parentId];
  }
  return "/" + segments.reverse().join("/");
}
export function hydrateModel(model: XmlModel): XmlModel {
  for (const node of Object.values(model.nodes))
    Object.defineProperty(node, "path", {
      configurable: true,
      enumerable: false,
      get: () => nodePath(model, node.id),
    });
  Object.defineProperty(model, "toJSON", {
    configurable: true,
    enumerable: false,
    value: () => encodeModel(model),
  });
  return model;
}
export function encodeModel(model: XmlModel, summaries = false): WireModel {
  const strings: string[] = [],
    ids = new Map<string, number>();
  const intern = (value: string) => {
    const old = ids.get(value);
    if (old !== undefined) return old;
    const next = strings.length;
    strings.push(value);
    ids.set(value, next);
    return next;
  };
  const encodeText = (record: Pick<XmlNode, TextKeys>) =>
    [
      record.name,
      record.prefix,
      record.localName,
      record.namespaceUri,
      summaries && record.value.length > 220
        ? record.value.slice(0, 219) + "…"
        : record.value,
    ].map(intern);
  const nodes = Object.values(model.nodes).map((node) => {
    const {
      name,
      prefix,
      localName,
      namespaceUri,
      value,
      attributes,
      ...rest
    } = node;
    const attrs = attributes.map((attr) => {
      const { name, prefix, localName, namespaceUri, value, ...ranges } = attr;
      return { ...ranges, text: encodeText(attr) };
    });
    return { ...rest, text: encodeText(node), attributes: attrs };
  });
  return {
    format: 1,
    strings,
    uri: model.uri,
    version: model.version,
    rootId: model.rootId,
    nodeCount: model.nodeCount,
    elementCount: model.elementCount,
    byteLength: model.byteLength,
    nodes,
  };
}
export function decodeModel(wire: WireModel): XmlModel {
  const text = (indices: number[]) => ({
    name: wire.strings[indices[0]!]!,
    prefix: wire.strings[indices[1]!]!,
    localName: wire.strings[indices[2]!]!,
    namespaceUri: wire.strings[indices[3]!]!,
    value: wire.strings[indices[4]!]!,
  });
  const { format: _format, strings: _strings, nodes, ...meta } = wire;
  return hydrateModel({
    ...meta,
    nodes: Object.fromEntries(
      nodes.map((record) => {
        const { text: indices, attributes, ...rest } = record;
        const node = {
          ...rest,
          ...text(indices),
          attributes: attributes.map(({ text: indices, ...ranges }) => ({
            ...ranges,
            ...text(indices),
          })),
        } as XmlNode;
        return [node.id, node];
      }),
    ),
  });
}
export function transferBytes(wire: WireModel): number {
  return new TextEncoder().encode(JSON.stringify(wire)).byteLength;
}
