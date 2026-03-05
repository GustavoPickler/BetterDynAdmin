/**
 * BDA XML Definition module
 * Replaces bda.xmldef.js - XML definition viewer for ATG repositories
 */

import { isNull, processRepositoryXmlDef, logTrace, formatString } from '../core/common';
import { bdaStorage } from '../core/storage';

export class BdaXmlDef {
  private readonly xmlDefinitionMaxSize = 150000;
  private readonly repositoryRootNode = 'gsa-template';

  isXMLDefinitionFilePage(): boolean {
    return $("h1:contains('XML Definition File')").length > 0;
  }

  isApplicable(): boolean {
    return this.isXMLDefinitionFilePage() ||
      location.search.indexOf('propertyName=') !== -1;
  }

  init(): void {
    if (!this.isApplicable()) return;
    logTrace('BdaXmlDef init');
    this.setupXmlDefPage();
  }

  private setupXmlDefPage(): void {
    const showAsTable = bdaStorage.getConfigurationValue('defaultOpenXmlDefAsTable') === true;

    if (this.isXMLDefinitionFilePage()) {
      this.renderXmlDefFromPage(showAsTable);
    } else {
      this.renderXmlDefFromProperty(showAsTable);
    }
  }

  private renderXmlDefFromPage(showAsTable: boolean): void {
    const $pre = $('pre').first();
    if ($pre.length === 0) return;

    const xmlContent = $pre.text().trim();
    if (xmlContent.length > this.xmlDefinitionMaxSize) {
      logTrace('XML definition too large to render as table');
      return;
    }

    this.renderXmlDef(xmlContent, showAsTable);
  }

  private renderXmlDefFromProperty(showAsTable: boolean): void {
    processRepositoryXmlDef('definitionFile', ($xmlDoc) => {
      if (!$xmlDoc) return;
      const xmlContent = $xmlDoc.find(this.repositoryRootNode).get(0)?.outerHTML ?? '';
      this.renderXmlDef(xmlContent, showAsTable);
    });
  }

  private renderXmlDef(xmlContent: string, showAsTable: boolean): void {
    try {
      const xmlDoc = jQuery.parseXML(xmlContent);
      const $xml = $(xmlDoc);
      const $root = $xml.find(this.repositoryRootNode);

      if ($root.length === 0) return;

      // Create tab container
      const $tabContainer = $('<div class="bda-xml-def-tabs twbs"></div>');
      const $tabNav = $('<ul class="nav nav-tabs"></ul>');
      const $tabContent = $('<div class="tab-content"></div>');

      $tabContainer.append($tabNav, $tabContent);

      // Raw XML tab
      $tabNav.append('<li class="active"><a href="#xmldef-raw" data-toggle="tab">XML</a></li>');
      const $rawTab = $('<div class="tab-pane active" id="xmldef-raw"></div>');
      const $pre = $('<pre></pre>').text(xmlContent);
      $rawTab.append($pre);
      $tabContent.append($rawTab);

      if (window.hljs) {
        window.hljs.highlightElement($pre.get(0) as HTMLElement);
      }

      // Table tab
      $tabNav.append('<li><a href="#xmldef-table" data-toggle="tab">Table</a></li>');
      const $tableTab = $('<div class="tab-pane" id="xmldef-table"></div>');
      this.buildItemDescriptorTables($root, $tableTab);
      $tabContent.append($tableTab);

      // Insert after the first h1
      $('h1').first().after($tabContainer);

      if (showAsTable) {
        $tabNav.find('a[href="#xmldef-table"]').trigger('click');
      }

      logTrace('XmlDef rendered');
    } catch (e) {
      logTrace('Failed to render XML def:', e);
    }
  }

  private buildItemDescriptorTables($root: JQuery, $container: JQuery): void {
    $root.find('item-descriptor').each((index, el) => {
      const $desc = $(el);
      const descriptorName = $desc.attr('name') ?? `item-${index}`;

      const $panel = $(
        formatString(
          '<div id="item_{0}" class="panel panel-default item-panel" data-item-descriptor="{0}"></div>',
          descriptorName,
        ),
      );

      const $heading = $(
        `<div class="panel-heading item-descriptor-heading"><h4>${descriptorName}</h4></div>`,
      );

      // Super-type link
      const superType = $desc.attr('super-type');
      if (!isNull(superType)) {
        $heading.append(` <small>extends: <a href="#item_${superType}">${superType}</a></small>`);
      }

      // Cache info
      const cacheMode = $desc.attr('cache-mode');
      const cacheSize = $desc.attr('item-cache-size');
      const cacheTimeout = $desc.attr('item-cache-timeout');
      if (cacheMode) $heading.append(` <span class="label label-default">cache: ${cacheMode}</span>`);
      if (cacheSize) $heading.append(` <span class="label label-info">size: ${cacheSize}</span>`);
      if (cacheTimeout) $heading.append(` <span class="label label-info">timeout: ${cacheTimeout}s</span>`);

      const $body = $('<div class="panel-body"></div>');

      // Properties table
      const $table = $('<table class="table table-condensed table-bordered bda-props-table"><thead><tr><th>Name</th><th>Data/Item Type</th><th>Column</th><th>Property Type</th><th>Queryable</th><th>Writable</th></tr></thead><tbody></tbody></table>');
      const $tbody = $table.find('tbody');

      $desc.find('property').each(function () {
        const $prop = $(this);
        const name = $prop.attr('name') ?? '';
        const dataType = $prop.attr('data-type') ?? '';
        const itemType = $prop.attr('item-type') ?? '';
        const columnName = $prop.attr('column-name') ?? '';
        const propertyType = $prop.attr('property-type') ?? '';
        const propertyTypeSimple = propertyType ? (propertyType.split('.').pop() ?? propertyType) : '';
        const queryable = $prop.attr('queryable') ?? '';
        const writable = $prop.attr('writable') ?? '';

        const typeDisplay = dataType || (itemType ? `<a href="#item_${itemType}">${itemType}</a>` : '');

        $tbody.append(
          `<tr><td>${name}</td><td>${typeDisplay}</td><td>${columnName}</td><td><span title="${propertyType}">${propertyTypeSimple}</span></td><td>${queryable}</td><td>${writable}</td></tr>`,
        );
      });

      $body.append($table);
      $panel.append($heading, $body);
      $container.append($panel);
    });
  }
}
