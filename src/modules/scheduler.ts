/**
 * BDA Scheduler module
 * Replaces bda.scheduler.js
 */

import { logTrace } from '../core/common';

/** Elements that must never be hidden when clearing the scheduler page */
const PRESERVE_SELECTOR = '#bdaNavbar, .bda-toolbar-strip, .bda-main';

/** ATG header names mapped to cleaner labels */
const HEADER_RENAME: Record<string, string> = {
  'last time': 'Last Run',
  'next time': 'Next Run',
  '# times run': '# Runs',
};

export class BdaScheduler {
  isApplicable(): boolean {
    return $("h2:contains('Scheduled jobs')").length > 0;
  }

  init(): void {
    if (!this.isApplicable()) return;
    logTrace('BdaScheduler init');
    this.buildScheduler();
    this.hideUnscheduledHeader();
  }

  private hideUnscheduledHeader(): void {
    const $h2 = $("h2:contains('Unscheduled jobs')");
    if ($h2.length === 0) return;
    const $table = $h2.next('table');
    if ($table.length > 0 && $table.find('tr').length <= 1) {
      $table.hide();
    }
  }

  private formatDate(raw: string): string {
    const normalized = raw.replace(/\s+[A-Z]{2,5}\s+(\d{4})$/, ' $1');
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return raw;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private findSchedulerTable($h2: JQuery): JQuery | null {
    let $table = $h2.next('table');
    if ($table.length === 0) {
      $table = $h2.nextAll().find('table').first();
    }
    return $table.length > 0 ? $table : null;
  }

  private buildScheduler(): void {
    const $h2 = $("h2:contains('Scheduled jobs')");

    $h2.prevAll().not(PRESERVE_SELECTOR).hide();
    $h2.hide();

    const $table = this.findSchedulerTable($h2);
    if (!$table) return;

    const $form = $table.closest('form');
    const $origDeleteBtn = $form.find('input[type="submit"][value*="Delete"], input[type="submit"][value*="delete"]');
    $origDeleteBtn.hide();

    // Build card structure
    const $card = this.buildCard();
    const $scrollWrap = $('<div class="bda-sched-scroll"></div>').append($table);
    $card.append($scrollWrap);

    if ($form.length) {
      $form.prepend($card);
    } else {
      $table.before($card);
      $card.find('.bda-sched-scroll').append($table);
    }

    // Normalize ATG table
    this.normalizeTable($table);

    // Detect column layout
    const columns = this.detectColumns($table);

    // Style body rows
    this.styleRows($table, columns);

    // Footer with counter and delete
    const totalRows = $table.find('tbody tr').length;
    const $counter = this.buildFooter($card, totalRows, $origDeleteBtn);

    // Search handler
    this.bindSearch($table, columns, totalRows, $counter);

    // Timeline (vis.js)
    this.buildTimeline($card, $table, columns);
  }

  private buildCard(): JQuery {
    const $card = $('<div class="bda-card"></div>');
    $card.append(
      '<div class="bda-section-header"><h3 class="bda-section-header__title"><i class="fa fa-clock-o"></i> Scheduled Jobs</h3></div>',
    );

    const $toolbar = $('<div class="bda-sched-toolbar"></div>');
    $toolbar.append(
      '<div class="bda-sched-search">' +
      '<i class="fa fa-search"></i>' +
      '<input type="text" class="bda-input" id="bdaSchedSearch" placeholder="Search by name or source..." />' +
      '</div>',
    );
    $card.append($toolbar);
    return $card;
  }

  private normalizeTable($table: JQuery): void {
    $table
      .addClass('bda-section-table')
      .removeAttr('style bgcolor background border cellpadding cellspacing width');
    $table
      .find('*')
      .removeAttr('bgcolor background valign align style nowrap width height color');

    const $firstRow = $table.find('tr').first();
    const $thead = $('<thead></thead>');
    const $headerRow = $('<tr></tr>');

    $firstRow.find('td, th').each(function (ci) {
      const rawText = $(this).text().trim();
      const lower = rawText.toLowerCase();
      if (ci === 0) {
        $headerRow.append($('<th class="bda-section-table__header bda-sched-check"></th>'));
        return;
      }
      const label = HEADER_RENAME[lower] ?? rawText;
      $headerRow.append($('<th class="bda-section-table__header"></th>').text(label));
    });

    $thead.append($headerRow);
    $firstRow.remove();

    const $tbody = $('<tbody></tbody>').append($table.find('tr'));
    $table.empty().append($thead).append($tbody);
  }

  private detectColumns($table: JQuery): { dateIndices: Set<number>; nameIdx: number; sourceIdx: number } {
    const dateIndices = new Set<number>();
    let nameIdx = -1;
    let sourceIdx = -1;

    $table.find('thead th').each(function (ci) {
      const txt = $(this).text().toLowerCase();
      if (txt === 'last run' || txt === 'next run') dateIndices.add(ci);
      if (txt === 'name') nameIdx = ci;
      if (txt === 'source') sourceIdx = ci;
    });

    return { dateIndices, nameIdx, sourceIdx };
  }

  private styleRows($table: JQuery, columns: { dateIndices: Set<number> }): void {
    $table.find('tbody tr').each((i, row) => {
      $(row).find('td').each((ci, cell) => {
        if (ci === 0) {
          $(cell).addClass('bda-sched-check');
        } else if (columns.dateIndices.has(ci)) {
          const raw = $(cell).text().trim();
          $(cell).text(this.formatDate(raw)).addClass('bda-sched-date');
        }
      });
      if (i % 2 === 1) $(row).find('td').addClass('bda-section-table__alt');
    });
  }

  private buildFooter($card: JQuery, totalRows: number, $origDeleteBtn: JQuery): JQuery {
    const $footer = $('<div class="bda-sched-footer"></div>');
    const $counter = $(`<span class="bda-sched-counter">Showing ${totalRows} of ${totalRows} jobs</span>`);
    $footer.append($counter);

    if ($origDeleteBtn.length) {
      const $deleteBtn = $('<button type="submit" class="bda-btn bda-btn--danger bda-btn--sm"><i class="fa fa-trash-o"></i> Delete checked jobs</button>');
      $deleteBtn.on('click', (e) => {
        e.preventDefault();
        $origDeleteBtn.trigger('click');
      });
      $footer.append($deleteBtn);
    }

    $card.append($footer);
    return $counter;
  }

  private bindSearch(
    $table: JQuery,
    columns: { nameIdx: number; sourceIdx: number },
    totalRows: number,
    $counter: JQuery,
  ): void {
    $('#bdaSchedSearch').on('input', function () {
      const term = ($(this).val() as string).toLowerCase();
      let visible = 0;
      $table.find('tbody tr').each(function () {
        const $cells = $(this).find('td');
        const name = (columns.nameIdx >= 0 ? $cells.eq(columns.nameIdx).text() : '').toLowerCase();
        const source = (columns.sourceIdx >= 0 ? $cells.eq(columns.sourceIdx).text() : '').toLowerCase();
        const match = !term || name.includes(term) || source.includes(term);
        $(this).toggle(match);
        if (match) visible++;
      });
      $counter.text(`Showing ${visible} of ${totalRows} jobs`);
    });
  }

  private buildTimeline($card: JQuery, $table: JQuery, columns: { nameIdx: number; dateIndices: Set<number> }): void {
    if (!window.vis) return;

    const $wrapper = $('<div id="timeline-wrapper"></div>').hide();
    const $toggleBtn = $(
      '<button class="bda-btn bda-btn--secondary bda-btn--sm" style="margin: 0 24px 12px"><i class="fa fa-calendar"></i> Toggle Timeline</button>',
    );

    // Place timeline inside the card, after the scroll wrapper
    $card.find('.bda-sched-scroll').after($wrapper).after($toggleBtn);

    $toggleBtn.on('click', () => {
      if ($wrapper.is(':visible')) {
        $wrapper.hide();
      } else {
        $wrapper.show();
        this.renderTimeline($wrapper, $table, columns);
      }
    });
  }

  private renderTimeline(
    $wrapper: JQuery,
    $table: JQuery,
    columns: { nameIdx: number; dateIndices: Set<number> },
  ): void {
    if (!window.vis) return;

    $wrapper.empty();
    const container = $wrapper.get(0);
    if (!container) return;

    const items: Array<{ id: number; content: string; start: Date }> = [];
    let id = 0;

    $table.find('tbody tr').each(function () {
      const $cells = $(this).find('td');
      if ($cells.length < 3) return;

      const jobName = columns.nameIdx >= 0 ? $cells.eq(columns.nameIdx).text().trim() : '';
      if (!jobName) return;

      // Iterate over detected date columns to extract timeline items
      columns.dateIndices.forEach((ci) => {
        const raw = $cells.eq(ci).text().trim();
        if (!raw) return;
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          items.push({ id: id++, content: jobName, start: d });
        }
      });
    });

    if (items.length === 0) {
      $wrapper.text('No scheduled job data available for timeline.');
      return;
    }

    const dataset = new (window.vis!.DataSet)(items);
    new (window.vis!.Timeline)(container, dataset, {
      height: '300px',
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    logTrace('Scheduler timeline rendered');
  }
}
