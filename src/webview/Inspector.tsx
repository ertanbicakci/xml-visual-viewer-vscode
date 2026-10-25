import { useState } from "react";
import type { Bridge } from "../shared/protocol";
import type { XmlNode } from "../core/model";
import type { Details } from "./useViewer";
export function Inspector({
  node,
  path,
  details,
  bridge,
  enabled,
  onClose,
  onFocus,
}: {
  node: XmlNode;
  path: string;
  details?: Details;
  bridge: Bridge;
  enabled: boolean;
  onClose(): void;
  onFocus(): void;
}) {
  const [copied, setCopied] = useState(false);
  const full = details?.node.id === node.id ? details : undefined;
  const selected = full?.node ?? node;
  return (
    <aside
      className="inspector"
      data-testid="node-inspector"
      aria-label="Node details"
    >
      <div className="inspector-heading">
        <span>NODE DETAILS</span>
        <button className="quiet" aria-label="Close details" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="inspector-content">
        <span className="eyebrow">{selected.kind}</span>
        <h2>{selected.name.slice(0, 4096)}</h2>
        <div className="path-line">
          <code>{path.length > 4096 ? path.slice(0, 4095) + "…" : path}</code>
          <button
            className="quiet"
            aria-label="Copy node path"
            onClick={() => {
              void navigator.clipboard
                .writeText(path)
                .then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1400);
                })
                .catch(() => setCopied(false));
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="inspector-actions">
          <button
            className="primary"
            disabled={!enabled}
            onClick={() =>
              bridge.post({
                type: "reveal",
                version: full?.version ?? 0,
                nodeId: node.id,
              })
            }
          >
            Show in source
          </button>
          <button disabled={!enabled} onClick={onFocus}>
            Focus branch
          </button>
        </div>
        <dl className="metadata">
          <div>
            <dt>Namespace</dt>
            <dd>{selected.namespaceUri.slice(0, 4096) || "No namespace"}</dd>
          </div>
          <div>
            <dt>Local name</dt>
            <dd>{selected.localName.slice(0, 4096)}</dd>
          </div>
          {selected.prefix && (
            <div>
              <dt>Prefix</dt>
              <dd>{selected.prefix.slice(0, 4096)}</dd>
            </div>
          )}
          {full && (
            <div>
              <dt>Source</dt>
              <dd>
                Line {full.line}, column {full.column}
              </dd>
            </div>
          )}
        </dl>
        {selected.attributes.length > 0 && (
          <section>
            <h3>
              Attributes{" "}
              <span>{full?.attributeCount ?? selected.attributes.length}</span>
            </h3>
            <div className="attribute-list">
              {selected.attributes.slice(0, 200).map((attr) => (
                <div className="attribute-detail" key={attr.nameRange.start}>
                  <button
                    disabled={
                      !enabled ||
                      attr.name.length > 1024 ||
                      attr.name.length !==
                        attr.nameRange.end - attr.nameRange.start
                    }
                    title="Show attribute in source"
                    onClick={() =>
                      bridge.post({
                        type: "reveal",
                        version: full?.version ?? 0,
                        nodeId: node.id,
                        attribute: attr.name,
                      })
                    }
                  >
                    @{attr.name.slice(0, 4096)}
                  </button>
                  <code>{attr.value}</code>
                  {attr.namespaceUri && (
                    <small>{attr.namespaceUri.slice(0, 4096)}</small>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        {full?.value && (
          <section>
            <h3>Value</h3>
            <pre className="detail-value" tabIndex={0} aria-label="Node value">
              {full.value}
            </pre>
          </section>
        )}
        <section>
          <h3>Source XML</h3>
          {full ? (
            <pre
              className="source-preview"
              tabIndex={0}
              aria-label="Source XML excerpt"
            >
              {full.source}
            </pre>
          ) : (
            <p className="muted">Loading source…</p>
          )}
        </section>
        {full?.truncated && (
          <p className="hint">
            Details are shortened: at most 200 attributes, 4,096 characters per
            name or namespace, and 100,000 characters of combined node details.
            Value and source excerpts are capped separately. Open the source for
            complete content.
          </p>
        )}
      </div>
    </aside>
  );
}
