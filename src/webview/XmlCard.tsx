import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { XmlNode } from "../core/model";
export type XmlFlowNode = Node<
  {
    xml: XmlNode;
    summary: string;
    childCount: number;
    shownCount: number;
    expanded: boolean;
    direction: "RIGHT" | "DOWN";
    toggle: (id: string) => void;
    more: (id: string) => void;
  },
  "xml"
>;
export const XmlCard = memo(function XmlCard({
  data,
  selected,
}: NodeProps<XmlFlowNode>) {
  const { xml, summary, childCount, expanded, shownCount, direction } = data;
  const label = xml.name.slice(0, 256);
  const horizontal = direction === "RIGHT";
  return (
    <div
      className={`xml-card kind-${xml.kind} ${selected ? "is-selected" : ""}`}
    >
      <Handle
        type="target"
        position={horizontal ? Position.Left : Position.Top}
        isConnectable={false}
      />
      <div className="card-heading">
        <span className="tag-mark" aria-hidden="true">
          {xml.kind === "element" ? "‹›" : xml.kind === "document" ? "⌘" : "#"}
        </span>
        <strong title={label}>{label}</strong>
        <span className="node-kind">
          {xml.kind === "element" ? "" : xml.kind}
        </span>
      </div>
      <div className="card-body">
        {xml.attributes.slice(0, 2).map((attr) => (
          <div className="attribute-preview" key={attr.name}>
            <span title={attr.name.slice(0, 256)}>
              @{attr.name.slice(0, 256)}
            </span>
            <span title={attr.value}>{attr.value}</span>
          </div>
        ))}
        {summary && (
          <div className="value-preview" title={summary}>
            {summary}
          </div>
        )}
        {!summary && !xml.attributes.length && (
          <span className="muted">
            {childCount
              ? `${childCount} child ${childCount === 1 ? "node" : "nodes"}`
              : "Empty element"}
          </span>
        )}
      </div>
      <div className="card-footer">
        <span>
          {xml.attributes.length
            ? `${xml.attributes.length} ${xml.attributes.length === 1 ? "attribute" : "attributes"}`
            : xml.namespaceUri
              ? "Namespaced"
              : " "}
        </span>
        {childCount > 0 && (
          <button
            className="branch-button nodrag nopan"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
            onClick={(event) => {
              event.stopPropagation();
              data.toggle(xml.id);
            }}
          >
            {expanded ? "−" : "+"} {childCount}
          </button>
        )}
        {expanded && childCount > shownCount && (
          <button
            className="branch-button nodrag nopan"
            aria-label={`Show more children of ${label}`}
            onClick={(event) => {
              event.stopPropagation();
              data.more(xml.id);
            }}
          >
            +{childCount - shownCount} more
          </button>
        )}
      </div>
      <Handle
        type="source"
        position={horizontal ? Position.Right : Position.Bottom}
        isConnectable={false}
      />
    </div>
  );
});
