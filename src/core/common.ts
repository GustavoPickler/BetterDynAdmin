/**
 * BDA Common utilities
 * Replaces bda.common.js - ES module with named exports instead of globals
 */

import type { BdaAlertOptions, ComponentTag, ComponentTags } from '../types/global';
import { BdaModal } from './modal';

export const isLoggingTrace = false;
export const xmlDefinitionCacheTimeout = 1200; // 20min

// ---------------------------------------------------------------------------
// String utilities (replaces prototype pollution)
// ---------------------------------------------------------------------------

export function formatString(template: string, ...args: unknown[]): string {
  return template.replace(/{(\d+)}/g, (match, number: string) => {
    const idx = parseInt(number, 10);
    return typeof args[idx] !== 'undefined' ? String(args[idx]) : match;
  });
}

export function truncateString(str: string, n: number): string {
  return str.substring(0, n - 1) + (str.length > n ? '\u2026' : '');
}

// ---------------------------------------------------------------------------
// Null / type checks
// ---------------------------------------------------------------------------

export function isNull(object: unknown): boolean {
  return object === null || object === undefined;
}

// ---------------------------------------------------------------------------
// Array utilities
// ---------------------------------------------------------------------------

export function buildArray(stringIn: string): string[] {
  const cleaned = stringIn.replace(/[ \t]/g, '').replace(/,,+/g, ',');
  if (cleaned !== '') return cleaned.split(',');
  return [];
}

export function buildTagsFromArray(tagNames: string[], defaultValue: boolean | null): ComponentTags {
  const value = defaultValue !== null ? defaultValue : false;
  const tags: ComponentTags = {};
  for (const tagName of tagNames) {
    const tag: ComponentTag = { selected: value, name: tagName };
    tags[tagName] = tag;
  }
  logTrace('buildTagsFromArray ' + JSON.stringify(tags));
  return tags;
}

