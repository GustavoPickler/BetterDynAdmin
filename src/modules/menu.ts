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

    const $navbar = $('<nav id="bdaNavbar"></nav>').prependTo('body');
    const $inner = $('<div class="bda-nav__inner"></div>').appendTo($navbar);
    const $left = $('<div class="bda-nav__left"></div>').appendTo($inner);

    // Brand with icon
    const $brand = $('<div class="bda-nav__brand"></div>');
    $brand.append(
      '<div class="bda-nav__brand-icon"><i class="fa fa-database"></i></div>' +
      '<div class="bda-nav__brand-text">Oracle<span>Commerce</span></div>',
    );
    $brand.appendTo($left);
    this.createSearchBox($left);

    this.$navRight = $('<div class="bda-nav__right" id="bdaNavActions"></div>').appendTo($inner);
    this.createAboutItem();
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
      `<p><strong>Better Dynamo Administration v${GM_info.script.version}</strong></p>` +
      `<p>A userscript that modernizes the Oracle ATG Dynamo Admin UI with smarter search, repository cards, dark mode, and more.</p>` +
      `<p><a target='_blank' href='https://github.com/GustavoPickler/BetterDynAdmin'>GitHub</a> &nbsp;·&nbsp; ` +
      `<a target='_blank' href='https://github.com/GustavoPickler/BetterDynAdmin/issues'>Report a bug</a></p>`,
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
  // Search box
  // -------------------------------------------------------------------------

  private createSearchBox($parent: JQuery): void {
    $(
      '<form class="bda-nav__search" action="/dyn/admin/atg/dynamo/admin/en/cmpn-search.jhtml">' +
      '<input type="text" name="query" id="searchFieldBDA" placeholder="Search\u2026 (ctrl+shift+f)">' +
      '</form>',
    ).appendTo($parent);

    this.search.init({ align: 'right' });

    $(document).on('keypress', (e) => {
      const isFocusKey =
        (e.which === 70 && e.ctrlKey && e.shiftKey) ||
        (e.which === 6 && e.ctrlKey && e.shiftKey);
      if (isFocusKey) $('#searchFieldBDA').trigger('focus');
    });
  }
}
