/**
 * BDA Menu module
 * Replaces bda.menu.js
 */

import { logTrace, rotateArrow, copyToClipboard } from '../core/common';
import { bdaStorage } from '../core/storage';
import { BdaSearch } from './search';
import type { BdaStorageData } from '../types/global';

export class BdaMenu {
  private $menuBar!: JQuery;
  private search = new BdaSearch();

  init(): void {
    console.time('bdaMenu');
    logTrace('BdaMenu init');
    this.$menuBar = $("<div id='menuBar'></div>").appendTo('body');
    this.createBugReportPanel();
    this.createBackupPanel();
    this.createConfigurationPanel();
    this.createWhatsnewPanel();
    this.createSearchBox();

    // Generic click binding for menu panels
    this.$menuBar.on('click', '.menu', (event) => {
      const $thisParent = $(event.currentTarget);
      $('.menu').each(function () {
        const $this = $(this);
        const $panel = $('#' + $this.attr('data-panel'));
        if ($this.attr('id') !== $thisParent.attr('id') && $panel.css('display') !== 'none') {
          $panel.slideToggle();
          rotateArrow($this.find('.menuArrow i'));
        }
      });
      const $panel = $('#' + $thisParent.attr('data-panel'));
      $panel.slideToggle();
      rotateArrow($thisParent.find('.menuArrow i'));
    });

    console.timeEnd('bdaMenu');
  }

  // -------------------------------------------------------------------------
  // Bug report panel
  // -------------------------------------------------------------------------

  private createBugReportPanel(): void {
    $("<div id='bdaBug' class='menu' data-panel='bdaBugPanel'></div>")
      .appendTo(this.$menuBar)
      .html("<p>About</p><div class='menuArrow'><i class='up fa fa-arrow-down'></i></div>");

    $("<div id='bdaBugPanel' class='menuPanel'></div>").appendTo('body').html(
      `<p>Better Dyn Admin has a <a target='_blank' href='https://github.com/jc7447/BetterDynAdmin'>GitHub page</a>.<br>
      Please report any bug in the <a target='_blank' href='https://github.com/jc7447/BetterDynAdmin/issues'>issues tracker</a>.
      <br><br><strong>BDA version ${GM_info.script.version}</strong></p>`,
    );
  }

  // -------------------------------------------------------------------------
  // What's new panel
  // -------------------------------------------------------------------------

  private createWhatsnewPanel(): void {
    $("<div id='whatsnew' class='menu' data-panel='whatsnewPanel'></div>")
      .appendTo(this.$menuBar)
      .html("<p>What's new</p><div class='menuArrow'><i class='up fa fa-arrow-down'></i></div>");

    $("<div id='whatsnewPanel' class='menuPanel'></div>")
      .appendTo('body')
      .html("<p id='whatsnewContent'></p>");

    $('#whatsnew').on('click', () => {
      if ($('#whatsnewPanel').css('display') === 'none') {
        $('#whatsnewContent').html(GM_getResourceText('whatsnew'));
      }
    });
  }

  // -------------------------------------------------------------------------
  // Backup panel
  // -------------------------------------------------------------------------

