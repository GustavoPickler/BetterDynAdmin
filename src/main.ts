/**
 * BDA - Better Dynamo Administration
 * Entry point - replaces bda.user.js
 *
 * Modules are imported as ES modules instead of global jQuery plugins.
 * CSS is injected via GM_addStyle.
 */

// Core
import { registerJQueryExtensions, logTrace } from './core/common';

// Modules
import { BdaToolbar } from './modules/toolbar';
import { BdaMenu } from './modules/menu';
import { BdaRepository } from './modules/repository';
import { BdaPipeline } from './modules/pipeline';
import { BdaJdbc } from './modules/jdbc';
import { BdaPerfMonitor } from './modules/perfmonitor';
import { BdaActor } from './modules/actor';
import { BdaXmlDef } from './modules/xmldef';
import { BdaCompConfig } from './modules/compconfig';
import { BdaSearch } from './modules/search';
import { BdaDash } from './modules/dash';
import { BdaScheduler } from './modules/scheduler';
import { bdaStorage } from './core/storage';
import { bdaKeyboard } from './core/keyboard';

// CSS
import bdaCss from './styles/bda.css?raw';

// ---------------------------------------------------------------------------
// CSS injection
// ---------------------------------------------------------------------------

function insertCss(resourceName: string): void {
  $('<link />')
    .attr('href', GM_getResourceURL(resourceName))
    .attr('rel', 'stylesheet')
    .attr('type', 'text/css')
    .appendTo('head');
}

