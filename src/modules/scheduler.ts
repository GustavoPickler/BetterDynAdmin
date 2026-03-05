/**
 * BDA Scheduler module
 * Replaces bda.scheduler.js
 */

import { isNull, logTrace } from '../core/common';

export class BdaScheduler {
  isApplicable(): boolean {
    return $("h2:contains('Scheduled jobs')").length > 0;
  }

  init(): void {
    if (!this.isApplicable()) return;
    logTrace('BdaScheduler init');
    this.buildScheduler();
  }

  private buildScheduler(): void {
    const $h2 = $("h2:contains('Scheduled jobs')");
    const $table = $h2.next('table');

    if ($table.length === 0) return;

    // Apply tablesorter
    const $firstRow = $table.find('tr').first();
    const $thead = $('<thead></thead>');
    const $headerRow = $('<tr></tr>');

    $firstRow.find('td').each(function () {
      $headerRow.append($('<th></th>').text($(this).text()));
    });

    $thead.append($headerRow);
    $firstRow.remove();
    $table.prepend($thead);
    ($table as JQuery).tablesorter({ theme: 'blue', widgets: ['zebra'] });

    // Build vis.js timeline if available
    this.buildTimeline($h2, $table);
  }

  private buildTimeline($h2: JQuery, $table: JQuery): void {
    if (!window.vis) {
      logTrace('vis.js not available for scheduler timeline');
      return;
    }

    const $wrapper = $('<div id="timeline-wrapper"></div>');
    const $toggleBtn = $(
      '<button class="bda-button btn btn-default"><i class="fa fa-calendar"></i> Toggle Timeline</button>',
    );

    $h2.after($wrapper).after($toggleBtn);
    $wrapper.hide();

    $toggleBtn.on('click', () => {
      if ($wrapper.is(':visible')) {
        $wrapper.hide();
      } else {
        $wrapper.show();
        this.renderTimeline($wrapper, $table);
      }
    });
  }

  private renderTimeline($wrapper: JQuery, $table: JQuery): void {
    if (!window.vis) return;

    $wrapper.empty();
    const container = $wrapper.get(0);
    if (!container) return;

    const items: Array<{ id: number; content: string; start: Date; end?: Date; group?: number }> = [];
    let id = 0;

    $table.find('tbody tr, tr').each(function () {
      const $cells = $(this).find('td');
      if ($cells.length < 3) return;

      const jobName = $cells.eq(0).text().trim();
      const nextRun = $cells.eq(1).text().trim();
      const prevRun = $cells.eq(2).text().trim();

      if (!jobName || jobName === '') return;

      const nextDate = nextRun ? new Date(nextRun) : null;
      const prevDate = prevRun ? new Date(prevRun) : null;

      if (!isNull(nextDate) && nextDate && !isNaN(nextDate.getTime())) {
        items.push({ id: id++, content: jobName + ' (next)', start: nextDate });
      }
      if (!isNull(prevDate) && prevDate && !isNaN(prevDate.getTime())) {
        items.push({ id: id++, content: jobName + ' (prev)', start: prevDate });
      }
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
