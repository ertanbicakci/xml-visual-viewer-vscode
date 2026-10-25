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
import ELK from "elkjs/lib/elk-api.js";
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
  const [layoutError, setLayoutError] = useState("");
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [renderedVersion, setRenderedVersion] = useState(-1);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const flow = useReactFlow<XmlFlowNode>();
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
          })
        : undefined,
    [v.model, v.expanded, v.pages, v.showMetadata, v.showWhitespace, v.focusId],
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
    let worker: Worker | undefined, objectUrl: string | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLayoutBusy(true);
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
        ariaLabel: `${xml.kind} ${xml.name}`,
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
      const url =
        document.getElementById("root")?.dataset.workerUri ??
        "/dist/webview/layout-worker.js";
      const response = await fetch(url);
      if (!response.ok)
        throw new Error("Unable to load the graph layout worker.");
      const source = await response.blob();
      if (disposed) return;
      objectUrl = URL.createObjectURL(source);
      worker = new Worker(objectUrl);
      timer = setTimeout(() => {
        worker?.terminate();
        if (!disposed) {
          setLayoutBusy(false);
          setLayoutError(
            "Graph layout timed out. Collapse branches or focus a smaller subtree.",
          );
        }
      }, 10_000);
      worker.onerror = () => {
        clearTimeout(timer);
        if (!disposed) {
          setLayoutBusy(false);
          setLayoutError(
            "Graph layout could not start. Reopen the preview to try again.",
          );
        }
      };
      const elk = new ELK({ workerFactory: () => worker! });
      const graph = await elk.layout({
        id: "graph",
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": v.direction,
          "elk.spacing.nodeNode": "28",
          "elk.layered.spacing.nodeNodeBetweenLayers": "72",
          "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
          "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
        },
        children: next.map((n) => ({ id: n.id, width: 236, height: 136 })),
        edges: projection.edges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      });
      clearTimeout(timer);
      worker.terminate();
      if (!disposed) {
        const positions = new Map(
          graph.children?.map((node) => [
            node.id,
            { x: node.x ?? 0, y: node.y ?? 0 },
          ]),
        );
        const arranged = next.map((node) => ({
          ...node,
          position: positions.get(node.id)!,
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
      clearTimeout(timer);
      worker?.terminate();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [
    projection,
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

  const selectedNode = v.model?.nodes[v.selected ?? ""];
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
        <section className="graph-pane" aria-label="XML graph">
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
              Showing the first 1,000 nodes. Collapse a branch or select a node
              and choose Focus branch.
            </div>
          )}
          {v.model ? (
            <ReactFlow<XmlFlowNode>
              inert={
                v.loading ||
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
              onClose={() => setInspectorOpen(false)}
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
