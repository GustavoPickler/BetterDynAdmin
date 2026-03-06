/**
 * BDA Performance Monitor module
 * Replaces bda.perfmonitor.js
 */

import { logTrace } from '../core/common';

export class BdaPerfMonitor {
  isPerfMonitorPage(): boolean {
    return location.pathname.indexOf('performance-monitor.jhtml') !== -1;
  }

  isPerfMonitorTimePage(): boolean {
    return location.pathname.indexOf('performance-data-time.jhtml') !== -1;
  }

  isApplicable(): boolean {
    return this.isPerfMonitorPage() || this.isPerfMonitorTimePage();
  }

  init(): void {
    if (!this.isApplicable()) return;
    logTrace('BdaPerfMonitor init');
    this.setupSortingTabPerfMonitor();
  }

  private setupSortingTabPerfMonitor(): void {
    const tableIndex = this.isPerfMonitorPage() ? 1 : 0;
    const $table = $('table').eq(tableIndex);

    if ($table.length === 0) return;

    // Wrap in card
    const $card = $('<div class="bda-card"></div>').insertBefore($table);
    $card.append(
      '<div class="bda-section-header"><h3 class="bda-section-header__title"><i class="fa fa-tachometer"></i> Performance Data</h3></div>',
    );
    $card.append($table);
    $table.addClass('bda-section-table');

    // Build a proper thead from the first row
    const $firstRow = $table.find('tr').first();
    const $thead = $('<thead></thead>');
    const $headerRow = $('<tr></tr>');

    $firstRow.find('td').each(function () {
      $headerRow.append($('<th class="bda-section-table__header"></th>').text($(this).text()));
    });

    $thead.append($headerRow);
    $firstRow.remove();
    $table.prepend($thead);

    // Apply tablesorter
    ($table as JQuery).tablesorter({
      theme: 'blue',
      widgets: ['zebra'],
    });

    logTrace('PerfMonitor tablesorter applied');
  }
}
