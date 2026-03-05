/**
 * BDA Repository module
 * Replaces bda.repository.js - RQL editor and repository browser
 */

import {
  isNull,
  logTrace,
  sanitizeXml,
  getCurrentComponentPath,
  getComponentNameFromPath,
  copyToClipboard,
  stringToColour,
  colorToCss,
  processRepositoryXmlDef,
} from '../core/common';
import { bdaStorage } from '../core/storage';

declare const CodeMirror: {
  fromTextArea(element: HTMLTextAreaElement, options: Record<string, unknown>): CodeMirrorEditor;
  Pass: unknown;
  Pos(line: number, ch: number): unknown;
  on(editor: CodeMirrorEditor, event: string, fn: (cm: CodeMirrorEditor) => void): void;
  innerMode(mode: unknown, state: unknown): { state: { tagName?: string } };
};

interface CodeMirrorEditor {
  getValue(): string;
  setValue(val: string): void;
  getDoc(): { getValue(): string; setValue(v: string): void };
  getCursor(): { line: number; ch: number };
  setCursor(line: number, ch: number): void;
  replaceSelection(text: string): void;
  on(event: string, handler: () => void): void;
  showHint(opts: Record<string, unknown>): void;
  getMode(): unknown;
  getTokenAt(pos: unknown): { type: string | null; string: string; state: unknown };
  getRange(from: unknown, to: unknown): string;
  state: { completionActive: boolean };
}

declare const hljs: { highlightBlock(el: HTMLElement): void };

const DEFAULT_DESCRIPTOR: Record<string, string> = {
  OrderRepository: 'order',
  CsrRepository: 'returnRequest',
  ProfileAdapterRepository: 'user',
  ProductCatalog: 'sku',
  InventoryRepository: 'inventory',
  PriceLists: 'price',
};

const CACHE_STAT_TITLE_REGEXP = /item-descriptor=(.*) cache-mode=(.*)( cache-locality=(.*))?/;
const MAP_SEPARATOR = '=';
const LIST_SEPARATOR = ',';

interface PropertyType {
  name: string;
  rdonly?: string;
  derived?: string;
  exportable?: string;
  isId?: boolean;
  itemDesc?: string;
}

interface ItemData {
  [key: string]: string | undefined;
}

export class BdaRepository {
  private editor: CodeMirrorEditor | null = null;
  private descriptorList: string[] | null = null;
  private itemTree = new Map<string, string>();
  private nbItemReceived = 0;
  private readonly xmlDefinitionMaxSize = 150000;
  private readonly edgesToIgnore = ['order', 'relationships', 'orderRef'];

  private readonly repositoryViewSelector = "h2:contains('Examine the Repository, Control Debugging')";
  private readonly cacheUsageSelector = "h2:contains('Cache usage statistics')";
  private readonly propertiesSelector = "h1:contains('Properties')";
  private readonly eventSetsSelector = "h1:contains('Event Sets')";
  private readonly methodsSelector = "h1:contains('Methods')";
  private readonly resultsSelector = "h2:contains('Results:')";
  private readonly errorsSelector1 = "p:contains('Errors:')";
  private readonly errorsSelector2 = "code:contains('*** Query:')";

  private readonly xmlTags = {
    '!top': ['add-item', 'query-items', 'print-item', 'remove-item'],
    '!attrs': {},
    'add-item': { attrs: { 'id': null, 'item-descriptor': null }, children: ['set-property'] },
    'print-item': { attrs: { 'id': null, 'item-descriptor': null }, children: [] },
    'remove-item': { attrs: { 'id': null, 'item-descriptor': null }, children: ['set-property'] },
    'query-items': { attrs: { 'item-descriptor': null, 'id-only': ['true', 'false'] }, children: [] },
    'set-property': { attrs: { name: null }, children: [] },
  };

  isApplicable(): boolean {
    return $("h2:contains('Run XML Operation Tags on the Repository')").length > 0;
  }

  init(): void {
    if (!this.isApplicable()) return;
    console.time('bdaRepository');
    logTrace('BdaRepository init');
    this.setupRepositoryPage();
    console.timeEnd('bdaRepository');
  }

  // -------------------------------------------------------------------------
  // Page setup
  // -------------------------------------------------------------------------

  private setupRepositoryPage(): void {
    const hasErrors = $(this.errorsSelector1).length > 0 || $(this.errorsSelector2).length > 0;
    const hasResults = $(this.resultsSelector).length > 0;

    $('table:eq(0)').attr('id', 'descriptorTable');

    $("<div id='RQLEditor'></div>").insertBefore('h2:first');
    $("<div id='RQLResults'></div>").insertBefore('#RQLEditor');

    if (hasErrors) this.showRqlErrors();
    if (hasResults && !hasErrors) this.showRQLResults();

    $('form:eq(1)').appendTo('#RQLEditor');
    $('form:eq(1)').attr('id', 'RQLForm');
    const $children = $('#RQLForm').children();
    $('#RQLForm').empty().append($children);
    $('textarea[name=xmltext]').attr('id', 'xmltext');

    const actionSelect = `<select id='RQLAction' class='js-example-basic-single' style='width:170px'>
      <optgroup label='Empty queries'>
        <option value='print-item'>print-item</option>
        <option value='query-items'>query-items</option>
        <option value='remove-item'>remove-item</option>
        <option value='add-item'>add-item</option>
        <option value='update-item'>update-item</option>
      </optgroup>
      <optgroup label='Predefined queries'>
        <option value='all'>query-items ALL</option>
        <option value='last_10'>query-items last 10</option>
      </optgroup>
    </select>`;

    $("<div id='RQLToolbar'></div>")
      .append(
        `<div> Action : ${actionSelect} <span id='editor'>` +
        `<span id='itemIdField'>ids : <input type='text' id='itemId' placeholder='Id1,Id2,Id3' /></span>` +
        `<span id='itemDescriptorField'> descriptor : <select id='itemDescriptor' class='itemDescriptor'>${this.getDescriptorOptions()}</select></span>` +
        `<span id='idOnlyField' style='display:none;'><label for='idOnly'>&nbsp;id only : </label><input type='checkbox' id='idOnly' /></span>` +
        `</span>` +
        `<button type='button' id='RQLAdd'>Add</button>` +
        `<button type='button' id='RQLGo'>Add &amp; Enter <i class='fa fa-play fa-x'></i></button>` +
        `</div>`,
      )
      .insertBefore('#RQLEditor textarea')
      .after("<div id='RQLText'></div>");

    $('#xmltext').appendTo('#RQLText');

    $('#RQLText').after(
      "<div id='tabs'>" +
      "<ul id='navbar'>" +
      "<li id='propertiesTab' class='selected'>Properties</li>" +
      "<li id='queriesTab'>Stored Queries</li>" +
      '</ul>' +
      "<div id='storedQueries'><i>No stored query for this repository</i></div>" +
      "<div id='descProperties'><i>Select a descriptor to see his properties</i></div>" +
      '</div>',
    );

    $('#RQLForm input[type=submit]').remove();

    const splitObj = this.getStoredSplitObj();
    const itemByTab = splitObj?.splitValue ?? '10';
    const isChecked = splitObj?.activeSplit ?? false;
    const checkboxSplit = `<input type='checkbox' id='noSplit' ${isChecked ? 'checked' : ''} /> don't split.`;

    $('#tabs').after(
      "<div id='RQLSave'>" +
      `<div style='display:inline-block;width:200px'><button id='clearQuery' type='button'>Clear <i class='fa fa-ban fa-x'></i></button></div>` +
      `<div style='display:inline-block;width:530px'>Split tab every : <input type='text' value='${itemByTab}' id='splitValue'> items. ${checkboxSplit}</div>` +
      `<button type='submit' id='RQLSubmit'>Enter <i class='fa fa-play fa-x'></i></button>` +
      '</div>' +
      `<div><input placeholder='Name this query' type='text' id='queryLabel'>&nbsp;<button type='button' id='saveQuery'>Save <i class='fa fa-save fa-x'></i></button></div>`,
    );

    this.showQueryList();
    this.setupItemTreeForm();
    this.setupItemDescriptorTable();
    this.setupPropertiesTables();

    const defaultDescriptor = DEFAULT_DESCRIPTOR[getComponentNameFromPath(getCurrentComponentPath())];
    if (defaultDescriptor !== undefined) this.showItemPropertyList(defaultDescriptor);

    $('#descProperties').css('display', 'inline-block');
    $('#storedQueries').css('display', 'none');

    this.bindEvents();
    this.setupRepositoryCacheSection();
    this.setupToggleSections();
    this.setupEditableTable();

    this.editor = this.initCodeMirror();

    // Store self reference for callbacks
    (window as unknown as Record<string, unknown>)['_bdaRepository'] = this;

    // Init select2 plugin
    if (typeof ($.fn as unknown as Record<string, unknown>)['select2'] === 'function') {
      ($('#RQLAction') as unknown as { select2(opts: Record<string, unknown>): void }).select2({
        width: 'style',
        minimumResultsForSearch: -1,
      });
      ($('.itemDescriptor') as unknown as { select2(opts: Record<string, unknown>): void }).select2({
        placeholder: 'Select a descriptor',
        allowClear: false,
        width: 'element',
      });
    }

    $('#itemDescriptor').on('change', (e) => {
      this.showItemPropertyList((e.currentTarget as HTMLSelectElement).value);
    });
  }

