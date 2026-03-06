/**
 * BDA Search module
 * Replaces bda.search.js - component autocomplete search
 */

import { logTrace } from '../core/common';

export class BdaSearch {
  init(options: { align?: string } = {}): void {
    logTrace('BdaSearch init');
    const $searchField = $('#searchFieldBDA');
    if ($searchField.length === 0) return;
    this.build($searchField, options);
  }

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  private buildQueryVariants(q: string): string[] {
    const variants = new Set<string>();
    variants.add(q);
    const cap0 = q.charAt(0).toUpperCase() + q.slice(1);
    variants.add(cap0);
    for (let i = 1; i < q.length; i++) {
      const arr = cap0.split('');
      arr[i] = arr[i].toUpperCase();
      variants.add(arr.join(''));
    }
    return Array.from(variants);
  }

  private fetchVariants(query: string, scope: string): Promise<string[]> {
    const endpoint = '/dyn/admin/atg/dynamo/admin/en/cmpn-search.jhtml';
    const variants = this.buildQueryVariants(query);
    const requests = variants.map((v) =>
      $.get(endpoint, { query: v, scope }).then((html: string) => {
        const results: string[] = [];
        const $result = $(html);
        $result.filter('table').add($result.find('table')).each(function () {
          const $tbl = $(this);
          if ($tbl.find('th').text().includes('Search Results:')) {
            $tbl.find('td a').each(function () {
              const href = $(this).attr('href') ?? '';
              const path = href.replace('/dyn/admin/nucleus', '');
              if (path) results.push(path);
            });
          }
        });
        return results;
      }),
    );
    return Promise.all(requests).then((all) => {
      const seen = new Set<string>();
      return all.flat().filter((p) => { if (seen.has(p)) return false; seen.add(p); return true; }).sort();
    });
  }

  private build($input: JQuery, options: { align?: string }): void {
    const DEBOUNCE_MS = 2000;

    const source = (query: string, _sync: (r: string[]) => void, async: (r: string[]) => void): void => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.fetchVariants(query, 'running').then(async);
      }, DEBOUNCE_MS);
    };

    const $wrapper = $('<div class="twbs bda-search-wrapper"></div>');
    $input.wrap($wrapper);

    ($input as JQuery).typeahead(
      {
        hint: true,
        highlight: true,
        minLength: 3,
      },
      {
        name: 'components',
        limit: 20,
        source,
        templates: {
          suggestion: (data: string) =>
            `<div class="bda-search-suggestion">${data}</div>`,
        },
      },
    );

    if (options.align === 'right') {
      $input.closest('.twitter-typeahead').find('.tt-menu').css('right', 0).css('left', 'auto');
    }

    $input.on('typeahead:select', (_event, suggestion: string) => {
      location.href = `/dyn/admin/nucleus${suggestion}`;
    });

    logTrace('BdaSearch typeahead initialized');
  }
}

