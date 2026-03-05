/**
 * BDA JDBC Browser module
 * Replaces bda.jdbc.js
 */

import { logTrace, copyToClipboard } from '../core/common';
import { bdaStorage } from '../core/storage';

export class BdaJdbc {
  private readonly DEFAULT_DATASOURCE_DIR = '/atg/dynamo/service/jdbc/';
  private readonly CONNECTION_POOL_POINTER =
    '/atg/dynamo/admin/jdbcbrowser/ConnectionPoolPointer/';

  isExecuteQueryPage(): boolean {
    return location.pathname.indexOf('executeQuery.jhtml') !== -1;
  }

  isJdbcHomePage(): boolean {
    return location.pathname.indexOf('/dyn/admin/nucleus/atg/dynamo/service/jdbc') !== -1 ||
      $("h1:contains('JDBC Browser')").length > 0;
  }

  isApplicable(): boolean {
    return this.isExecuteQueryPage() || this.isJdbcHomePage();
  }

  init(): void {
    if (!this.isApplicable()) return;
    logTrace('BdaJdbc init');

    if (this.isExecuteQueryPage()) this.setupExecuteQueryPage();
    if (this.isJdbcHomePage()) this.setupJdbcHomePage();
  }

  private setupExecuteQueryPage(): void {
    logTrace('setupExecuteQueryPage');
    const $h1 = $("h1:contains('Execute Query')");
    if ($h1.length === 0) return;

    const $switcher = $('<div class="bda-jdbc-switcher"></div>');
    const $label = $('<label>Data Source: </label>');
    const $select = $('<select class="bda-select"></select>');

    this.getAvailableDataSources().then((sources) => {
      sources.forEach((src) => {
        $select.append($('<option></option>').val(src).text(src));
      });

      this.getCurrentDataSource().then((current) => {
        if (current) $select.val(current);
      });

      $select.on('change', () => {
        const selected = $select.val() as string;
        this.switchDataSource(selected).catch((e) => logTrace('switchDataSource error:', e));
      });
    });

    $switcher.append($label, $select);
    $h1.after($switcher);

    // Add CSV export button to result table
    this.addCsvExport();
  }

  private addCsvExport(): void {
    const $resultTable = $('table').filter(function () {
      return $(this).find('tr').length > 1;
    }).first();

    if ($resultTable.length === 0) return;

    const $btn = $('<button class="bda-button btn btn-default"><i class="fa fa-download"></i> Export CSV</button>');
    $btn.on('click', () => {
      const csv = ($resultTable as JQuery).toCSV();
      copyToClipboard(csv);
    });

    $resultTable.before($btn);
  }

  private async getAvailableDataSources(): Promise<string[]> {
    const customFolder = bdaStorage.getConfigurationValue('data_source_folder') as string | null;
    const folder = customFolder ?? this.DEFAULT_DATASOURCE_DIR;

    const url = `/dyn/admin/nucleus${folder}`;
    return new Promise((resolve) => {
      jQuery.ajax({
        url,
        success: (result: string) => {
          const sources: string[] = [];
          $(result).find('a').each(function () {
            const href = $(this).attr('href') ?? '';
            if (href.indexOf(folder) !== -1) {
              sources.push(href.replace('/dyn/admin/nucleus', ''));
            }
          });
          resolve(sources);
        },
        error: () => resolve([]),
      });
    });
  }

  private async getCurrentDataSource(): Promise<string | null> {
    const url = `/dyn/admin/nucleus${this.CONNECTION_POOL_POINTER}/?propertyName=dataSource`;
    return new Promise((resolve) => {
      jQuery.ajax({
        url,
        success: (result: string) => {
          const $result = $(result);
          const value = $result.find("h3:contains('Value')").next().text().trim();
          resolve(value || null);
        },
        error: () => resolve(null),
      });
    });
  }

  private async switchDataSource(path: string): Promise<void> {
    const url = `/dyn/admin/nucleus${this.CONNECTION_POOL_POINTER}/`;
    return new Promise((resolve, reject) => {
      jQuery.ajax({
        url,
        type: 'POST',
        data: { propertyName: 'dataSource', dataSource: path },
        success: () => {
          logTrace('Switched datasource to', path);
          resolve();
        },
        error: (xhr) => reject(new Error(`Switch failed: ${xhr.status}`)),
      });
    });
  }

  private setupJdbcHomePage(): void {
    logTrace('setupJdbcHomePage');
    // Make datasource links clickable if they are plain text
    $('td').each(function () {
      const text = $(this).text().trim();
      if (text.startsWith('/') && !$(this).find('a').length) {
        const url = `/dyn/admin/nucleus${text}`;
        $(this).html(`<a href="${url}">${text}</a>`);
      }
    });
  }
}
