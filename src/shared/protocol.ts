import type { XmlNode, XmlIssue } from "../core/model";
import type { WireModel } from "./model-codec";
import type { SavedView } from "../core/view-state";
import type { ViewerSettings } from "./settings";
export type ClientMessage =
  | { type: "ready" }
  | { type: "cancel" }
  | { type: "retry" }
  | { type: "showError"; version: number }
  | {
      type: "reveal" | "details";
      version: number;
      nodeId: string;
      attribute?: string;
    }
  | { type: "search"; version: number; query: string; requestId: number };
export type HostMessage =
  | { type: "settings"; settings: ViewerSettings; changed?: boolean }
  | { type: "loading"; version: number }
  | { type: "model"; model: WireModel }
  | { type: "error"; version: number; error: XmlIssue }
  | { type: "selection"; version: number; nodeId: string }
  | {
      type: "details";
      version: number;
      node: XmlNode;
      value: string;
      source: string;
      line: number;
      column: number;
      truncated: boolean;
      attributeCount?: number;
    }
  | {
      type: "search";
      version: number;
      requestId: number;
      query: string;
      ids: string[];
      contexts?: Record<string, string>;
    };
export interface ViewState {
  uri?: string;
  view?: SavedView;
  direction?: "RIGHT" | "DOWN";
  showMetadata?: boolean;
  showWhitespace?: boolean;
  inspectorWidth?: number;
  viewport?: { x: number; y: number; zoom: number };
}
export interface Bridge {
  post(message: ClientMessage): void;
  subscribe(listener: (message: HostMessage) => void): () => void;
  getState(): ViewState;
  setState(state: ViewState): void;
}
export function validateMessage(value: unknown): ClientMessage | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const m = value as Record<string, unknown>;
  if ("uri" in m || "command" in m) return;
  if (m.type === "ready" || m.type === "cancel" || m.type === "retry")
    return { type: m.type };
  if (!Number.isSafeInteger(m.version) || (m.version as number) < 0) return;
  const version = m.version as number;
  if (m.type === "showError") return { type: "showError", version };
  if (
    (m.type === "reveal" || m.type === "details") &&
    typeof m.nodeId === "string" &&
    m.nodeId.length > 0 &&
    m.nodeId.length <= 128
  ) {
    if (
      m.attribute !== undefined &&
      (typeof m.attribute !== "string" || m.attribute.length > 1024)
    )
      return;
    return {
      type: m.type,
      version,
      nodeId: m.nodeId,
      ...(m.attribute === undefined
        ? {}
        : { attribute: m.attribute as string }),
    };
  }
  if (
    m.type === "search" &&
    typeof m.query === "string" &&
    m.query.length <= 1000 &&
    Number.isSafeInteger(m.requestId)
  )
    return {
      type: "search",
      version,
      query: m.query,
      requestId: m.requestId as number,
    };
}
