import {
  parseXml,
  XmlElement,
  XmlDeclaration,
  XmlProcessingInstruction,
  XmlComment,
  XmlText,
  XmlError,
  type XmlNode as ParsedNode,
} from "@rgrove/parse-xml";
import {
  DEFAULT_LIMITS,
  type ParseResult,
  type ParseLimits,
  type XmlModel,
  type XmlNode,
  type XmlAttribute,
  type XmlIssue,
} from "./model";
import { fingerprint } from "./fingerprint";
import {
  encodeModel,
  hydrateModel,
  transferBytes,
} from "../shared/model-codec";

const XML = "http://www.w3.org/XML/1998/namespace";
const XMLNS = "http://www.w3.org/2000/xmlns/";
// NCName is the XML 1.0 Name production with ':' excluded.
const ncStart =
  "A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\u{10000}-\\u{EFFFF}";
const ncName = new RegExp(
  `^[${ncStart}][${ncStart}0-9.\\-\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$`,
  "u",
);
class ModelError extends Error {
  constructor(
    readonly code: XmlIssue["code"],
    message: string,
    readonly offset: number,
  ) {
    super(message);
  }
}

// A bounded lexical preflight, not a replacement XML parser. Skip literal regions
// and quoted attributes before inspecting markup; never mistake CDATA for a DTD.
function preflight(source: string, limits: ParseLimits): void {
  let depth = 0,
    elements = 1,
    attributeCount = 0,
    cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf("<", cursor);
    if (start < 0) break;
    let terminator = "";
    if (source.startsWith("<!--", start)) terminator = "-->";
    else if (source.startsWith("<![CDATA[", start)) terminator = "]]>";
    else if (source.startsWith("<?", start)) terminator = "?>";
    if (terminator) {
      const end = source.indexOf(terminator, start + 2);
      if (end < 0) break; // The parser provides the syntax error.
      cursor = end + terminator.length;
      continue;
    }
    if (source.startsWith("<!DOCTYPE", start))
      throw new ModelError(
        "unsupported",
        "DOCTYPE declarations are not supported. External resources and custom entities are never loaded.",
        start,
      );
    let end = start + 1,
      quote = "";
    for (; end < source.length; end++) {
      const char = source[end]!;
      if (quote) {
        if (char === quote) quote = "";
      } else if (char === '"' || char === "'") quote = char;
      else if (char === "=" && ++attributeCount > limits.maxAttributes)
        throw new ModelError(
          "limit",
          `XML exceeds the ${limits.maxAttributes} attribute limit.`,
          end,
        );
      else if (char === ">") break;
    }
    if (source[start + 1] === "/") depth--;
    else if (source[start + 1] !== "!") {
      depth++;
      elements++;
      if (depth > limits.maxDepth)
        throw new ModelError(
          "limit",
          `XML nesting exceeds the ${limits.maxDepth} level limit.`,
          start,
        );
      if (elements > limits.maxNodes)
        throw new ModelError(
          "limit",
          `XML exceeds the ${limits.maxNodes.toLocaleString("en-US")} node limit.`,
          start,
        );
      if (source[end - 1] === "/") depth--;
    }
    cursor = end + 1;
  }
}

function qname(
  name: string,
  scope: Record<string, string>,
  attribute: boolean,
  offset: number,
) {
  const parts = name.split(":");
  const prefix = parts.length === 2 ? parts[0]! : "";
  const localName = parts.at(-1)!;
  if (
    parts.length > 2 ||
    !ncName.test(localName) ||
    (parts.length === 2 && !ncName.test(prefix))
  )
    throw new ModelError(
      "namespace",
      `Invalid qualified XML name: ${name}`,
      offset,
    );
  const namespaceUri =
    attribute && !prefix
      ? ""
      : Object.hasOwn(scope, prefix)
        ? scope[prefix]!
        : "";
  if (prefix && !namespaceUri)
    throw new ModelError(
      "namespace",
      `The prefix "${prefix}" has no namespace declaration.`,
      offset,
    );
  if (prefix === "xmlns")
    throw new ModelError(
      "namespace",
      "The xmlns prefix is reserved for namespace declarations.",
      offset,
    );
  return { prefix, localName, namespaceUri };
}