  private createBackupPanel(): void {
    $("<div id='bdaBackup' class='menu' data-panel='bdaBackupPanel'></div>")
      .appendTo(this.$menuBar)
      .html("<p>Backup</p><div class='menuArrow'><i class='up fa fa-arrow-down'></i></div>");

    $("<div id='bdaBackupPanel' class='menuPanel'></div>")
      .appendTo('body')
      .html(
        '<p>Backup BDA data to keep your favorite components and stored queries safe.<br><br>' +
        '<strong>You can also import a backup from another domain!</strong></p>' +
        "<textarea id='bdaData' placeholder='Paste your data here to restore it.'></textarea>" +
        "<button id='bdaDataBackup'>Backup</button>" +
        "<button id='bdaDataRestore'>Restore</button>",
      );

    $('#bdaDataBackup').on('click', () => {
      const data = bdaStorage.getData();
      logTrace('bdaDataBackup', data);
      copyToClipboard(JSON.stringify(data));
    });

    $('#bdaDataRestore').on('click', () => {
      if (window.confirm('Restore BDA data? This will overwrite current data.')) {
        const raw = ($('#bdaData').val() as string).trim();
        try {
          const data = JSON.parse(raw) as BdaStorageData;
          bdaStorage.restoreData(data, true);
        } catch {
          alert('Invalid backup data.');
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // Configuration panel
  // -------------------------------------------------------------------------

  private createConfigurationPanel(): void {
    $("<div id='bdaConfig' class='menu' data-panel='bdaConfigPanel'></div>")
      .appendTo(this.$menuBar)
      .html("<p>Configuration</p><div class='menuArrow'><i class='up fa fa-arrow-down'></i></div>");

    const $panel = $("<div id='bdaConfigPanel' class='menuPanel'></div>").appendTo('body');

    // Mono-instance mode
    const monoInstanceKey = 'mono_instance';
    const isMonoInstance = GM_getValue(monoInstanceKey) === true;
    $panel.html(
      `<p>Same BDA data on every domain: <input type='checkbox' id='mono_instance_checkbox' ${isMonoInstance ? 'checked' : ''}></p>`,
    );

    $('#mono_instance_checkbox').on('change', function () {
      const checked = $(this).prop('checked') as boolean;
      GM_setValue(monoInstanceKey, checked);
      if (checked) GM_setValue('BDA_GM_Backup', JSON.stringify(bdaStorage.getData()));
    });

    this.createCheckBoxConfig($panel, {
      name: 'search_autocomplete',
      description: 'Search AutoComplete',
      message: '<p>Note: Reload dyn/admin to apply.</p>',
    });

    this.createCheckBoxConfig($panel, {
      name: 'defaultOpenXmlDefAsTable',
      description: 'Display XML Def as table by default',
    });

    this.createDefaultMethodsConfig($panel);
    this.createDataSourceFolderConfig($panel);
  }

  private createCheckBoxConfig(
    $parent: JQuery,
    options: { name: string; description: string; message?: string },
  ): void {
    const value = bdaStorage.getConfigurationValue(options.name) === true;
    const checked = value ? 'checked' : '';
    $parent.append(
      `<p class="config">${options.description}: <input type="checkbox" id="${options.name}_config" ${checked}/></p>${options.message ?? ''}`,
    );
    $(`#${options.name}_config`).on('change', function () {
      bdaStorage.storeConfiguration(options.name, $(this).is(':checked'));
    });
  }

  private createDefaultMethodsConfig($parent: JQuery): void {
    const $config = $('<div id="advancedConfig"></div>').appendTo($parent);

    const savedMethods = (bdaStorage.getConfigurationValue('default_methods') as string[] | null) ?? [];
    $config.append(
      `<p>Default methods when bookmarking:</p><textarea id='config-methods-data' placeholder='Comma separated'>${savedMethods.join(',')}</textarea>`,
    );
    $('<button>Save methods</button>').on('click', () => {
      const arr = ($('#config-methods-data').val() as string).replace(/ /g, '').split(',').filter(Boolean);
      bdaStorage.storeConfiguration('default_methods', arr);
    }).appendTo($config);

    const savedProps = (bdaStorage.getConfigurationValue('default_properties') as string[] | null) ?? [];
    $config.append(
      `<p>Default properties when bookmarking:</p><textarea id='config-properties-data' placeholder='Comma separated'>${savedProps.join(',')}</textarea>`,
    );
    $('<button>Save properties</button>').on('click', () => {
      const arr = ($('#config-properties-data').val() as string).replace(/ /g, '').split(',').filter(Boolean);
      bdaStorage.storeConfiguration('default_properties', arr);
    }).appendTo($config);
  }

  private createDataSourceFolderConfig($parent: JQuery): void {
    const $config = $('<div></div>').appendTo($parent);
    const saved = (bdaStorage.getConfigurationValue('data_source_folder') as string | null) ?? '';
    $config.append(
      `<p>JDBC datasource folders:</p><textarea id='config-data-source-folders-data' placeholder='Comma separated paths'>${saved}</textarea>`,
    );
    $('<button>Save folders</button>').on('click', () => {
      const val = ($('#config-data-source-folders-data').val() as string).trim();
      bdaStorage.storeConfiguration('data_source_folder', val);
    }).appendTo($config);
  }

  // -------------------------------------------------------------------------
  // Search box
  // -------------------------------------------------------------------------

  private createSearchBox(): void {
    $("<div id='bdaSearch' class='menu'></div>")
      .appendTo(this.$menuBar)
      .html(
        '<p>Search</p>' +
        '<form action="/dyn/admin/atg/dynamo/admin/en/cmpn-search.jhtml">' +
        '<input type="text" name="query" id="searchFieldBDA" placeholder="focus: ctrl+shift+f">' +
        '</form>',
      );

    try {
      const autocomplete = bdaStorage.getConfigurationValue('search_autocomplete') === true;
      if (autocomplete) {
        this.search.init({ align: 'right' });
      }
    } catch (e) {
      console.error(e);
    }

    $(document).on('keypress', (e) => {
      const isFocusKey =
        (e.which === 70 && e.ctrlKey && e.shiftKey) ||
        (e.which === 6 && e.ctrlKey && e.shiftKey);
      if (isFocusKey) $('#searchFieldBDA').trigger('focus');
    });
  }
}
