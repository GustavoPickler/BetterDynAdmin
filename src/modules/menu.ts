/**
 * BDA Menu module
 * Replaces bda.menu.js
 */

import { logTrace, copyToClipboard } from '../core/common';
import { bdaStorage } from '../core/storage';
import { BdaSearch } from './search';
import type { BdaStorageData } from '../types/global';

export class BdaMenu {
  private $navRight!: JQuery;
  private search = new BdaSearch();

  init(): void {
    console.time('bdaMenu');
    logTrace('BdaMenu init');

    // Apply persisted dark mode before rendering UI
    if (bdaStorage.getConfigurationValue('dark_mode') === true) {
      $('body').addClass('bda-dark');
    }

    const $navbar = $('<nav id="bdaNavbar"></nav>').appendTo('body');
    const $left = $('<div class="bda-nav__left"></div>').appendTo($navbar);
    $('<span class="bda-nav__brand">BDA</span>').appendTo($left);
    this.createSearchBox($left);

    this.$navRight = $('<div class="bda-nav__right" id="bdaNavActions"></div>').appendTo($navbar);
    this.createAboutItem();
    this.createConfigItem();
    this.createWhatsnewItem();

    // Close open dropdowns when clicking outside the navbar
    $(document).on('click.bdaNav', (e) => {
      if (!($(e.target as Element).closest('#bdaNavbar').length)) {
        this.closeAllDropdowns();
      }
    });

    console.timeEnd('bdaMenu');
  }

  // -------------------------------------------------------------------------
  // Navigation helpers
  // -------------------------------------------------------------------------

  private createNavItem(id: string, icon: string, label: string): { $btn: JQuery; $dropdown: JQuery } {
    const $item = $(`<div class="bda-nav__item" id="${id}"></div>`).appendTo(this.$navRight);
    const $btn = $(`<button class="bda-nav__btn"><i class="fa ${icon}"></i> ${label}</button>`).appendTo($item);
    const $dropdown = $(`<div class="bda-nav__dropdown" id="${id}Dropdown"></div>`).appendTo($item);

    $btn.on('click', (e) => {
      e.stopPropagation();
      const isOpen = $dropdown.hasClass('bda-nav__dropdown--open');
      this.closeAllDropdowns();
      if (!isOpen) {
        $dropdown.addClass('bda-nav__dropdown--open');
        $btn.addClass('bda-nav__btn--active');
      }
    });

    return { $btn, $dropdown };
  }

  private closeAllDropdowns(): void {
    this.$navRight.find('.bda-nav__dropdown').removeClass('bda-nav__dropdown--open');
    this.$navRight.find('.bda-nav__btn').removeClass('bda-nav__btn--active');
  }

  // -------------------------------------------------------------------------
  // About panel
  // -------------------------------------------------------------------------

  private createAboutItem(): void {
    const { $dropdown } = this.createNavItem('bdaBug', 'fa-info-circle', 'About');
    $dropdown.html(
      `<p>Better Dyn Admin has a <a target='_blank' href='https://github.com/jc7447/BetterDynAdmin'>GitHub page</a>.<br>
      Please report any bug in the <a target='_blank' href='https://github.com/jc7447/BetterDynAdmin/issues'>issues tracker</a>.
      <br><br><strong>BDA version ${GM_info.script.version}</strong></p>`,
    );
  }

  // -------------------------------------------------------------------------
  // What's new panel
  // -------------------------------------------------------------------------

  private createWhatsnewItem(): void {
    const { $btn, $dropdown } = this.createNavItem('whatsnew', 'fa-star', "What's New");
    let loaded = false;
    $btn.on('click', () => {
      if (!loaded && $dropdown.hasClass('bda-nav__dropdown--open')) {
        $dropdown.html(GM_getResourceText('whatsnew'));
        loaded = true;
      }
    });
  }

  // -------------------------------------------------------------------------
  // Backup panel
  // -------------------------------------------------------------------------

  private createBackupItem(): void {
    const { $dropdown } = this.createNavItem('bdaBackup', 'fa-database', 'Backup');
    $dropdown.html(
      '<p>Backup BDA data to keep your favorite components and stored queries safe.<br><br>' +
      '<strong>You can also import a backup from another domain!</strong></p>' +
      "<textarea id='bdaData' placeholder='Paste your data here to restore it.'></textarea>" +
      "<div style='margin-top:6px'><button id='bdaDataBackup' class='bda-btn'>Backup</button>" +
      " <button id='bdaDataRestore' class='bda-btn'>Restore</button></div>",
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

  private createConfigItem(): void {
    const { $dropdown } = this.createNavItem('bdaConfig', 'fa-cog', 'Config');

    // Dark mode toggle
    const isDarkMode = bdaStorage.getConfigurationValue('dark_mode') === true;
    $dropdown.html(
      `<p>Dark mode: <input type='checkbox' id='dark_mode_checkbox' ${isDarkMode ? 'checked' : ''}></p>`,
    );
    $('#dark_mode_checkbox').on('change', function () {
      const checked = $(this).prop('checked') as boolean;
      bdaStorage.storeConfiguration('dark_mode', checked);
      $('body').toggleClass('bda-dark', checked);
    });

    // Mono-instance mode
    const monoInstanceKey = 'mono_instance';
    const isMonoInstance = GM_getValue(monoInstanceKey) === true;
    $dropdown.append(
      `<p>Same BDA data on every domain: <input type='checkbox' id='mono_instance_checkbox' ${isMonoInstance ? 'checked' : ''}></p>`,
    );
    $('#mono_instance_checkbox').on('change', function () {
      const checked = $(this).prop('checked') as boolean;
      GM_setValue(monoInstanceKey, checked);
      if (checked) GM_setValue('BDA_GM_Backup', JSON.stringify(bdaStorage.getData()));
    });

    this.createCheckBoxConfig($dropdown, {
      name: 'search_autocomplete',
      description: 'Search AutoComplete',
      message: '<p>Note: Reload dyn/admin to apply.</p>',
    });

    this.createCheckBoxConfig($dropdown, {
      name: 'defaultOpenXmlDefAsTable',
      description: 'Display XML Def as table by default',
    });

    this.createDefaultMethodsConfig($dropdown);
    this.createDataSourceFolderConfig($dropdown);
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
    $('<button class="bda-btn">Save methods</button>').on('click', () => {
      const arr = ($('#config-methods-data').val() as string).replace(/ /g, '').split(',').filter(Boolean);
      bdaStorage.storeConfiguration('default_methods', arr);
    }).appendTo($config);

    const savedProps = (bdaStorage.getConfigurationValue('default_properties') as string[] | null) ?? [];
    $config.append(
      `<p>Default properties when bookmarking:</p><textarea id='config-properties-data' placeholder='Comma separated'>${savedProps.join(',')}</textarea>`,
    );
    $('<button class="bda-btn">Save properties</button>').on('click', () => {
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
    $('<button class="bda-btn">Save folders</button>').on('click', () => {
      const val = ($('#config-data-source-folders-data').val() as string).trim();
      bdaStorage.storeConfiguration('data_source_folder', val);
    }).appendTo($config);
  }

  // -------------------------------------------------------------------------
  // Search box
  // -------------------------------------------------------------------------

  private createSearchBox($parent: JQuery): void {
    $(
      '<form class="bda-nav__search" action="/dyn/admin/atg/dynamo/admin/en/cmpn-search.jhtml">' +
      '<input type="text" name="query" id="searchFieldBDA" placeholder="Search\u2026 (ctrl+shift+f)">' +
      '</form>',
    ).appendTo($parent);

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
