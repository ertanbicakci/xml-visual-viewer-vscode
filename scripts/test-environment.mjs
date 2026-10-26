import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
const assigned = new Set();
export async function createTestEnvironment() {
  const root = await mkdtemp(
    join(process.platform === "darwin" ? "/tmp" : tmpdir(), "xv-"),
  );
  const userData = join(root, "user");
  await mkdir(join(userData, "User"), { recursive: true });
  await writeFile(
    join(userData, "User", "settings.json"),
    JSON.stringify({
      "workbench.startupEditor": "none",
      "window.restoreWindows": "none",
      "window.newWindowDimensions": "maximized",
      "telemetry.telemetryLevel": "off",
      "update.mode": "none",
    }),
  );
  let port;
  do {
    port = await new Promise((resolve, reject) => {
      const server = createServer();
      server.on("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        server.close(() => resolve(address.port));
      });
    });
  } while (assigned.has(port));
  assigned.add(port);
  return { root, userData, extensions: join(root, "extensions"), port };
}
