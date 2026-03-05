export interface SplitterResult {
  lines: string[];
}

export interface DashLineSplitter {
  parse(input: string, options?: Record<string, unknown>): string[];
  SyntaxError: new (message: string, expected: unknown, found: unknown, location: unknown) => Error;
}

declare const DASH_LINES_SPLITTER: DashLineSplitter;
export default DASH_LINES_SPLITTER;
