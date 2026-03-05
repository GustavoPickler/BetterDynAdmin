/**
 * BDA Search module
 * Replaces bda.search.js - component autocomplete search
 */

import { logTrace } from '../core/common';

export class BdaSearch {
  init(options: { align?: string } = {}): void {
    logTrace('BdaSearch init');
    const $searchField = $('#searchField');
    if ($searchField.length === 0) return;
    this.build($searchField, options);
  }

  private build($input: JQuery, options: { align?: string }): void {
    if (!window.Bloodhound) {
      logTrace('Bloodhound not available for search autocomplete');
      return;
    }

    const searchEndpoint = '/dyn/admin/atg/dynamo/admin/en/cmpn-search.jhtml?query=';

    const engine = new window.Bloodhound({
      datumTokenizer: window.Bloodhound.tokenizers.whitespace,
      queryTokenizer: window.Bloodhound.tokenizers.whitespace,
      remote: {
        url: searchEndpoint + '%QUERY',
        wildcard: '%QUERY',
        transform: (response: string) => {
          const $result = $(response);
          const results: string[] = [];
          $result.find("th:contains('Search Results:')").closest('table').find('td a').each(function () {
            const href = $(this).attr('href') ?? '';
            const path = href.replace('/dyn/admin/nucleus', '');
            if (path) results.push(path);
          });
          return results;
        },
      },
    });

    engine.initialize();

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
        limit: 15,
        source: engine.ttAdapter(),
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

