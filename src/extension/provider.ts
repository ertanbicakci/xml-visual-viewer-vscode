import * as vscode from "vscode";
import { DocumentController } from "./controller";
import { WorkerParser } from "./worker-parser";
import { webviewHtml } from "./html";
import { nodeAtOffset, previewValue, searchModel } from "../core/graph";
import {
  snapshotModel,
  validateMessage,
  type HostMessage,
  type ClientMessage,
} from "../shared/protocol";
import type { ParseResult } from "../core/model";

interface DocumentEntry {
  document: vscode.TextDocument;
  controller: DocumentController;
  panels: Set<vscode.WebviewPanel>;
  last?: HostMessage;
  timer?: ReturnType<typeof setTimeout>;
}

export class XmlPreviewProvider
  implements vscode.CustomTextEditorProvider, vscode.Disposable
{
  static readonly viewType = "xmlViewer.preview";
  private entries = new Map<string, DocumentEntry>();
  private subscriptions: vscode.Disposable[];
  private decoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor(
      "editor.findMatchHighlightBackground",
    ),
    border: "1px solid",
    borderColor: new vscode.ThemeColor("editor.findMatchHighlightBorder"),
  });
  constructor(private context: vscode.ExtensionContext) {
    this.subscriptions = [
      vscode.workspace.onDidChangeTextDocument((event) => {
        const entry = this.entries.get(event.document.uri.toString());
        if (!entry || event.contentChanges.length === 0) return;
        entry.controller.cancel(); // Invalidate navigation before the debounce.
        clearTimeout(entry.timer);
        this.clearHighlight(entry.document);
        this.broadcast(entry, {
          type: "loading",
          version: entry.document.version,
        });
        entry.timer = setTimeout(() => {
          void entry.controller.update(
            entry.document.getText(),
            entry.document.version,
          );
        }, 400);
      }),
      vscode.window.onDidChangeTextEditorSelection((event) => {
        const entry = this.entries.get(
          event.textEditor.document.uri.toString(),
        );
        const model = entry?.controller.current(
          event.textEditor.document.version,
        );
        if (!entry || !model || !event.selections[0]) return;
        const node = nodeAtOffset(
          model,
          entry.document.offsetAt(event.selections[0].active),
        );
        if (node)
          for (const panel of entry.panels)
            void panel.webview.postMessage({
              type: "selection",
              version: model.version,
              nodeId: node.id,
            } satisfies HostMessage);
      }),
    ];
  }

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
  ): void {
    const uri = document.uri.toString();
    let entry = this.entries.get(uri);
    const isNew = !entry;
    if (!entry) {
      const created = {
        document,
        panels: new Set<vscode.WebviewPanel>(),
      } as DocumentEntry;
      created.controller = new DocumentController(
        uri,
        new WorkerParser(
          vscode.Uri.joinPath(
            this.context.extensionUri,
            "dist",
            "parse-worker.cjs",
          ).fsPath,
        ),
        (result) => this.onResult(created, result),
      );
      entry = created;
      this.entries.set(uri, entry);
    }
    const bound = entry;
    bound.panels.add(panel);
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview"),
      ],
    };
    const messages = panel.webview.onDidReceiveMessage((value: unknown) => {
      const message = validateMessage(value);
      if (message)
        void this.onMessage(bound, panel, message).catch((error) => {
          void vscode.window.showErrorMessage(
            `XML Viewer: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
    });
    panel.onDidDispose(() => {
      messages.dispose();
      bound.panels.delete(panel);
      if (!bound.panels.size) {
        clearTimeout(bound.timer);
        bound.controller.dispose();
        this.entries.delete(uri);
        this.clearHighlight(document);
      }
    });
    panel.webview.html = webviewHtml(panel.webview, this.context.extensionUri);
    if (isNew)
      void bound.controller.update(document.getText(), document.version);
  }

  private onResult(
    entry: DocumentEntry,
    result: ParseResult | { loading: number },
  ): void {
    if ("loading" in result)
      this.broadcast(entry, { type: "loading", version: result.loading });
    else if (result.ok)
      this.broadcast(entry, {
        type: "model",
        model: snapshotModel(result.model),
      });
    else
      this.broadcast(entry, {
        type: "error",
        version: entry.document.version,
        error: result.error,
      });
  }

  private broadcast(entry: DocumentEntry, message: HostMessage): void {
    entry.last = message;
    for (const panel of entry.panels) void panel.webview.postMessage(message);
  }

  private async onMessage(
    entry: DocumentEntry,
    panel: vscode.WebviewPanel,
    message: ClientMessage,
  ): Promise<void> {
    if (message.type === "ready") {
      if (entry.last?.type !== "model" && entry.controller.model)
        await panel.webview.postMessage({
          type: "model",
          model: snapshotModel(entry.controller.model),
        } satisfies HostMessage);
      if (entry.last) await panel.webview.postMessage(entry.last);
      return;
    }
    if (message.type === "cancel") {
      clearTimeout(entry.timer);
      entry.controller.cancel();
      this.broadcast(entry, {
        type: "error",
        version: entry.document.version,
        error: {
          code: "internal",
          message:
            "XML processing cancelled. Edit the document or reopen the preview to try again.",
          offset: 0,
          line: 1,
          column: 1,
        },
      });
      return;
    }
    const model = entry.controller.current(message.version);
    if (!model || entry.document.version !== message.version) return;
    if (message.type === "search") {
      await panel.webview.postMessage({
        type: "search",
        version: model.version,
        requestId: message.requestId,
        query: message.query,
        ids: searchModel(model, message.query),
      } satisfies HostMessage);
      return;
    }
    const node = model.nodes[message.nodeId];
    if (!node) return;
    const doc = entry.document;
    if (message.type === "details") {
      const text = doc.getText();
      const value = previewValue(model, node);
      const position = doc.positionAt(node.range.start);
      const cap = 100_000;
      await panel.webview.postMessage({
        type: "details",
        version: model.version,
        node: {
          ...node,
          value: node.value.slice(0, cap),
          attributes: node.attributes.map((attr) => ({
            ...attr,
            value: attr.value.slice(0, cap),
          })),
        },
        value: value.slice(0, cap),
        source: text.slice(
          node.range.start,
          Math.min(node.range.end, node.range.start + cap),
        ),
        line: position.line + 1,
        column: position.character + 1,
        truncated:
          node.range.end - node.range.start > cap ||
          value.length > cap ||
          node.attributes.some((attr) => attr.value.length > cap),
      } satisfies HostMessage);
      return;
    }
    let editor = vscode.window.visibleTextEditors.find(
      (view) => view.document.uri.toString() === doc.uri.toString(),
    );
    if (!editor)
      editor = await vscode.window.showTextDocument(doc, {
        viewColumn:
          panel.viewColumn === vscode.ViewColumn.One
            ? vscode.ViewColumn.Two
            : vscode.ViewColumn.One,
        preserveFocus: true,
        preview: false,
      });
    // Opening an editor is asynchronous; check again before using source offsets.
    if (
      doc.version !== message.version ||
      !entry.controller.current(message.version)
    )
      return;
    const attr = message.attribute
      ? node.attributes.find((a) => a.name === message.attribute)
      : undefined;
    const range =
      attr?.valueRange ??
      (node.kind === "element" ? node.nameRange : node.range);
    const selection = new vscode.Selection(
      doc.positionAt(range.start),
      doc.positionAt(range.end),
    );
    editor.selection = selection;
    editor.revealRange(
      selection,
      vscode.TextEditorRevealType.InCenterIfOutsideViewport,
    );
    editor.setDecorations(this.decoration, [selection]);
  }

  private clearHighlight(document: vscode.TextDocument): void {
    for (const editor of vscode.window.visibleTextEditors)
      if (editor.document.uri.toString() === document.uri.toString())
        editor.setDecorations(this.decoration, []);
  }

  dispose(): void {
    this.subscriptions.forEach((subscription) => subscription.dispose());
    for (const entry of this.entries.values()) {
      clearTimeout(entry.timer);
      entry.controller.dispose();
    }
    this.entries.clear();
    this.decoration.dispose();
  }
}
