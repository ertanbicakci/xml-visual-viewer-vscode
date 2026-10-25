export interface ViewerSettings {
  direction: "RIGHT" | "DOWN";
  initialDepth: number;
  followSource: boolean;
  showMetadata: boolean;
  showWhitespace: boolean;
  updateDelay: number;
  maxVisibleNodes: number;
}
export const DEFAULT_SETTINGS: ViewerSettings = {
  direction: "RIGHT",
  initialDepth: 2,
  followSource: true,
  showMetadata: false,
  showWhitespace: false,
  updateDelay: 400,
  maxVisibleNodes: 1000,
};
export function normalizeSettings(
  value: Record<string, unknown>,
): ViewerSettings {
  const bounded = (
    key: "initialDepth" | "updateDelay" | "maxVisibleNodes",
    min: number,
    max: number,
  ) => {
    const n = value[key];
    return typeof n === "number" && Number.isFinite(n)
      ? Math.max(min, Math.min(max, Math.round(n)))
      : DEFAULT_SETTINGS[key];
  };
  const boolean = (key: "followSource" | "showMetadata" | "showWhitespace") =>
    typeof value[key] === "boolean"
      ? (value[key] as boolean)
      : DEFAULT_SETTINGS[key];
  return {
    direction: value.direction === "DOWN" ? "DOWN" : "RIGHT",
    initialDepth: bounded("initialDepth", 1, 6),
    updateDelay: bounded("updateDelay", 50, 3000),
    maxVisibleNodes: bounded("maxVisibleNodes", 100, 2000),
    followSource: boolean("followSource"),
    showMetadata: boolean("showMetadata"),
    showWhitespace: boolean("showWhitespace"),
  };
}
