/**
 * BDA Toolbar module
 * Replaces bda.toolbar.js - favorites toolbar
 */

import {
  logTrace,
  purgeSlashes,
  getComponentNameFromPath,
  getComponentShortName,
  stringToColour,
  colorToCss,
  buildArray,
  buildTagsFromArray,
  unique,
  rotateArrow,
  sortArray,
} from '../core/common';
import { bdaStorage } from '../core/storage';
import { BdaModal } from '../core/modal';
import type { BDAConfig, StoredComponent, ComponentTags } from '../types/global';

export class BdaToolbar {
  private bda: BDAConfig;
  private addComponentModal: BdaModal | null = null;

  constructor(bda: BDAConfig) {
    this.bda = bda;
  }

  init(): void {
    console.time('bdaToolbar');
    logTrace('BdaToolbar init');
    this.showComponentHistory();
    this.createToolbar();
    if (this.bda.isComponentPage) this.collectHistory();
    console.timeEnd('bdaToolbar');
  }

  // -------------------------------------------------------------------------
  // History
  // -------------------------------------------------------------------------

  collectHistory(): void {
    if (document.URL.indexOf('?') >= 0) return;
    if (document.URL.indexOf('#') >= 0) return;

    const componentPath = purgeSlashes(document.location.pathname);
    const history: string[] = JSON.parse(localStorage.getItem('componentHistory') ?? '[]') as string[];
    if (history.indexOf(componentPath) === -1) {
      logTrace('Collect : ' + componentPath);
      history.unshift(componentPath);
      const trimmed = history.slice(0, 10);
      bdaStorage.storeItem('componentHistory', trimmed);
    }
  }

  showComponentHistory(): void {
    const $hist = $("<div id='history'></div>").insertAfter(this.bda.logoSelector);
    const history: string[] = JSON.parse(localStorage.getItem('componentHistory') ?? '[]') as string[];
    if (history.length === 0) return;
    const $list = $('<div class="bda-history-list"></div>').appendTo($hist);
    history.forEach((comp) => {
      $(`<a class="bda-history-pill" href="${comp}">${getComponentNameFromPath(comp)}</a>`).appendTo($list);
    });
  }

  // -------------------------------------------------------------------------
  // Tag management
  // -------------------------------------------------------------------------

  addTags(newTags: ComponentTags): void {
    const existingTags = bdaStorage.getTags() as unknown as ComponentTags;
    for (const name in newTags) {
      if (!(name in existingTags)) {
        (existingTags as ComponentTags)[name] = newTags[name];
      }
    }
    bdaStorage.saveTags(existingTags as unknown as string[]);
  }

  clearTags(): void {
    const savedTags = bdaStorage.getTags() as unknown as ComponentTags;
    for (const tagName in savedTags) savedTags[tagName].selected = false;
    bdaStorage.saveTags(savedTags as unknown as string[]);
    this.reloadToolbar();
  }

  // -------------------------------------------------------------------------
  // Toolbar management
  // -------------------------------------------------------------------------

  deleteComponent(componentName: string): void {
    const components = bdaStorage.getStoredComponents();
    const filtered = components.filter((c) => c.name !== componentName);
    bdaStorage.storeItem('Components', filtered);
    this.reloadToolbar();
  }

  storeComponent(
    componentPath: string,
    methods: string[],
    vars: string[],
    tags: string[],
  ): void {
    const compName = getComponentNameFromPath(componentPath);
    const storedComps = bdaStorage.getStoredComponents();
    const lastId = storedComps.length > 0 ? storedComps[storedComps.length - 1].path.length : 0;

    const component: StoredComponent = {
      path: componentPath,
      name: compName,
      color: stringToColour(compName),
      tags,
      shortName: getComponentShortName(compName),
    };

    bdaStorage.storeComponent(component);
    const tagMap = buildTagsFromArray(tags, false);
    this.addTags(tagMap);
  }

  isComponentAlreadyStored(componentPath: string): boolean {
    return bdaStorage.getStoredComponents().some((c) => c.path === componentPath);
  }

  reloadToolbar(): void {
    this.deleteToolbar();
    this.createToolbar();
  }

  deleteToolbar(): void {
    $('#toolbar').remove();
    $('#toolbarHeader').remove();
    $('#toolbarContainer').remove();
    $('#addComponentToolbarPopup').remove();
  }

  private getBorderColor(colors: number[]): string {
    return colorToCss(colors.map((c) => Math.max(0, c - 50)));
  }

