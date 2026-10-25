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
    await node.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("node-inspector")).toContainText(
      "Developer bookshelf",
    );
  });
}
