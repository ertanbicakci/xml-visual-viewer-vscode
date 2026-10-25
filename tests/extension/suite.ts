import * as vscode from "vscode";
import * as assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
const waitFor = async (condition: () => boolean) => {
  const end = Date.now() + 8000;
  while (!condition()) {
    if (Date.now() > end)
      throw new Error("Timed out waiting for a custom editor tab");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};
export async function run() {
  const extension = vscode.extensions.getExtension("local.xml-visual-viewer");
  assert.ok(extension, "Development extension must be registered");
  await extension.activate();
  assert.ok(extension.isActive, "Extension must activate");
  const sourceUri = vscode.Uri.joinPath(
    extension.extensionUri,
    "examples",
    "catalog.xml",
  );
  const doc = await vscode.workspace.openTextDocument(sourceUri);
  await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
  const before = doc.getText();
  await vscode.commands.executeCommand("xmlViewer.openPreview", sourceUri);
  const previews = () =>
    vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .filter(
        (tab) =>
          tab.input instanceof vscode.TabInputCustom &&
          tab.input.viewType === "xmlViewer.preview",
      );
  await waitFor(() => previews().length >= 1);
  assert.equal(
    doc.getText(),
    before,
    "Opening the preview must not change XML",
  );
  assert.equal(doc.isDirty, false);
  assert.ok(
    vscode.window.tabGroups.all.length >= 2,
    "Preview must open beside source",
  );
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9337");
  const workbench = browser
    .contexts()[0]!
    .pages()
    .find((page) => page.url().includes("workbench"))!;
  assert.ok(workbench, "VS Code workbench renderer must be reachable");
  let frame = workbench.mainFrame();
  await expect
    .poll(
      async () => {
        for (const candidate of workbench.frames())
          if (await candidate.locator(".viewer").count()) {
            frame = candidate;
            return true;
          }
        return false;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  await expect(frame.locator(".react-flow__node")).not.toHaveCount(0);
  await frame
    .getByRole("searchbox", { name: "Search XML" })
    .fill("The Namespace Handbook");
  await expect(frame.getByTestId("node-inspector")).toContainText(
    "The Namespace Handbook",
  );
  await frame
    .getByRole("button", { name: "Show in source", exact: true })
    .click();
  await waitFor(() =>
    vscode.window.visibleTextEditors.some(
      (editor) =>
        editor.document === doc && doc.getText(editor.selection) === "title",
    ),
  );
  const sourceEditor = vscode.window.visibleTextEditors.find(
    (editor) => editor.document === doc,
  )!;
  const cursor = doc.positionAt(doc.getText().indexOf("notifications"));
  sourceEditor.selection = new vscode.Selection(cursor, cursor);
  await expect(
    frame
      .getByTestId("node-inspector")
      .getByRole("heading", { name: "notifications", exact: true }),
  ).toBeVisible();
  assert.equal(
    doc.isDirty,
    false,
    "Graph and source navigation must remain read-only",
  );
  const edit = new vscode.WorkspaceEdit();
  edit.insert(
    doc.uri,
    new vscode.Position(2, 0),
    "<!-- Live update integration test -->\n",
  );
  await vscode.workspace.applyEdit(edit);
  assert.equal(doc.isDirty, true);
  await expect(frame.locator(".viewer")).toHaveAttribute(
    "data-document-version",
    String(doc.version),
    { timeout: 10_000 },
  );
  await expect(frame.locator(".viewer")).toHaveAttribute("data-state", "ready");
  assert.ok(
    previews().length >= 1,
    "Preview must remain open after an unsaved edit",
  );
  await frame
    .getByRole("searchbox", { name: "Search XML" })
    .fill("Live update integration test");
  await expect(frame.getByText("1 of 1", { exact: true })).toBeVisible();
  await expect(frame.getByTestId("node-inspector")).toContainText(
    "Live update integration test",
  );
  await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
  await vscode.commands.executeCommand("undo");
  assert.equal(doc.getText(), before);
  const untitled = await vscode.workspace.openTextDocument({
    language: "xml",
    content: "<root><hello>Untitled</hello></root>",
  });
  await vscode.window.showTextDocument(untitled, vscode.ViewColumn.One);
  await vscode.commands.executeCommand("xmlViewer.openPreview");
  await waitFor(() => previews().length >= 2);
  assert.equal(untitled.getText(), "<root><hello>Untitled</hello></root>");
  const sameUri = sourceUri.toString();
  await vscode.commands.executeCommand(
    "vscode.openWith",
    sourceUri,
    "xmlViewer.preview",
    { viewColumn: vscode.ViewColumn.Three },
  );
  await waitFor(
    () =>
      previews().filter(
        (tab) =>
          (tab.input as vscode.TabInputCustom).uri.toString() === sameUri,
      ).length >= 2,
  );
  await vscode.window.tabGroups.close(previews());
  await browser.close();
  console.log(
    "XML Viewer: Extension Host integration checks passed (actual Webview rendering, graph↔source navigation, live search, read-only, untitled, multiple views, cleanup).",
  );
}