  private getStoredSplitObj(): { splitValue: string; activeSplit: boolean } | null {
    try {
      const raw = localStorage.getItem('BDA_SplitObj');
      return raw ? JSON.parse(raw) as { splitValue: string; activeSplit: boolean } : null;
    } catch { return null; }
  }

  private storeSplitValue(): void {
    const splitValue = ($('#splitValue').val() as string) ?? '10';
    const activeSplit = !$('#noSplit').is(':checked');
    try { localStorage.setItem('BDA_SplitObj', JSON.stringify({ splitValue, activeSplit })); } catch { /* ignore */ }
  }

  // -------------------------------------------------------------------------
  // Event binding
  // -------------------------------------------------------------------------

  private bindEvents(): void {
    $('#queriesTab').on('click', () => {
      $('#descProperties').css('display', 'none');
      $('#storedQueries').css('display', 'inline-block');
      $('#queriesTab').addClass('selected');
      $('#propertiesTab').removeClass('selected');
    });

    $('#propertiesTab').on('click', () => {
      $('#descProperties').css('display', 'inline-block');
      $('#storedQueries').css('display', 'none');
      $('#propertiesTab').addClass('selected');
      $('#queriesTab').removeClass('selected');
    });

    $('#RQLAction').on('change', () => {
      const action = $('#RQLAction').val() as string;
      if (action === 'print-item' || action === 'remove-item' || action === 'update-item') this.getPrintItemEditor();
      else if (action === 'query-items' || action === 'all' || action === 'last_10') this.getQueryItemsEditor();
      else if (action === 'add-item') this.getAddItemEditor();
    });

    $('#RQLSubmit').on('click', () => this.submitRQLQuery(false));
    $('#RQLGo').on('click', () => this.submitRQLQuery(true));
    $('#RQLAdd').on('click', () => this.addToQueryEditor(this.getRQLQuery()));

    $('#saveQuery').on('click', () => {
      const val = this.getQueryEditorValue().trim();
      const label = ($('#queryLabel').val() as string).trim();
      if (val.length > 0 && label.length > 0) {
        bdaStorage.storeQuery({ name: label, query: val });
        this.showQueryList();
      }
    });

    $('#clearQuery').on('click', () => this.setQueryEditorValue(''));
    $('#noSplit').on('change', () => this.storeSplitValue());
    $('#splitValue').on('change', () => this.storeSplitValue());
  }

  // -------------------------------------------------------------------------
  // Toggle sections
  // -------------------------------------------------------------------------

  private setupToggleSections(): void {
    const toggleObj = bdaStorage.getToggleObj() as Record<string, number>;

    const makeLink = (id: string) =>
      `&nbsp;<a href='javascript:void(0)' id='${id}' class='showMore'>${toggleObj[id] === 1 ? 'Show less...' : 'Show more...'}</a>`;

    $(this.repositoryViewSelector).append(makeLink('showMoreRepositoryView'));
    if (toggleObj['showMoreRepositoryView'] === 0) this.toggleRepositoryView();
    $('#showMoreRepositoryView').on('click', () => this.toggleRepositoryView());

    $(this.cacheUsageSelector).append(makeLink('showMoreCacheUsage'));
    if (toggleObj['showMoreCacheUsage'] !== 1) this.toggleCacheUsage();
    $('#showMoreCacheUsage').on('click', () => this.toggleCacheUsage());

    $(this.propertiesSelector).append(makeLink('showMoreProperties'));
    if (toggleObj['showMoreProperties'] !== 1) this.toggleProperties();
    $('#showMoreProperties').on('click', () => this.toggleProperties());

    $(this.eventSetsSelector).append(makeLink('showMoreEventsSets'));
    if (toggleObj['showMoreEventsSets'] !== 1) this.toggleEventSets();
    $('#showMoreEventsSets').on('click', () => this.toggleEventSets());

    $(this.methodsSelector).append(makeLink('showMoreMethods'));
    if (toggleObj['showMoreMethods'] !== 1) this.toggleMethods();
    $('#showMoreMethods').on('click', () => this.toggleMethods());
  }

  private updateToggleLabel(contentDisplay: string, selector: string): void {
    $(selector).html(contentDisplay === 'none' ? 'Show more...' : 'Show less...');
  }

  private toggleRepositoryView(): void {
    $(this.repositoryViewSelector).next().toggle().next().toggle();
    this.updateToggleLabel($(this.repositoryViewSelector).next().css('display'), '#showMoreRepositoryView');
    bdaStorage.storeToggleState('showMoreRepositoryView', $(this.repositoryViewSelector).next().css('display'));
  }

  private toggleCacheUsage(): void {
    const $cu = $(this.cacheUsageSelector);
    $cu.next().toggle().next().toggle();
    this.updateToggleLabel($cu.next().css('display'), '#showMoreCacheUsage');
    bdaStorage.storeToggleState('showMoreCacheUsage', $cu.next().css('display'));
  }