function attributes(
  source: string,
  element: XmlElement,
  start: number,
): XmlAttribute[] {
  const values: XmlAttribute[] = [];
  const pattern = /\s+([^\s=/>]+)\s*=\s*(["'])([\s\S]*?)\2/gy;
  pattern.lastIndex = start + element.name.length + 1;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const name = match[1]!;
    const nameStart = match.index + match[0].indexOf(name);
    const quote = match[2]!;
    const quoteStart = source.indexOf(quote, nameStart + name.length);
    values.push({
      name,
      prefix: "",
      localName: name,
      namespaceUri: "",
      value: element.attributes[name]!,
      range: { start: nameStart, end: pattern.lastIndex },
      nameRange: { start: nameStart, end: nameStart + name.length },
      valueRange: { start: quoteStart + 1, end: pattern.lastIndex - 1 },
    });
  }
  return values;
}

export function parseXmlDocument(
  source: string,
  uri = "untitled:document.xml",
  version = 1,
  overrides: Partial<ParseLimits> = {},
): ParseResult {
  const limits = { ...DEFAULT_LIMITS, ...overrides };
  try {
    const byteLength = new TextEncoder().encode(source).byteLength;
    if (byteLength > limits.maxBytes)
      throw new ModelError(
        "limit",
        `This document exceeds the ${Math.round(limits.maxBytes / 1024 / 1024)} MiB size limit.`,
        0,
      );
    if (!source.trim())
      throw new ModelError(
        "empty",
        "This XML document is empty. Add a root element to start exploring.",
        0,
      );
    preflight(source, limits);
    const parsed = parseXml(source, {
      includeOffsets: true,
      preserveCdata: true,
      preserveComments: true,
      preserveXmlDeclaration: true,
      preserveDocumentType: true,
    });
    const nodes: Record<string, XmlNode> = Object.create(null);
    const namespaceKeys = new Map<string, string>();
    const nameKeys = new Map<string, Map<string, string>>();
    const nameKey = (uri: string, local: string) => {
      let names = nameKeys.get(uri);
      if (!names) {
        names = new Map();
        nameKeys.set(uri, names);
      }
      let namespaceKey = namespaceKeys.get(uri);
      if (!namespaceKey) {
        namespaceKey = fingerprint([uri]);
        namespaceKeys.set(uri, namespaceKey);
      }
      let key = names.get(local);
      if (!key) {
        key = fingerprint([namespaceKey, local]);
        names.set(local, key);
      }
      return key;
    };
    const model: XmlModel = {
      uri,
      version,
      rootId: "document",
      nodes,
      nodeCount: 0,
      elementCount: 0,
      byteLength,
    };
    const bound = (position: number) =>
      Number.isFinite(position)
        ? Math.max(0, Math.min(source.length, position))
        : source.length;

    const visit = (
      raw: ParsedNode,
      parentId: string | null,
      siblingIndex: number,
      depth: number,
      inherited: Record<string, string>,
      preserveSpace: boolean,
    ): string => {
      if (++model.nodeCount > limits.maxNodes)
        throw new ModelError(
          "limit",
          `XML exceeds the ${limits.maxNodes.toLocaleString("en-US")} node limit.`,
          bound(raw.start),
        );
      const id = parentId === null ? "document" : `n${model.nodeCount}`;
      const range = { start: bound(raw.start), end: bound(raw.end) };
      const name =
        raw instanceof XmlElement
          ? raw.name
          : raw instanceof XmlProcessingInstruction
            ? raw.name
            : raw.type === "document"
              ? "XML document"
              : `#${raw.type}`;
      const node: XmlNode = {
        id,
        parentId,
        siblingIndex,
        path: "",
        fingerprint: "",
        nameKey: "",
        depth,
        kind: raw.type as XmlNode["kind"],
        name,
        prefix: "",
        localName: name,
        namespaceUri: "",
        children: [],
        attributes: [],
        value: "",
        range,
        nameRange: range,
        preserveSpace,
      };
      nodes[id] = node;
      let scope = inherited;
      if (raw instanceof XmlElement) {
        model.elementCount++;
        node.nameRange = {
          start: range.start + 1,
          end: range.start + 1 + raw.name.length,
        };
        node.attributes = attributes(source, raw, range.start);
        scope = Object.assign(Object.create(null), inherited);
        for (const attr of node.attributes) {
          if (attr.name === "xmlns" || attr.name.startsWith("xmlns:")) {
            const prefix = attr.name === "xmlns" ? "" : attr.name.slice(6);
            if (
              (prefix && !ncName.test(prefix)) ||
              prefix === "xmlns" ||
              (prefix === "xml" && attr.value !== XML) ||
              (prefix !== "xml" && attr.value === XML) ||
              attr.value === XMLNS ||
              (prefix && !attr.value)
            )
              throw new ModelError(
                "namespace",
                `Invalid namespace declaration: ${attr.name}`,
                attr.range.start,
              );
            scope[prefix] = attr.value;
            attr.namespaceUri = XMLNS;
            attr.prefix = attr.name === "xmlns" ? "" : "xmlns";
            attr.localName = prefix || "xmlns";
          }
        }
        Object.assign(
          node,
          qname(raw.name, scope, false, node.nameRange.start),
        );
        const expanded = new Map<string, Set<string>>();
        for (const attr of node.attributes) {
          if (attr.namespaceUri === XMLNS) continue;
          Object.assign(attr, qname(attr.name, scope, true, attr.range.start));
          const names = expanded.get(attr.namespaceUri) ?? new Set<string>();
          if (names.has(attr.localName))
            throw new ModelError(
              "namespace",
              `Duplicate attribute in the same namespace: ${attr.name}`,
              attr.range.start,
            );
          names.add(attr.localName);
          expanded.set(attr.namespaceUri, names);
        }
        const space = raw.attributes["xml:space"];
        node.preserveSpace =
          space === "preserve"
            ? true
            : space === "default"
              ? false
              : preserveSpace;
      } else if (raw instanceof XmlDeclaration) {
        if (raw.version !== "1.0")
          throw new ModelError(
            "unsupported",
            `XML ${raw.version} is not supported. Use XML 1.0.`,
            range.start,
          );
        node.value = source.slice(range.start, range.end);
      } else if (
        raw instanceof XmlProcessingInstruction ||
        raw instanceof XmlComment
      )
        node.value = raw.content;
      else if (raw instanceof XmlText) node.value = raw.text;

      if ("children" in raw && Array.isArray(raw.children)) {
        const counts = new Map<string, number>();
        for (const child of raw.children as ParsedNode[]) {
          const segment =
            child instanceof XmlElement ? child.name : `#${child.type}`;
          const index = (counts.get(segment) ?? 0) + 1;
          counts.set(segment, index);
          node.children.push(
            visit(child, id, index, depth + 1, scope, node.preserveSpace),
          );
        }
      }
      node.nameKey = nameKey(node.namespaceUri, node.localName);
      node.fingerprint = fingerprint([
        node.kind,
        node.nameKey,
        node.value,
        ...node.attributes.flatMap((attr) => [
          nameKey(attr.namespaceUri, attr.localName),
          attr.value,
        ]),
        ...node.children.map((child) => nodes[child]!.fingerprint),
      ]);
      return id;
    };
    visit(parsed, null, 1, 0, { xml: XML }, false);
    hydrateModel(model);
    if (transferBytes(encodeModel(model)) > limits.maxModelBytes)
      throw new ModelError(
        "limit",
        "The derived XML model exceeds its transfer budget. Try a smaller document.",
        0,
      );
    return { ok: true, model };
  } catch (error) {
    const known = error instanceof ModelError;
    const rawOffset = known
      ? error.offset
      : error instanceof XmlError
        ? error.pos
        : 0;
    const offset = Number.isFinite(rawOffset)
      ? Math.max(0, Math.min(source.length, rawOffset))
      : source.length;
    const before = source.slice(0, offset).split(/\r\n|\r|\n/);
    return {
      ok: false,
      error: {
        code: known
          ? error.code
          : error instanceof XmlError
            ? "syntax"
            : "internal",
        message:
          error instanceof Error
            ? error.message.split("\n", 1)[0]!.slice(0, 4096)
            : "Unable to parse XML.",
        offset,
        line: before.length,
        column: before.at(-1)!.length + 1,
      },
    };
  }
}
