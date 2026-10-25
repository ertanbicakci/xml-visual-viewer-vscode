import { expect, it } from "vitest";
import { normalizeSettings } from "../../src/shared/settings";
it("validates resource settings and clamps user supplied limits", () => {
  const settings = normalizeSettings({
    direction: "DOWN",
    initialDepth: 4,
    followSource: false,
    showMetadata: true,
    updateDelay: 25,
    maxVisibleNodes: 99_999,
  });
  expect(settings.direction).toBe("DOWN");
  expect(settings.initialDepth).toBe(4);
  expect(settings.followSource).toBe(false);
  expect(settings.showMetadata).toBe(true);
  expect(settings.updateDelay).toBe(50);
  expect(settings.maxVisibleNodes).toBe(2000);
});
it("uses safe defaults for invalid settings without coercing strings to flags", () => {
  const settings = normalizeSettings({
    direction: "SIDEWAYS",
    initialDepth: NaN,
    followSource: "false",
    updateDelay: Infinity,
  });
  expect(settings.direction).toBe("RIGHT");
  expect(settings.initialDepth).toBe(2);
  expect(settings.followSource).toBe(true);
  expect(settings.updateDelay).toBe(400);
});
