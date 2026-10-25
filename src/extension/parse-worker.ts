import { parentPort, workerData } from "node:worker_threads";
import { parseXmlDocument } from "../core/parser";
import { encodeModel } from "../shared/model-codec";
const result = parseXmlDocument(
  workerData.source,
  workerData.uri,
  workerData.version,
  workerData.limits,
);
parentPort?.postMessage(
  result.ok ? { ok: true, model: encodeModel(result.model) } : result,
);
