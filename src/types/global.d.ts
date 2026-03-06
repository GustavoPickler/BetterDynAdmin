// Global type definitions for BetterDynAdmin

export interface BDAConfig {
  oldDynamoAltSelector: string[];
  isOldDynamo: boolean;
  isComponentPage: boolean;
}

export interface StoredComponent {
  path: string;
  name: string;
  color: number[];
  tags: string[];
  shortName?: string;
}

export interface ComponentTag {
  name: string;
  selected: boolean;
}

export interface ComponentTags {
  [tagName: string]: ComponentTag;
}

export interface RQLQuery {
  name: string;
  query: string;
  descriptor?: string;
}

export interface DashScript {
  name: string;
  content: string;
}

export interface BdaStorageData {
  components: StoredComponent[];
  queries: RQLQuery[];
  config: Record<string, unknown>;
  scripts: DashScript[];
}

export interface BdaConfiguration {
  [key: string]: unknown;
  search_autocomplete?: boolean;
  mono_instance?: boolean;
  xml_def_as_tab?: boolean;
  data_source_folder?: string;
  default_methods?: string;
}

export interface ToggleState {
  [key: string]: boolean;
}

export interface XmlDefMetaData {
  componentPath: string;
  timestamp: number;
}

// vis.js types (minimal, for Network and Timeline)
declare global {
  interface Window {
    vis?: {
      Network: new (
        container: HTMLElement,
        data: { nodes: unknown; edges: unknown },
        options?: unknown
      ) => unknown;
      Timeline: new (container: HTMLElement, items: unknown, options?: unknown) => unknown;
      DataSet: new <T>(data?: T[]) => unknown;
    };
    hljs?: {
      highlightElement(element: HTMLElement): void;
      highlightBlock(element: HTMLElement): void;
      registerLanguage(name: string, language: unknown): void;
    };
    vkbeautify?: {
      xml(text: string, step?: number | string): string;
    };
    Bloodhound?: (new (options: {
      datumTokenizer: unknown;
      queryTokenizer: unknown;
      remote?: unknown;
      local?: unknown;
    }) => {
      initialize(): Promise<void>;
      ttAdapter(): unknown;
    }) & {
      tokenizers: { whitespace: (d: string) => string[] };
    };
  }
}

// jQuery plugin extensions
declare global {
  interface JQuery {
    outerHTML(s?: string): string | JQuery;
    adjustToFit($parent: JQuery, targetTotalSize: number, minSize?: number | null): JQuery;
    fullHeight(): number;
    setHeightAndMax(value: number): JQuery;
    toCSV(): string;
    sortContent(selector: string, sortFunction: (a: Element, b: Element) => number): JQuery;
    highlight(pat: string): JQuery;
    removeHighlight(): JQuery;
    bdaAlert(options: BdaAlertOptions): JQuery;
    bdaSearch(options?: { align?: string }): JQuery;
    tablesorter(options?: unknown): JQuery;
    textcomplete(strategies: unknown[], options?: unknown): JQuery;
    typeahead(options: unknown, ...datasets: unknown[]): JQuery;
    select2(options?: unknown): JQuery;
    notify(message: string, options?: unknown): void;
    modal(action?: string | object): JQuery;
    popover(options?: unknown): JQuery;
    tooltip(options?: unknown): JQuery;
    bdaStorage(): JQuery;
    bdaRepository(bda: BDAConfig): JQuery;
    bdaPipeline(): JQuery;
    bdaXmlDef(): JQuery;
    bdaCompConfig(): JQuery;
    bdaPerfMonitor(): JQuery;
    bdajdbc(): JQuery;
    bdaActor(): JQuery;
    bdaToolbar(bda: BDAConfig): JQuery;
    bdaMenu(options: object): JQuery;
    initDASH(bda: BDAConfig): JQuery;
    bdaScheduler(): JQuery;
    bdaDash(): JQuery;
  }

  interface JQueryStatic {
    notify(message: string, options?: unknown): void;
    tablesorter: {
      defaults: {
        sortInitialOrder: string;
      };
    };
  }
}

export interface BdaAlertOptions {
  msg: string;
  options: Array<{
    label: string;
    _callback?: () => void;
  }>;
}

// CodeMirror types extension
declare global {
  interface Window {
    CodeMirror?: unknown;
  }
}