  // -------------------------------------------------------------------------
  // Create toolbar
  // -------------------------------------------------------------------------

  createToolbar(): void {
    this.createAddPopup();
    this.addExistingTagsToToolbarPopup();

    const favs = bdaStorage.getStoredComponents();
    $("<div id='toolbarContainer'></div>").insertAfter(this.bda.logoSelector);
    $("<div id='toolbar'></div>").appendTo('#toolbarContainer');

    const tags = bdaStorage.getTags() as unknown as ComponentTags;
    const selectedTags: string[] = [];
    for (const tagName in tags) {
      if (tags[tagName].selected) selectedTags.push(tagName);
    }

    favs.forEach((fav) => {
      const show =
        selectedTags.length === 0 ||
        (fav.tags && fav.tags.some((t) => selectedTags.includes(t)));

      if (!show) return;

      const colors = fav.color ?? stringToColour(fav.name);
      const shortName = fav.shortName ?? getComponentShortName(fav.name);
      const favId = encodeURIComponent(fav.path);

      const favTags = (fav.tags ?? []).map((t, i, arr) => '#' + t + (i < arr.length - 1 ? ',' : '')).join('');

      const $fav = $("<div class='toolbar-elem fav'></div>")
        .html(
          `<div class='fav-color-bar' style='background:${colorToCss(colors)}'></div>` +
          `<div class='favLink'><a href='${fav.path}' title='${fav.name}'><div class='favTitle'>${shortName}</div><div class='favName'>${fav.name}</div></a></div>` +
          `<div class='favArrow' id='favArrow${favId}'><i class='fa fa-chevron-down'></i></div>` +
          `<div class='favMoreInfo' id='favMoreInfo${favId}'>` +
          `<div class='favLogDebug'><form method='POST' action='${fav.path}' id='logDebugForm${fav.name}'><input type='hidden' value='loggingDebug' name='propertyName'><input type='hidden' value='' name='newValue'>logDebug : <a href='javascript:void(0)' class='logdebug' id='logDebug${fav.name}'>true</a>&nbsp;|&nbsp;<a href='javascript:void(0)' class='logdebug' id='logDebug${fav.name}'>false</a></form></div>` +
          `<div class='favDelete' id='delete${fav.name}'><i class='fa fa-trash-o'></i> Delete</div>` +
          `<div class='fav-tags'>${favTags}</div>` +
          `</div>`,
        )
        .appendTo('#toolbar');
    });

    // Bind events
    $('.favArrow').on('click', function () {
      const id = (this as HTMLElement).id;
      const idToExpand = '#' + id.replace('favArrow', 'favMoreInfo');
      $(idToExpand).slideToggle();
      rotateArrow($('#' + id + ' i'));
    });

    $('.favDelete').on('click', (e) => {
      const componentName = (e.currentTarget as HTMLElement).id.replace('delete', '');
      this.deleteComponent(componentName);
    });

    $('.logdebug').on('click', function () {
      const componentName = (this as HTMLElement).id.replace('logDebug', '');
      const logDebugState = (this as HTMLElement).innerHTML;
      $(`#logDebugForm${componentName} input[name=newValue]`).val(logDebugState);
      $(`#logDebugForm${componentName}`).trigger('submit');
    });

    // Add component button (only on component pages)
    if (this.bda.isComponentPage) {
      const componentPath = purgeSlashes(document.location.pathname);
      if (!this.isComponentAlreadyStored(componentPath)) {
        $("<div class='toolbar-elem newFav'><button class='bda-btn bda-btn--sm' id='addComponent' title='Add to favorites'><i class='fa fa-plus'></i> Add</button></div>")
          .appendTo('#toolbar');

        $('#submitComponent').on('click', () => {
          this.addComponentModal?.hide();
          const methods: string[] = [];
          const vars: string[] = [];

          $('.method:checked').each(function () {
            methods.push((this as HTMLInputElement).parentElement?.textContent ?? '');
          });
          $('.variable:checked').each(function () {
            vars.push((this as HTMLInputElement).parentElement?.textContent ?? '');
          });

          let tags = buildArray($('#newtags').val() as string);
          $('.tag:checked').each(function () {
            tags.push((this as HTMLInputElement).parentElement?.textContent ?? '');
          });
          tags = unique(tags);

          this.storeComponent(componentPath, methods, vars, tags);
          this.reloadToolbar();
        });

        $('#addComponent').on('click', () => {
          const $methodsList = $('#methods').empty();
          const $varsList = $('#vars').empty();

          $('h1:contains("Methods")').next().find('tr').each(function (index) {
            if (index > 0) {
              const linkMethod = $(this).find('a').first();
              const methodName = (linkMethod.attr('href') ?? '').split('=')[1];
              if (methodName) {
                $methodsList.append(
                  `<li><input type="checkbox" class="method" id="method_${methodName}"><label for="method_${methodName}">${methodName}</label></li>`,
                );
              }
            }
          });

          const defMethods = bdaStorage.getConfigurationValue('default_methods') as string[] | null;
          if (defMethods) defMethods.forEach((m) => { $(`#method_${m}`).prop('checked', true); });

          $('h1:contains("Properties")').next().find('tr').each(function (index) {
            if (index > 0) {
              const linkVariable = $(this).find('a').first();
              const variableName = (linkVariable.attr('href') ?? '').split('=')[1];
              if (variableName) {
                $varsList.append(
                  `<li><input type="checkbox" class="variable" id="var_${variableName}"><label for="var_${variableName}">${variableName}</label></li>`,
                );
              }
            }
          });

          const defProperties = bdaStorage.getConfigurationValue('default_properties') as string[] | null;
          if (defProperties) defProperties.forEach((p) => { $(`#var_${p}`).prop('checked', true); });

          this.addComponentModal?.show();
        });
      }
    }

    this.addFavTagList();
  }

