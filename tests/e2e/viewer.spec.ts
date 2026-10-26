import { test, expect } from "@playwright/test";
test("reuses the layout worker resource across branch changes and repeated source selection", async ({
  page,
}) => {
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/layout-worker.js")) requests++;
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Expand collection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Collapse collection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Expand collection", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "element book", exact: true }),
  ).toHaveCount(3);
  await page.evaluate(() => (window as any).xmlViewerDemo.select(180));
  await expect(
    page
      .getByTestId("node-inspector")
      .getByRole("heading", { name: "catalog", exact: true }),
  ).toBeVisible();
  const baseline = requests;
  for (let i = 0; i < 5; i++)
    await page.evaluate(() => (window as any).xmlViewerDemo.select(181));
  await page.waitForTimeout(300);
  expect(requests).toBe(baseline);
  expect(requests).toBe(1);
});
test("preserves the inspected keyed element and focused branch after a source edit", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    (window as any).xmlViewerDemo.update(
      '<r><item id="a"><title>A</title></item><item id="b"><title>B</title></item></r>',
    ),
  );
  await page.getByRole("searchbox").fill('"b"');
  await page.getByRole("searchbox").fill("b");
  await expect(page.getByTestId("node-inspector")).toContainText("id");
  // Select the unique identity attribute rather than a common element name.
  await page.evaluate(() => (window as any).xmlViewerDemo.select(60));
  await page.getByRole("button", { name: "Focus branch", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Show full document" }),
  ).toBeVisible();
  await page.evaluate(() =>
    (window as any).xmlViewerDemo.update(
      '<r><item id="new"/><item id="a"><title>A</title></item><item id="b"><title>Updated B</title></item></r>',
    ),
  );
  await expect(page.getByTestId("node-inspector")).toContainText("Updated B");
  await expect(
    page.getByRole("button", { name: "Show full document" }),
  ).toBeVisible();
});
test("does not allow interaction with a graph from the previous document version while laying out the next one", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      postMessage(message: any, ...args: any[]) {
        if ((window as any).delayLayout)
          setTimeout(() => super.postMessage(message, ...(args as [any])), 700);
        else super.postMessage(message, ...(args as [any]));
      }
    };
  });
  await page.goto("/");
  await expect(page.locator(".react-flow__node")).not.toHaveCount(0);
  await page.evaluate(() => {
    (window as any).delayLayout = true;
  });
  await page.evaluate(() =>
    (window as any).xmlViewerDemo.update("<new-root><new-item/></new-root>"),
  );
  await expect(page.locator(".react-flow")).toHaveAttribute("inert", "");
  await expect(page.locator(".react-flow")).not.toHaveAttribute("inert", "");
  await expect(
    page.getByRole("group", { name: "element new-root", exact: true }),
  ).toBeVisible();
});
test("focus branch fits the complete visible subtree in the canvas", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("bk-101");
  await expect(page.getByTestId("node-inspector")).toContainText("bk-101");
  await page.getByRole("button", { name: "Focus branch", exact: true }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
  await expect
    .poll(async () =>
      page.locator(".graph-pane").evaluate((canvas) => {
        const bounds = canvas.getBoundingClientRect();
        return [...canvas.querySelectorAll(".react-flow__node")].every(
          (node) => {
            const rect = node.getBoundingClientRect();
            return (
              rect.top >= bounds.top &&
              rect.bottom <= bounds.bottom &&
              rect.left >= bounds.left &&
              rect.right <= bounds.right
            );
          },
        );
      }),
    )
    .toBe(true);
});
test("search selects newly inserted comments after an already selected result", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Search XML" });
  await search.fill("The Namespace Handbook");
  await expect(page.getByTestId("node-inspector")).toContainText(
    "The Namespace Handbook",
  );
  await page.evaluate(async () => {
    const xml = await fetch("/examples/catalog.xml").then((r) => r.text());
    await (window as any).xmlViewerDemo.update(
      xml.replace(
        "<catalog ",
        "<!-- Live update integration test -->\n<catalog ",
      ),
    );
  });
  await expect(page.locator(".viewer")).toHaveAttribute(
    "data-document-version",
    "2",
  );
  await search.fill("Live update integration test");
  await expect(page.getByTestId("node-inspector")).toContainText(
    "Live update integration test",
  );
});
test("loads the graph under the extension content security policy", async ({
  page,
}) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") violations.push(message.text());
  });
  await page.goto("/secure");
  await expect(page.locator(".react-flow__node")).not.toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(violations).toEqual([]);
});
test("explores a graph, searches hidden content, inspects namespaces and navigates to source", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "XML Viewer", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".react-flow__node")).not.toHaveCount(0);
  const search = page.getByRole("searchbox", { name: "Search XML" });
  await search.fill("The Namespace Handbook");
  await expect(page.getByText("1 of 1", { exact: true })).toBeVisible();
  await expect(page.getByTestId("node-inspector")).toContainText(
    "The Namespace Handbook",
  );
  await page
    .getByRole("button", { name: "Show in source", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-revealed",
    /book\[3\]\/title\[1\]/,
  );
  await expect(page.getByTestId("node-inspector")).toContainText(
    "urn:example:catalog",
  );
  await search.fill("bk-101");
  await expect(page.getByTestId("node-inspector")).toContainText("bk-101");
  await page.getByRole("button", { name: "Focus branch", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Show full document" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show full document" }).click();
  await page
    .getByRole("combobox", { name: "Graph direction" })
    .selectOption("DOWN");
  await expect(page.locator(".viewer")).toHaveAttribute(
    "data-direction",
    "DOWN",
  );
  expect(errors).toEqual([]);
});
test("blocks stale source navigation for invalid XML and recovers after correction", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".react-flow__node")).not.toHaveCount(0);
  await page.getByRole("searchbox").fill("Understanding XML");
  await expect(page.getByTestId("node-inspector")).toContainText(
    "Understanding XML",
  );
  await page.evaluate(() => (window as any).xmlViewerDemo.update("<broken>"));
  await expect(page.getByRole("alert")).toContainText("Missing end tag");
  await expect(
    page.getByRole("button", { name: "Show in source", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() =>
    (window as any).xmlViewerDemo.update("<r><fixed>Recovered</fixed></r>"),
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("searchbox").fill("Recovered");
  await expect(page.getByTestId("node-inspector")).toContainText("Recovered");
});
test("supports keyboard selection and branch controls", async ({ page }) => {
  await page.goto("/");
  const collection = page.getByRole("group", {
    name: "element collection",
    exact: true,
  });
  await expect(collection).toBeVisible();
  await collection.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("node-inspector")).toContainText(
    "Developer bookshelf",
  );
  await page
    .getByRole("button", { name: "Expand collection", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "element book", exact: true }),
  ).toHaveCount(3);
  await page
    .getByRole("button", { name: "Collapse collection", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "element book", exact: true }),
  ).toHaveCount(0);
});
test("shows metadata, preserves text safely, and renders in a narrow panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 500, height: 800 });
  await page.goto("/");
  await expect(page.locator(".react-flow__node")).not.toHaveCount(0);
  await page.evaluate(() =>
    (window as any).xmlViewerDemo.update(
      "<r><!--a note--><x>&lt;script&gt;window.pwned=true&lt;/script&gt;</x></r>",
    ),
  );
  await page.getByRole("button", { name: "Expand r", exact: true }).click();
  await page.getByRole("button", { name: "View", exact: true }).click();
  await page.getByRole("checkbox", { name: "Comments & instructions" }).check();
  await expect(
    page.getByRole("group", { name: "comment #comment", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View", exact: true }).click();
  await page.getByRole("searchbox").fill("window.pwned");
  await expect(page.getByTestId("node-inspector")).toContainText(
    "<script>window.pwned=true</script>",
  );
  expect(await page.evaluate(() => (window as any).pwned)).toBeUndefined();
  await page.getByRole("button", { name: "Close details" }).click();
  expect(
    await page.evaluate(() => document.body.scrollWidth <= window.innerWidth),
  ).toBe(true);
});

test("pauses a preview and retries the latest XML, with breadcrumbs and selection history", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("bk-101");
  await expect(page.getByTestId("node-inspector")).toContainText("bk-101");
  const nav = page.getByRole("navigation", { name: "XML navigation" });
  await expect(
    nav.getByRole("button", { name: "catalog", exact: true }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "catalog", exact: true }).click();
  await expect(
    page
      .getByTestId("node-inspector")
      .getByRole("heading", { name: "catalog", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to previous node" }).click();
  await expect(page.getByTestId("node-inspector")).toContainText("bk-101");
  await page.getByRole("button", { name: "Forward to next node" }).click();
  await expect(
    page
      .getByTestId("node-inspector")
      .getByRole("heading", { name: "catalog", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause preview", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("paused");
  await expect(page.locator(".react-flow")).toHaveAttribute("inert", "");
  await page.evaluate(() =>
    (window as any).xmlViewerDemo.update("<latest><ok/></latest>"),
  );
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: "element latest", exact: true }),
  ).toBeVisible();
});
test("applies live settings and offers source navigation for syntax errors", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".react-flow__node")).not.toHaveCount(0);
  await page.evaluate(() =>
    (window as any).xmlViewerDemo.configure({
      direction: "DOWN",
      showMetadata: true,
    }),
  );
  await expect(page.locator(".viewer")).toHaveAttribute(
    "data-direction",
    "DOWN",
  );
  await expect(
    page.getByRole("group", { name: "comment #comment", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => (window as any).xmlViewerDemo.update("<broken>"));
  await page.getByRole("button", { name: "Show error in source" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-error-revealed",
    "2",
  );
});
test("search reveals a result beyond the visible node budget", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".react-flow__node")).not.toHaveCount(0);
  await page.evaluate(() =>
    (window as any).xmlViewerDemo.update(
      "<r>" +
        Array.from({ length: 1500 }, (_, i) => `<item id="row-${i}"/>`).join(
          "",
        ) +
        "</r>",
    ),
  );
  await page.getByRole("searchbox").fill("row-1499");
  await expect(page.getByTestId("node-inspector")).toContainText("row-1499");
  await expect(page.locator(".react-flow__node.selected")).toContainText(
    "row-1499",
  );
});
