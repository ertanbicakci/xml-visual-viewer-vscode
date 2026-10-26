# Changelog

## 0.2.1 — 2026-10-26 (release candidate)

- Restore keyboard focus to the selected graph node when closing details.
- Respect forced-colors system colors while retaining visible selection and edges.
- Fix CI profile socket paths and attach to Webviews before creation for reliable Windows CDP inspection.
- Exercise UTF-8/UTF-16 BOM files, read-only virtual URIs, repeated standard openings and the installed VSIX.
- Derive test extension identity from the manifest so publisher registration does not require changing tests.
- Capture integration screenshots/logs, add a support guide and a bug-report template.

## 0.2.0 — 2026-10-25 (local beta)

- Reuse layout worker resources and cached positions; repeated source selections no longer rebuild the graph.
- Share model strings in worker/Webview messages and compute paths on demand, with serialized-model and attribute budgets.
- Preserve unambiguous selection, expansion, pagination and focus after source edits; clear ambiguous duplicate-ID selections.
- Add independent panel pause/retry, layout retry, Problems diagnostics, error-location navigation and metadata-only diagnostic reports.
- Add resource settings, breadcrumbs, bounded selection history and search match context; reveal results beyond the drawn-node budget.
- Bound inspector metadata/attributes and improve contrast, resize semantics, keyboard scrolling and view-menu dismissal.
- Add SOAP, Maven and Unicode/mixed-content examples, four theme accessibility checks, UI performance reports, minimum/stable VS Code CI and verified beta packaging.

## 0.1.0 — 2026-10-25

- Interactive, read-only XML graph with expand/collapse, two layout directions, minimap and subtree focus.
- Namespace-aware XML model preserving source order, mixed content, CDATA, comments and processing instructions.
- Search through the full document, including collapsed and paginated branches.
- Graph-to-source and source-to-graph navigation with document version checks.
- Unsaved document updates, independent views, restored viewport and theme-aware details panel.
- Worker-based parsing and layout with explicit size, depth, node and execution limits.
