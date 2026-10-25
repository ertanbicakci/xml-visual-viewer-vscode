import { DEFAULT_SETTINGS } from "../shared/settings";
import { decodeModel } from "../shared/model-codec";
import { saveView, restoreView } from "../core/view-state";
import { useCallback, useEffect, useRef, useState } from "react";
import { initialExpanded, projectGraph, revealNode } from "../core/graph";
import type { XmlIssue, XmlModel } from "../core/model";
import type { Bridge, HostMessage, ViewState } from "../shared/protocol";
export type Details = Extract<HostMessage, { type: "details" }>;
export function useViewer(bridge: Bridge) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<{ ids: string[]; index: number }>({
    ids: [],
    index: -1,
  });
  const historyRef = useRef(history);
  historyRef.current = history;
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
  const [contexts, setContexts] = useState<Record<string, string>>({});
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
  const current = useRef({
    model,
    expanded,
    pages,
    query,
    loading,
    issue,
    selected,
    focusId,
    details,
  });
  current.current = {
    model,
    expanded,
    pages,
    query,
    loading,
    issue,
    selected,
    focusId,
    details,
  };
  const version = useRef(-1),
    searchId = useRef(0);
  const requestedDetails = useRef<string | undefined>(undefined);
  const lastSearchQuery = useRef("");
  const autoSelectSearch = useRef(true);

  const select = useCallback(
    (id: string, reveal = false, record = true) => {
      const state = current.current;
      if (!state.model) return;
      let target = id;
      if (reveal) {
        const next = revealNode(state.model, id, state.expanded, state.pages);
        target = next.id;
        if (next.expanded !== state.expanded) setExpanded(next.expanded);
        if (next.pages !== state.pages) setPages(next.pages);
        let ancestor = state.model.nodes[target];
        while (ancestor?.parentId && ancestor.id !== state.focusId)
          ancestor = state.model.nodes[ancestor.parentId];
        if (state.focusId && ancestor?.id !== state.focusId)
          setFocusId(undefined);
        const node = state.model.nodes[target];
        if (node && ["comment", "pi", "xmldecl"].includes(node.kind))
          setShowMetadata(true);
        if (node?.kind === "text" && !node.value.trim())
          setShowWhitespace(true);
        const projection =
          next.expanded === state.expanded && next.pages === state.pages
            ? undefined
            : projectGraph(state.model, {
                expanded: next.expanded,
                pages: next.pages,
                showMetadata: true,
                showWhitespace: true,
                maxVisible: settingsRef.current.maxVisibleNodes,
              });
        if (projection && !projection.nodes.some((n) => n.id === target))
          setFocusId(target);
      }
      if (
        record &&
        historyRef.current.ids[historyRef.current.index] !== target
      ) {
        const ids = [
          ...historyRef.current.ids.slice(0, historyRef.current.index + 1),
          target,
        ].slice(-32);
        const next = { ids, index: ids.length - 1 };
        historyRef.current = next;
        setHistory(next);
      }
      setSelected(target);
      requestedDetails.current = target;
      if (
        !state.loading &&
        !state.issue &&
        (state.details?.node.id !== target ||
          state.details?.version !== state.model.version)
      )
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
      if (message.type === "settings") {
        settingsRef.current = message.settings;
        setSettings(message.settings);
        if (message.changed || saved.current.direction === undefined)
          setDirection(message.settings.direction);
        if (message.changed || saved.current.showMetadata === undefined)
          setShowMetadata(message.settings.showMetadata);
        if (message.changed || saved.current.showWhitespace === undefined)
          setShowWhitespace(message.settings.showWhitespace);
        return;
      }
      if (message.type === "model") {
        const nextModel = decodeModel(message.model);
        if (nextModel.version < version.current) return;
        version.current = nextModel.version;
        const previous = current.current;
        const stored =
          previous.model?.uri === nextModel.uri
            ? saveView(previous.model, previous)
            : saved.current.uri === nextModel.uri
              ? saved.current.view
              : undefined;
        const restored = stored ? restoreView(nextModel, stored) : undefined;
        const nextExpanded =
          restored?.expanded ??
          initialExpanded(nextModel, settingsRef.current.initialDepth);
        current.current = {
          ...previous,
          model: nextModel,
          expanded: nextExpanded,
          pages: restored?.pages ?? {},
          selected: restored?.selected,
          focusId: restored?.focusId,
          details: undefined,
          loading: false,
          issue: undefined,
        };
        const nextHistory = {
          ids: restored?.selected ? [restored.selected] : [],
          index: restored?.selected ? 0 : -1,
        };
        historyRef.current = nextHistory;
        setHistory(nextHistory);
        setModel(nextModel);
        setExpanded(nextExpanded);
        setPages(restored?.pages ?? {});
        setLoading(false);
        setIssue(undefined);
        setSelected(restored?.selected);
        setDetails(undefined);
        setFocusId(restored?.focusId);
        setMatches([]);
        requestedDetails.current = restored?.selected;
        if (restored?.selected)
          bridge.post({
            type: "details",
            version: nextModel.version,
            nodeId: restored.selected,
          });
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
        setContexts(message.contexts ?? {});
        const index = message.ids.findIndex(
          (id) =>
            id === current.current.selected ||
            current.current.model?.nodes[id]?.parentId ===
              current.current.selected,
        );
        setMatchIndex(autoSelectSearch.current ? 0 : Math.max(0, index));
        if (message.ids[0] && autoSelectSearch.current)
          select(message.ids[0], true);
      }
    });
    bridge.post({ type: "ready" });
    return unsubscribe;
  }, [bridge, select]);

  useEffect(() => {
    const requestId = ++searchId.current;
    autoSelectSearch.current =
      lastSearchQuery.current !== query || !current.current.selected;
    lastSearchQuery.current = query;
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
      view: model
        ? saveView(model, { selected, focusId, expanded, pages })
        : undefined,
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
    selected,
    focusId,
    pages,
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
    settings,
    history,
    navigateHistory(step: number) {
      const index = history.index + step;
      const id = history.ids[index];
      if (!id) return;
      const next = { ...history, index };
      historyRef.current = next;
      setHistory(next);
      select(id, true, false);
    },
    retry: () => bridge.post({ type: "retry" }),
    showError: () =>
      bridge.post({ type: "showError", version: version.current }),
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
    matchContext: contexts[matches[matchIndex] ?? ""],
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
