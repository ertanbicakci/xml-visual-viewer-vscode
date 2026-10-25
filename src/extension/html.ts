import * as vscode from "vscode";
import { randomBytes } from "node:crypto";
export function webviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
): string {
  const asset = (name: string) =>
    webview
      .asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webview", name))
      .toString();
  const escape = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;");
  const nonce = randomBytes(24).toString("base64");
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline'; connect-src ${webview.cspSource}; worker-src blob:; img-src ${webview.cspSource} data:; font-src ${webview.cspSource};">
<title>XML Viewer</title><link rel="stylesheet" href="${escape(asset("app.css"))}"></head>
<body><div id="root" data-worker-uri="${escape(asset("layout-worker.js"))}"></div><script nonce="${nonce}" src="${escape(asset("app.js"))}"></script></body></html>`;
}
