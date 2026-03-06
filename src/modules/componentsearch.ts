/**
 * BDA Component Search module
 * Redesigns the ATG component search page (cmpn-search.jhtml)
 */

import { logTrace } from '../core/common';

export class BdaComponentSearch {
  isApplicable(): boolean {
    return document.location.href.includes('cmpn-search.jhtml');
  }

  init(): void {
    if (!this.isApplicable()) return;
    logTrace('BdaComponentSearch init');
    this.build();
  }

  private build(): void {
    // Collect raw ATG data before we tear down the page
    const query = ($('input[name="query"]').val() as string) ?? '';
    const scope = $('input[name="scope"]:checked').val() as string | undefined;
    const results = this.collectResults();
    const hasResults = results.length > 0;

    // Remove all original ATG content (form, table, headings, paragraphs)
    $('body').children().not('#bdaNavbar, .bda-toolbar-strip, .bda-main, script, link, style, noscript').remove();

    const $card = $(
      '<div class="bda-card bda-cmpn-search-card"></div>',
    );

    // Header
    $card.append(
      '<div class="bda-section-header">' +
      '<div class="bda-cmpn-search-header-content">' +
      '<i class="fa fa-search" style="font-size:18px;color:var(--bda-slate-500)"></i>' +
      '<div>' +
      '<h3 class="bda-section-header__title" style="margin:0">Component Search</h3>' +
      '<p class="bda-cmpn-search-subtitle">Search for nucleus components or name contexts by partial name (case sensitive) or class (begin query with "class:")</p>' +
      '</div>' +
      '</div>' +
      '</div>',
    );

    // Form
    const $form = $(`<form class="bda-cmpn-search-form" method="GET" action="${document.location.pathname}"></form>`);

    const $formRow = $('<div class="bda-cmpn-search-form-row"></div>');

    // Query input
    $formRow.append(
      '<div class="bda-input-field bda-cmpn-search-query">' +
      '<label class="bda-input-field__label">Query</label>' +
      `<input type="text" name="query" class="bda-input" placeholder="Enter component name or class:..." value="${this.escapeAttr(query)}" autofocus />` +
      '</div>',
    );

    // Scope radios
    const runningChecked = !scope || scope === 'running' ? 'checked' : '';
    const allChecked = scope === 'all' ? 'checked' : '';
    $formRow.append(
      '<div class="bda-input-field bda-cmpn-search-scope">' +
      '<label class="bda-input-field__label">Search Scope</label>' +
      '<div class="bda-cmpn-search-radios">' +
      `<label class="bda-cmpn-search-radio"><input type="radio" name="scope" value="running" ${runningChecked} /><span>Running</span></label>` +
      `<label class="bda-cmpn-search-radio"><input type="radio" name="scope" value="all" ${allChecked} /><span>All (Slow)*</span></label>` +
      '</div>' +
      '</div>',
    );

    // Submit
    $formRow.append(
      '<div class="bda-cmpn-search-submit">' +
      '<button type="submit" class="bda-btn bda-btn--primary"><i class="fa fa-search"></i> Search</button>' +
      '</div>',
    );

    $form.append($formRow);
    $form.append(
      '<p class="bda-cmpn-search-warning">' +
      '<i class="fa fa-exclamation-triangle"></i>' +
      ' *Searching all components is resource intensive and not recommended for live production instances.' +
      '</p>',
    );

    $card.append($form);

    // Results
    if (hasResults) {
      const $resultsSection = $('<div class="bda-cmpn-search-results"></div>');
      $resultsSection.append(
        '<div class="bda-cmpn-search-results-header">' +
        '<span class="bda-cmpn-search-results-title"><i class="fa fa-list"></i> Search Results</span>' +
        `<span class="bda-cmpn-search-results-count">${results.length} component${results.length !== 1 ? 's' : ''} found</span>` +
        '</div>',
      );

      const $list = $('<div class="bda-cmpn-search-list"></div>');
      results.forEach((r) => {
        const $item = $(
          `<a class="bda-cmpn-search-item" href="/dyn/admin/nucleus${r.path}">` +
          '<div class="bda-cmpn-search-item__icon"><i class="fa fa-cube"></i></div>' +
          '<div class="bda-cmpn-search-item__content">' +
          `<span class="bda-cmpn-search-item__path">${this.escapeHtml(r.path)}</span>` +
          (r.description ? `<span class="bda-cmpn-search-item__desc">${this.escapeHtml(r.description)}</span>` : '') +
          '</div>' +
          '<i class="fa fa-chevron-right bda-cmpn-search-item__chevron"></i>' +
          '</a>',
        );
        $list.append($item);
      });

      $resultsSection.append($list);
      $card.append($resultsSection);
    } else if (query) {
      $card.append(
        '<div class="bda-cmpn-search-empty">' +
        '<i class="fa fa-search"></i>' +
        `<p>No components found for "<strong>${this.escapeHtml(query)}</strong>"</p>` +
        '<p class="bda-cmpn-search-empty__hint">Try a different search term</p>' +
        '</div>',
      );
    }

    if ($('.bda-main').length > 0) {
      $('.bda-main').prepend($card);
    } else {
      $('body').append($card);
    }
  }

  private collectResults(): Array<{ path: string; description: string }> {
    const results: Array<{ path: string; description: string }> = [];
    $("th:contains('Search Results:')").closest('table').find('td').each(function () {
      const $td = $(this);
      const $a = $td.find('a').first();
      if ($a.length === 0) return;
      const href = $a.attr('href') ?? '';
      const path = href.replace('/dyn/admin/nucleus', '');
      if (!path) return;
      // Description is the text node after the link (if any)
      const desc = $td.contents().filter(function () { return this.nodeType === 3; }).text().trim().replace(/^[,\s]+/, '');
      results.push({ path, description: desc });
    });
    return results;
  }

  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private escapeAttr(s: string): string {
    return String(s).replace(/"/g, '&quot;');
  }
}
