import { test, expect } from "vitest";
import { createTestEnvironment } from "../../scripts/test-environment.mjs";
import { rm } from "node:fs/promises";
test("isolates VS Code profiles from long workspace paths and allows concurrent debug ports", async () => {
  const first = await createTestEnvironment(),
    second = await createTestEnvironment();
  try {
    expect(first.userData.length + "/1.143-main.sock".length).toBeLessThan(100);
    expect(first.root).not.toBe(second.root);
    expect(first.port).not.toBe(second.port);
  } finally {
    await rm(first.root, { recursive: true, force: true });
    await rm(second.root, { recursive: true, force: true });
  }
});
