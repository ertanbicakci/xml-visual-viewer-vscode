import * as vscode from "vscode";
import * as assert from "node:assert/strict";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { expect, type Page, type Frame } from "@playwright/test";
export async function findViewer(
  workbench: Page,
  uri: vscode.Uri,
): Promise<Frame> {
  let found: Frame | undefined;
  await expect
    .poll(
      async () => {
        for (const frame of workbench.frames()) {
          if (
            (await frame
              .locator(".viewer")
              .count()
              .catch(() => 0)) &&
            (await frame.locator(".file-name").getAttribute("title")) ===
              uri.toString()
          ) {
            found = frame;
            return true;
          }
        }
        return false;
      },
      {
        timeout: 30000,
        message: "Expected the preview for " + uri.scheme + " document",
      },
    )
    .toBe(true);
  return found!;
}
export async function interactive(frame: Frame) {
  await expect(
    frame.locator(".react-flow:not([inert]) .react-flow__node"),
  ).not.toHaveCount(0, { timeout: 30000 });
  await frame.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}
async function closeDocument(uri: vscode.Uri) {
  const tabs = vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .filter(
      (tab) =>
        (tab.input instanceof vscode.TabInputCustom ||
          tab.input instanceof vscode.TabInputText) &&
        tab.input.uri.toString() === uri.toString(),
    );
  await vscode.window.tabGroups.close(tabs);
}
export async function checkDocumentCompatibility(workbench: Page) {
  const folder = join(process.env.XML_VIEWER_TEST_TEMP!, "documents");
  await mkdir(folder, { recursive: true });
  const xml =
    '<?xml version="1.0" encoding="UTF-16"?><root><name>İstanbul 東京 😀</name></root>';
  const bytes = Buffer.from(xml, "utf16le");
  const fixtures: [string, Buffer][] = [
    ["utf16-le.xml", Buffer.concat([Buffer.from([255, 254]), bytes])],
    [
      "utf16-be.xml",
      Buffer.concat([Buffer.from([254, 255]), Buffer.from(bytes).swap16()]),
    ],
    [
      "utf8-bom.xml",
      Buffer.concat([
        Buffer.from([239, 187, 191]),
        Buffer.from(xml.replace("UTF-16", "UTF-8")),
      ]),
    ],
  ];
  const checked: string[] = [];
  for (const [name, content] of fixtures) {
    const uri = vscode.Uri.file(join(folder, name));
    await writeFile(uri.fsPath, content);
    const doc = await vscode.workspace.openTextDocument(uri);
    assert.ok(
      doc.getText().includes("İstanbul 東京 😀"),
      "VS Code must decode BOM text before parsing",
    );
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("xmlViewer.openPreview", uri);
    const frame = await findViewer(workbench, uri);
    await frame.getByRole("searchbox").fill("İstanbul");
    await expect(frame.getByTestId("node-inspector")).toContainText(
      "İstanbul 東京 😀",
    );
    await expect(
      frame.getByRole("button", { name: "Show in source", exact: true }),
    ).toBeEnabled();
    await frame
      .getByRole("button", { name: "Show in source", exact: true })
      .click();
    await expect
      .poll(() =>
        vscode.window.visibleTextEditors.some(
          (editor) =>
            editor.document === doc && doc.getText(editor.selection) === "name",
        ),
      )
      .toBe(true);
    assert.ok(!doc.isDirty);
    checked.push(name);
    await closeDocument(uri);
  }
  const uri = vscode.Uri.parse("xml-viewer-fixture:/remote/sample.xml");
  const text = "<root><name>Virtual readonly workspace</name></root>";
  const emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  const denied = () => {
    throw vscode.FileSystemError.NoPermissions();
  };
  const provider: vscode.FileSystemProvider = {
    onDidChangeFile: emitter.event,
    watch: () => new vscode.Disposable(() => {}),
    stat: () => ({
      type: vscode.FileType.File,
      ctime: 0,
      mtime: 0,
      size: Buffer.byteLength(text),
    }),
    readDirectory: () => [],
    readFile: () => Buffer.from(text),
    createDirectory: denied,
    writeFile: denied,
    delete: denied,
    rename: denied,
  };
  const registration = vscode.workspace.registerFileSystemProvider(
    uri.scheme,
    provider,
    { isCaseSensitive: true, isReadonly: true },
  );
  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await vscode.commands.executeCommand("xmlViewer.openPreview", uri);
    const frame = await findViewer(workbench, uri);
    await frame.getByRole("searchbox").fill("Virtual readonly");
    await expect(frame.getByTestId("node-inspector")).toContainText(
      "Virtual readonly workspace",
    );
    assert.equal(vscode.workspace.fs.isWritableFileSystem(uri.scheme), false);
    await frame
      .getByRole("button", { name: "Show in source", exact: true })
      .click();
    await expect
      .poll(() =>
        vscode.window.visibleTextEditors.some(
          (editor) =>
            editor.document === doc && doc.getText(editor.selection) === "name",
        ),
      )
      .toBe(true);
    assert.equal(doc.getText(), text);
    checked.push("readonly virtual URI");
    await closeDocument(uri);
  } finally {
    registration.dispose();
    emitter.dispose();
    await rm(folder, { recursive: true, force: true });
  }
  return checked;
}
export async function measureStandardOpening(workbench: Page) {
  const uri = vscode.Uri.file(
    join(process.env.XML_VIEWER_TEST_TEMP!, "standard.xml"),
  );
  const source =
    "<catalog>" +
    Array.from(
      { length: 1000 },
      (_, i) =>
        `<item id="row-${i}"><name>${"XML visualization ".repeat(10)}${i}</name></item>`,
    ).join("") +
    "</catalog>";
  await writeFile(uri.fsPath, source);
  const doc = await vscode.workspace.openTextDocument(uri);
  const timings: number[] = [];
  for (let i = 0; i < 5; i++) {
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    const start = Date.now();
    await vscode.commands.executeCommand("xmlViewer.openPreview", uri);
    await interactive(await findViewer(workbench, uri));
    timings.push(Date.now() - start);
    const previews = vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .filter(
        (tab) =>
          tab.input instanceof vscode.TabInputCustom &&
          tab.input.uri.toString() === uri.toString(),
      );
    await vscode.window.tabGroups.close(previews);
  }
  await closeDocument(uri);
  const sorted = [...timings].sort((a, b) => a - b);
  return {
    bytes: Buffer.byteLength(source),
    nodes: 3002,
    samples: timings.length,
    timingsMs: timings,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
    scope:
      "Five fresh preview panels in the same VS Code workbench. Includes parse worker/IPC/layout and two animation frames; excludes VS Code/extension activation. Renderer caches may be warm. Indicative p95, not a guarantee for other hardware.",
  };
}
