import * as vscode from "vscode";
import { XmlPreviewProvider } from "./provider";
export function activate(context: vscode.ExtensionContext): void {
  const provider = new XmlPreviewProvider(context);
  context.subscriptions.push(
    provider,
    vscode.commands.registerCommand("xmlViewer.copyDiagnostics", () =>
      provider.copyDiagnostics(),
    ),
    vscode.window.registerCustomEditorProvider(
      XmlPreviewProvider.viewType,
      provider,
      {
        supportsMultipleEditorsPerDocument: true,
        webviewOptions: { retainContextWhenHidden: false },
      },
    ),
    vscode.commands.registerCommand(
      "xmlViewer.openPreview",
      async (resource?: vscode.Uri) => {
        const uri =
          resource instanceof vscode.Uri
            ? resource
            : vscode.window.activeTextEditor?.document.uri;
        if (!uri) {
          void vscode.window.showInformationMessage(
            "Open an XML document to start its visual preview.",
          );
          return;
        }
        const document = await vscode.workspace.openTextDocument(uri);
        if (
          document.languageId !== "xml" &&
          !uri.path.toLowerCase().endsWith(".xml")
        ) {
          void vscode.window.showInformationMessage(
            "XML Viewer works with XML documents. Set the document language to XML first.",
          );
          return;
        }
        await vscode.commands.executeCommand(
          "vscode.openWith",
          uri,
          XmlPreviewProvider.viewType,
          {
            viewColumn: vscode.ViewColumn.Beside,
            preview: false,
            preserveFocus: false,
          },
        );
      },
    ),
  );
}
