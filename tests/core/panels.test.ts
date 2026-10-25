import { expect, test } from "vitest";
import { PanelSessions } from "../../src/extension/panel-sessions";
test("pausing one panel leaves other subscribers active and resume receives future updates", () => {
  const sessions = new PanelSessions<string>();
  sessions.add("first");
  sessions.add("second");
  sessions.pause("first");
  expect([...sessions.active()]).toEqual(["second"]);
  expect(sessions.hasActive).toBe(true);
  sessions.pause("second");
  expect(sessions.hasActive).toBe(false);
  sessions.resume("first");
  expect([...sessions.active()]).toEqual(["first"]);
  sessions.delete("first");
  sessions.delete("second");
  expect(sessions.size).toBe(0);
});
