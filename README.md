# XML Viewer

Explore XML inside VS Code as an interactive graph. Inspect namespaces, attributes and values, search the complete document, and jump between graph nodes and source code.

## Try it

1. Install the local `xml-visual-viewer-0.1.0.vsix` using **Extensions → … → Install from VSIX…**.
2. Open an XML document, for example `examples/catalog.xml`.
3. Run **XML Viewer: Open Visual Preview** from the Command Palette or the XML editor title.

The preview opens beside the source. You can also right-click an XML file in Explorer, or choose **Reopen Editor With → XML Viewer**. The normal XML text editor remains the default.

Requires VS Code 1.96 or newer. This is a local v0.1.0 package; the `local` publisher is a development identity, not a Marketplace publisher registration.

## Explore a document

- **Select a node** to inspect its XML name, namespace URI, attributes, value and source excerpt. **Show in source** selects its name in the text editor; clicking an attribute name selects its value.
- **Move the source cursor** to highlight the corresponding node. Neither action changes the document.
- **Expand a branch** with its `+` button or double-click. **Expand level** opens another visible level; **Collapse** returns to the document root.
- **Search** element names, namespace URIs, attributes and text. Enter/Shift+Enter or the arrow buttons move between matches. Results inside folded or paginated branches are revealed automatically.
- **Focus branch** explores a selected subtree. **Show full document** returns to the whole tree.
- **Horizontal / Vertical** changes layout direction. Pan, zoom, Fit View and the minimap help with navigation.
- **View** toggles comments/instructions and whitespace/text nodes. Ordinary leaf text is normally inlined in its element card; mixed content preserves its order.
- Resize the details panel by dragging its divider, or focus the divider and press the arrow keys. Tab to graph nodes and press Enter/Space to select them. Reduced motion, VS Code themes and high contrast colors are supported.

Edits in the source update the preview after a 400 ms pause, including unsaved changes. While processing or when XML is invalid, source navigation is paused. A last valid graph may remain visible with an explicit stale-state notice. Correcting the XML restores the preview.

## XML support and limits

The viewer supports well-formed XML 1.0, namespace scopes, repeated siblings, attributes, mixed content, CDATA, comments, processing instructions, numeric character references, and the five predefined XML entities. XML language-mode documents without a `.xml` extension, including untitled documents, can be opened through the command.

It does not edit or format XML, validate XSD/DTD schemas, execute XPath queries, export images or load external resources. XML 1.1 and DOCTYPE declarations are explicitly unsupported. A copied node path is a location label; it is not guaranteed to be an executable XPath expression.

Default budgets:

| Budget | Limit |
|---|---:|
| Document text, UTF-8 equivalent | 10 MiB |
| Model nodes, including text/metadata/document | 50,000 |
| Element nesting | 256 levels |
| Nodes drawn at once | 1,000 |
| Children revealed per page | 100 |
| Parse job / layout job | 10 seconds each |
| Inspector value / source excerpt | 100,000 characters |

The first view shows a limited tree depth. Large sibling lists offer **more** buttons. When the visible graph budget is reached, collapse branches or focus a subtree. All search results use the complete parsed values; card summaries are shortened. Limits are enforced and are not a promise that every document below the limits has the same loading time.

## Privacy

The extension processes XML within VS Code and its local webview/worker environment. In a remote VS Code workspace, parsing runs in that workspace's Extension Host. It has no telemetry, network service, account or API key. XML values are rendered as text; embedded scripts, URLs and external entities are not executed or fetched. React Flow's attribution is an ordinary link and is loaded only if you choose to open it.

## Development

Use Node.js 22 or newer and npm.

```sh
npm ci
npm run build
```

Press **F5** in VS Code to start the Extension Development Host, then run **XML Viewer: Open Visual Preview**. The launch configuration opens the sample catalog.

```sh
npm run check                 # TypeScript
npm test                      # XML, graph, protocol, worker and version tests
npx playwright install chromium
npm run test:e2e               # Browser UI and CSP tests
npm run test:extension         # Real VS Code + real webview and source navigation
npm run benchmark             # Parser/model timing report in artifacts/
npm run package               # Build a self-contained VSIX
```

`test:extension` uses an isolated profile under `.vscode-test/`. It uses an installed VS Code executable when available, or downloads a stable test build. Set `VSCODE_EXECUTABLE` to choose a specific executable. The test build exposes a loopback CDP port (9337) only while the integration test runs. On Linux, run the Extension Host tests under `xvfb-run`.

`npm run preview` starts a browser harness at `http://127.0.0.1:4173` after a build. It runs the same React interface with a sample document; source-navigation behavior is simulated in this harness. Demo files and integration tests are excluded from the VSIX.

## Structure

- `src/core/`: parser adapter, ordered XML model, source index and graph projection.
- `src/extension/`: VS Code custom editor, shared document controller, parsing worker and secure webview setup.
- `src/shared/`: validated message protocol and bounded snapshots.
- `src/webview/`: React Flow workspace, XML cards, inspector and view state.
- `tests/`: core, browser and Extension Host checks.

See `PROJECT_PLAN.md` for the product plan and `docs/implementation.md` for implementation decisions. Third-party notices and license texts are included in `THIRD_PARTY_NOTICES.txt`.
