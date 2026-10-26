import { test, expect } from "vitest";
import { prepareReadme } from "../../scripts/readme-content.mjs";
const text =
  "![Preview](docs/images/preview.png)\n[Support](SUPPORT.md)\n[Guide](https://example.com/help)";
test("keeps relative images and links out of packages unless public repository access is explicitly enabled", () => {
  const result = prepareReadme(text);
  expect(result).not.toContain("![Preview]");
  expect(result).not.toContain("](SUPPORT.md)");
  expect(result).toContain("[Guide](https://example.com/help)");
});
test("retains source markup when the repository is explicitly public", () => {
  expect(prepareReadme(text, true)).toBe(text);
});
