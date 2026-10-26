import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import palettes from "../fixtures/themes.json";
for (const theme of palettes.themes) {
  test(`keyboard and WCAG checks in ${theme.name}`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript((theme) => {
      document.addEventListener("DOMContentLoaded", () => {
        document.body.className = theme.name;
        for (const [key, value] of Object.entries(theme.colors))
          document.documentElement.style.setProperty(
            "--vscode-" + key.replaceAll(".", "-"),
            value as string,
          );
      });
    }, theme);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("searchbox").fill("bk-101");
    await expect(page.getByTestId("node-inspector")).toContainText("bk-101");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${theme.name}.png`) });
    await page.getByRole("button", { name: "Close details" }).click();
    const node = page.getByRole("group", {
      name: "element collection",
      exact: true,
    });
    await expect(page.locator(".react-flow")).not.toHaveAttribute("inert", "");
    await node.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("node-inspector")).toContainText(
      "Developer bookshelf",
    );
  });
}
test("returns keyboard focus to the selected graph node after closing details", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Original = window.Worker;
    window.Worker = class extends Original {
      postMessage(message: any, ...args: any[]) {
        setTimeout(() => super.postMessage(message, ...(args as [any])), 350);
      }
    };
  });
  await page.goto("/");
  await page.getByRole("searchbox").fill("bk-101");
  await expect(page.getByTestId("node-inspector")).toContainText("bk-101");
  const close = page.getByRole("button", { name: "Close details" });
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".react-flow__node.selected")).toBeFocused();
});
test("keeps controls usable at a 200% equivalent viewport with forced colors", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 720, height: 480 });
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("searchbox").fill("bk-101");
  await expect(page.getByTestId("node-inspector")).toContainText("bk-101");
  await page
    .getByRole("button", { name: "Show in source", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-revealed",
    /book\[1\]/,
  );
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
  expect(
    await page.evaluate(() => document.body.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("forced-colors-200-percent.png"),
  });
});
test("does not steal focus if the user tabs away while layout finishes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Original = window.Worker;
    window.Worker = class extends Original {
      postMessage(message: any, ...args: any[]) {
        setTimeout(() => super.postMessage(message, ...(args as [any])), 500);
      }
    };
  });
  await page.goto("/");
  await page.getByRole("searchbox").fill("bk-101");
  await expect(page.getByTestId("node-inspector")).toContainText("bk-101");
  await page.getByRole("button", { name: "Close details" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("node-inspector")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await page.evaluate(() =>
    document.activeElement?.setAttribute("data-focus-marker", "kept"),
  );
  await expect(
    page.locator(".react-flow:not([inert]) .react-flow__node.selected"),
  ).toBeVisible();
  await expect(page.locator('[data-focus-marker="kept"]')).toBeFocused();
});