function injectFontAwesome(): void {
  // Font Awesome must be loaded via direct <link> so that relative font file
  // paths in the CSS (e.g. ../fonts/fontawesome-webfont.eot) resolve against
  // the CDN origin instead of the current page or a blob: URL.
  $('<link />')
    .attr('href', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css')
    .attr('rel', 'stylesheet')
    .attr('type', 'text/css')
    .appendTo('head');
}

function injectCss(): void {
  const resources = [
    'bootstrapCSS', 'cmCSS', 'hlCSS', 'hljsThemeCSS', 'tablesorterCSS',
    'select2CSS', 'visCSS', 'cmHint',
  ];
  for (const name of resources) {
    try {
      GM_addStyle(GM_getResourceText(name));
    } catch (e) {
      console.error('Failed to inject CSS resource:', name, e);
    }
  }
  GM_addStyle(bdaCss);
}

// ---------------------------------------------------------------------------
// Page detection
// ---------------------------------------------------------------------------

const OLD_DYNAMO_ALT_SELECTORS = [
  'Dynamo Component Browser',
  'Dynamo Administration',
  'Performance Monitor',
  'Dynamo Batch Compiler',
  'Dynamo Configuration',
  'JDBC Browser',
];

function isOldDynamo(): boolean {
  for (const img of Array.from(document.getElementsByTagName('img'))) {
    if (OLD_DYNAMO_ALT_SELECTORS.includes(img.alt)) return true;
  }
  return false;
}

function isComponentPage(): boolean {
  return (
    $("h1:contains('Directory Listing')").length === 0 &&
    document.URL.indexOf('/dyn/admin/nucleus/') !== -1 &&
    document.URL.indexOf('?') === -1
  );
}

function buildOldDynamoLogoSelector(): string {
  return OLD_DYNAMO_ALT_SELECTORS.map((s) => `img[alt='${s}']`).join(',');
}

function fixCss(): void {
  const cssUri = '/dyn/admin/atg/dynamo/admin/admin.css';
  if ($(`link[href='${cssUri}']`).length === 0) {
    const $link = $('<link />')
      .attr('href', cssUri)
      .attr('type', 'text/css')
      .attr('rel', 'stylesheet');
    if ($('head').length > 0) $('head').append($link);
    else $('body').append($link);
  }
}

function setupPageTitle(componentPath: string): void {
  const parts = componentPath.replace(/\/$/, '').split('/');
  $('title').text(parts[parts.length - 1] ?? document.title);
}

function setupFindClassLink(oldDynamo: boolean): void {
  const $classLink = oldDynamo ? $('h1:eq(0)').next() : $('h1:eq(1)').next();
  const fullClassName = $classLink.text().trim();
  if (fullClassName) {
    const simpleName = fullClassName.split('.').pop() ?? fullClassName;
    $classLink.text(simpleName).attr('title', fullClassName);
    $(`<span style='margin-left:25px'><a href='/dyn/dyn/findclass.jhtml?className=${fullClassName}&debug=true'>Find Class</a></span>`)
      .insertAfter($classLink);
  }
}

function setupCopyClipboardButtons(oldDynamo: boolean): void {
  const $breadcrumb = oldDynamo ? $('h1:eq(0)') : $('h1:eq(1)');
  if ($breadcrumb.length === 0) return;

  $breadcrumb.attr('id', 'breadcrumb').append(
    $('<button></button>', { class: 'bda-btn bda-btn--icon', html: "<i class='fa fa-files-o'></i>" })
      .on('click', () => {
        const path = document.location.pathname.replace('/dyn/admin/nucleus', '');
        GM_setClipboard(path);
      }),
  );

  const $classLink = $breadcrumb.next();
  $('<button></button>', { class: 'bda-btn bda-btn--icon', html: "<i class='fa fa-files-o'></i>" })
    .on('click', () => { GM_setClipboard($classLink.attr('title') ?? $classLink.text()); })
    .insertAfter($classLink);
}

function setupBreadcrumb(oldDynamo: boolean): void {
  // '#breadcrumb' id is set by setupCopyClipboardButtons before this runs
  const $h1 = $('#breadcrumb');
  if ($h1.length === 0) return;

  // Detach the copy button first (preserve its event handler)
  const $copyBtn = $h1.find('.bda-btn--icon').detach();

  const $nav = $('<nav class="bda-breadcrumb" id="breadcrumb" aria-label="Component path"></nav>');
  const $links = $h1.find('a');
  const total = $links.length;

  $links.each(function (i) {
    const text = $(this).text().replace(/\//g, '').trim();
    if (!text || text === '/') return;

    if ($nav.children().length > 0) {
      $('<i class="fa fa-chevron-right bda-breadcrumb__sep"></i>').appendTo($nav);
    }

    if (i === total - 1) {
      $(`<span class="bda-breadcrumb__item bda-breadcrumb__item--active">${text}</span>`).appendTo($nav);
    } else {
      $(`<a class="bda-breadcrumb__item" href="${$(this).attr('href') ?? '#'}">${text}</a>`).appendTo($nav);
    }
  });

  // Handle trailing text node (component name rendered as plain text, not a link)
  const lastChild = $h1[0]?.lastChild;
  if (lastChild && lastChild.nodeType === 3 /* TEXT_NODE */) {
    const text = (lastChild.textContent ?? '').replace(/\//g, '').trim();
    if (text) {
      if ($nav.children().length > 0) {
        $('<i class="fa fa-chevron-right bda-breadcrumb__sep"></i>').appendTo($nav);
      }
      $(`<span class="bda-breadcrumb__item bda-breadcrumb__item--active">${text}</span>`).appendTo($nav);
    }
  }

  if ($copyBtn.length) $nav.append($copyBtn);
  $h1.replaceWith($nav);
}

function bindEscapeKey(): void {
  $(document).on('keyup', (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
      $('.bda-nav__dropdown').removeClass('bda-nav__dropdown--open');
      $('.bda-nav__btn').removeClass('bda-nav__btn--active');
      if ($('#bda-help-overlay').length) bdaKeyboard.hideHelp();
    }
  });
}

// ---------------------------------------------------------------------------
// Main init
// ---------------------------------------------------------------------------

function init(): void {
  console.time('bda');
  console.log('Start BDA script');

  const oldDynamo = isOldDynamo();
  const componentPage = isComponentPage();
  const logoSelector = oldDynamo ? buildOldDynamoLogoSelector() : 'div#oracleATGbrand';

  const bdaConfig = {
    componentBrowserPageSelector: "h1:contains('Component Browser')",
    logoSelector,
    oldDynamoAltSelector: OLD_DYNAMO_ALT_SELECTORS,
    isOldDynamo: oldDynamo,
    isComponentPage: componentPage,
    dynAdminCssUri: '/dyn/admin/atg/dynamo/admin/admin.css',
  };

  if (oldDynamo) {
    console.log('isOldDynamo');
    fixCss();
  }

  // Register jQuery extensions (outerHTML, toCSV, highlight, bdaAlert, etc.)
  registerJQueryExtensions();

  // Set tablesorter default
  if (typeof ($ as JQueryStatic).tablesorter !== 'undefined') {
    ($ as JQueryStatic).tablesorter.defaults.sortInitialOrder = 'desc';
  }

  // Init modules
  new BdaCompConfig().init();
  new BdaRepository().init();
  new BdaPipeline().init();
  new BdaXmlDef().init();
  new BdaPerfMonitor().init();
  new BdaJdbc().init();
  new BdaActor().init();
  new BdaToolbar(bdaConfig).init();
  new BdaMenu().init();
  new BdaDash(bdaConfig).init();
  new BdaScheduler().init();

  // Search autocomplete (global search field)
  const autocomplete = bdaStorage.getConfigurationValue('search_autocomplete') === true;
  if (autocomplete) {
    new BdaSearch().init();
  }

  // Component-page specific setup
  if (componentPage) {
    const componentPath = document.location.pathname.replace('/dyn/admin/nucleus', '');
    setupPageTitle(componentPath);
    setupFindClassLink(oldDynamo);
    setupCopyClipboardButtons(oldDynamo);
    setupBreadcrumb(oldDynamo);
    $('#search').css('display', 'inline');
  }

  bindEscapeKey();

  // Keyboard shortcut framework
  bdaKeyboard.register({
    key: 'k', ctrl: true, description: 'Focus search', module: 'Global',
    handler: () => { $('#searchFieldBDA').trigger('focus').trigger('select'); },
  });
  bdaKeyboard.register({
    key: '?', description: 'Show keyboard shortcuts', module: 'Global',
    handler: () => { bdaKeyboard.showHelp(); },
  });
  bdaKeyboard.init();

  logTrace('BDA init complete');
  console.timeEnd('bda');
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

// Inject CSS early (before DOM ready) to prevent flash of unstyled content
injectFontAwesome();

const isChrome = !!window.chrome;
if (!isChrome) {
  // Firefox: use <link> tags
  const cssResources = [
    'bootstrapCSS', 'cmCSS', 'hlCSS', 'hljsThemeCSS', 'tablesorterCSS',
    'select2CSS', 'visCSS', 'cmHint',
  ];
  for (const name of cssResources) {
    try { insertCss(name); } catch { /* ignore missing resource */ }
  }
  // Inject BDA CSS inline
  try { GM_addStyle(bdaCss); } catch { /* ignore */ }
} else {
  // Chrome: inject all CSS as <style> tags
  try { injectCss(); } catch (e) { console.error('CSS injection failed:', e); }
}

// Wait for DOM ready
jQuery(document).ready(function () {
  (function ($) {
    if (document.getElementById('oracleATGbrand') !== null || isOldDynamo()) {
      console.log('Loading BDA');
      try {
        init();
      } catch (err) {
        console.error('BDA init error:', err);
      }
    } else {
      console.log('BDA script not starting - not an ATG admin page');
    }
  })(jQuery);
});
