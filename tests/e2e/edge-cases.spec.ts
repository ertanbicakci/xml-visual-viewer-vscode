import { test, expect } from "@playwright/test";
for (const [file, query, namespace] of [
  ["soap.xml", "Ayşe Yılmaz", "urn:example:orders"],
  ["pom.xml", "maven-compiler-plugin", "http://maven.apache.org/POM/4.0.0"],
  ["mixed-content.xml", "東京", "urn:example:article"],
]) {
  test(`inspects ${file} locally`, async ({ page }) => {
    const remote: string[] = [];
    page.on("request", (r) => {
      if (r.url().startsWith("https://")) remote.push(r.url());
    });
    await page.goto("/");
    await expect(page.locator(".react-flow__node")).not.toHaveCount(0);
    await page.evaluate(
      async (file) =>
        (window as any).xmlViewerDemo.update(
          await fetch("/examples/" + file).then((r) => r.text()),
        ),
      file,
    );
    await page.getByRole("searchbox").fill(query!);
    await expect(page.getByTestId("node-inspector")).toContainText(query!);
    await expect(page.getByTestId("node-inspector")).toContainText(namespace!);
    expect(remote).toEqual([]);
  });
}
test("recovers from a failed layout resource using Retry layout", async ({
  page,
}) => {
  await page.route("**/layout-worker.js", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Unable to load");
  await page.unroute("**/layout-worker.js");
  await page.getByRole("button", { name: "Retry layout" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.locator(".react-flow:not([inert]) .react-flow__node"),
  ).not.toHaveCount(0);
});
test("handles empty input and long Unicode values without horizontal page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 720 });
  await page.goto("/");
  await expect(page.locator(".react-flow__node")).not.toHaveCount(0);
  await page.evaluate(() => (window as any).xmlViewerDemo.update(""));
  await expect(page.getByRole("alert")).toContainText("Empty XML");
  await page.evaluate(() =>
    (window as any).xmlViewerDemo.update(
      "<r><x>" + "東京 😀 مرحبا ".repeat(2000) + "</x></r>",
    ),
  );
  await page.getByRole("searchbox").fill("東京");
  await expect(page.getByTestId("node-inspector")).toContainText("東京");
  expect(
    await page.evaluate(() => document.body.scrollWidth <= innerWidth),
  ).toBe(true);
});
