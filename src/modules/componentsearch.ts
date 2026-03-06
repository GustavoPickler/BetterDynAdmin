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
    const results = this.parseResultsFromHtml(document.documentElement.outerHTML);
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
      '<p class="bda-cmpn-search-subtitle">Search for nucleus components or name contexts by partial name or class (begin query with "class:")</p>' +
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

    // Results placeholder (populated after initial load or form submit)
    const $resultsContainer = $('<div class="bda-cmpn-search-results-container"></div>');
    $card.append($resultsContainer);

    if ($('.bda-main').length > 0) {
      $('.bda-main').prepend($card);
    } else {
      $('body').append($card);
    }

    // Render initial results (page was loaded with a query already)
    if (query) this.renderResults($resultsContainer, results, query);

    // Intercept form submit for case-insensitive multi-query
    $form.on('submit', (e) => {
      e.preventDefault();
      const q = ($form.find('input[name="query"]').val() as string).trim();
      const s = $form.find('input[name="scope"]:checked').val() as string;
      if (!q) return;

      $resultsContainer.html('<div class="bda-cmpn-search-loading"><i class="fa fa-spinner fa-spin"></i> Searching…</div>');

      const queries = this.buildQueryVariants(q);
      const action = $form.attr('action') ?? document.location.pathname;

      const requests = queries.map((variant) =>
        $.get(action, { query: variant, scope: s }).then((html: string) =>
          this.parseResultsFromHtml(html),
        ),
      );

      Promise.all(requests).then((allResults) => {
        const seen = new Set<string>();
        const merged: Array<{ path: string; description: string }> = [];
        allResults.flat().forEach((r) => {
          if (!seen.has(r.path)) { seen.add(r.path); merged.push(r); }
        });
        merged.sort((a, b) => a.path.localeCompare(b.path));
        this.renderResults($resultsContainer, merged, q);
      });
    });
  }

  private buildQueryVariants(q: string): string[] {
    const variants = new Set<string>();
    variants.add(q);
    // capitalize first letter
    variants.add(q.charAt(0).toUpperCase() + q.slice(1));
    // capitalize every word segment (split on spaces, dots, slashes)
    const titleCase = q.replace(/(^|[\s./])([a-z])/g, (_, sep: string, c: string) => sep + c.toUpperCase());
    variants.add(titleCase);
    return Array.from(variants);
  }

  private parseResultsFromHtml(html: string): Array<{ path: string; description: string }> {
    const results: Array<{ path: string; description: string }> = [];
    const $doc = $(html);
    $doc.filter("table").add($doc.find("table")).each(function () {
      const $tbl = $(this);
      if ($tbl.find("th").text().includes('Search Results:')) {
        $tbl.find('td').each(function () {
          const $td = $(this);
          const $a = $td.find('a').first();
          if ($a.length === 0) return;
          const href = $a.attr('href') ?? '';
          const path = href.replace('/dyn/admin/nucleus', '');
          if (!path) return;
          const desc = $td.contents().filter(function () { return this.nodeType === 3; }).text().trim().replace(/^[,\s]+/, '');
          results.push({ path, description: desc });
        });
      }
    });
    return results;
  }

  private renderResults(
    $container: JQuery,
    results: Array<{ path: string; description: string }>,
    query: string,
  ): void {
    $container.empty();
    if (results.length === 0) {
      $container.append(
        '<div class="bda-cmpn-search-empty">' +
        '<i class="fa fa-search"></i>' +
        `<p>No components found for "<strong>${this.escapeHtml(query)}</strong>"</p>` +
        '<p class="bda-cmpn-search-empty__hint">Try a different search term</p>' +
        '</div>',
      );
      return;
    }

    const $section = $('<div class="bda-cmpn-search-results"></div>');
    $section.append(
      '<div class="bda-cmpn-search-results-header">' +
      '<span class="bda-cmpn-search-results-title"><i class="fa fa-list"></i> Search Results</span>' +
      `<span class="bda-cmpn-search-results-count">${results.length} component${results.length !== 1 ? 's' : ''} found</span>` +
      '</div>',
    );

    const $list = $('<div class="bda-cmpn-search-list"></div>');
    results.forEach((r) => {
      $list.append(
        `<a class="bda-cmpn-search-item" href="/dyn/admin/nucleus${r.path}">` +
        '<div class="bda-cmpn-search-item__icon"><i class="fa fa-cube"></i></div>' +
        '<div class="bda-cmpn-search-item__content">' +
        `<span class="bda-cmpn-search-item__path">${this.escapeHtml(r.path)}</span>` +
        (r.description ? `<span class="bda-cmpn-search-item__desc">${this.escapeHtml(r.description)}</span>` : '') +
        '</div>' +
        '<i class="fa fa-chevron-right bda-cmpn-search-item__chevron"></i>' +
        '</a>',
      );
    });

    $section.append($list);
    $container.append($section);
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
