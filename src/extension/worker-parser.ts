import type { Parser } from "./controller";
import type { ParseResult } from "../core/model";
import { Worker } from "node:worker_threads";
import { decodeModel, type WireModel } from "../shared/model-codec";
export class WorkerParser implements Parser {
  private stop?: () => void;
  constructor(
    readonly workerPath: string,
    readonly timeoutMs = 10_000,
  ) {}
  parse(source: string, uri: string, version: number): Promise<ParseResult> {
    this.cancel();
    return new Promise((resolve, reject) => {
      const worker = new Worker(this.workerPath, {
        workerData: { source, uri, version },
        resourceLimits: { maxOldGenerationSizeMb: 256 },
      });
      let done = false;
      const finish = (result?: ParseResult, error?: Error) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.stop = undefined;
        void worker.terminate();
        if (error) reject(error);
        else resolve(result!);
      };
      const timer = setTimeout(
        () =>
          finish({
            ok: false,
            error: {
              code: "limit",
              message:
                "XML processing exceeded its time budget. Try a smaller document.",
              offset: 0,
              line: 1,
              column: 1,
            },
          }),
        this.timeoutMs,
      );
      this.stop = () =>
        finish(undefined, new Error("XML processing cancelled."));
      worker.once(
        "message",
        (
          result:
            Exclude<ParseResult, { ok: true }> | { ok: true; model: WireModel },
        ) =>
          finish(
            result.ok ? { ok: true, model: decodeModel(result.model) } : result,
          ),
      );
      worker.once("error", (error) =>
        finish(
          undefined,
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
      worker.once("exit", (code) => {
        if (!done)
          finish(
            undefined,
            new Error(`XML worker exited before returning a result (${code}).`),
          );
      });
    });
  }
  cancel(): void {
    this.stop?.();
  }
  dispose(): void {
    this.cancel();
  }
}
