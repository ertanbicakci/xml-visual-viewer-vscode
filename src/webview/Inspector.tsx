import { useState } from "react";
import type { Bridge } from "../shared/protocol";
import type { XmlNode } from "../core/model";
import type { Details } from "./useViewer";
export function Inspector({
  node,
  details,
  bridge,
  enabled,
  onClose,
  onFocus,
}: {
  node: XmlNode;
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
        <h2>{selected.name}</h2>
        <div className="path-line">
          <code>{selected.path}</code>
          <button
            className="quiet"
            aria-label="Copy node path"
            onClick={() => {
              void navigator.clipboard
                .writeText(selected.path)
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
          <button onClick={onFocus}>Focus branch</button>
        </div>
        <dl className="metadata">
          <div>
            <dt>Namespace</dt>
            <dd>{selected.namespaceUri || "No namespace"}</dd>
          </div>
          <div>
            <dt>Local name</dt>
            <dd>{selected.localName}</dd>
          </div>
          {selected.prefix && (
            <div>
              <dt>Prefix</dt>
              <dd>{selected.prefix}</dd>
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
              Attributes <span>{selected.attributes.length}</span>
            </h3>
            <div className="attribute-list">
              {selected.attributes.map((attr) => (
                <div className="attribute-detail" key={attr.name}>
                  <button
                    disabled={!enabled}
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
                    @{attr.name}
                  </button>
                  <code>{attr.value}</code>
                  {attr.namespaceUri && <small>{attr.namespaceUri}</small>}
                </div>
              ))}
            </div>
          </section>
        )}
        {full?.value && (
          <section>
            <h3>Value</h3>
            <pre className="detail-value">{full.value}</pre>
          </section>
        )}
        <section>
          <h3>Source XML</h3>
          {full ? (
            <pre className="source-preview">{full.source}</pre>
          ) : (
            <p className="muted">Loading source…</p>
          )}
        </section>
        {full?.truncated && (
          <p className="hint">
            Large values are shown up to 100,000 characters. Open the source for
            the complete content.
          </p>
        )}
      </div>
    </aside>
  );
}
