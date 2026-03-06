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

    $("<div id='RQLEditor' class='bda-card'></div>").insertBefore('h2:first');
    $("<div id='RQLResults'></div>").insertBefore('#RQLEditor');

    if (hasErrors) this.showRqlErrors();
    if (hasResults && !hasErrors) this.showRQLResults();

    $('form:eq(1)').appendTo('#RQLEditor');
    $('form:eq(1)').attr('id', 'RQLForm');
    const $children = $('#RQLForm').children();
    $('#RQLForm').empty().append($children);
    $('textarea[name=xmltext]').attr('id', 'xmltext');

    const actionSelect = `<select id='RQLAction' class='bda-select js-example-basic-single' style='width:170px'>
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

    // Remove the original ATG h2 heading (replaced by styled header below)
    $("h2:contains('Run XML Operation Tags on the Repository')").remove();

    // Dark section header for XML operations
    $("<div class='bda-section-header bda-section-header--dark'><h3 class='bda-section-header__title'><i class='fa fa-terminal'></i> Run XML Operation Tags on the Repository</h3></div>")
      .prependTo('#RQLEditor');

    $("<div id='RQLToolbar'></div>")
      .append(
        `<div class='bda-input-field'><label class='bda-input-field__label'>Action</label>${actionSelect}</div>` +
        `<div class='bda-input-field' id='itemIdField'><label class='bda-input-field__label'>IDs</label><input type='text' id='itemId' class='bda-input' placeholder='Id1, Id2, Id3' /></div>` +
        `<div class='bda-input-field' id='itemDescriptorField'><label class='bda-input-field__label'>Descriptor</label><select id='itemDescriptor' class='bda-select itemDescriptor'>${this.getDescriptorOptions()}</select></div>` +
        `<span id='idOnlyField' style='display:none;'><label for='idOnly'>&nbsp;id only : </label><input type='checkbox' id='idOnly' /></span>` +
        `<div style='display:flex;gap:8px;align-items:flex-end;padding-bottom:2px'>` +
        `<button type='button' id='RQLAdd' class='bda-btn bda-btn--secondary'>Add</button>` +
        `<button type='button' id='RQLGo' class='bda-btn bda-btn--primary'>Add &amp; Enter <i class='fa fa-play'></i></button>` +
        `</div>`,
      )
      .insertBefore('#RQLEditor textarea')
      .after("<div id='RQLText'></div>");

    $('#xmltext').appendTo('#RQLText');

    $('#RQLText').after(
      "<div id='tabs'>" +
      "<ul id='navbar' class='bda-tabs'>" +
      "<li id='propertiesTab' class='bda-tabs__item bda-tabs__item--active'>Properties</li>" +
      "<li id='queriesTab' class='bda-tabs__item'>Stored Queries</li>" +
      '</ul>' +
      "<div id='storedQueries'><div class='bda-empty-state'><p>No saved queries yet</p><p class='bda-empty-state__hint'>Use \"Name this query\" below and click Save</p></div></div>" +
      "<div id='descProperties'><i>Select a descriptor to see his properties</i></div>" +
      '</div>',
    );

    // Wrap CodeMirror + Properties/Queries in a grid container
    const $editorGrid = $('<div class="bda-rql-editor-grid"></div>');
    $('#RQLText').before($editorGrid);
    $editorGrid.append($('#RQLText'), $('#tabs'));

    $('#RQLForm input[type=submit]').remove();

    const splitObj = this.getStoredSplitObj();
    const itemByTab = splitObj?.splitValue ?? '10';
    const isChecked = splitObj?.activeSplit ?? false;
    const checkboxSplit = `<input type='checkbox' id='noSplit' ${isChecked ? 'checked' : ''} /> don't split.`;

    $editorGrid.after(
      "<div id='RQLSave'>" +
      `<button id='clearQuery' type='button' class='bda-btn'>Clear <i class='fa fa-ban'></i></button>` +
      `<span class='rql-split-label'>Split tab every: <input type='text' value='${itemByTab}' id='splitValue' class='bda-input rql-split-input'> items. ${checkboxSplit}</span>` +
      `<input placeholder='Name this query' type='text' id='queryLabel' class='bda-input rql-name-input'>` +
      `<button type='button' id='saveQuery' class='bda-btn'>Save <i class='fa fa-save'></i></button>` +
      `<button type='submit' id='RQLSubmit' class='bda-btn bda-btn--primary'>Enter <i class='fa fa-play'></i></button>` +
      '</div>',
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
      $('#queriesTab').addClass('selected bda-tabs__item--active');
      $('#propertiesTab').removeClass('selected bda-tabs__item--active');
    });

    $('#propertiesTab').on('click', () => {
      $('#descProperties').css('display', 'inline-block');
      $('#storedQueries').css('display', 'none');
      $('#propertiesTab').addClass('selected bda-tabs__item--active');
      $('#queriesTab').removeClass('selected bda-tabs__item--active');
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

    // Keyboard shortcuts
    $(document).on('keydown.bdaRepo', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        this.submitRQLQuery(false);
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        $('#saveQuery').trigger('click');
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.setQueryEditorValue('');
      }
    });
  }

  // -------------------------------------------------------------------------
  // Toggle sections
  // -------------------------------------------------------------------------

  private setupToggleSections(): void {
    const toggleObj = bdaStorage.getToggleObj() as Record<string, number>;

    const makeToggleBtn = (id: string) =>
      `<button id='${id}' class='bda-btn bda-btn--outline bda-btn--sm bda-toggle-btn'>${toggleObj[id] === 1 ? 'Show less...' : 'Show more...'}</button>`;

    // --- Repository View — wrap h2 + its siblings in a section card ---
    const $rvH2 = $(this.repositoryViewSelector);
    if ($rvH2.length > 0) {
      const $rvCard = $('<div class="bda-section-card"></div>');
      const $rvHeader = $('<div class="bda-section-card__header"></div>');
      $rvHeader.append('<h2><i class="fa fa-eye"></i> Examine the Repository, Control Debugging</h2>');
      $rvHeader.append(makeToggleBtn('showMoreRepositoryView'));

      const $rvBody = $('<div class="bda-section-card__body"></div>');
      // Collect all siblings between this h2 and the next major section
      let $next = $rvH2.next();
      while ($next.length > 0 && !$next.is('h1, h2, #itemTree, #RQLEditor, .bda-cache-card, .bda-section-card')) {
        const $move = $next;
        $next = $next.next();
        $rvBody.append($move);
      }

      $rvCard.append($rvHeader, $rvBody);
      $rvH2.before($rvCard);
      $rvH2.remove();

      // Default collapsed
      if (toggleObj['showMoreRepositoryView'] !== 1) $rvBody.hide();
      $('#showMoreRepositoryView').on('click', () => this.toggleSection('showMoreRepositoryView', 'showMoreRepositoryView'));
    }

    // --- Cache Usage (toggle the .bda-cache-card body) ---
    // The toggle button is added to the cache card header (built in setupRepositoryCacheSection)
    const $cacheCardHeader = $('.bda-cache-header__actions');
    if ($cacheCardHeader.length) {
      $(makeToggleBtn('showMoreCacheUsage')).prependTo($cacheCardHeader);
    } else {
      $(this.cacheUsageSelector).append(makeToggleBtn('showMoreCacheUsage'));
    }
    if (toggleObj['showMoreCacheUsage'] !== 1) this.toggleCacheUsage();
    $('#showMoreCacheUsage').on('click', () => this.toggleCacheUsage());

    // --- Properties, Event Sets, Methods (h1-based, will be wrapped in card later) ---
    // DON'T toggle at setup time — normalizeAtgSectionTables will wrap these in cards.
    // Instead, mark the h1 with data-bda-collapsed so the card wrapper can set initial state.

    $(this.propertiesSelector).append(makeToggleBtn('showMoreProperties'));
    const $propsTable = $(this.propertiesSelector).next('table');
    if ($propsTable.length > 0) {
      this.simplifyClassNames($propsTable);
      this.simplifyPropertyType($propsTable);
      this.formatAttributes($propsTable);
      this.normalizeLegacyTable($propsTable);
    }
    if (toggleObj['showMoreProperties'] !== 1) $(this.propertiesSelector).attr('data-bda-collapsed', 'true');
    $('#showMoreProperties').on('click', () => this.toggleProperties());

    $(this.eventSetsSelector).append(makeToggleBtn('showMoreEventsSets'));
    if (toggleObj['showMoreEventsSets'] !== 1) $(this.eventSetsSelector).attr('data-bda-collapsed', 'true');
    $('#showMoreEventsSets').on('click', () => this.toggleEventSets());

    $(this.methodsSelector).append(makeToggleBtn('showMoreMethods'));
    if (toggleObj['showMoreMethods'] !== 1) $(this.methodsSelector).attr('data-bda-collapsed', 'true');
    $('#showMoreMethods').on('click', () => this.toggleMethods());
  }

  private updateToggleLabel(contentDisplay: string, selector: string): void {
    $(selector).html(contentDisplay === 'none' ? 'Show more...' : 'Show less...');
  }

  /**
   * Find the toggleable content for a section.
   * After normalizeAtgSectionTables() runs, the h1 is replaced by a .bda-section-card
   * with .bda-section-card__body. We look for the card body first, then fall back
   * to the old .next() approach for non-card pages.
   */
  private findToggleContent(btnId: string): JQuery {
    const $btn = $(`#${btnId}`);
    const $card = $btn.closest('.bda-section-card');
    if ($card.length > 0) {
      return $card.find('.bda-section-card__body');
    }
    // Fallback for non-card (h1/h2 based) structure
    return $btn.parent().next();
  }

  private toggleSection(btnId: string, storageKey: string): void {
    const $content = this.findToggleContent(btnId);
    $content.toggle();
    const display = $content.css('display');
    this.updateToggleLabel(display, `#${btnId}`);
    bdaStorage.storeToggleState(storageKey, display);
  }

  private toggleRepositoryView(): void {
    this.toggleSection('showMoreRepositoryView', 'showMoreRepositoryView');
  }

  private toggleCacheUsage(): void {
    const $cacheBody = $('.bda-cache-card .bda-cache-body');
    if ($cacheBody.length > 0) {
      $cacheBody.toggle();
      this.updateToggleLabel($cacheBody.css('display'), '#showMoreCacheUsage');
      bdaStorage.storeToggleState('showMoreCacheUsage', $cacheBody.css('display'));
    } else {
      // Fallback for non-card structure
      const $cu = $(this.cacheUsageSelector);
      $cu.next().toggle().next().toggle();
      this.updateToggleLabel($cu.next().css('display'), '#showMoreCacheUsage');
      bdaStorage.storeToggleState('showMoreCacheUsage', $cu.next().css('display'));
    }
  }

  private toggleProperties(): void {
    this.toggleSection('showMoreProperties', 'showMoreProperties');
  }

  private toggleEventSets(): void {
    this.toggleSection('showMoreEventsSets', 'showMoreEventsSets');
  }

  private toggleMethods(): void {
    this.toggleSection('showMoreMethods', 'showMoreMethods');
  }

  private toggleRawXml(): void {
    $('#rawXml').toggle();
    const visible = $('#rawXml').is(':visible');
    $('#rawXmlLink').html(visible ? "<i class='fa fa-code'></i> Hide raw XML" : "<i class='fa fa-code'></i> Show raw XML");
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

    let html = '<div id="bdaDescriptorCard" style="padding:16px">';
    html += `<div style="margin-bottom:12px"><span class="bda-badge bda-badge--info">${descriptors.length} descriptors</span></div>`;
    html += '<div style="background:var(--bda-slate-50);border-radius:var(--bda-radius-md);border:1px solid var(--bda-slate-200);margin:0;overflow:hidden">';

    // Table header
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;padding:10px 16px;background:var(--bda-slate-100);border-bottom:1px solid var(--bda-slate-200)">';
    html += '<div style="font-size:11px;font-weight:600;color:var(--bda-slate-500);text-transform:uppercase;letter-spacing:0.05em">Descriptor</div>';
    html += '<div style="font-size:11px;font-weight:600;color:var(--bda-slate-500);text-transform:uppercase;letter-spacing:0.05em">View</div>';
    html += '<div style="font-size:11px;font-weight:600;color:var(--bda-slate-500);text-transform:uppercase;letter-spacing:0.05em">Debug</div>';
    html += '</div>';

    // Table body
    html += '<div style="max-height:500px;overflow-y:auto">';
    descriptors.forEach((d) => {
      const isDebugEnabled = $(`a[href='${componentURI}?action=clriddbg&itemdesc=${d}#listItemDescriptors']`).length > 0;
      html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;padding:10px 16px;border-bottom:1px solid var(--bda-slate-100);align-items:center;transition:background 0.15s" onmouseover="this.style.background='var(--bda-white)'" onmouseout="this.style.background='transparent'">`;
      html += `<div><span style="font-family:var(--bda-font-mono);font-size:var(--bda-font-size-sm);color:var(--bda-slate-700)">${d}</span></div>`;
      html += `<div style="display:flex;gap:8px"><a class='bda-btn bda-btn--outline bda-btn--sm' href='${componentURI}?action=seetmpl&itemdesc=${d}#showProperties'>Properties</a>`;
      html += `<a class='bda-btn bda-btn--outline bda-btn--sm' href='${componentURI}?action=seenamed&itemdesc=${d}#namedQuery'>Named queries</a></div>`;
      html += '<div style="display:flex;gap:8px">';
      if (isDebugEnabled) {
        html += `<a class='bda-btn bda-btn--outline bda-btn--sm' href='${componentURI}?action=clriddbg&itemdesc=${d}#listItemDescriptors'><i class='fa fa-toggle-on'></i> Disable</a>`;
      } else {
        html += `<a class='bda-btn bda-btn--outline bda-btn--sm' href='${componentURI}?action=setiddbg&itemdesc=${d}#listItemDescriptors'><i class='fa fa-toggle-off'></i> Enable</a>`;
        html += `<a class='bda-btn bda-btn--outline bda-btn--sm' href='${componentURI}?action=dbgprops&itemdesc=${d}#debugProperties'><i class='fa fa-pencil'></i> Edit</a>`;
      }
      html += '</div></div>';
    });
    html += '</div></div></div>';

    $('#descriptorTable').remove();
    $(html).insertAfter("a[name='listItemDescriptors']");
  }

  private setupPropertiesTables(): void {
    if ($("a[name=showProperties]").length > 0) {
      $("a[name=showProperties]").next().attr('id', 'propertiesTable');
      this.simplifyClassNames($('#propertiesTable'));
      this.simplifyPropertyType($('#propertiesTable'));
      this.formatAttributes($('#propertiesTable'));
      this.normalizeLegacyTable($('#propertiesTable'));
    }
  }

  private simplifyClassNames($table: JQuery): void {
    $table.find('td').each((_, td) => {
      const $td = $(td);
      const text = $td.text().trim();
      if (text.includes('.') && /^[\w.]+$/.test(text)) {
        const simpleName = text.split('.').pop() ?? text;
        $td.text(simpleName).attr('title', text);
      }
    });
  }

  private formatAttributes($table: JQuery): void {
    $table.find('td').each((_, td) => {
      const $td = $(td);
      const text = $td.text().trim();
      if (/^\{.*\}$/.test(text) && text.includes('=')) {
        const entries = text.slice(1, -1).split(',').map(s => s.trim());
        const html = entries
          .filter(entry => {
            const val = entry.split('=')[1] ?? '';
            return val !== 'false';
          })
          .map(entry => {
            const [key, val] = entry.split('=');
            const label = (key ?? '').replace(/^template\./, '');
            const value = val ?? '';
            const cls = value === 'true' ? 'bda-attr-true' : '';
            return `<span class="bda-attr ${cls}" title="${key}=${value}">${label}</span>`;
          })
          .join(' ');
        $td.html(html);
      }
    });
  }

  private normalizeLegacyTable($table: JQuery): void {
    $table.addClass('bda-section-table').removeAttr('style').removeAttr('bgcolor').removeAttr('background');
    $table.find('tr, td, th').removeAttr('bgcolor').removeAttr('background').removeAttr('valign').removeAttr('style');
    $table.find('tr:first-child td, tr:first-child th').addClass('bda-section-table__header');
    $table.find('tr.even td, tr.even th').addClass('bda-section-table__alt');
  }

  private simplifyPropertyType($table: JQuery): void {
    $table.find('td').each((_, td) => {
      const $td = $(td);
      const text = $td.text().trim();
      const enumMatch = text.match(/^(\w+)\s+as one of\s+\[([^\]]+)\]$/i);
      if (enumMatch) {
        const values = enumMatch[2].split(',').map(s => s.trim());
        const isBool = values.length === 2 && values.includes('true') && values.includes('false');
        if (isBool) {
          $td.text('Boolean');
        } else {
          const valuesHtml = values.map(v => `<span class="bda-enum-value">${v}</span>`).join(' ');
          $td.html(`<span class="bda-enum-toggle" title="Click to expand">Enum</span><div class="bda-enum-values">${valuesHtml}</div>`);
          $td.find('.bda-enum-toggle').on('click', function () {
            $(this).next('.bda-enum-values').toggle();
          });
        }
      }
    });
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
            // Wrap the property name text (first text node) as a clickable link
            const propName = $td.contents().first().text().trim();
            if (propName) {
              $td.contents().first().replaceWith(`<a class='propQueryBtn' href='javascript:void(0)' title='Query by ${propName}'>${propName}</a>`);
            }
          } else if (i === 1) {
            const classText = $td.text().replace('Class', '').trim();
            const simpleName = classText.includes('.') ? (classText.split('.').pop() ?? classText) : classText;
            $td.text(simpleName).attr('title', classText);
          }
        });
      });
      this.simplifyClassNames($pTable);
      this.simplifyPropertyType($pTable);
      this.formatAttributes($pTable);
      $('#descProperties').empty().append($pTable);
      $('.itemPropertyBtn').on('click', (e) => {
        const name = $(e.currentTarget).text().trim();
        this.addToQueryEditor(`<set-property name="${name}"><![CDATA[]]></set-property>\n`);
      });
      $('.propQueryBtn').on('click', (e) => {
        const propName = $(e.currentTarget).text().trim();
        const query = `<query-items item-descriptor="${item}" id-only="false">\n${propName}=""\n</query-items>\n`;
        this.setQueryEditorValue(query);
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
    const current = this.editor.getDoc().getValue().trimEnd();
    const newValue = current ? `${current}\n\n${query}` : query;
    this.editor.getDoc().setValue(newValue);
    const lines = newValue.split('\n');
    this.editor.setCursor(lines.length - 1, 0);
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
          html += `<span class='bda-query-actions'>`;
          html += `<span id='previewQuery${i}' class='previewQuery' title='Preview query'><i class='fa fa-eye'></i></span>`;
          html += `<span id='deleteQuery${i}' class='deleteQuery' title='Delete query'><i class='fa fa-trash-o'></i></span>`;
          html += `</span>`;
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

    $('.savedQuery > a').on('click', (e) => {
      const name = $(e.currentTarget).html();
      const q = bdaStorage.getStoredRQLQueries().find((q) => q.name === name);
      if (q) this.setQueryEditorValue(q.query + '\n');
    });

    $('.previewQuery').on('mouseenter', function () {
      $(this).closest('li').find('span.queryView').show();
    }).on('mouseleave', function () {
      $(this).closest('li').find('span.queryView').hide();
    });

    $('.deleteQuery').on('click', (e) => {
      e.stopPropagation();
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

    // Hide original ATG result text immediately so it doesn't flash
    const $atgResult = $(this.resultsSelector).next();
    $atgResult.hide();

    let xmlContent = $atgResult.text().trim();
    xmlContent = sanitizeXml(xmlContent);

    processRepositoryXmlDef('definitionFiles', ($xmlDef) => {
      const log = this.showXMLAsTab(xmlContent, $xmlDef as JQuery | null, $('#RQLResults'), false);
      this.showRQLLog(log, false);

      // Build structured raw XML viewer
      const rawText = $atgResult.text();
      this.buildRawXmlViewer(rawText);
      $atgResult.remove();
      $(this.resultsSelector).remove();

      $('#rawXmlLink').on('click', () => {
        this.toggleRawXml();
      });
    });
  }

  private buildRawXmlViewer(rawText: string): void {
    // Parse items from raw ATG output
    const items: Array<{ id: string; descriptor: string; content: string }> = [];
    const parts = rawText.split(/------\s*Printing item with id:\s*/);

    parts.forEach((part) => {
      const trimmed = part.trim();
      if (!trimmed) return;

      // Extract ID from the first line
      const firstLine = trimmed.split('\n')[0].trim();
      const restContent = trimmed.substring(firstLine.length).trim();

      // Try to extract descriptor from <add-item item-descriptor="xxx">
      const descMatch = restContent.match(/item-descriptor="([^"]+)"/);
      const descriptor = descMatch ? descMatch[1] : 'unknown';
      const id = firstLine || 'unknown';

      items.push({ id, descriptor, content: restContent || trimmed });
    });

    const $rawXml = $('<div id="rawXml"></div>');

    // Toolbar
    const $toolbar = $('<div class="bda-rawxml-toolbar"></div>');
    $toolbar.append(
      `<span class="bda-rawxml-toolbar__title"><i class="fa fa-code"></i> Raw XML <span class="bda-desc-card__count">${items.length} item(s)</span></span>`,
    );
    $toolbar.append(
      '<div class="bda-rawxml-search"><i class="fa fa-search"></i><input type="text" class="bda-input" placeholder="Search by ID..." /></div>',
    );
    $rawXml.append($toolbar);

    // Body with items
    const $body = $('<div class="bda-rawxml-body"></div>');

    if (items.length === 0) {
      // Fallback: just show raw text
      $body.append($('<div class="bda-rawxml-item__content"></div>').text(rawText));
    } else {
      items.forEach((item, i) => {
        const $item = $(`<div class="bda-rawxml-item" data-item-id="${item.id}"></div>`);
        const $header = $(`<div class="bda-rawxml-item__header">
          <i class="fa fa-chevron-right"></i>
          <span class="bda-rawxml-item__desc">${item.descriptor}</span>
          <span style="color:var(--bda-slate-400)">&bull;</span>
          <span class="bda-rawxml-item__id">${item.id}</span>
        </div>`);
        const $content = $('<div class="bda-rawxml-item__content"></div>').text(item.content).hide();

        $header.on('click', function () {
          $content.toggle();
          $(this).find('i').toggleClass('fa-chevron-right fa-chevron-down');
        });

        $item.append($header).append($content);
        $body.append($item);
      });
    }

    $rawXml.append($body);

    // Search
    $toolbar.find('input').on('input', function () {
      const term = ($(this).val() as string).toLowerCase();
      $body.find('.bda-rawxml-item').each(function () {
        const id = ($(this).attr('data-item-id') ?? '').toLowerCase();
        $(this).toggle(!term || id.includes(term));
      });
    });

    $('#RQLResults .bda-desc-grid').before($rawXml);
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

  private formatPropertyName(name: string): string {
    // "FINALORDERNUMBER" → "finalordernumber", "camelCase" stays
    const lower = /^[A-Z_]+$/.test(name) ? name.toLowerCase() : name;
    return lower
      // camelCase splits: "finalOrderNumber" → "final Order Number"
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(/[\s_]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

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

  private renderTab(itemDesc: string, types: PropertyType[], datas: ItemData[], tabId: string, isItemTree: boolean): string {
    const descName = itemDesc.substring(1);
    let html = '';

    datas.forEach((d, di) => {
      const itemId = d['id'] ?? '';
      const cardId = `bda-desc-${descName}-${itemId}-${di}`;

      html += `<div class="bda-desc-card" id="${cardId}" data-descriptor="${descName}" data-item-id="${itemId}">`;
      // Header
      html += '<div class="bda-desc-card__header">';
      html += '<div class="bda-desc-card__info">';
      html += `<i class="fa fa-database" style="color:var(--bda-slate-500);font-size:13px"></i>`;
      html += `<span class="bda-desc-card__descriptor">${descName}</span>`;
      html += `<span style="color:var(--bda-slate-400)">&bull;</span>`;
      html += `<span class="bda-desc-card__id">${itemId}</span>`;
      html += '</div>';
      html += '<div class="bda-desc-card__btns">';
      html += `<button class="bda-desc-card__btn bda-desc-card__btn--minimize" title="Minimize"><i class="fa fa-minus"></i></button>`;
      html += `<button class="bda-desc-card__btn bda-desc-card__btn--close" title="Close"><i class="fa fa-times"></i></button>`;
      html += '</div>';
      html += '</div>';

      // Body
      html += '<div class="bda-desc-card__body">';
      html += '<div class="bda-desc-card__search"><i class="fa fa-search"></i><input type="text" class="bda-input bda-desc-card__search-input" placeholder="Search properties..." /></div>';
      html += `<table class="dataTable" data-descriptor="${descName}"${isItemTree ? ` id="${tabId}_${di}"` : ''}>`;
      types.forEach((curProp) => {
        html += '<tr>';
        // Property name cell
        html += '<td><div class="bda-desc-card__prop-label">';
        html += `<span class="bda-desc-card__prop-name">${this.formatPropertyName(curProp.name)}`;
        if (curProp.rdonly === 'true') html += " <span class='bda-badge bda-badge--danger'>R</span>";
        if (curProp.derived === 'true') html += " <span class='bda-badge bda-badge--success'>D</span>";
        if (curProp.exportable === 'true') html += " <span class='bda-badge bda-badge--accent'>E</span>";
        html += '</span>';
        html += `<span class="bda-desc-card__prop-key">${curProp.name}</span>`;
        html += '</div></td>';
        // Value cell
        html += `<td class="bda-desc-card__prop-value" data-property="${curProp.name}" data-item-id="${itemId}">${this.renderPropertyValue(curProp, d[curProp.name], itemId, isItemTree)}</td>`;
        html += '</tr>';
      });
      html += '</table></div>';

      html += '</div>'; // end card
    });

    return html;
  }

  private renderPropertyValue(curProp: PropertyType, propValue: string | undefined, itemId: string, isItemTree: boolean): string {
    if (propValue === null || propValue === undefined) {
      return "<i class='fa fa-pencil-square-o' aria-hidden='true'></i>";
    }
    propValue = propValue.replace(/ /g, '●');
    if (curProp.name === 'descriptor') propValue = propValue.substring(1);
    const baseId = `${curProp.name}_${itemId}`;

    if (curProp.name === 'id') return `<span id='${baseId}'>${propValue}</span>`;

    if (propValue.length > 50) {
      return `<a class='copyLink' href='javascript:void(0)' title='Show all' id='link_${baseId}'><span id='${baseId}'>${this.escapeHTML(propValue.substring(0, 50))}...</span></a><textarea class='copyField' id='text_${baseId}' readonly>${propValue}</textarea>`;
    }

    if (curProp.isId === true) {
      const parts = this.parseRepositoryId(propValue);
      let html = '';
      parts.forEach((p) => {
        if (p !== MAP_SEPARATOR && p !== LIST_SEPARATOR) {
          html += isItemTree
            ? `<a class='clickable_property' href='#id_${p}'>${p}</a>`
            : `<a class='clickable_property loadable_property' data-id='${p}' data-descriptor='${curProp.itemDesc ?? ''}'>${p}</a>`;
        } else html += p;
      });
      return html;
    }

    if (curProp.name === 'descriptor' || curProp.rdonly === 'true' || curProp.derived === 'true') return propValue;
    return `<i class='fa fa-pencil-square-o' aria-hidden='true'></i>${propValue}`;
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

    // Legend
    const $legend = $(
      '<div class="bda-desc-legend">' +
      '<div class="bda-desc-legend__item"><span class="bda-badge bda-badge--danger">R</span> read-only</div>' +
      '<div class="bda-desc-legend__item"><span class="bda-badge bda-badge--success">D</span> derived</div>' +
      '<div class="bda-desc-legend__item"><span class="bda-badge bda-badge--accent">E</span> export is false</div>' +
      '<div class="bda-desc-legend__actions"></div>' +
      '</div>',
    );
    $outputDiv.append($legend);

    // Grid container
    let cardsHtml = '';
    const splitObj = this.getStoredSplitObj();
    let splitValue = splitObj?.activeSplit === false ? parseInt(splitObj.splitValue) : 0;

    for (const itemDesc in datas) {
      if (splitValue === 0) splitValue = datas[itemDesc].length;
      let nbTab = 0;
      if (datas[itemDesc].length <= splitValue) {
        cardsHtml += this.renderTab(itemDesc, types[itemDesc], datas[itemDesc], itemDesc.substring(1), isItemTree);
      } else {
        while (splitValue * nbTab < datas[itemDesc].length) {
          const start = splitValue * nbTab;
          cardsHtml += this.renderTab(itemDesc, types[itemDesc], datas[itemDesc].slice(start, Math.min(start + splitValue, datas[itemDesc].length)), `${itemDesc}_${nbTab}`, isItemTree);
          nbTab++;
        }
      }
    }

    const $grid = $(`<div class="bda-desc-grid">${cardsHtml}</div>`);
    $outputDiv.append($grid);

    // Counter badge
    const $counter = $(`<span class="bda-desc-card__count">${$addItems.length} items in ${nbTypes} descriptor(s)</span>`);
    $legend.find('.bda-desc-legend__actions').prepend($counter);

    // Show raw xml link
    $legend.find('.bda-desc-legend__actions').append("<a href='javascript:void(0)' id='rawXmlLink'><i class='fa fa-code'></i> Show raw XML</a>");

    // Show full text link
    if ($grid.find('.copyField').length > 0) {
      $legend.find('.bda-desc-legend__actions').append("<a href='javascript:void(0)' class='showFullTextLink'><i class='fa fa-expand'></i> Show full text</a>");
      let fullTextShown = false;
      const savedHtml = new Map<HTMLElement, string>();
      $outputDiv.find('.showFullTextLink').on('click', function () {
        fullTextShown = !fullTextShown;
        if (fullTextShown) {
          $grid.find('.copyField').each((_, el) => {
            const $parent = $(el).parent();
            savedHtml.set($parent[0], $parent.html());
            $parent.html($(el).html());
          });
        } else {
          savedHtml.forEach((html, el) => $(el).html(html));
        }
        $(this).html(fullTextShown
          ? "<i class='fa fa-compress'></i> Hide full text"
          : "<i class='fa fa-expand'></i> Show full text");
      });
    }

    // Per-card property search
    $grid.on('input', '.bda-desc-card__search-input', function () {
      const term = ($(this).val() as string).toLowerCase();
      const $table = $(this).closest('.bda-desc-card__body').find('table');
      $table.find('tr').each(function () {
        const $row = $(this);
        const propName = $row.find('.bda-desc-card__prop-name').text().toLowerCase();
        const propKey = $row.find('.bda-desc-card__prop-key').text().toLowerCase();
        $row.toggle(!term || propName.includes(term) || propKey.includes(term));
      });
    });

    // Minimize / Close card buttons
    $grid.on('click', '.bda-desc-card__btn--minimize', function () {
      const $card = $(this).closest('.bda-desc-card');
      const $body = $card.find('.bda-desc-card__body');
      $body.toggle();
      const isMinimized = !$body.is(':visible');
      $(this).find('i').toggleClass('fa-minus', !isMinimized).toggleClass('fa-plus', isMinimized);
      $(this).attr('title', isMinimized ? 'Expand' : 'Minimize');
    });

    $grid.on('click', '.bda-desc-card__btn--close', function () {
      $(this).closest('.bda-desc-card').remove();
    });

    // Loadable property click
    $grid.on('click', '.loadable_property', (e) => {
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

    // Copy link toggle
    $grid.on('click', '.copyLink', function () {
      const id = ($(this).attr('id') ?? '').replace('link_', '').replace(/(:|\.|\[|\]|,)/g, '\\$1');
      $(`#${id}`).toggle();
      $(`#text_${id}`).toggle();
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
    const $card = $('<div id="itemTree" class="bda-card"></div>').insertAfter('#RQLEditor');

    // Header
    $card.append(
      "<div class='bda-section-header'>" +
      "<h3 class='bda-section-header__title'><i class='fa fa-sitemap'></i> Get Item Tree</h3>" +
      '</div>',
    );

    // Warning box
    $card.append(
      "<div class='bda-item-tree-alert'>" +
      "<div class='bda-item-tree-alert__content'>" +
      "<i class='fa fa-info-circle bda-item-tree-alert__icon'></i>" +
      "<div>" +
      "<p>This tool will recursively retrieve items and print the result with the chosen output.</p>" +
      "<p>For example, if you give an order ID in the form below, you will get all shipping groups, payment groups, commerceItems, priceInfo... of the given order</p>" +
      '</div>' +
      '</div>' +
      "<p class='bda-item-tree-alert__warning'><i class='fa fa-exclamation-triangle'></i> Be careful when using this tool on a live instance! Set a low max items value.</p>" +
      '</div>',
    );

    // Form grid
    $card.append(
      "<div id='itemTreeForm'>" +
      "<div class='bda-item-tree-grid'>" +
      "<div class='bda-input-field'><label class='bda-input-field__label'>ID</label>" +
      "<input type='text' id='itemTreeId' class='bda-input' placeholder='Enter item ID' /></div>" +
      "<div class='bda-input-field'><label class='bda-input-field__label'>Descriptor</label>" +
      "<span id='itemTreeDescriptorField'><select id='itemTreeDesc' class='bda-select itemDescriptor'>" +
      this.getDescriptorOptions() +
      '</select></span></div>' +
      "<div class='bda-input-field'><label class='bda-input-field__label'>Max Items</label>" +
      "<input type='text' id='itemTreeMax' class='bda-input' value='50' /></div>" +
      "<div class='bda-input-field'><label class='bda-input-field__label'>Output Format</label>" +
      "<select id='itemTreeOutput' class='bda-select'>" +
      "<option value='HTMLtab'>HTML tab</option>" +
      "<option value='addItem'>add-item XML</option>" +
      "<option value='removeItem'>remove-item XML</option>" +
      "<option value='printItem'>print-item XML</option>" +
      "<option value='tree'>Tree (experimental)</option>" +
      '</select></div>' +
      '</div>' +
      "<div class='bda-item-tree-actions'>" +
      "<label class='bda-item-tree-checkbox'>" +
      "<input type='checkbox' id='printRepositoryAttr' />" +
      "<span>Print attribute:</span>" +
      `<code>repository='${getCurrentComponentPath()}'</code>` +
      '</label>' +
      "<button id='itemTreeBtn' class='bda-btn bda-btn--primary'>Enter <i class='fa fa-play'></i></button>" +
      '</div>' +
      '</div>',
    );

    $card.append("<div id='itemTreeInfo' />");
    $card.append("<div id='itemTreeResult' />");

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
      $('#itemTreeInfo').append("<button type='button' id='itemTreeCopyButton' class='bda-btn'>Copy result to clipboard</button>");
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

      // Wrap everything in a card
      const $card = $('<div class="bda-card bda-cache-card"></div>');
      const $headerDiv = $('<div class="bda-section-header bda-cache-header"></div>');
      const $titleRow = $('<div class="bda-cache-header__row"></div>');
      $titleRow.append('<h3 class="bda-section-header__title"><i class="fa fa-bar-chart"></i> Cache Usage Statistics</h3>');

      const $actions = $('<div class="bda-cache-header__actions"></div>');
      const $resetLink = $cacheUsage.next();
      const $resetBtn = $resetLink.find('a').first();
      if ($resetBtn.length) {
        $resetBtn.addClass('bda-btn bda-btn--danger bda-btn--sm').detach().appendTo($actions);
      }
      $('<button></button>', { id: 'cacheExpandAll', class: 'bda-btn bda-btn--outline bda-btn--sm', html: '<i class="fa fa-expand"></i> Expand All' })
        .on('click', () => { $cacheTable.find('tr.cache-subheader.collapsed').each((_, el) => this.toggleCacheLine(el)); })
        .appendTo($actions);
      $('<button></button>', { id: 'collapseAll', class: 'bda-btn bda-btn--outline bda-btn--sm', html: '<i class="fa fa-compress"></i> Collapse All' })
        .on('click', () => { $cacheTable.find('tr.cache-subheader.expanded').each((_, el) => this.toggleCacheLine(el)); })
        .appendTo($actions);
      $('<button></button>', { id: 'exportCSV', class: 'bda-btn bda-btn--outline bda-btn--sm', html: '<i class="fa fa-download"></i> Export CSV' })
        .on('click', () => this.exportCacheStatsAsCSV($cacheTable))
        .appendTo($actions);

      $titleRow.append($actions);
      $headerDiv.append($titleRow);
      $card.append($headerDiv);

      // Move cache table into the card
      const $cardBody = $('<div class="bda-cache-body"></div>');
      $cacheTable.addClass('cache bda-section-table').removeAttr('border');
      const $header = $cacheTable.find('tr').first().detach();
      $('<thead></thead>').prependTo($cacheTable).append($header);

      let index = 0;
      $cacheTable.find('tr').each((_, tr) => { if ((index - 1) % 3 === 0) $(tr).addClass('odd cache-subheader'); index++; });

      this.setupCacheCollapse($header, $cacheTable);

      $cacheTable.addClass('fixed_headers');
      $cacheTable.find('.cache-subheader').each((_, el) => {
        $(el).addClass('collapsed').next().css('display', 'none').next().css('display', 'none');
      });

      $cardBody.append($cacheTable);
      $card.append($cardBody);

      // Insert card and clean up old elements
      // The ATG page has: h2 > (reset link div) > (table container)
      // We need to remove the old h2 and its sibling wrapper, leaving only the card
      const $oldResetWrapper = $cacheUsage.next();
      const $oldTableWrapper = $oldResetWrapper.next();
      $cacheUsage.before($card);
      $oldTableWrapper.remove();
      $oldResetWrapper.remove();
      $cacheUsage.remove();

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
        const cacheModeClass = cacheMode === 'disabled' ? ' bda-cache-attr-value--warning' : '';
        $td.html(
          `<span class="cacheArrow"><i class="fa fa-chevron-right"></i></span>` +
          `<span class="bda-cache-attr">item-descriptor=</span><span class="bda-cache-descriptor-name">${itemDesc}</span>` +
          `<span class="bda-cache-attr">cache-mode=</span><span class="bda-cache-attr-value${cacheModeClass}">${cacheMode}</span>` +
          (cacheLocality ? `<span class="bda-cache-attr">cache-locality=</span><span class="bda-cache-attr-value">${cacheLocality}</span>` : ''),
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