  private toggleProperties(): void {
    $(this.propertiesSelector).next().toggle();
    this.updateToggleLabel($(this.propertiesSelector).next().css('display'), '#showMoreProperties');
    bdaStorage.storeToggleState('showMoreProperties', $(this.propertiesSelector).next().css('display'));
  }

  private toggleEventSets(): void {
    $(this.eventSetsSelector).next().toggle();
    this.updateToggleLabel($(this.eventSetsSelector).next().css('display'), '#showMoreEventsSets');
    bdaStorage.storeToggleState('showMoreEventsSets', $(this.eventSetsSelector).next().css('display'));
  }

  private toggleMethods(): void {
    $(this.methodsSelector).next().toggle();
    this.updateToggleLabel($(this.methodsSelector).next().css('display'), '#showMoreMethods');
    bdaStorage.storeToggleState('showMoreMethods', $(this.methodsSelector).next().css('display'));
  }

  private toggleRawXml(): void {
    $('#rawXml').toggle();
    $('#rawXmlLink').html($('#rawXml').css('display') === 'none' ? 'show raw XML' : 'hide raw XML');
  }

  // -------------------------------------------------------------------------
  // Descriptor helpers
  // -------------------------------------------------------------------------

  private getDescriptorList(): string[] {
    if (this.descriptorList) return this.descriptorList;
    const descriptors: string[] = [];
    $('table:eq(0) tr th:first-child:not([colspan])')
      .toArray()
      .sort((a, b) => ($(a).text().toLowerCase() > $(b).text().toLowerCase() ? 1 : -1))
      .forEach((el) => descriptors.push($(el).html().trim()));
    this.descriptorList = descriptors;
    return descriptors;
  }

  private getDescriptorOptions(): string {
    const descriptors = this.getDescriptorList();
    const defaultDesc = DEFAULT_DESCRIPTOR[getComponentNameFromPath(getCurrentComponentPath())];
    let opts = defaultDesc === undefined ? '<option></option>' : '';
    descriptors.forEach((d) => {
      opts += `<option value='${d}'${d === defaultDesc ? " selected='selected'" : ''}>${d}</option>\n`;
    });
    return opts;
  }

  private setupItemDescriptorTable(): void {
    const descriptors = this.getDescriptorList();
    const componentURI = window.location.pathname;
    const splitValue = 20;
    let html = `<p>${descriptors.length} descriptors available.</p><div>`;

    descriptors.forEach((d, i) => {
      if (i === 0 || i % splitValue === 0) {
        html += "<table class='descriptorTable'><th>Descriptor</th><th>View</th><th>Debug</th>";
      }
      const rowClass = i % 2 === 0 ? 'even' : 'odd';
      const isDebugEnabled = $(`a[href='${componentURI}?action=clriddbg&itemdesc=${d}#listItemDescriptors']`).length > 0;
      html += `<tr class='${rowClass}'>`;
      html += `<td class='descriptor'>${d}</td>`;
      html += `<td><a class='btn-desc' href='${componentURI}?action=seetmpl&itemdesc=${d}#showProperties'>Properties</a>`;
      html += `&nbsp;<a class='btn-desc' href='${componentURI}?action=seenamed&itemdesc=${d}#namedQuery'>Named queries</a></td>`;
      html += '<td>';
      if (isDebugEnabled) {
        html += `<a class='btn-desc red' href='${componentURI}?action=clriddbg&itemdesc=${d}#listItemDescriptors'>Disable</a>`;
      } else {
        html += `<a class='btn-desc' href='${componentURI}?action=setiddbg&itemdesc=${d}#listItemDescriptors'>Enable</a>`;
        html += `&nbsp;<a class='btn-desc' href='${componentURI}?action=dbgprops&itemdesc=${d}#debugProperties'>Edit</a>`;
      }
      html += '</td></tr>';
      if (i !== 0 && ((i + 1) % splitValue === 0 || i + 1 === descriptors.length)) html += '</table>';
    });

    html += '</div><div style="clear:both" />';
    $('#descriptorTable').remove();
    $(html).insertAfter("a[name='listItemDescriptors']");
  }

  private setupPropertiesTables(): void {
    if ($("a[name=showProperties]").length > 0) {
      $("a[name=showProperties]").next().attr('id', 'propertiesTable');
      $('#propertiesTable').find('tr:nth-child(odd)').addClass('odd');
    }
  }