export function unique<T>(array: T[]): T[] {
  const seen: Record<string, boolean> = {};
  const result: T[] = [];
  for (const item of array) {
    const key = String(item);
    if (!seen[key]) {
      seen[key] = true;
      result.push(item);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// String comparison / sorting
// ---------------------------------------------------------------------------

export function stringCompare(a: string | null, b: string | null): number {
  if (a !== null && b !== null) return a.localeCompare(b, 'en', { caseFirst: 'upper' });
  if (b !== null) return -1;
  return 0;
}

export function compareAttr(a: Element, b: Element, attr: string): number {
  const aVal = (a as Element).getAttribute(attr);
  const bVal = (b as Element).getAttribute(attr);
  return stringCompare(aVal, bVal);
}

export function compareAttrFc(attr: string): (a: Element, b: Element) => number {
  return (a, b) => compareAttr(a, b, attr);
}

export function sortArray(array: string[]): string[] {
  logTrace('beforeSort : ' + array);
  const sorted = [...array].sort(stringCompare);
  logTrace('after sort : ' + sorted);
  return sorted;
}

// ---------------------------------------------------------------------------
// Path / URL utilities
// ---------------------------------------------------------------------------

export function purgeSlashes(str: string): string {
  return str.replace(/([^:/])\/\/+/g, '$1/');
}

export function getCurrentComponentPath(): string {
  return purgeSlashes(document.location.pathname.replace('/dyn/admin/nucleus', ''));
}

export function getComponentNameFromPath(componentPath: string): string {
  let path = componentPath;
  if (path[path.length - 1] === '/') path = path.substring(0, path.length - 1);
  const tab = path.split('/');
  return tab[tab.length - 1];
}

export function getComponentShortName(componentName: string): string {
  let shortName = '';
  for (const character of componentName) {
    if (character === character.toUpperCase() && character !== '.') shortName += character;
  }
  return shortName;
}

export function extendComponentPath(path: string): string {
  let res = path;
  if (!res.startsWith('/dyn/admin/nucleus/')) res = '/dyn/admin/nucleus/' + res;
  if (!res.endsWith('/')) res = res + '/';
  return purgeSlashes(res);
}

export function endsWith(str: string, suffix: string): boolean {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

// ---------------------------------------------------------------------------
// Logging / tracing
// ---------------------------------------------------------------------------

export function logTrace(...args: unknown[]): void {
  if (isLoggingTrace) console.log(...args);
}

export function traceTime(name: string): void {
  if (isLoggingTrace) console.time(name);
}

export function traceTimeEnd(name: string): void {
  if (isLoggingTrace) console.timeEnd(name);
}

// ---------------------------------------------------------------------------
// Clipboard
// ---------------------------------------------------------------------------

export function copyToClipboard(text: string): void {
  GM_setClipboard(text);
  ($ as JQueryStatic).notify('Data has been added to your clipboard', {
    position: 'top center',
    className: 'success',
  });
}

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

export function colorToCss(colors: number[]): string {
  return 'rgb(' + colors.join(',') + ')';
}

export function verifyColor(colors: number[]): number[] {
  return colors.map((c) => (c > 210 ? 210 : c));
}

export function stringToColour(str: string): number[] {
  const colors: number[] = [];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    const hexVal = ('00' + value.toString(16)).substr(-2);
    colors.push(parseInt(hexVal, 16));
  }
  return verifyColor(colors);
}

// ---------------------------------------------------------------------------
// XML utilities
// ---------------------------------------------------------------------------

export function processRepositoryXmlDef(
  property: string,
  callback: (($xmlDoc: JQuery | null) => void) | undefined,
): void {
  if (callback === undefined) return;

  const rawXmlDef = getXmlDef(getCurrentComponentPath());
  if (rawXmlDef !== null) {
    logTrace('Getting XML def from cache');
    const xmlDoc = jQuery.parseXML(rawXmlDef);
    callback($(xmlDoc) as unknown as JQuery);
    return;
  }

  const url =
    location.protocol +
    '//' +
    location.host +
    location.pathname +
    '?propertyName=' +
    property;
  logTrace(url);

  jQuery.ajax({
    url,
    success(result: string) {
      const $result = $(result);
      if ($result.find('pre').length > 0) {
        let raw = $result
          .find('pre')
          .html()
          .trim()
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace('&nbsp;', '')
          .replace(
            '<!DOCTYPE gsa-template SYSTEM "dynamosystemresource:/atg/dtds/gsa/gsa_1.0.dtd">',
            '',
          );
        try {
          logTrace('XML def length : ' + raw.length);
          const xmlDoc = jQuery.parseXML(raw);
          storeXmlDef(getCurrentComponentPath(), raw);
          callback($(xmlDoc) as unknown as JQuery);
        } catch (err) {
          logTrace('Unable to parse XML def file !');
          callback(null);
          logTrace(err);
        }
      } else {
        callback(null);
      }
    },
  });
}

export function getXmlDef(componentPath: string): string | null {
  logTrace('Getting XML def for : ' + componentPath);
  const timestamp = Math.floor(Date.now() / 1000);
  const raw = localStorage.getItem('XMLDefMetaData');
  if (!raw) return null;
  const xmlDefMetaData = JSON.parse(raw) as { componentPath: string; timestamp: number };
  if (
    xmlDefMetaData.componentPath !== componentPath ||
    xmlDefMetaData.timestamp + xmlDefinitionCacheTimeout < timestamp
  ) {
    logTrace('Xml def is outdated or from a different component');
    return null;
  }
  return localStorage.getItem('XMLDefData');
}

export function storeXmlDef(componentPath: string, rawXML: string): void {
  logTrace('Storing XML def : ' + componentPath);
  const timestamp = Math.floor(Date.now() / 1000);
  localStorage.setItem('XMLDefMetaData', JSON.stringify({ componentPath, timestamp }));
  localStorage.setItem('XMLDefData', rawXML);
}

export function highlightAndIndentXml($elm: JQuery): void {
  traceTime('highlightAndIndentXml');
  logTrace('Start highlightAndIndentXml');

  $elm.each(function () {
    const escapeXML = $(this).html();
    const div = document.createElement('div');
    div.innerHTML = escapeXML;
    let unescapeXML = div.textContent ?? '';
    unescapeXML = window.vkbeautify?.xml(unescapeXML, 2) ?? unescapeXML;

    const $codeBlock = $(this)
      .empty()
      .append("<code class='xml'></code>")
      .find('code')
      .text(unescapeXML);

    logTrace($codeBlock.get(0));
    if (window.hljs && $codeBlock.get(0)) {
      window.hljs.highlightElement($codeBlock.get(0) as HTMLElement);
    }

    $codeBlock
      .find(
        "span.hljs-attribute:contains('jndi'), span.hljs-attribute:contains('repository')",
      )
      .each(function () {
        const $value = $(this).next();
        const url = '/dyn/admin/nucleus' + $value.text().replace(/"/g, '');
        $value.wrap("<a target='_blank' class='clickable' href='" + url + "' ></a>");
        $value.append("<i class='fa fa-external-link'></i>");
      });
  });

  traceTimeEnd('highlightAndIndentXml');
}

export function sanitizeXml(xmlContent: string): string {
  console.time('sanitizeXml');
  const regexp =
    /<\!--(.*)(<set\-property.*><\!\[CDATA\[[\S\s]*?\]\]\><\/set\-property\>).*-->/gi;
  const xmlStr = xmlContent.replace(regexp, (_str, p1: string, p2: string) => {
    let attributes = 'set-property ';
    if (p1.indexOf('derived') !== -1) attributes += 'derived="true" ';
    if (p1.indexOf('rdonly') !== -1) attributes += 'rdonly="true" ';
    if (p1.indexOf('export') !== -1) attributes += 'export="true" ';
    return p2.replace('set-property', attributes);
  });
  console.timeEnd('sanitizeXml');
  return xmlStr;
}

// ---------------------------------------------------------------------------
// Object utilities
// ---------------------------------------------------------------------------

export function index(obj: Record<string, unknown>, i: string): unknown {
  return obj[i];
}

export function subProp(o: Record<string, unknown>, s: string): unknown {
  return s.split('.').reduce((acc, key) => (acc as Record<string, unknown>)[key], o as unknown);
}

export function convertAddItemToPlainObject($item: JQuery): Record<string, string> {
  const o: Record<string, string> = {};
  o['itemDescriptor'] = $item.attr('item-descriptor') ?? '';
  o['id'] = $item.attr('id') ?? '';
  $item.find('set-property').each(function () {
    const $row = $(this);
    o[$row.attr('name') ?? ''] = $row.text();
  });
  return o;
}

// ---------------------------------------------------------------------------
// jQuery extensions
// ---------------------------------------------------------------------------

export function registerJQueryExtensions(): void {
  $.fn.outerHTML = function (s?: string): string | JQuery {
    if (s !== undefined) return this.before(s).remove();
    return $('<p>').append(this.eq(0).clone()).html();
  };

  $.fn.adjustToFit = function (
    $parent: JQuery,
    targetTotalSize: number,
    minSize?: number | null,
  ): JQuery {
    const curSize = ($parent as JQuery).fullHeight();
    const delta = targetTotalSize - curSize;
    let hThis = parseFloat(this.css('height').replace('px', ''));
    hThis += delta;
    if (!isNull(minSize) && minSize !== undefined && minSize !== null) {
      hThis = Math.max(minSize, hThis);
    }
    this.setHeightAndMax(hThis);
    return this;
  };

  $.fn.fullHeight = function (): number {
    const h = parseFloat(this.css('height').replace('px', ''));
    const mBot = parseFloat(this.css('margin-bottom').replace('px', ''));
    const mTop = parseFloat(this.css('margin-top').replace('px', ''));
    return h + mTop + mBot;
  };

  $.fn.setHeightAndMax = function (value: number): JQuery {
    this.css('max-height', value + 'px');
    this.css('height', value + 'px');
    return this;
  };

  $.fn.toCSV = function (): string {
    const data: string[][] = [];
    $(this)
      .find('tr')
      .each(function (_, elem) {
        const $tr = $(elem);
        const line: string[] = [];
        $tr.children('th').each(function () { line.push($(this).text()); });
        $tr.children('td').each(function () { line.push($(this).text()); });
        if (line.length > 0) data.push(line);
      });
    return data.map((row) => row.join(';')).join('\n');
  };

  $.fn.sortContent = function (
    selector: string,
    sortFunction: (a: Element, b: Element) => number,
  ): JQuery {
    const $this = $(this);
    let $elems = $this.find(selector);
    logTrace('selector ' + selector);
    logTrace($elems.length);
    $elems = $(Array.from($elems).sort(sortFunction));
    $elems.detach().appendTo($this);
    return this;
  };

  $.fn.highlight = function (pat: string): JQuery {
    function innerHighlight(node: Node, patUpper: string): number {
      let skip = 0;
      if (node.nodeType === 3) {
        const textNode = node as Text;
        const pos = (textNode.data ?? '').toUpperCase().indexOf(patUpper);
        if (pos >= 0) {
          const spannode = document.createElement('span');
          spannode.className = 'highlight';
          const middlebit = textNode.splitText(pos);
          middlebit.splitText(patUpper.length);
          const middleclone = middlebit.cloneNode(true);
          spannode.appendChild(middleclone);
          middlebit.parentNode?.replaceChild(spannode, middlebit);
          skip = 1;
        }
      } else if (
        node.nodeType === 1 &&
        (node as Element).childNodes &&
        !/(script|style)/i.test((node as Element).tagName)
      ) {
        for (let i = 0; i < node.childNodes.length; ++i) {
          i += innerHighlight(node.childNodes[i], patUpper);
        }
      }
      return skip;
    }
    return this.length && pat && pat.length
      ? this.each(function () { innerHighlight(this, pat.toUpperCase()); })
      : this;
  };

  $.fn.removeHighlight = function (): JQuery {
    return this.find('span.highlight')
      .each(function () {
        const parent = this.parentNode;
        if (parent) {
          parent.replaceChild(this.firstChild!, this);
          parent.normalize();
        }
      })
      .end();
  };

  // BDA Alert plugin
  const pluginName = 'bdaAlert';

  ($.fn as unknown as Record<string, unknown>)[pluginName] = function (this: JQuery, options: BdaAlertOptions) {
    try {
      return this.each(function () {
        const modal = new BdaModal({
          content: options.msg,
          closeOnBackdrop: false,
          buttons: options.options.map((opt) => ({
            label: opt.label,
            callback: opt._callback,
          })),
        });
        modal.show();
      });
    } catch (e) {
      console.error(e);
    }
    return this;
  };
}

// ---------------------------------------------------------------------------
// Arrow rotation helpers
// ---------------------------------------------------------------------------

export function rotateArrow($arrow: JQuery): void {
  if ($arrow.hasClass('fa-arrow-down'))
    $arrow.removeClass('fa-arrow-down').addClass('fa-arrow-up');
  else $arrow.removeClass('fa-arrow-up').addClass('fa-arrow-down');
}

export function rotateArrowQuarter($arrow: JQuery): void {
  if ($arrow.hasClass('fa-arrow-down'))
    $arrow.removeClass('fa-arrow-down').addClass('fa-arrow-right');
  else $arrow.removeClass('fa-arrow-right').addClass('fa-arrow-down');
}

// ---------------------------------------------------------------------------
// Debounce
// ---------------------------------------------------------------------------

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number,
  immediate = false,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function (...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}
