// Type definitions for Greasemonkey/Tampermonkey GM_* APIs

declare function GM_getResourceText(resourceName: string): string;
declare function GM_getResourceURL(resourceName: string): string;
declare function GM_addStyle(css: string): void;
declare function GM_setClipboard(text: string): void;
declare function GM_getValue(name: string, defaultValue?: unknown): unknown;
declare function GM_setValue(name: string, value: unknown): void;
declare function GM_deleteValue(name: string): void;

declare const GM_info: {
  script: {
    name: string;
    version: string;
    description: string;
    namespace: string;
    [key: string]: unknown;
  };
  scriptMetaStr: string;
  scriptHandler: string;
  version: string;
};
