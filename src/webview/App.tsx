import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { LayoutEngine } from "./layout-engine";
import type { Bridge } from "../shared/protocol";
import { displayChildren, previewValue, projectGraph } from "../core/graph";
import { useViewer } from "./useViewer";
import { XmlCard, type XmlFlowNode } from "./XmlCard";
import { Inspector } from "./Inspector";
import { Toolbar } from "./Toolbar";
const nodeTypes = { xml: XmlCard };
const reduceMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function App({ bridge }: { bridge: Bridge }) {
  return (
    <ReactFlowProvider>
      <Workspace bridge={bridge} />
    </ReactFlowProvider>
  );
}
function Workspace({ bridge }: { bridge: Bridge }) {
  const v = useViewer(bridge);
  const [nodes, setNodes] = useState<XmlFlowNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [layoutAttempt, setLayoutAttempt] = useState(0);
  const [layoutError, setLayoutError] = useState("");
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [renderedVersion, setRenderedVersion] = useState(-1);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const flow = useReactFlow<XmlFlowNode>();
  const graphPane = useRef<HTMLElement>(null);
  const returnFocus = useRef(false);
  const engineRef = useRef<LayoutEngine | null>(null);
  if (!engineRef.current)
    engineRef.current = new LayoutEngine(
      document.getElementById("root")?.dataset.workerUri ??
        "/dist/webview/layout-worker.js",
    );
  const engine = engineRef.current;
  useEffect(() => () => engine.dispose(), [engine]);
  const viewportIntent = useRef({ focus: v.focusId, direction: v.direction });
  const selectedRef = useRef(v.selected);
  const restoredView = useRef(bridge.getState());
  const firstLayout = useRef(true);
  selectedRef.current = v.selected;
  const projection = useMemo(
    () =>
      v.model
        ? projectGraph(v.model, {
            expanded: v.expanded,
            pages: v.pages,
            showMetadata: v.showMetadata,
            showWhitespace: v.showWhitespace,
            focusId: v.focusId,
            maxVisible: v.settings.maxVisibleNodes,
          })
        : undefined,
    [
      v.model,
      v.expanded,
      v.pages,
      v.showMetadata,
      v.showWhitespace,
      v.focusId,
      v.settings.maxVisibleNodes,
    ],
  );
  const toggle = useCallback(
    (id: string) =>
      v.setExpanded((previous) => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [v.setExpanded],
  );
  const more = useCallback(
    (id: string) =>
      v.setPages((previous) => ({
        ...previous,
        [id]: (previous[id] ?? 1) + 1,
      })),
    [v.setPages],
  );

  useEffect(() => {
    if (!projection || !v.model) return;
    let disposed = false;
    const signature = engine.signature(
      projection.nodes.map((n) => n.id),
      projection.edges,
      v.direction,
    );
    setLayoutBusy(!engine.has(signature));
    setLayoutError("");
    const model = v.model;
    const next: XmlFlowNode[] = projection.nodes.map((xml) => {
      const children = displayChildren(model, xml, {
        showMetadata: v.showMetadata,
        showWhitespace: v.showWhitespace,
      });
      return {
        id: xml.id,
        type: "xml",
        position: { x: 0, y: 0 },
        width: 236,
        height: 136,
        selected: xml.id === selectedRef.current,
        ariaLabel: `${xml.kind} ${xml.name.slice(0, 256)}`,
        data: {
          xml,
          summary: previewValue(model, xml).slice(0, 180),
          childCount: children.length,
          shownCount: Math.min(children.length, (v.pages[xml.id] ?? 1) * 100),
          expanded: v.expanded.has(xml.id),
          direction: v.direction,
          toggle,
          more,
        },
      };
    });
    const run = async () => {
      const result = await engine.layout(
        signature,
        next.map((n) => n.id),
        projection.edges,
        v.direction,
      );
      if (!disposed) {
        const positions = result.positions;
        const arranged = next.map((node) => ({
          ...node,
          position: positions[node.id]!,
          selected: node.id === selectedRef.current,
        }));
        setNodes(arranged);
        setRenderedVersion(model.version);
        setEdges(
          projection.edges.map((edge) => ({ ...edge, type: "smoothstep" })),
        );
        setLayoutBusy(false);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (disposed) return;
            const intentChanged =
              viewportIntent.current.focus !== v.focusId ||
              viewportIntent.current.direction !== v.direction;
            viewportIntent.current = {
              focus: v.focusId,
              direction: v.direction,
            };
            if (result.cached && !firstLayout.current && !intentChanged) return;
            const selected = arranged.find(
              (node) => node.id === selectedRef.current,
            );
            if (
              firstLayout.current &&
              restoredView.current.uri === model.uri &&
              restoredView.current.viewport
            )
              void flow.setViewport(restoredView.current.viewport);
            else if (v.focusId)
              void flow.fitView({
                padding: 0.18,
                maxZoom: 1,
                duration: reduceMotion() ? 0 : 180,
              });
            else if (selected)
              void flow.setCenter(
                selected.position.x + 118,
                selected.position.y + 68,
                {
                  zoom: Math.max(0.7, Math.min(flow.getZoom(), 1.1)),
                  duration: reduceMotion() ? 0 : 180,
                },
              );
            else
              void flow.fitView({
                padding: 0.18,
                maxZoom: 1,
                duration: reduceMotion() ? 0 : 180,
              });
            firstLayout.current = false;
          }),
        );
      }
    };
    void run().catch((error) => {
      if (!disposed) {
        setLayoutBusy(false);
        setLayoutError(
          error instanceof Error ? error.message : "Unable to load the graph.",
        );
      }
    });
    return () => {
      disposed = true;
      engine.cancel();
    };
  }, [
    projection,
    layoutAttempt,
    engine,
    v.model,
    v.direction,
    v.pages,
    v.expanded,
    v.showMetadata,
    v.showWhitespace,
    flow,
    toggle,
    more,
  ]);

  useEffect(() => {
    setNodes((previous) =>
      previous.map((node) => ({ ...node, selected: node.id === v.selected })),
    );
    const node = flow.getNode(v.selected ?? "");
    if (node)
      void flow.setCenter(node.position.x + 118, node.position.y + 68, {
        zoom: Math.max(0.7, Math.min(flow.getZoom(), 1.1)),
        duration: reduceMotion() ? 0 : 180,
      });
    if (v.selected) setInspectorOpen(true);
  }, [v.selected, flow]);

  useEffect(() => {
    if (!returnFocus.current || inspectorOpen) return;
    let frame = 0,
      attempts = 0;
    const cancel = () => {
      returnFocus.current = false;
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Tab" || event.key === "Escape") cancel();
    };
    document.addEventListener("pointerdown", cancel, true);
    document.addEventListener("keydown", keyboard, true);
    const restore = () => {
      if (!returnFocus.current) return;
      const invalid = v.loading || Boolean(v.issue) || Boolean(layoutError);
      if (!invalid && (layoutBusy || renderedVersion !== v.model?.version))
        return;
      const visible =
        !invalid && projection?.nodes.some((node) => node.id === v.selected);
      const target = visible
        ? graphPane.current?.querySelector<HTMLElement>(
            ".react-flow__node.selected",
          )
        : graphPane.current;
      // React Flow commits its internal node store after the parent render.
      if (target && !target.closest("[inert]")) target.focus();
      if ((!target || document.activeElement !== target) && attempts++ < 60) {
        frame = requestAnimationFrame(restore);
        return;
      }
      returnFocus.current = false;
    };
    frame = requestAnimationFrame(restore);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", cancel, true);
      document.removeEventListener("keydown", keyboard, true);
    };
  }, [
    inspectorOpen,
    layoutBusy,
    layoutError,
    renderedVersion,
    v.model?.version,
    v.loading,
    v.issue,
    v.selected,
    projection,
    nodes,
  ]);

  const selectedNode = v.model?.nodes[v.selected ?? ""];
  const ancestors = [];
  for (
    let node = selectedNode;
    node;
    node = node.parentId ? v.model?.nodes[node.parentId] : undefined
  )
    ancestors.unshift(node);
  const breadcrumbs =
    ancestors.length > 6 ? [ancestors[0]!, ...ancestors.slice(-5)] : ancestors;
  const valid = Boolean(v.model && !v.loading && !v.issue);
  const fileName = v.model
    ? decodeURIComponent(v.model.uri.split("/").at(-1) ?? "XML document")
    : "XML document";
  const resize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX,
      startWidth = v.inspectorWidth;
    const handleMove = (move: PointerEvent) =>
      v.setInspectorWidth(
        Math.max(240, Math.min(520, startWidth + startX - move.clientX)),
      );
    const handleEnd = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd, { once: true });
  };
  return (
    <main
      className="viewer"
      data-direction={v.direction}
      data-document-version={v.model?.version}
      data-state={v.loading ? "loading" : v.issue ? "error" : "ready"}
    >
      <header className="topbar">
        <div className="identity">
          <span className="app-symbol" aria-hidden="true">
            ‹/›
          </span>
          <h1>XML Viewer</h1>
          <span className="file-name" title={v.model?.uri}>
            {fileName}
          </span>
        </div>
        <span className="read-only">Read only</span>
      </header>
      <Toolbar
        v={v}
        projection={projection}
        valid={valid}
        inspectorOpen={inspectorOpen}
        setInspectorOpen={setInspectorOpen}
      />
      <nav className="breadcrumbs" aria-label="XML navigation">
        <button
          aria-label="Back to previous node"
          disabled={!valid || v.history.index <= 0}
          onClick={() => v.navigateHistory(-1)}
        >
          ←
        </button>
        <button
          aria-label="Forward to next node"
          disabled={!valid || v.history.index >= v.history.ids.length - 1}
          onClick={() => v.navigateHistory(1)}
        >
          →
        </button>
        {breadcrumbs.map((node) => (
          <button
            key={node.id}
            disabled={!valid}
            title={node.path.slice(0, 4096)}
            aria-current={node.id === v.selected ? "location" : undefined}
            onClick={() => v.select(node.id, true)}
          >
            {node.kind === "document" ? "Document" : node.name.slice(0, 160)}
          </button>
        ))}
        {!selectedNode && <span>Select a node to explore its location</span>}
        {valid && (
          <button
            className="pause-preview"
            onClick={() => bridge.post({ type: "cancel" })}
          >
            Pause preview
          </button>
        )}
      </nav>
      {v.issue && (
        <div className="issue-banner" role="alert">
          <div>
            <strong>
              {v.issue.code === "empty"
                ? "Empty XML document"
                : v.issue.code === "limit"
                  ? "Document limit reached"
                  : "XML preview unavailable"}
            </strong>
            <span>{v.issue.message}</span>
          </div>
          <div className="issue-actions">
            <button onClick={v.retry}>Retry</button>
            {["syntax", "namespace"].includes(v.issue.code) && (
              <button onClick={v.showError}>Show error in source</button>
            )}
          </div>
          <small>
            Line {v.issue.line}, column {v.issue.column}
            {v.model
              ? " · Showing the last valid graph. Source navigation is paused."
              : ""}
          </small>
        </div>
      )}
      {layoutError && (
        <div className="issue-banner" role="alert">
          {layoutError}
          <button onClick={() => setLayoutAttempt((attempt) => attempt + 1)}>
            Retry layout
          </button>
        </div>
      )}
      <div
        className={`workspace ${inspectorOpen && selectedNode ? "with-inspector" : ""}`}
        style={
          {
            "--inspector-width": `${v.inspectorWidth}px`,
          } as React.CSSProperties
        }
      >
        <section
          className="graph-pane"
          aria-label="XML graph"
          ref={graphPane}
          tabIndex={-1}
        >
          {v.focusId && (
            <div className="focus-banner">
              <span>Focused on {v.model?.nodes[v.focusId]?.name}</span>
              <button onClick={() => v.setFocusId(undefined)}>
                Show full document
              </button>
            </div>
          )}
          {projection?.limited && (
            <div className="budget-banner" role="status">
              Showing the first {v.settings.maxVisibleNodes.toLocaleString()}{" "}
              nodes. Collapse a branch or select a node and choose Focus branch.
            </div>
          )}
          {v.model ? (
            <ReactFlow<XmlFlowNode>
              inert={
                v.loading ||
                Boolean(v.issue) ||
                layoutBusy ||
                Boolean(layoutError) ||
                renderedVersion !== v.model.version
              }
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              edgesReconnectable={false}
              deleteKeyCode={null}
              selectionOnDrag={false}
              minZoom={0.08}
              maxZoom={2}
              onNodesChange={(changes) => {
                for (const change of changes)
                  if (change.type === "select" && change.selected)
                    v.select(change.id);
              }}
              onNodeClick={(_event, node) => v.select(node.id)}
              onNodeDoubleClick={(_event, node) => toggle(node.id)}
              onMoveEnd={(_event, viewport) =>
                bridge.setState({ ...bridge.getState(), viewport })
              }
              colorMode="system"
              defaultEdgeOptions={{ style: { strokeWidth: 1.4 } }}
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable nodeStrokeWidth={2} />
            </ReactFlow>
          ) : (
            <div className="empty-state">
              <span className="empty-symbol" aria-hidden="true">
                ‹/›
              </span>
              <h2>
                {v.loading ? "Reading your XML" : "A clearer view of your XML"}
              </h2>
              <p>
                {v.loading
                  ? "Building the document structure…"
                  : "Correct the document in the source editor to build its graph."}
              </p>
            </div>
          )}
          {(v.loading || layoutBusy) && (
            <div className="loading-badge" role="status">
              <span className="spinner" />
              {v.loading ? "Reading XML…" : "Arranging graph…"}
              {v.loading && (
                <button
                  className="quiet"
                  onClick={() => bridge.post({ type: "cancel" })}
                >
                  Cancel
                </button>
              )}
            </div>
          )}
          {!selectedNode && v.model && (
            <div className="canvas-hint">
              Select a node to inspect its content <span>·</span> Double-click
              to expand
            </div>
          )}
        </section>
        {inspectorOpen && selectedNode && (
          <>
            <div
              className="inspector-resize"
              role="separator"
              aria-label="Resize details"
              aria-orientation="vertical"
              aria-valuenow={v.inspectorWidth}
              aria-valuemin={240}
              aria-valuemax={520}
              tabIndex={0}
              onPointerDown={resize}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft")
                  v.setInspectorWidth(Math.min(520, v.inspectorWidth + 20));
                if (event.key === "ArrowRight")
                  v.setInspectorWidth(Math.max(240, v.inspectorWidth - 20));
              }}
            />
            <Inspector
              node={selectedNode}
              path={selectedNode.path}
              details={v.details}
              bridge={bridge}
              enabled={
                valid &&
                !layoutBusy &&
                !layoutError &&
                renderedVersion === v.model?.version &&
                Boolean(
                  v.details?.version === v.model?.version &&
                  v.details?.node.id === selectedNode.id,
                )
              }
              onClose={() => {
                returnFocus.current = true;
                setInspectorOpen(false);
              }}
              onFocus={() => {
                v.setFocusId(selectedNode.id);
                v.setExpanded(
                  (previous) => new Set([...previous, selectedNode.id]),
                );
              }}
            />
          </>
        )}
      </div>
      <footer className="statusbar">
        <span>
          <i className={valid ? "status-dot" : "status-dot paused"} />
          {v.loading
            ? "Updating"
            : v.issue
              ? "Preview paused"
              : "Synced with source"}
        </span>
        <span>
          {v.model
            ? `${v.model.elementCount.toLocaleString()} elements · ${projection?.nodes.length ?? 0} visible · ${(v.model.byteLength / 1024).toFixed(1)} KB`
            : "XML 1.0"}
          <span className="status-separator">|</span>Processed locally
        </span>
      </footer>
    </main>
  );
}