  private createAddPopup(): void {
    const $content = $(
      "<p>Choose methods and/or properties to shortcut : </p>" +
      "<div id='addComponentToolbarPopupContent'>" +
      "<div id='methods'></div>" +
      "<div id='vars'></div>" +
      "</div>" +
      "<div id='favSetTags'>" +
      "<div class='favline'><div>Add tags:</div><div><ul id='existingTags'></ul></div></div>" +
      "<div class='favline'><div>New tags:</div><div><input id='newtags' class='newtags' type='text' placeholder='comma separated'></div></div>" +
      "</div>" +
      "<div class='addFavSubmit'><button type='button' id='submitComponent' class='bda-btn bda-btn--primary'>Add <i class='fa fa-play'></i></button></div>",
    );
    this.addComponentModal = new BdaModal({
      title: 'Add new component',
      content: $content,
    }).mount();
  }

  private addExistingTagsToToolbarPopup(): void {
    const tags = bdaStorage.getTags() as unknown as ComponentTags;
    const $tagList = $('#existingTags');
    const sortedTags = sortArray(Object.keys(tags));

    sortedTags.forEach((tagValue) => {
      const $li = $('<li></li>').appendTo($tagList);
      $('<input/>', { id: `tagSelector_${tagValue}`, type: 'checkbox', name: tagValue, class: 'tag' }).appendTo($li);
      $(`<label for='tagSelector_${tagValue}'>${tagValue}</label>`).appendTo($li);
    });
  }

  private addFavTagList(): void {
    logTrace('addFavTagList');
    const tags = bdaStorage.getTags() as unknown as ComponentTags;
    const $favline = $("<div id='favTagList' class='favline'>").appendTo('#toolbar');
    const $list = $('<ul></ul>');

    if (Object.keys(tags).length > 0) {
      $('<button id="clear-filters" class="bda-btn bda-btn--icon" title="Clear"><i class="fa fa-times" aria-hidden="true"></i></button>')
        .on('click', () => { this.clearTags(); })
        .appendTo($('<li class="tag-filter"></li>').appendTo($list));
    }

    const sortedTags = sortArray(Object.keys(tags));
    sortedTags.forEach((tagName) => {
      const tag = tags[tagName];

      const $li = $(`<li class="bda-tag-pill${tag.selected ? ' bda-tag-pill--active' : ''}"></li>`)
        .appendTo($list);

      $('<input/>', {
        id: `favFilter_${tagName}`,
        type: 'checkbox',
        name: tagName,
        class: 'favFilterTag',
        checked: tag.selected,
      })
        .on('change', (e) => {
          const name = $(e.currentTarget).attr('name') ?? '';
          const allTags = bdaStorage.getTags() as unknown as ComponentTags;
          if (allTags[name]) allTags[name].selected = $(e.currentTarget).prop('checked') as boolean;
          bdaStorage.saveTags(allTags as unknown as string[]);
          this.reloadToolbar();
        })
        .appendTo($li);

      $(`<label for='favFilter_${tagName}'>#${tagName}</label>`).appendTo($li);
    });

    $list.appendTo($favline);
  }
}
