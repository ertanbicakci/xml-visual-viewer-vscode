import { DEFAULT_SETTINGS, normalizeSettings } from "../shared/settings";
import { encodeModel } from "../shared/model-codec";
import { createRoot } from "react-dom/client";
import { App } from "../webview/App";
import { parseXmlDocument } from "../core/parser";
import { searchWithContext, previewValue } from "../core/graph";
import {
  type Bridge,
  type HostMessage,
  type ViewState,
} from "../shared/protocol";
import type { XmlModel } from "../core/model";
import "../webview/styles.css";
let model: XmlModel | undefined,
  source = "",
  version = 0,
  state: ViewState = {};
let paused = false;
const listeners = new Set<(message: HostMessage) => void>();
const emit = (message: HostMessage) =>
  listeners.forEach((listener) => listener(message));
async function update(text?: string) {
  source = text ?? (await fetch("/examples/catalog.xml").then((r) => r.text()));
  version++;
  if (paused) return;
  emit({ type: "loading", version });
  const parsed = parseXmlDocument(
    source,
    "file:///examples/catalog.xml",
    version,
  );
  if (parsed.ok) {
    model = parsed.model;
    emit({ type: "model", model: encodeModel(model, true) });
  } else emit({ type: "error", version, error: parsed.error });
}
const bridge: Bridge = {
  post(message) {
    if (message.type === "ready") {
      emit({ type: "settings", settings: DEFAULT_SETTINGS });
      void update();
      return;
    }
    if (message.type === "cancel") {
      paused = true;
      emit({
        type: "error",
        version,
        error: {
          code: "cancelled",
          message:
            "This preview is paused. Choose Retry to read the latest document.",
          offset: 0,
          line: 1,
          column: 1,
        },
      });
      return;
    }
    if (message.type === "retry") {
      paused = false;
      void update(source);
      return;
    }
    if (message.type === "showError") {
      document.documentElement.dataset.errorRevealed = String(version);
      return;
    }
    if (!model || message.version !== version) return;
    if (message.type === "search")
      emit({
        type: "search",
        version,
        query: message.query,
        requestId: message.requestId,
        ...searchWithContext(model, message.query),
      });
    if (message.type === "details") {
      const node = model.nodes[message.nodeId];
      if (node) {
        const lines = source.slice(0, node.range.start).split("\n");
        emit({
          type: "details",
          version,
          node,
          value: previewValue(model, node),
          source: source
            .slice(node.range.start, node.range.end)
            .slice(0, 100_000),
          line: lines.length,
          column: lines.at(-1)!.length + 1,
          truncated: node.range.end - node.range.start > 100_000,
        });
      }
    }
    if (message.type === "reveal") {
      const node = model.nodes[message.nodeId];
      if (node) document.documentElement.dataset.revealed = node.path;
    }
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getState: () => state,
  setState: (next) => {
    state = next;
  },
};
// Browser harness drives the same App and protocol; no demo code ships in the extension.
Object.assign(window, {
  xmlViewerDemo: {
    update,
    configure(value: Record<string, unknown>) {
      emit({
        type: "settings",
        settings: normalizeSettings(value),
        changed: true,
      });
    },
    select(offset: number) {
      return import("../core/graph").then(({ nodeAtOffset }) => {
        if (model) {
          const node = nodeAtOffset(model, offset);
          if (node) emit({ type: "selection", version, nodeId: node.id });
        }
      });
    },
  },
});
createRoot(document.getElementById("root")!).render(<App bridge={bridge} />);
