import ELK from "elkjs/lib/elk-api.js";
type Point = { x: number; y: number };
type Edge = { id: string; source: string; target: string };
export class LayoutEngine {
  private source?: Promise<string>;
  private blobUrl?: string;
  private worker?: Worker;
  private elk?: InstanceType<typeof ELK>;
  private generation = 0;
  private stop?: () => void;
  private disposed = false;
  private cache = new Map<string, Record<string, Point>>();
  constructor(private url: string) {}
  signature(ids: string[], edges: Edge[], direction: string): string {
    return (
      direction +
      ":" +
      ids.join(",") +
      ":" +
      edges.map((edge) => edge.source + ">" + edge.target).join(",")
    );
  }
  has(key: string): boolean {
    return this.cache.has(key);
  }
  async layout(
    key: string,
    ids: string[],
    edges: Edge[],
    direction: string,
    force = false,
  ): Promise<{ positions: Record<string, Point>; cached: boolean }> {
    this.cancel();
    const generation = this.generation;
    const cached = this.cache.get(key);
    if (cached && !force) return { positions: cached, cached: true };
    if (this.disposed) throw new Error("Layout engine disposed.");
    if (!this.source)
      this.source = fetch(this.url)
        .then(async (response) => {
          if (!response.ok)
            throw new Error("Unable to load the graph layout worker.");
          const blob = await response.blob();
          if (this.disposed) throw new Error("Layout engine disposed.");
          return (this.blobUrl = URL.createObjectURL(blob));
        })
        .catch((error) => {
          this.source = undefined;
          throw error;
        });
    const source = await this.source;
    if (generation !== this.generation) throw new Error("Layout cancelled.");
    if (this.disposed) throw new Error("Layout engine disposed.");
    if (!this.worker) {
      this.worker = new Worker(source);
      this.elk = new ELK({ workerFactory: () => this.worker! });
    }
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (error?: Error, positions?: Record<string, Point>) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.stop = undefined;
        if (error) {
          this.worker?.terminate();
          this.worker = undefined;
          this.elk = undefined;
          reject(error);
        } else {
          this.cache.set(key, positions!);
          if (this.cache.size > 8)
            this.cache.delete(this.cache.keys().next().value!);
          resolve({ positions: positions!, cached: false });
        }
      };
      const timer = setTimeout(
        () =>
          finish(
            new Error(
              "Graph layout timed out. Collapse branches or focus a smaller subtree.",
            ),
          ),
        10_000,
      );
      this.stop = () => finish(new Error("Layout cancelled."));
      this.worker!.onerror = () =>
        finish(
          new Error(
            "The graph layout worker stopped. Choose Retry to try again.",
          ),
        );
      void this.elk!.layout({
        id: "graph",
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": direction,
          "elk.spacing.nodeNode": "28",
          "elk.layered.spacing.nodeNodeBetweenLayers": "72",
          "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
          "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
        },
        children: ids.map((id) => ({ id, width: 236, height: 136 })),
        edges: edges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      })
        .then((graph) => {
          finish(
            undefined,
            Object.fromEntries(
              (graph.children ?? []).map((node) => [
                node.id,
                { x: node.x ?? 0, y: node.y ?? 0 },
              ]),
            ),
          );
        })
        .catch((error) =>
          finish(
            error instanceof Error
              ? error
              : new Error("Unable to arrange the graph."),
          ),
        );
    });
  }
  cancel(): void {
    this.generation++;
    this.stop?.();
  }
  dispose(): void {
    this.disposed = true;
    this.cancel();
    this.worker?.terminate();
    if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
    this.cache.clear();
  }
}
