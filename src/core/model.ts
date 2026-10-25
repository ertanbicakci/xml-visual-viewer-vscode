export interface SourceRange {
  start: number;
  end: number;
}
export type NodeKind =
  "document" | "element" | "text" | "cdata" | "comment" | "pi" | "xmldecl";
export interface XmlAttribute {
  name: string;
  prefix: string;
  localName: string;
  namespaceUri: string;
  value: string;
  range: SourceRange;
  nameRange: SourceRange;
  valueRange: SourceRange;
}
export interface XmlNode {
  id: string;
  parentId: string | null;
  kind: NodeKind;
  name: string;
  prefix: string;
  localName: string;
  namespaceUri: string;
  path: string;
  siblingIndex: number;
  fingerprint: string;
  nameKey: string;
  depth: number;
  children: string[];
  attributes: XmlAttribute[];
  value: string;
  range: SourceRange;
  nameRange: SourceRange;
  preserveSpace: boolean;
}
export interface XmlModel {
  uri: string;
  version: number;
  rootId: string;
  nodes: Record<string, XmlNode>;
  elementCount: number;
  nodeCount: number;
  byteLength: number;
}
export interface XmlIssue {
  code:
    | "empty"
    | "syntax"
    | "namespace"
    | "unsupported"
    | "limit"
    | "internal"
    | "cancelled";
  message: string;
  offset: number;
  line: number;
  column: number;
}
export type ParseResult =
  { ok: true; model: XmlModel } | { ok: false; error: XmlIssue };
export interface ParseLimits {
  maxBytes: number;
  maxNodes: number;
  maxDepth: number;
  maxAttributes: number;
  maxModelBytes: number;
}
export const DEFAULT_LIMITS: ParseLimits = {
  maxBytes: 10 * 1024 * 1024,
  maxNodes: 50_000,
  maxDepth: 256,
  maxAttributes: 50_000,
  maxModelBytes: 32 * 1024 * 1024,
};
