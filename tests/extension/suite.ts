import { relative, isAbsolute } from "node:path";
import {
  checkDocumentCompatibility,
  findViewer,
  measureStandardOpening,
} from "./compatibility";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, platform, arch } from "node:os";
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
async function runSuite() {
  const extension = vscode.extensions.getExtension(
    process.env.XML_VIEWER_EXTENSION_ID ?? "local.xml-visual-viewer",
  );
  assert.ok(extension, "Development extension must be registered");
  await extension.activate();
  assert.ok(extension.isActive, "Extension must activate");
  if (process.env.XML_VIEWER_PACKAGE_TEST === "true") {
    const installedPath = relative(
      process.env.XML_VIEWER_INSTALLED_ROOT!,
      extension.extensionUri.fsPath,
    );
    assert.ok(
      installedPath &&
        !installedPath.startsWith("..") &&
        !isAbsolute(installedPath),
      "Must exercise the installed VSIX, not the workspace checkout",
    );
  }
  // Attach before creating Webviews: CDP misses already-loaded nested OOPIFs on Windows.
  const browser = await chromium.connectOverCDP(
    process.env.XML_VIEWER_CDP_URL ?? "http://127.0.0.1:9337",
  );
  const workbench = browser
    .contexts()[0]!
    .pages()
    .find((page) => page.url().includes("workbench"))!;
  assert.ok(workbench, "VS Code workbench renderer must be reachable");
  const sourceUri = vscode.Uri.joinPath(
    extension.extensionUri,
    "examples",
    "catalog.xml",
  );
  const doc = await vscode.workspace.openTextDocument(sourceUri);
  await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
  const before = doc.getText();
  const openStarted = Date.now();
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
  const frame = await findViewer(workbench, sourceUri);
  await expect(
    frame.locator(".react-flow:not([inert]) .react-flow__node"),
  ).not.toHaveCount(0);
  await frame.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const openingMs = Date.now() - openStarted;
  await workbench.screenshot({
    path: process.env.XML_VIEWER_TEST_ARTIFACTS + "/first-open.png",
    timeout: 5000,
  });
  const reportDirectory = vscode.Uri.file(process.env.XML_VIEWER_REPORT_DIR!);
  await mkdir(reportDirectory.fsPath, { recursive: true });
  const reportPath = vscode.Uri.joinPath(
    reportDirectory,
    `extension-performance-${vscode.version}${process.env.XML_VIEWER_PACKAGE_TEST === "true" ? "-package" : ""}.json`,
  ).fsPath;
  const performanceReport = {
    measuredAt: new Date().toISOString(),
    vscode: vscode.version,
    os: platform() + " " + arch(),
    cpu: cpus()[0]?.model,
    samples: 1,
    openingMs,
    scope:
      "Actual VS Code command invocation to interactive graph and two animation frames. Includes parser worker, IPC, Webview setup, ELK and rendering. Extension activation and VS Code startup precede measurement. Source update includes configured 400ms debounce. One sample per document, not p95.",
    large: undefined as
      | {
          bytes: number;
          nodes: number;
          openingMs: number;
          searchMs: number;
          updateMs: number;
        }
      | undefined,
  };
  await writeFile(
    reportPath,
    JSON.stringify(performanceReport, null, 2) + "\n",
  );
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
  const config = vscode.workspace.getConfiguration("xmlViewer", doc.uri);
  await config.update("followSource", false, vscode.ConfigurationTarget.Global);
  const titleCursor = doc.positionAt(doc.getText().indexOf("<title>") + 2);
  sourceEditor.selection = new vscode.Selection(titleCursor, titleCursor);
  await new Promise((resolve) => setTimeout(resolve, 250));
  await expect(
    frame
      .getByTestId("node-inspector")
      .getByRole("heading", { name: "notifications", exact: true }),
  ).toBeVisible();
  await config.update(
    "followSource",
    undefined,
    vscode.ConfigurationTarget.Global,
  );
  await config.update("direction", "DOWN", vscode.ConfigurationTarget.Global);
  await expect(frame.locator(".viewer")).toHaveAttribute(
    "data-direction",
    "DOWN",
  );
  await config.update(
    "direction",
    undefined,
    vscode.ConfigurationTarget.Global,
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
  // Both previews of the same document must remain independent.
  await vscode.commands.executeCommand(
    "vscode.openWith",
    sourceUri,
    "xmlViewer.preview",
    { viewColumn: vscode.ViewColumn.Two },
  );
  let sameFrames: (typeof frame)[] = [];
  await expect
    .poll(async () => {
      sameFrames = [];
      for (const candidate of workbench.frames()) {
        if (
          (await candidate
            .locator(".file-name")
            .textContent({ timeout: 200 })
            .catch(() => "")) === "catalog.xml"
        )
          sameFrames.push(candidate);
      }
      return sameFrames.length;
    })
    .toBe(2);
  const paused = sameFrames[0]!,
    active = sameFrames[1]!;
  await paused
    .getByRole("button", { name: "Pause preview", exact: true })
    .click();
  await expect(paused.getByRole("alert")).toContainText("paused");
  const change = new vscode.WorkspaceEdit();
  change.insert(
    doc.uri,
    new vscode.Position(2, 0),
    "<!-- Independent panel test -->\n",
  );
  await vscode.workspace.applyEdit(change);
  await expect(active.locator(".viewer")).toHaveAttribute(
    "data-document-version",
    String(doc.version),
  );
  await expect(active.locator(".viewer")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await expect(paused.getByRole("alert")).toContainText("paused");
  await paused.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(paused.locator(".viewer")).toHaveAttribute(
    "data-document-version",
    String(doc.version),
  );
  await expect(paused.locator(".viewer")).toHaveAttribute(
    "data-state",
    "ready",
  );
  const validText = doc.getText();
  const broken = new vscode.WorkspaceEdit();
  broken.replace(
    doc.uri,
    new vscode.Range(doc.positionAt(0), doc.positionAt(validText.length)),
    "<broken>",
  );
  await vscode.workspace.applyEdit(broken);
  await expect(paused.getByRole("alert")).toContainText("Missing end tag");
  await waitFor(() =>
    vscode.languages
      .getDiagnostics(doc.uri)
      .some((d) => d.source === "XML Viewer"),
  );
  await paused.getByRole("button", { name: "Show error in source" }).click();
  await waitFor(() => vscode.window.activeTextEditor?.document === doc);
  const clipboard = await vscode.env.clipboard.readText();
  try {
    await vscode.commands.executeCommand("xmlViewer.copyDiagnostics");
    const report = await vscode.env.clipboard.readText();
    assert.ok(report.includes("syntax"));
    assert.ok(!report.includes("broken") && !report.includes(sourceUri.fsPath));
  } finally {
    await vscode.env.clipboard.writeText(clipboard);
  }
  const fix = new vscode.WorkspaceEdit();
  fix.replace(
    doc.uri,
    new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length)),
    before,
  );
  await vscode.workspace.applyEdit(fix);
  await waitFor(
    () =>
      !vscode.languages
        .getDiagnostics(doc.uri)
        .some((d) => d.source === "XML Viewer"),
  );
  assert.equal(doc.getText(), before, "Integration fixtures must be restored");
  await vscode.window.tabGroups.close(previews());
  const largeSource =
    "<catalog>" +
    Array.from(
      { length: 16000 },
      (_, i) =>
        `<item id="row-${i}"><name>${"XML visualization ".repeat(10)}${i}</name></item>`,
    ).join("") +
    "</catalog>";
  const largeDoc = await vscode.workspace.openTextDocument({
    language: "xml",
    content: largeSource,
  });
  await vscode.window.showTextDocument(largeDoc, vscode.ViewColumn.One);
  let start = Date.now();
  await vscode.commands.executeCommand("xmlViewer.openPreview");
  const largeFrame = await findViewer(workbench, largeDoc.uri);
  await expect(
    largeFrame.locator(".react-flow:not([inert]) .react-flow__node"),
  ).not.toHaveCount(0, { timeout: 15000 });
  const paint = () =>
    largeFrame.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  await paint();
  const largeOpeningMs = Date.now() - start;
  start = Date.now();
  await largeFrame.getByRole("searchbox").fill("row-15999");
  await expect(largeFrame.locator(".react-flow__node.selected")).toContainText(
    "row-15999",
  );
  await expect(
    largeFrame.getByRole("button", { name: "Show in source", exact: true }),
  ).toBeEnabled();
  await paint();
  const searchMs = Date.now() - start;
  start = Date.now();
  const largeEdit = new vscode.WorkspaceEdit();
  largeEdit.insert(largeDoc.uri, largeDoc.positionAt(8), ' updated="true"');
  await vscode.workspace.applyEdit(largeEdit);
  await expect(largeFrame.locator(".viewer")).toHaveAttribute(
    "data-document-version",
    String(largeDoc.version),
    { timeout: 15000 },
  );
  await expect(largeFrame.locator(".react-flow")).not.toHaveAttribute(
    "inert",
    "",
  );
  await paint();
  const updateMs = Date.now() - start;
  performanceReport.large = {
    bytes: new TextEncoder().encode(largeSource).byteLength,
    nodes: 48002,
    openingMs: largeOpeningMs,
    searchMs,
    updateMs,
  };
  await writeFile(
    reportPath,
    JSON.stringify(performanceReport, null, 2) + "\n",
  );
  await vscode.window.tabGroups.close(previews());
  const compatibleDocuments = await checkDocumentCompatibility(workbench);
  const standard = await measureStandardOpening(workbench);
  const memory = process.memoryUsage();
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        ...performanceReport,
        standard,
        compatibleDocuments,
        extensionHostMemory: {
          heapUsedMiB: +(memory.heapUsed / 1048576).toFixed(1),
          rssMiB: +(memory.rss / 1048576).toFixed(1),
          scope:
            "Extension Host process snapshot after tests; includes VS Code/test infrastructure, excludes peak parser-worker and renderer memory.",
        },
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
  console.log(
    "XML Viewer: Extension Host integration checks passed (actual Webview rendering, graph↔source navigation, live search, settings, diagnostics, read-only, untitled, independent cancellation/retry, cleanup).",
  );
}

export async function run() {
  try {
    await runSuite();
  } catch (error) {
    const dir = process.env.XML_VIEWER_TEST_ARTIFACTS;
    if (dir) {
      await mkdir(dir, { recursive: true });
      const browser = await chromium
        .connectOverCDP(
          process.env.XML_VIEWER_CDP_URL ?? "http://127.0.0.1:9337",
        )
        .catch(() => undefined);
      if (browser) {
        const states = [];
        for (const [index, page] of browser
          .contexts()
          .flatMap((c) => c.pages())
          .entries()) {
          states.push({
            url: page.url(),
            frames: await Promise.all(
              page.frames().map(async (frame) => ({
                url: frame.url(),
                text: await frame
                  .locator("body")
                  .innerText({ timeout: 1000 })
                  .then((text) => text.slice(0, 20000))
                  .catch(() => "<unavailable>"),
              })),
            ),
          });
          await page
            .screenshot({ path: dir + `/workbench-${index}.png` })
            .catch(() => {});
        }
        await writeFile(
          dir + "/renderer.json",
          JSON.stringify(states, null, 2),
        );
        await browser.close();
      }
    }
    throw error;
  }
}
