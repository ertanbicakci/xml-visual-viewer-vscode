import { useCallback, useEffect, useRef, useState } from "react";
import { initialExpanded, projectGraph, revealNode } from "../core/graph";
import type { XmlIssue, XmlModel } from "../core/model";
import type { Bridge, HostMessage, ViewState } from "../shared/protocol";
export type Details = Extract<HostMessage, { type: "details" }>;
export function useViewer(bridge: Bridge) {
  const saved = useRef(bridge.getState());
  const [model, setModel] = useState<XmlModel>();
  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState<XmlIssue>();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pages, setPages] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string>();
  const [details, setDetails] = useState<Details>();
  const [focusId, setFocusId] = useState<string>();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<string[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [direction, setDirection] = useState<"RIGHT" | "DOWN">(
    saved.current.direction ?? "RIGHT",
  );
  const [showMetadata, setShowMetadata] = useState(
    saved.current.showMetadata ?? false,
  );
  const [showWhitespace, setShowWhitespace] = useState(
    saved.current.showWhitespace ?? false,
  );
  const [inspectorWidth, setInspectorWidth] = useState(
    saved.current.inspectorWidth ?? 312,
  );
  const current = useRef({ model, expanded, pages, query, loading, issue });
  current.current = { model, expanded, pages, query, loading, issue };
  const version = useRef(-1),
    searchId = useRef(0);
  const requestedDetails = useRef<string | undefined>(undefined);

  const select = useCallback(
    (id: string, reveal = false) => {
      const state = current.current;
      if (!state.model) return;
      let target = id;
      if (reveal) {
        const next = revealNode(state.model, id, state.expanded, state.pages);
        target = next.id;
        setExpanded(next.expanded);
        setPages(next.pages);
        setFocusId(undefined);
        const node = state.model.nodes[target];
        if (node && ["comment", "pi", "xmldecl"].includes(node.kind))
          setShowMetadata(true);
        if (node?.kind === "text" && !node.value.trim())
          setShowWhitespace(true);
        const projection = projectGraph(state.model, {
          expanded: next.expanded,
          pages: next.pages,
          showMetadata: true,
          showWhitespace: true,
        });
        if (!projection.nodes.some((n) => n.id === target))
          setFocusId(node?.parentId ?? target);
      }
      setSelected(target);
      requestedDetails.current = target;
      if (!state.loading && !state.issue)
        bridge.post({
          type: "details",
          version: state.model.version,
          nodeId: target,
        });
    },
    [bridge],
  );

  useEffect(() => {
    const unsubscribe = bridge.subscribe((message) => {
      if (message.type === "model") {
        if (message.model.version < version.current) return;
        version.current = message.model.version;
        const previous = current.current;
        const pathSet =
          previous.model?.uri === message.model.uri
            ? new Set(
                [...previous.expanded].map(
                  (id) => previous.model!.nodes[id]?.path,
                ),
              )
            : saved.current.uri === message.model.uri
              ? new Set(saved.current.expandedPaths ?? [])
              : undefined;
        const nextExpanded = pathSet?.size
          ? new Set(
              Object.values(message.model.nodes)
                .filter((n) => pathSet.has(n.path))
                .map((n) => n.id),
            )
          : initialExpanded(message.model);
        current.current = {
          ...previous,
          model: message.model,
          expanded: nextExpanded,
          pages: {},
          loading: false,
          issue: undefined,
        };
        setModel(message.model);
        setExpanded(nextExpanded);
        setPages({});
        setLoading(false);
        setIssue(undefined);
        setSelected(undefined);
        setDetails(undefined);
        setFocusId(undefined);
        setMatches([]);
        return;
      }
      if ("version" in message && message.version < version.current) return;
      if (message.type === "loading") {
        version.current = message.version;
        setLoading(true);
        setIssue(undefined);
        setMatches([]);
        current.current.loading = true;
        current.current.issue = undefined;
      } else if (message.type === "error") {
        version.current = message.version;
        setLoading(false);
        setIssue(message.error);
        current.current.loading = false;
        current.current.issue = message.error;
      } else if (
        message.type === "selection" &&
        !current.current.loading &&
        !current.current.issue
      )
        select(message.nodeId, true);
      else if (
        message.type === "details" &&
        message.version === version.current &&
        message.node.id === requestedDetails.current
      )
        setDetails(message);
      else if (
        message.type === "search" &&
        message.requestId === searchId.current &&
        message.query === current.current.query
      ) {
        setMatches(message.ids);
        setMatchIndex(0);
        if (message.ids[0]) select(message.ids[0], true);
      }
    });
    bridge.post({ type: "ready" });
    return unsubscribe;
  }, [bridge, select]);

  useEffect(() => {
    const requestId = ++searchId.current;
    if (!model || loading || issue || !query.trim()) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(
      () =>
        bridge.post({
          type: "search",
          version: model.version,
          query,
          requestId,
        }),
      160,
    );
    return () => clearTimeout(timer);
  }, [query, model, loading, issue, bridge]);

  useEffect(() => {
    const state: ViewState = {
      ...bridge.getState(),
      uri: model?.uri,
      expandedPaths: model
        ? [...expanded]
            .map((id) => model.nodes[id]?.path)
            .filter((path): path is string => Boolean(path))
        : [],
      direction,
      showMetadata,
      showWhitespace,
      inspectorWidth,
    };
    bridge.setState(state);
  }, [
    model,
    expanded,
    direction,
    showMetadata,
    showWhitespace,
    inspectorWidth,
    bridge,
  ]);

  const navigateMatch = (step: number) => {
    if (!matches.length) return;
    const next = (matchIndex + step + matches.length) % matches.length;
    setMatchIndex(next);
    select(matches[next]!, true);
  };
  return {
    model,
    loading,
    issue,
    expanded,
    setExpanded,
    pages,
    setPages,
    selected,
    details,
    select,
    focusId,
    setFocusId,
    query,
    setQuery,
    matches,
    matchIndex,
    navigateMatch,
    direction,
    setDirection,
    showMetadata,
    setShowMetadata,
    showWhitespace,
    setShowWhitespace,
    inspectorWidth,
    setInspectorWidth,
  };
}
