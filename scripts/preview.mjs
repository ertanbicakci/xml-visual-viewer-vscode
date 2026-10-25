import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = process.cwd();
const types = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".xml": "application/xml",
  ".html": "text/html",
  ".map": "application/json",
};
createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/" || pathname === "/secure") {
    if (pathname === "/secure")
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; worker-src blob:; img-src 'self' data:; font-src 'self'",
      );
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>XML Viewer Preview</title><link rel="stylesheet" href="/dist/webview/demo.css"></head><body><div id="root"></div><script src="/dist/webview/demo.js"></script></body></html>',
    );
    return;
  }
  const file = resolve(root, "." + decodeURIComponent(pathname));
  if (
    !file.startsWith(root + sep) ||
    (!pathname.startsWith("/dist/webview/") &&
      !pathname.startsWith("/examples/"))
  ) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    res.setHeader(
      "Content-Type",
      types[extname(file)] || "application/octet-stream",
    );
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(4173, "127.0.0.1", () =>
  console.log("XML Viewer preview: http://127.0.0.1:4173"),
);
