import { parentPort, workerData } from "node:worker_threads";
import { parseXmlDocument } from "../core/parser";
parentPort?.postMessage(
  parseXmlDocument(workerData.source, workerData.uri, workerData.version),
);
