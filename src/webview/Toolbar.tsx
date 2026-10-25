import { useEffect, useRef, useState } from "react";
import type { GraphProjection } from "../core/graph";
import type { useViewer } from "./useViewer";

type ToolbarProps = {
  v: ReturnType<typeof useViewer>;
  projection?: GraphProjection;
  valid: boolean;
  inspectorOpen: boolean;
  setInspectorOpen(value: boolean): void;
};
export function Toolbar({
  v,
  projection,
  valid,
  inspectorOpen,
  setInspectorOpen,
}: ToolbarProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!optionsOpen) return;
    const pointer = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOptionsOpen(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOptionsOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", keyboard);
    };
  }, [optionsOpen]);
  return (
    <div className="toolbar">
      <div className="search-control">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          aria-label="Search XML"
          placeholder="Find elements, attributes, values…"
          value={v.query}
          maxLength={1000}
          onChange={(event) => v.setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") v.navigateMatch(event.shiftKey ? -1 : 1);
            if (event.key === "Escape") v.setQuery("");
          }}
        />
        {v.query && (
          <>
            <span className="search-count" aria-live="polite">
              {v.matches.length
                ? `${v.matchIndex + 1} of ${v.matches.length}`
                : "No matches"}
            </span>
            {v.matches.length > 0 && (
              <span className="search-context" title="Matched field">
                {v.matchContext}
              </span>
            )}
            <button
              className="quiet"
              aria-label="Previous match"
              disabled={!v.matches.length}
              onClick={() => v.navigateMatch(-1)}
            >
              ↑
            </button>
            <button
              className="quiet"
              aria-label="Next match"
              disabled={!v.matches.length}
              onClick={() => v.navigateMatch(1)}
            >
              ↓
            </button>
          </>
        )}
      </div>
      <div className="toolbar-actions">
        <select
          aria-label="Graph direction"
          value={v.direction}
          onChange={(event) =>
            v.setDirection(event.target.value as "RIGHT" | "DOWN")
          }
        >
          <option value="RIGHT">Horizontal</option>
          <option value="DOWN">Vertical</option>
        </select>
        <button
          title="Expand one more level"
          disabled={!valid}
          onClick={() =>
            v.setExpanded(
              (previous) =>
                new Set([
                  ...previous,
                  ...(projection?.nodes.map((n) => n.id) ?? []),
                ]),
            )
          }
        >
          Expand level
        </button>
        <button
          disabled={!valid}
          onClick={() =>
            v.setExpanded(new Set(v.model ? [v.model.rootId] : []))
          }
        >
          Collapse
        </button>
        <div className="view-options" ref={menu}>
          <button
            ref={menuButton}
            aria-expanded={optionsOpen}
            onClick={() => setOptionsOpen(!optionsOpen)}
          >
            View
          </button>
          {optionsOpen && (
            <div className="options-menu">
              <label>
                <input
                  type="checkbox"
                  checked={v.showMetadata}
                  onChange={(event) => v.setShowMetadata(event.target.checked)}
                />{" "}
                Comments & instructions
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={v.showWhitespace}
                  onChange={(event) =>
                    v.setShowWhitespace(event.target.checked)
                  }
                />{" "}
                Whitespace & text nodes
              </label>
              <button
                onClick={() => {
                  setInspectorOpen(!inspectorOpen);
                  setOptionsOpen(false);
                }}
              >
                {inspectorOpen ? "Hide" : "Show"} details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
