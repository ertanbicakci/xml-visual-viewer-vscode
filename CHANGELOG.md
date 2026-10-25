# Changelog

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
