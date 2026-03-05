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

    // Build a proper thead from the first row
    const $firstRow = $table.find('tr').first();
    const $thead = $('<thead></thead>');
    const $headerRow = $('<tr></tr>');

    $firstRow.find('td').each(function () {
      $headerRow.append($('<th></th>').text($(this).text()));
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
