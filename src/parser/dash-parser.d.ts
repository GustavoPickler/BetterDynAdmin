export type ParamValue = string | boolean | number;

export interface ParsedParam {
  type: 'flag' | 'value' | 'variable' | 'component';
  name?: string;
  value?: ParamValue;
  path?: string;
}

export interface ParsedOutput {
  name: string;
  index?: number;
  format?: string;
}

export interface ParsedCommand {
  function: string;
  params: ParsedParam[];
  output?: ParsedOutput;
}

export interface DashParser {
  parse(input: string, options?: Record<string, unknown>): ParsedCommand;
  SyntaxError: new (message: string, expected: unknown, found: unknown, location: unknown) => Error;
}

declare const BDA_DASH_PARSER: DashParser;
export default BDA_DASH_PARSER;
