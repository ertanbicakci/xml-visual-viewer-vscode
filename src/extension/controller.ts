import type { ParseResult, XmlModel } from "../core/model";
export interface Parser {
  parse(source: string, uri: string, version: number): Promise<ParseResult>;
  cancel(): void;
  dispose(): void;
}
export class DocumentController {
  model?: XmlModel;
  version = -1;
  private generation = 0;
  private valid = false;
  constructor(
    readonly uri: string,
    readonly parser: Parser,
    readonly emit: (result: ParseResult | { loading: number }) => void,
  ) {}
  async update(source: string, version: number): Promise<void> {
    const generation = ++this.generation;
    this.version = version;
    this.valid = false;
    this.emit({ loading: version });
    try {
      const result = await this.parser.parse(source, this.uri, version);
      if (generation !== this.generation) return;
      if (result.ok) {
        this.model = result.model;
        this.valid = true;
      }
      this.emit(result);
    } catch (error) {
      if (generation !== this.generation) return;
      this.emit({
        ok: false,
        error: {
          code: "internal",
          message:
            error instanceof Error ? error.message : "XML processing stopped.",
          offset: 0,
          line: 1,
          column: 1,
        },
      });
    }
  }
  current(version: number): XmlModel | undefined {
    return this.valid && version === this.version ? this.model : undefined;
  }
  cancel(): void {
    this.generation++;
    this.valid = false;
    this.parser.cancel();
  }
  dispose(): void {
    this.cancel();
    this.parser.dispose();
  }
}