  private showItemPropertyList(item: string): void {
    logTrace('showItemPropertyList');
    const componentURI = window.location.pathname;
    const url = `${componentURI}?action=seetmpl&itemdesc=${item}#showProperties`;
    $.get(url, (data: string) => {
      const $pTable = $(data).find("a[name='showProperties']").next();
      $pTable.find('th:nth-child(2), td:nth-child(2), th:nth-child(4), td:nth-child(4), th:nth-child(5), td:nth-child(5), th:nth-child(6), td:nth-child(6)').remove();
      $pTable.find('tr').each((_, tr) => {
        $(tr).find('td').each((i, td) => {
          const $td = $(td);
          if (i === 0) {
            $td.html($td.html().replace(/[\w\s']+\((\w+)\)$/i, "<a class='itemPropertyBtn' href='javascript:void(0)'> $1 </a>"));
          } else if (i === 1) {
            $td.text($td.text().replace('Class', ''));
          }
        });
      });
      $('#descProperties').empty().append($pTable);
      $('.itemPropertyBtn').on('click', (e) => {
        const name = $(e.currentTarget).text().trim();
        this.addToQueryEditor(`<set-property name="${name}"><![CDATA[]]></set-property>\n`);
      });
    });
  }

  // -------------------------------------------------------------------------
  // CodeMirror
  // -------------------------------------------------------------------------

  private initCodeMirror(): CodeMirrorEditor | null {
    const el = document.getElementById('xmltext') as HTMLTextAreaElement | null;
    if (!el || typeof CodeMirror === 'undefined') return null;

    const tags = this.xmlTags;

    function completeAfter(cm: CodeMirrorEditor, pred?: () => boolean): unknown {
      const cur = cm.getCursor();
      if (!pred || pred()) {
        setTimeout(() => {
          if (!cm.state.completionActive) cm.showHint({ completeSingle: false });
        }, 100);
      }
      return CodeMirror.Pass;
    }

    const editor = CodeMirror.fromTextArea(el, {
      lineNumbers: false,
      mode: 'xml',
      extraKeys: {
        "'<'": (cm: CodeMirrorEditor) => completeAfter(cm),
        "'/'": (cm: CodeMirrorEditor) => completeAfter(cm, () => {
          const cur = cm.getCursor();
          return cm.getRange(CodeMirror.Pos(cur.line, cur.ch - 1), cur) === '<';
        }),
        "' '": (cm: CodeMirrorEditor) => completeAfter(cm, () => {
          const tok = cm.getTokenAt(cm.getCursor());
          if (tok.type === 'string' && (!/['"]/.test(tok.string.charAt(tok.string.length - 1)) || tok.string.length === 1)) return false;
          return !!CodeMirror.innerMode(cm.getMode(), tok.state).state.tagName;
        }),
        "'='": (cm: CodeMirrorEditor) => completeAfter(cm, () => {
          const tok = cm.getTokenAt(cm.getCursor());
          return !!CodeMirror.innerMode(cm.getMode(), tok.state).state.tagName;
        }),
        'Ctrl-Space': 'autocomplete',
      },
      hintOptions: { schemaInfo: tags },
    });

    if (navigator.userAgent.toLowerCase().includes('firefox')) {
      CodeMirror.on(editor, 'cursorActivity', (cm: CodeMirrorEditor) => {
        if (cm.state.completionActive) cm.showHint({ completeSingle: false });
      });
    }

    return editor;
  }

  // -------------------------------------------------------------------------
  // Query editor
  // -------------------------------------------------------------------------

  addToQueryEditor(query: string): void {
    if (!this.editor) return;
    const cur = this.editor.getCursor();
    if (cur.ch !== 0) this.editor.setCursor(cur.line + 1, 0);
    this.editor.replaceSelection(query);
  }

  private setQueryEditorValue(value: string): void {
    this.editor?.getDoc().setValue(value);
  }

  private getQueryEditorValue(): string {
    return this.editor?.getDoc().getValue() ?? '';
  }

  private getPrintItemEditor(): void { $('#itemIdField').show(); $('#itemDescriptorField').show(); $('#idOnlyField').hide(); }
  private getAddItemEditor(): void { $('#itemIdField').hide(); $('#itemDescriptorField').show(); $('#idOnlyField').hide(); }
  private getQueryItemsEditor(): void { $('#itemIdField').hide(); $('#itemDescriptorField').show(); $('#idOnlyField').show(); }

  private getMultiId(): string[] {
    const ids = ($('#itemId').val() as string).trim();
    return ids.includes(',') ? ids.split(',') : [ids];
  }

  private getRQLQuery(): string {
    const action = $('#RQLAction').val() as string;
    const descriptor = $('#itemDescriptor').val() as string;
    const idOnly = ($('#idOnly').prop('checked') as boolean).toString();

    if (action === 'print-item' || action === 'remove-item') {
      return this.getMultiId().map((id) => `<${action} id="${id.trim()}" item-descriptor="${descriptor}" />\n`).join('');
    } else if (action === 'update-item') {
      return this.getMultiId().map((id) =>
        `<update-item id="${id.trim()}" item-descriptor="${descriptor}" >\n  <set-property name=""><![CDATA[]]></set-property>\n</update-item>\n`,
      ).join('');
    } else if (action === 'add-item') {
      return `<add-item item-descriptor="${descriptor}" >\n  <set-property name=""><![CDATA[]]></set-property>\n</add-item>\n`;
    } else if (action === 'all') {
      return `<query-items item-descriptor="${descriptor}" id-only="${idOnly}">\nALL\n</query-items>\n`;
    } else if (action === 'last_10') {
      return `<query-items item-descriptor="${descriptor}" id-only="${idOnly}">\nALL ORDER BY ID DESC RANGE 0+10\n</query-items>\n`;
    }
    return `<query-items item-descriptor="${descriptor}" id-only="${idOnly}">\n\n</query-items>\n`;
  }

  private submitRQLQuery(addText: boolean): void {
    if (addText) this.setQueryEditorValue(this.getQueryEditorValue() + this.getRQLQuery());
    this.setQueryEditorValue(this.getQueryEditorValue().replace(/repository="[^"]+"/gi, ''));
    this.storeSplitValue();
    location.hash = '#RQLResults';
    $('#RQLForm').trigger('submit');
  }

  // -------------------------------------------------------------------------
  // Stored queries
  // -------------------------------------------------------------------------

  private showQueryList(): void {
    let html = '';
    const rqlQueries = bdaStorage.getStoredRQLQueries();
    const currComponentName = getComponentNameFromPath(getCurrentComponentPath());
    let nbQuery = 0;

    if (rqlQueries && rqlQueries.length > 0) {
      html += '<ul>';
      for (let i = 0; i < rqlQueries.length; i++) {
        const q = rqlQueries[i];
        if (!('repo' in q) || (q as unknown as Record<string, string>)['repo'] === currComponentName) {
          const escapedQuery = $('<div>').text(q.query).html();
          html += `<li class='savedQuery'><a href='javascript:void(0)'>${q.name}</a>`;
          html += `<span id='previewQuery${i}' class='previewQuery'><i class='fa fa-eye'></i></span>`;
          html += `<span id='deleteQuery${i}' class='deleteQuery'><i class='fa fa-trash-o'></i></span>`;
          html += `<span id='queryView${i}' class='queryView'><pre>${escapedQuery}</pre></span></li>`;
          nbQuery++;
        }
      }
      html += '</ul>';
      if (nbQuery > 0) $('#storedQueries').html(html);
    }

    if (typeof hljs !== 'undefined') {
      $('#storedQueries .queryView').each((_, block) => hljs.highlightBlock(block));
    }

    $('.savedQuery').on('click', (e) => {
      const name = $(e.currentTarget).find('a').html();
      const q = bdaStorage.getStoredRQLQueries().find((q) => q.name === name);
      if (q) this.setQueryEditorValue(q.query + '\n');
    });

    $('.previewQuery').on('mouseenter', function () {
      $(this).parent('li').find('span.queryView').show();
    }).on('mouseleave', function () {
      $(this).parent('li').find('span.queryView').hide();
    });

    $('.deleteQuery').on('click', (e) => {
      const index = parseInt(e.currentTarget.id.replace('deleteQuery', ''));
      bdaStorage.deleteQuery(index);
      this.reloadQueryList();
    });
  }

  private reloadQueryList(): void {
    $('#storedQueries').empty();
    this.showQueryList();
  }

  // -------------------------------------------------------------------------
  // RQL Results
  // -------------------------------------------------------------------------

  private showRQLResults(): void {
    logTrace('Start showRQLResults');
    $('#RQLResults').append("<p><a href='javascript:void(0)' id='rawXmlLink'>Show raw xml</a></p>\n<p id='rawXml'></p>");

    let xmlContent = $(this.resultsSelector).next().text().trim();
    xmlContent = sanitizeXml(xmlContent);

    processRepositoryXmlDef('definitionFiles', ($xmlDef) => {
      const log = this.showXMLAsTab(xmlContent, $xmlDef as JQuery | null, $('#RQLResults'), false);
      this.showRQLLog(log, false);

      $(this.resultsSelector).next().appendTo('#rawXml');
      $(this.resultsSelector).remove();

      $('#rawXmlLink').on('click', () => {
        this.toggleRawXml();
        const xmlSize = $('#rawXml pre').html()?.length ?? 0;
        if (xmlSize < this.xmlDefinitionMaxSize) {
          if (typeof hljs !== 'undefined') $('#rawXml').each((_, block) => hljs.highlightBlock(block));
        } else if ($('#xmlHighlight').length === 0) {
          $("<p id='xmlHighlight' />")
            .html('The XML result is big. XML highlight disabled. <br><button id="xmlHighlightBtn">Highlight XML now</button>')
            .prependTo('#rawXml');
          $('#xmlHighlightBtn').on('click', () => {
            if (typeof hljs !== 'undefined') $('#rawXml pre').each((_, block) => hljs.highlightBlock(block));
          });
        }
      });

      $('.copyLink').on('click', function () {
        const id = ($(this).attr('id') ?? '').replace('link_', '').replace(/(:|\.|\[|\]|,)/g, '\\$1');
        $(`#${id}`).toggle();
        $(`#text_${id}`).toggle();
      });
    });
  }

  private showRqlErrors(): void {
    let error = '';
    if ($(this.errorsSelector1).length > 0) {
      error = $(this.errorsSelector1).next().text();
      $(this.resultsSelector).next().remove();
      $(this.resultsSelector).remove();
      $(this.errorsSelector1).next().remove();
      $(this.errorsSelector1).remove();
    } else {
      error = $(this.errorsSelector2).text();
    }
    error = error.split('\n').filter((l) => !(l.trim().startsWith('<') && l.trim().endsWith('>'))).join('\n');
    this.showRQLLog(error, true);
  }

  private showRQLLog(log: string, error: boolean): void {
    if (log && log.length > 0) {
      $("<h3>Execution log</h3><div id='RQLLog'></div>").insertAfter('#RQLResults');
      $('#RQLLog').html(log.replace(/\n{2,}/g, '\n').replace(/------ /g, '').trim());
    }
    if (error) $('#RQLLog').addClass('error');
  }

  // -------------------------------------------------------------------------
  // XML Tab rendering
  // -------------------------------------------------------------------------

  private escapeHTML(s: string): string {
    return String(s).replace(/&(?!\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private isPropertyId(propertyName: string, $itemDesc: JQuery): string | null {
    let isId: string | null = null;
    let propertyFound = false;
    $itemDesc.find(`property[name=${propertyName}]`).each((_, el) => {
      propertyFound = true;
      const $p = $(el);
      if ($p.attr('item-type') !== undefined && $p.attr('repository') === undefined) isId = $p.attr('item-type') ?? null;
      else if ($p.attr('component-item-type') !== undefined && $p.attr('repository') === undefined) isId = $p.attr('component-item-type') ?? null;
    });
    if (propertyFound && isId === null) return 'FOUND_NOT_ID';
    return isId;
  }

  private isTypeId(propertyName: string, itemDesc: string, $xmlDef: JQuery | null): string | null {
    if (!$xmlDef) return null;
    let $itemDesc = $xmlDef.find(`item-descriptor[name='${itemDesc}']`);
    let isId = this.isPropertyId(propertyName, $itemDesc);
    if (isId === 'FOUND_NOT_ID') return null;
    if (isId !== null) return isId;
    let superType = $itemDesc.attr('super-type');
    while (superType !== undefined && isId === null) {
      const $parent = $xmlDef.find(`item-descriptor[name='${superType}']`);
      isId = this.isPropertyId(propertyName, $parent);
      superType = $parent.attr('super-type');
    }
    return isId === 'FOUND_NOT_ID' ? null : isId;
  }

  private parseRepositoryId(id: string): string[] {
    const result: string[] = [];
    if (!id.includes(MAP_SEPARATOR) && !id.includes(LIST_SEPARATOR)) {
      result.push(id);
    } else if (!id.includes(MAP_SEPARATOR)) {
      id.split(LIST_SEPARATOR).forEach((part, i) => { if (i !== 0) result.push(LIST_SEPARATOR); result.push(part); });
    } else {
      id.split(LIST_SEPARATOR).forEach((entry, a) => {
        if (a !== 0) result.push(LIST_SEPARATOR);
        entry.split(MAP_SEPARATOR).forEach((val, b) => { if (b !== 0) result.push(MAP_SEPARATOR); result.push(val); });
      });
    }
    return result;
  }

  private renderProperty(curProp: PropertyType, propValue: string | undefined, itemId: string | undefined, isItemTree: boolean): string {
    const td = `<td data-property='${curProp.name}' data-item-id='${itemId ?? ''}'>`;
    if (propValue === null || propValue === undefined) {
      return `${td}<i class='fa fa-pencil-square-o' aria-hidden='true'></i></td>`;
    }
    propValue = propValue.replace(/ /g, '●');
    if (curProp.name === 'descriptor') propValue = propValue.substring(1);
    const baseId = `${curProp.name}_${itemId}`;

    if (curProp.name === 'id') return `<td id='${baseId}'>${propValue}</td>`;

    if (propValue.length > 25) {
      return `${td}<a class='copyLink' href='javascript:void(0)' title='Show all' id='link_${baseId}'><span id='${baseId}'>${this.escapeHTML(propValue.substring(0, 25))}...</span></a><textarea class='copyField' id='text_${baseId}' readonly>${propValue}</textarea></td>`;
    }

    if (curProp.isId === true) {
      const parts = this.parseRepositoryId(propValue);
      let html = td;
      parts.forEach((p) => {
        if (p !== MAP_SEPARATOR && p !== LIST_SEPARATOR) {
          html += isItemTree
            ? `<a class='clickable_property' href='#id_${p}'>${p}</a>`
            : `<a class='clickable_property loadable_property' data-id='${p}' data-descriptor='${curProp.itemDesc ?? ''}'>${p}</a>`;
        } else html += p;
      });
      return html + '</td>';
    }

    if (curProp.name === 'descriptor' || curProp.rdonly === 'true' || curProp.derived === 'true') return `<td>${propValue}</td>`;
    return `${td}<i class='fa fa-pencil-square-o' aria-hidden='true'></i>${propValue}</td>`;
  }

  private renderTab(itemDesc: string, types: PropertyType[], datas: ItemData[], tabId: string, isItemTree: boolean): string {
    let html = `<table class='dataTable' data-descriptor='${itemDesc.substring(1)}'${isItemTree ? ` id='${tabId}'` : ''}>`;
    types.forEach((curProp, i) => {
      let extra = curProp.name === 'id' ? ' id' : curProp.name === 'descriptor' ? ' descriptor' : '';
      html += `<tr class='${i % 2 === 0 ? 'even' : 'odd'}${extra}'>`;
      html += `<th>${curProp.name}<span class='prop_name'>`;
      if (curProp.rdonly === 'true') html += "<div class='prop_attr prop_attr_red'>R</div>";
      if (curProp.derived === 'true') html += "<div class='prop_attr prop_attr_green'>D</div>";
      if (curProp.exportable === 'true') html += "<div class='prop_attr prop_attr_blue'>E</div>";
      html += '</span></th>';
      datas.forEach((d) => { html += this.renderProperty(curProp, d[curProp.name], d['id'], isItemTree); });
      html += '</tr>';
    });
    return html + '</table>';
  }

  private showXMLAsTab(xmlContent: string, $xmlDef: JQuery | null, $outputDiv: JQuery, isItemTree: boolean): string {
    console.time('renderTab');
    const xmlDoc = $.parseXML(`<xml>${xmlContent}</xml>`);
    const $xml = $(xmlDoc as unknown as Document);
    const $addItems = $xml.find('add-item');

    const log = $(`<xml>${xmlContent}</xml>`).children().remove().end().text().trim();

    const types: Record<string, PropertyType[]> = {};
    const typesNames: Record<string, string[]> = {};
    const datas: Record<string, ItemData[]> = {};
    let nbTypes = 0;

    $addItems.each((_, item) => {
      const $item = $(item);
      const curItemDesc = '_' + ($item.attr('item-descriptor') ?? '');
      if (!types[curItemDesc]) types[curItemDesc] = [];
      if (!typesNames[curItemDesc]) typesNames[curItemDesc] = [];
      if (!datas[curItemDesc]) { datas[curItemDesc] = []; nbTypes++; }

      const curData: ItemData = {};
      $item.find('set-property').each((_, prop) => {
        const $p = $(prop);
        const name = $p.attr('name') ?? '';
        curData[name] = $p.text();
        if (!typesNames[curItemDesc].includes(name)) {
          const typeItemDesc = this.isTypeId(name, curItemDesc.substring(1), $xmlDef);
          types[curItemDesc].push({
            name, rdonly: $p.attr('rdonly'), derived: $p.attr('derived'), exportable: $p.attr('exportable'),
            isId: typeItemDesc !== null, itemDesc: typeItemDesc ?? undefined,
          });
          typesNames[curItemDesc].push(name);
        }
      });

      if (!typesNames[curItemDesc].includes('descriptor')) { types[curItemDesc].unshift({ name: 'descriptor' }); typesNames[curItemDesc].push('descriptor'); }
      if (!typesNames[curItemDesc].includes('id')) { types[curItemDesc].unshift({ name: 'id' }); typesNames[curItemDesc].push('id'); }
      curData['descriptor'] = curItemDesc;
      curData['id'] = $item.attr('id');
      datas[curItemDesc].push(curData);
    });

    let html = `<p class='nbResults'>${$addItems.length} items in ${nbTypes} descriptor(s)</p>`;
    const splitObj = this.getStoredSplitObj();
    let splitValue = splitObj?.activeSplit === false ? parseInt(splitObj.splitValue) : 0;

    for (const itemDesc in datas) {
      if (splitValue === 0) splitValue = datas[itemDesc].length;
      let nbTab = 0;
      if (datas[itemDesc].length <= splitValue) {
        html += this.renderTab(itemDesc, types[itemDesc], datas[itemDesc], itemDesc.substring(1), isItemTree);
      } else {
        while (splitValue * nbTab < datas[itemDesc].length) {
          const start = splitValue * nbTab;
          html += this.renderTab(itemDesc, types[itemDesc], datas[itemDesc].slice(start, Math.min(start + splitValue, datas[itemDesc].length)), `${itemDesc}_${nbTab}`, isItemTree);
          nbTab++;
        }
      }
    }

    $outputDiv.append(html);
    $outputDiv.prepend(
      "<div class='prop_attr prop_attr_red'>R</div> : read-only " +
      "<div class='prop_attr prop_attr_green'>D</div> : derived " +
      "<div class='prop_attr prop_attr_blue'>E</div> : export is false",
    );

    if ($('.copyField').length > 0) {
      $outputDiv.find('p.nbResults').append("<br><a href='javascript:void(0)' class='showFullTextLink'>Show full text</a>");
      $outputDiv.find('.showFullTextLink').on('click', function () {
        $('.copyField').each((_, el) => $(el).parent().html($(el).html()));
        $(this).hide();
      });
    }

    $('.loadable_property').on('click', (e) => {
      const $elm = $(e.currentTarget);
      const id = $elm.attr('data-id') ?? '';
      const desc = $elm.attr('data-descriptor') ?? '';
      const query = `<print-item id='${id}' item-descriptor='${desc}' />\n`;
      ($('body') as unknown as { bdaAlert?(opts: unknown): void }).bdaAlert?.({
        msg: `You are about to add this query and reload the page: \n${query}`,
        options: [
          { label: 'Add & Reload', _callback: () => { this.setQueryEditorValue(this.getQueryEditorValue() + query); $('#RQLForm').trigger('submit'); } },
          { label: 'Just Add', _callback: () => { this.setQueryEditorValue(this.getQueryEditorValue() + query); } },
          { label: 'Cancel' },
        ],
      });
    });

    if (isItemTree) this.createSpeedbar();
    console.timeEnd('renderTab');
    return log;
  }

  // -------------------------------------------------------------------------
  // Editable table
  // -------------------------------------------------------------------------

  private setupEditableTable(): void {
    $('body').on('click', '.dataTable .fa-pencil-square-o', function (event) {
      const $target = $(event.target).parent();
      const initialValue = $target.text().replace(/●/g, ' ');
      $target.html(`<input type="text" value="${initialValue}" />`);
      const $input = $($target.children()[0] as HTMLInputElement);
      $input.trigger('focus').on('blur', function () {
        const $t = $(this);
        const descriptor = $t.parents('.dataTable').attr('data-descriptor') ?? '';
        const itemId = $t.parent().attr('data-item-id') ?? '';
        const propertyName = $t.parent().attr('data-property') ?? '';
        if (propertyName === 'id' || propertyName === 'descriptor') {
          $input.parent().html($input.val() as string);
          return;
        }
        const newValue = $t.val() as string;
        const query = `<update-item id="${itemId}" item-descriptor="${descriptor}">\n  <set-property name="${propertyName}"><![CDATA[${newValue}]]></set-property>\n</update-item>`;
        if (confirm(`You are about to execute this query: \n${query}`)) {
          jQuery.post(document.location.href, `xmltext=${query}`, (res: string) => {
            const errMsg = $(res).find('code').text().trim();
            if ($(res).text().includes('Errors:')) {
              console.error('Update error:', errMsg);
              $input.parent().html(`<i class="fa fa-pencil-square-o"></i>${initialValue}`);
            } else {
              $input.parent().html(`<i class="fa fa-pencil-square-o"></i>${newValue}`);
            }
          });
        } else {
          $input.parent().html(`<i class="fa fa-pencil-square-o"></i>${initialValue}`);
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // Item Tree
  // -------------------------------------------------------------------------

  private setupItemTreeForm(): void {
    $("<div id='itemTree' />").insertAfter('#RQLEditor');
    const $itemTree = $('#itemTree');
    $itemTree.append('<h2>Get Item Tree</h2>');
    $itemTree.append(
      '<p>This tool will recursively retrieve items and print the result with the chosen output.' +
      '<br> For example, if you give an order ID in the form below, you will get all shipping groups, payment groups, commerceItems, priceInfo... of the given order' +
      '<br><b> Be careful when using this tool on a live instance ! Set a low max items value.</b></p>',
    );
    $itemTree.append(
      "<div id='itemTreeForm'>" +
      "id : <input type='text' id='itemTreeId' /> &nbsp;" +
      "descriptor : <span id='itemTreeDescriptorField'><select id='itemTreeDesc' class='itemDescriptor'>" +
      this.getDescriptorOptions() +
      "</select></span>" +
      "max items : <input type='text' id='itemTreeMax' value='50' />&nbsp;<br><br>" +
      "output format : <select id='itemTreeOutput'>" +
      "<option value='HTMLtab'>HTML tab</option>" +
      "<option value='addItem'>add-item XML</option>" +
      "<option value='removeItem'>remove-item XML</option>" +
      "<option value='printItem'>print-item XML</option>" +
      "<option value='tree'>Tree (experimental)</option>" +
      "</select>&nbsp;" +
      "<input type='checkbox' id='printRepositoryAttr' /><label for='printRepositoryAttr'>Print attribute : </label>" +
      `<pre style='margin:0; display:inline;'>repository='${getCurrentComponentPath()}'</pre> <br><br>` +
      "<button id='itemTreeBtn'>Enter <i class='fa fa-play fa-x'></i></button>" +
      '</div>',
    );
    $itemTree.append("<div id='itemTreeInfo' />");
    $itemTree.append("<div id='itemTreeResult' />");

    $('#itemTreeBtn').on('click', () => {
      this.getItemTree(
        ($('#itemTreeId').val() as string).trim(),
        $('#itemTreeDesc').val() as string,
        parseInt($('#itemTreeMax').val() as string),
        $('#itemTreeOutput').val() as string,
        $('#printRepositoryAttr').is(':checked'),
      );
    });
  }

  private getItemTree(id: string, descriptor: string, maxItem: number, outputType: string, printRepoAttr: boolean): void {
    $('#itemTreeResult').empty();
    $('#itemTreeInfo').empty();
    if (!id) { $('#itemTreeInfo').html('<p>Please provide a valid ID</p>'); return; }
    console.time('getItemTree');
    $('#itemTreeInfo').html('<p>Getting XML definition of this repository...</p>');
    processRepositoryXmlDef('definitionFiles', ($xmlDef) => {
      if (!$xmlDef) { $('#itemTreeInfo').html('<p>Unable to parse XML definition of this repository!</p>'); return; }
      this.itemTree = new Map();
      this.nbItemReceived = 0;
      this.getSubItems([{ id, desc: descriptor }], $xmlDef as JQuery, maxItem, outputType, printRepoAttr);
    });
  }

  private getSubItems(items: { id: string; desc: string }[], $xmlDef: JQuery, maxItem: number, outputType: string, printRepoAttr: boolean): void {
    if (this.nbItemReceived >= maxItem) return;
    let xmlText = '';
    let batchSize = 0;
    for (let i = 0; i < items.length; i++) {
      if (this.nbItemReceived + i >= maxItem) break;
      xmlText += `<print-item id='${items[i].id}' item-descriptor='${items[i].desc}' />\n`;
      batchSize++;
    }
    if (batchSize === 0) return;

    $.ajax({
      type: 'POST', url: document.URL, data: { xmltext: xmlText },
      success: (result: string) => {
        let rawXml = $(result).find('code').html() ?? '';
        const tab = rawXml.split('\n');
        tab.splice(0, 2);
        rawXml = `<xml>${tab.join('\n').trim().replace(/&lt;/g, '<').replace(/&gt;/g, '>')}</xml>`;
        try {
          const xmlDoc = jQuery.parseXML(rawXml);
          this.nbItemReceived += $(xmlDoc).find('add-item').length;
          $('#itemTreeInfo').html(`<p>${this.nbItemReceived} items retrieved</p>`);

          const subItems: { id: string; desc: string }[] = [];
          $(xmlDoc).find('add-item').each((_, el) => {
            const $item = $(el);
            const itemId = $item.attr('id') ?? '';
            if (!this.itemTree.has(itemId)) {
              this.itemTree.set(itemId, el.outerHTML);
              const desc = $item.attr('item-descriptor') ?? '';
              let $itemDesc = $xmlDef.find(`item-descriptor[name=${desc}]`);
              let superType = $itemDesc.attr('super-type');
              while (superType !== undefined) {
                const $parent = $xmlDef.find(`item-descriptor[name=${superType}]`);
                $itemDesc = $itemDesc.add($parent);
                superType = $parent.attr('super-type');
              }
              $itemDesc.find('property[item-type]').each((_, p) => {
                const $p = $(p);
                if ($p.attr('repository') === undefined) {
                  const subId = $item.find(`set-property[name=${$p.attr('name')}]`).text();
                  if (subId.length > 0 && !this.itemTree.has(subId)) subItems.push({ id: subId, desc: $p.attr('item-type') ?? '' });
                }
              });
              $itemDesc.find('property[component-item-type]').each((_, p) => {
                const $p = $(p);
                if ($p.attr('repository') === undefined) {
                  const subId = $item.find(`set-property[name=${$p.attr('name')}]`).text();
                  if (subId.length > 0) {
                    this.parseRepositoryId(subId)
                      .filter((v) => v !== MAP_SEPARATOR && v !== LIST_SEPARATOR && !this.itemTree.has(v))
                      .forEach((v) => subItems.push({ id: v, desc: $p.attr('component-item-type') ?? '' }));
                  }
                }
              });
            }
          });

          if (subItems.length > 0 && this.nbItemReceived < maxItem) this.getSubItems(subItems, $xmlDef, maxItem, outputType, printRepoAttr);
          else this.renderItemTreeTab(outputType, printRepoAttr, $xmlDef, maxItem);
        } catch { this.renderItemTreeTab(outputType, printRepoAttr, $xmlDef, maxItem); }
      },
    });
  }

  private renderItemTreeTab(outputType: string, printRepoAttr: boolean, $xmlDef: JQuery, maxItem: number): void {
    if (this.nbItemReceived >= maxItem) console.warn('Item tree stopped: max items reached:', maxItem);
    $('#itemTreeInfo').empty();
    $('#itemTreeResult').empty();
    const componentPath = getCurrentComponentPath();

    if (outputType !== 'HTMLtab' && outputType !== 'tree') {
      $('#itemTreeInfo').append("<input type='button' id='itemTreeCopyButton' value='Copy result to clipboard' />");
      $('#itemTreeCopyButton').on('click', () => copyToClipboard($('#itemTreeResult').text()));
    }

    if (outputType === 'addItem') {
      let res = '';
      this.itemTree.forEach((data) => {
        if (printRepoAttr) {
          try {
            const xmlDoc = jQuery.parseXML(data);
            const $item = $(xmlDoc).find('add-item');
            $item.attr('repository', componentPath);
            res += ($item[0] as Element | undefined)?.outerHTML ?? '';
          } catch { res += data; }
        } else res += data;
        res += '\n\n';
      });
      $('#itemTreeResult').append('<pre />').find('pre').text(`<import-items>\n${res}\n</import-items>`);
    } else if (outputType === 'HTMLtab') {
      let allXml = '';
      this.itemTree.forEach((data) => { allXml += data; });
      this.showXMLAsTab(allXml, $xmlDef, $('#itemTreeResult'), true);
    } else if (outputType === 'removeItem' || outputType === 'printItem') {
      let res = '';
      this.itemTree.forEach((data) => {
        try {
          const xmlDoc = jQuery.parseXML(data);
          const $item = $(xmlDoc).find('add-item');
          const tag = outputType === 'removeItem' ? 'remove-item' : 'print-item';
          res += `<${tag} id="${$item.attr('id')}" item-descriptor="${$item.attr('item-descriptor')}"${printRepoAttr ? ` repository='${componentPath}'` : ''} />\n`;
        } catch { /* ignore */ }
      });
      $('#itemTreeResult').append('<pre />').find('pre').text(res);
    } else if (outputType === 'tree') {
      this.renderAsTree($xmlDef);
    }
    console.timeEnd('getItemTree');
  }

  private renderAsTree($xmlDef: JQuery): void {
    const vis = (window as unknown as Record<string, unknown>)['vis'] as {
      DataSet: new () => { add(obj: unknown): void };
      Network: new (el: HTMLElement, data: unknown, opts: unknown) => { on(ev: string, fn: (p: { nodes: number[] }) => void): void };
    } | undefined;
    if (!vis) return;

    const nodes = new vis.DataSet();
    const edges = new vis.DataSet();
    const itemIdToVisId: Record<string, number> = {};
    let i = 0;
    this.itemTree.forEach((_, id) => { itemIdToVisId[id] = i++; });

    this.itemTree.forEach((data, id) => {
      try {
        const xmlDoc = $.parseXML(`<xml>${data}</xml>`);
        const $xml = $(xmlDoc as unknown as Document);
        const $addItem = $xml.find('add-item').first();
        const itemDesc = $addItem.attr('item-descriptor') ?? '';
        const itemId = $addItem.attr('id') ?? '';

        $addItem.children().each((_, propEl) => {
          const $p = $(propEl);
          const pName = $p.attr('name') ?? '';
          const pVal = $p.text();
          if (!this.edgesToIgnore.includes(pName)) {
            const isId = this.isTypeId(pName, itemDesc, $xmlDef);
            if (isId !== null) {
              this.parseRepositoryId(pVal).filter((v) => v !== ',' && v !== '=' && itemIdToVisId[v] !== undefined)
                .forEach((v) => edges.add({ from: itemIdToVisId[itemId], to: itemIdToVisId[v], arrows: 'to', title: pName }));
            }
          }
        });

        nodes.add({ id: itemIdToVisId[itemId], label: `${itemDesc}\n${itemId}`, color: colorToCss(stringToColour(itemDesc)), shape: 'box' });
      } catch { /* ignore */ }
    });

    const $container = $('#itemTreeResult').empty().append("<div id='treeContainer' style='height:600px;'></div>");
    const container = document.getElementById('treeContainer');
    if (!container) return;
    const network = new vis.Network(container, { nodes, edges }, {});
    network.on('click', (params) => {
      if (params.nodes?.length > 0) {
        const visId = params.nodes[0];
        const itemId = Object.keys(itemIdToVisId).find((k) => itemIdToVisId[k] === visId);
        if (itemId) {
          const data = this.itemTree.get(itemId);
          if (data) this.showXMLAsTab(data, null, $('#treeInfo'), false);
        }
      }
    });
  }

  private createSpeedbar(): void {
    let html = "<a class='close' href='javascript:void(0)'><i class='fa fa-times'></i></a><p>Quick links :</p><ul>";
    $('#itemTreeResult .dataTable').each((_, table) => {
      const id = $(table).attr('id') ?? '';
      const name = id.includes('_') ? id.split('_')[1] : id;
      const nbItem = Math.floor($(table).find('td').length / $(table).find('tr').length);
      html += `<li><i class='fa fa-arrow-right'></i>&nbsp;&nbsp;<a href='#${id}'>${name.trim()} (${nbItem})</a></li>`;
    });
    html += '</ul>';
    $('#itemTreeInfo').append(`<div id='speedbar'><div id='widget' class='sticky'>${html}</div></div>`);
    $('#speedbar .close').on('click', () => $('#speedbar').fadeOut(200));
    const stickyTop = $('.sticky').offset()?.top ?? 0;
    $(window).on('scroll', () => {
      if (stickyTop < ($(window).scrollTop() ?? 0)) $('.sticky').css({ position: 'fixed', top: 100 });
      else $('.sticky').css('position', 'static');
    });
  }

  // -------------------------------------------------------------------------
  // Cache section
  // -------------------------------------------------------------------------

  private setupRepositoryCacheSection(): void {
    try {
      console.time('setupRepositoryCacheSection');
      const $cacheUsage = $(this.cacheUsageSelector);
      const $cacheTable = $cacheUsage.next().next().find('table');
      if ($cacheTable.length === 0) return;

      $cacheTable.addClass('cache').removeAttr('border');
      const $header = $cacheTable.find('tr').first().detach();
      $('<thead></thead>').prependTo($cacheTable).append($header);

      let index = 0;
      $cacheTable.find('tr').each((_, tr) => { if ((index - 1) % 3 === 0) $(tr).addClass('odd cache-subheader'); index++; });

      this.setupCacheCollapse($header, $cacheTable);

      const $resetLink = $cacheUsage.next();
      const $buttons = $('<div></div>').appendTo($resetLink);
      $('<button></button>', { id: 'cacheExpandAll', class: 'cache expand', html: 'Expand All' })
        .on('click', () => { $cacheTable.find('tr.cache-subheader.collapsed').each((_, el) => this.toggleCacheLine(el)); })
        .appendTo($buttons);
      $('<button></button>', { id: 'collapseAll', class: 'cache collapse', html: 'Collapse All' })
        .on('click', () => { $cacheTable.find('tr.cache-subheader.expanded').each((_, el) => this.toggleCacheLine(el)); })
        .appendTo($buttons);
      $('<button></button>', { id: 'exportCSV', class: 'cache export', html: 'Export as CSV' })
        .on('click', () => this.exportCacheStatsAsCSV($cacheTable))
        .appendTo($buttons);

      $cacheTable.addClass('fixed_headers');
      $cacheTable.find('.cache-subheader').each((_, el) => {
        $(el).addClass('collapsed').next().css('display', 'none').next().css('display', 'none');
      });

      console.timeEnd('setupRepositoryCacheSection');
    } catch (err) { console.error(err); }
  }

  private setupCacheCollapse($header: JQuery, $cacheTable: JQuery): void {
    $cacheTable.find('.cache-subheader').each((_, el) => {
      const $tr = $(el);
      const $td = $tr.find('td').first();
      $td.attr('colspan', 23);
      const $queryCols = $tr.next().next().children('td');
      if ($queryCols.length === 1) $queryCols.attr('colspan', 23);

      const text = $td.find('b:contains("item-descriptor")').first().text();
      const match = CACHE_STAT_TITLE_REGEXP.exec(text);
      if (match) {
        const [, itemDesc = '', cacheMode = '', , cacheLocality = ''] = match;
        $tr.attr('data-item-desc', itemDesc).attr('data-cache-mode', cacheMode).attr('data-cache-locality', cacheLocality);
        $td.html(
          `<span class="cacheArrow"><i class="up fa fa-arrow-right"></i></span>` +
          `<span> item-descriptor=<b>${itemDesc}</b></span>` +
          `<span> cache-mode=<b>${cacheMode}</b></span>` +
          (cacheLocality ? `<span> cache-locality=<b>${cacheLocality}</b></span>` : ''),
        );
      }
      $tr.on('click', () => this.toggleCacheLine(el));
    });
  }

  private toggleCacheLine(el: HTMLElement): void {
    const $tr = $(el);
    if ($tr.hasClass('collapsed')) {
      $tr.removeClass('collapsed').addClass('expanded').next().show().next().show();
    } else {
      $tr.removeClass('expanded').addClass('collapsed').next().hide().next().hide();
    }
  }

  private exportCacheStatsAsCSV($cacheTable: JQuery): void {
    let csv = '';
    $cacheTable.find('tr').each((_, tr) => {
      const row: string[] = [];
      $(tr).find('th, td').each((_, td) => row.push(`"${$(td).text().trim().replace(/"/g, '""')}"`));
      csv += row.join(',') + '\n';
    });
    copyToClipboard(csv);
  }
}
