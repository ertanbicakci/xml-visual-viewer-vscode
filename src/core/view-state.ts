import type { XmlModel, XmlNode } from "./model";
import { fingerprint } from "./fingerprint";
export interface ActiveView {
  selected?: string;
  focusId?: string;
  expanded: Set<string>;
  pages: Record<string, number>;
}
interface Anchor {
  parent: number;
  key: string;
  identity?: string;
  identityPeers: number;
  signature: string;
  peers: number;
  signaturePeers: number;
}
export interface SavedView {
  anchors: Anchor[];
  expanded: number[];
  pages: Record<number, number>;
  selected?: number;
  focus?: number;
}
const groupKey = (node: XmlNode) => node.kind + ":" + node.nameKey;
function identity(node: XmlNode): string | undefined {
  const attr = node.attributes.find(
    (a) =>
      a.localName === "id" &&
      (!a.namespaceUri ||
        a.namespaceUri === "http://www.w3.org/XML/1998/namespace") &&
      a.value.length < 220 &&
      !a.value.endsWith("…"),
  );
  return attr ? fingerprint([attr.namespaceUri, attr.value]) : undefined;
}
interface PeerGroup {
  nodes: XmlNode[];
  identities: Map<string, XmlNode[]>;
  signatures: Map<string, XmlNode[]>;
}
function groups(model: XmlModel) {
  const cache = new Map<string, Map<string, PeerGroup>>();
  return (parentId: string) => {
    let result = cache.get(parentId);
    if (!result) {
      result = new Map();
      for (const id of model.nodes[parentId]?.children ?? []) {
        const node = model.nodes[id]!,
          key = groupKey(node),
          group: PeerGroup = result.get(key) ?? {
            nodes: [],
            identities: new Map(),
            signatures: new Map(),
          };
        group.nodes.push(node);
        const keyIdentity = identity(node);
        if (keyIdentity) {
          const list = group.identities.get(keyIdentity) ?? [];
          list.push(node);
          group.identities.set(keyIdentity, list);
        }
        const list = group.signatures.get(node.fingerprint) ?? [];
        list.push(node);
        group.signatures.set(node.fingerprint, list);
        result.set(key, group);
      }
      cache.set(parentId, result);
    }
    return result;
  };
}
export function saveView(model: XmlModel, view: ActiveView): SavedView {
  const saved: SavedView = { anchors: [], expanded: [], pages: {} },
    ids = new Map<string, number>(),
    getGroups = groups(model);
  const add = (id?: string): number | undefined => {
    if (!id || !model.nodes[id]) return;
    const old = ids.get(id);
    if (old !== undefined) return old;
    if (saved.anchors.length >= 1000) return;
    const node = model.nodes[id]!;
    const parent = node.parentId ? add(node.parentId) : -1;
    if (parent === undefined || saved.anchors.length >= 1000) return;
    const group = node.parentId
      ? getGroups(node.parentId).get(groupKey(node))
      : undefined;
    const index = saved.anchors.length;
    const keyIdentity = identity(node);
    saved.anchors.push({
      parent,
      key: groupKey(node),
      identity: keyIdentity,
      identityPeers: keyIdentity
        ? (group?.identities.get(keyIdentity)?.length ?? 1)
        : 0,
      signature: node.fingerprint,
      peers: group?.nodes.length ?? 1,
      signaturePeers: group?.signatures.get(node.fingerprint)?.length ?? 1,
    });
    ids.set(id, index);
    return index;
  };
  saved.selected = add(view.selected);
  saved.focus = add(view.focusId);
  for (const id of view.expanded) {
    const index = add(id);
    if (index !== undefined) saved.expanded.push(index);
  }
  for (const [id, page] of Object.entries(view.pages)) {
    const index = add(id);
    if (index !== undefined)
      saved.pages[index] = Math.max(1, Math.min(500, page));
  }
  return saved;
}
export function restoreView(model: XmlModel, saved: SavedView): ActiveView {
  const result: ActiveView = { expanded: new Set(), pages: {} },
    resolved = new Map<number, string>(),
    getGroups = groups(model);
  if (!Array.isArray(saved.anchors) || saved.anchors.length > 1000)
    return result;
  saved.anchors.forEach((anchor, index) => {
    if (!anchor || typeof anchor.key !== "string") return;
    if (anchor.parent === -1) {
      if (groupKey(model.nodes[model.rootId]!) === anchor.key)
        resolved.set(index, model.rootId);
      return;
    }
    const parent = resolved.get(anchor.parent);
    if (!parent) return;
    const group = getGroups(parent).get(anchor.key);
    const peers = group?.nodes ?? [];
    let chosen: XmlNode | undefined;
    if (anchor.identity) {
      const matches = group?.identities.get(anchor.identity) ?? [];
      if (anchor.identityPeers === 1 && matches.length === 1)
        chosen = matches[0];
    } else if (anchor.peers === 1 && peers.length === 1) chosen = peers[0];
    else if (anchor.signaturePeers === 1) {
      const matches = group?.signatures.get(anchor.signature) ?? [];
      if (matches.length === 1) chosen = matches[0];
    }
    if (chosen) resolved.set(index, chosen.id);
  });
  result.selected =
    saved.selected === undefined ? undefined : resolved.get(saved.selected);
  result.focusId =
    saved.focus === undefined ? undefined : resolved.get(saved.focus);
  for (const index of saved.expanded ?? []) {
    const id = resolved.get(index);
    if (id) result.expanded.add(id);
  }
  for (const [index, page] of Object.entries(saved.pages ?? {})) {
    const id = resolved.get(Number(index));
    if (id && Number.isFinite(page))
      result.pages[id] = Math.max(1, Math.min(500, Math.floor(page)));
  }
  return result;
}
