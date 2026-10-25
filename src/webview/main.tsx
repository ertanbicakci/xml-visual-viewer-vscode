import { createRoot } from "react-dom/client";
import { App } from "./App";
import type {
  Bridge,
  ClientMessage,
  HostMessage,
  ViewState,
} from "../shared/protocol";
import "./styles.css";
declare function acquireVsCodeApi(): {
  postMessage(message: ClientMessage): void;
  getState(): ViewState | undefined;
  setState(state: ViewState): void;
};
const vscode = acquireVsCodeApi();
const bridge: Bridge = {
  post: (message) => vscode.postMessage(message),
  subscribe(listener) {
    const handler = (event: MessageEvent<HostMessage>) => listener(event.data);
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  },
  getState: () => vscode.getState() ?? {},
  setState: (state) => vscode.setState(state),
};
createRoot(document.getElementById("root")!).render(<App bridge={bridge} />);
