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
import { BdaComponentSearch } from './modules/componentsearch';
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

function wrapContentInContainer(): void {
  // Center ATG page content by wrapping it in a container
  // Skip navbar and overlay elements
  const $body = $('body');
  const $children = $body.children().not('#bdaNavbar, .bda-overlay, #bda-help-overlay, .bda-toolbar-strip, script, link, style, noscript');

  if ($children.length === 0) return;

  // Check if container already exists
  if ($('.bda-main').length > 0) return;

  const $container = $('<div class="bda-main"></div>');
  $children.first().before($container);
  $container.append($children);
}

function setupCopyClipboardButtons(oldDynamo: boolean): void {
  const $breadcrumb = oldDynamo ? $('h1:eq(0)') : $('h1:eq(1)');
  if ($breadcrumb.length === 0) return;

  $breadcrumb.attr('id', 'breadcrumb').append(
    $('<button></button>', { class: 'bda-btn bda-btn--ghost bda-btn--sm', html: "<i class='fa fa-files-o'></i>" })
      .on('click', () => {
        const path = document.location.pathname.replace('/dyn/admin/nucleus', '');
        GM_setClipboard(path);
      }),
  );

  const $classLink = $breadcrumb.next();
  $('<button></button>', { class: 'bda-btn bda-btn--ghost bda-btn--sm', html: "<i class='fa fa-files-o'></i>" })
    .on('click', () => { GM_setClipboard($classLink.attr('title') ?? $classLink.text()); })
    .insertAfter($classLink);
}

function setupBreadcrumb(oldDynamo: boolean): void {
  // '#breadcrumb' id is set by setupCopyClipboardButtons before this runs
  const $h1 = $('#breadcrumb');
  if ($h1.length === 0) return;

  // Detach the copy button first (preserve its event handler)
  const $copyBtn = $h1.find('.bda-btn--ghost, .bda-btn--icon').detach();

  const $nav = $('<nav class="bda-breadcrumb" id="breadcrumb" aria-label="Component path"></nav>');
  $('<span class="bda-breadcrumb__prefix">Path:</span>').appendTo($nav);

  const $links = $h1.find('a');
  const total = $links.length;

  $links.each(function (i) {
    const text = $(this).text().replace(/\//g, '').trim();
    if (!text || text === '/') return;

    if ($nav.find('.bda-breadcrumb__item').length > 0) {
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
      if ($nav.find('.bda-breadcrumb__item').length > 0) {
        $('<i class="fa fa-chevron-right bda-breadcrumb__sep"></i>').appendTo($nav);
      }
      $(`<span class="bda-breadcrumb__item bda-breadcrumb__item--active">${text}</span>`).appendTo($nav);
    }
  }

  if ($copyBtn.length) $nav.append($copyBtn);
  $h1.replaceWith($nav);
}

function normalizeAtgSectionTables(): void {
  // Targets every ATG-rendered table that immediately follows a section h1
  // (Properties, Event Sets, Methods, String Value, etc.)
  $('h1').each(function () {
    const $h1 = $(this);
    const $table = $h1.next('table');
    if ($table.length === 0) return;

    // Normalize table styles (skip if already processed by repository module)
    if (!$table.hasClass('bda-section-table')) {
      $table.addClass('bda-section-table');
      $table.removeAttr('style').removeAttr('bgcolor').removeAttr('background');
      $table.find('tr, td, th').removeAttr('bgcolor').removeAttr('background')
        .removeAttr('valign').removeAttr('style');

      $table.find('tr:first-child td, tr:first-child th').addClass('bda-section-table__header');
      $table.find('tr.even td, tr.even th').addClass('bda-section-table__alt');

      // Simplify fully-qualified Java class names to short form, store full name as title
      $table.find('td').each(function () {
        const $td = $(this);
        const text = $td.text().trim();

        // Pattern 1: pure class name — "com.example.Foo"
        if (text.includes('.') && /^[\w.]+$/.test(text) && !text.startsWith('/')) {
          const simpleName = text.split('.').pop() ?? text;
          $td.text(simpleName).attr('title', text);
          return;
        }

        // Pattern 2: "Class com.example.Foo" — possibly with an inner <a> link
        const classMatch = text.match(/^Class\s+([\w.]+)$/);
        if (classMatch) {
          const fullName = classMatch[1];
          const simpleName = fullName.split('.').pop() ?? fullName;
          const $link = $td.find('a').first();
          if ($link.length > 0) {
            $link.text(simpleName).attr('title', fullName);
            $td.contents().filter(function () { return this.nodeType === 3; }).remove();
          } else {
            $td.text(simpleName).attr('title', `Class ${fullName}`);
          }
        }
      });
    }

    // Wrap h1 + table in a card
    const heading = $h1.text().trim();
    const $card = $('<div class="bda-section-card"></div>');
    const $header = $('<div class="bda-section-card__header"></div>');

    // Choose icon based on heading text
    let icon = 'fa-list';
    if (heading.includes('Properties')) icon = 'fa-list-ul';
    else if (heading.includes('Event')) icon = 'fa-bolt';
    else if (heading.includes('Method')) icon = 'fa-code';
    else if (heading.includes('String Value')) icon = 'fa-hashtag';

    // Extract toggle button if it was appended inside the h1
    const $toggleInH1 = $h1.find('.bda-toggle-btn, .showMore');
    const $toggleAfterTable = $table.next('.bda-toggle-btn, .showMore, a.showMore');

    // Clean heading text (remove any toggle button text that got mixed in)
    const cleanHeading = heading.replace(/Show (more|less)\.\.\./g, '').trim();
    $header.append(`<h2><i class="fa ${icon}"></i> ${cleanHeading}</h2>`);

    // Move toggle button to header
    if ($toggleInH1.length > 0) {
      $header.append($toggleInH1.detach());
    } else if ($toggleAfterTable.length > 0) {
      $header.append($toggleAfterTable.detach());
    }

    const $body = $('<div class="bda-section-card__body"></div>');

    // Move table into card (not clone — preserves jQuery bindings and avoids display issues)
    $table.css('display', '');  // Reset any display:none set before card wrapping

    // Special handling for "String Value" — render as dark code block
    if (heading.includes('String Value')) {
      const valueText = $table.find('td').text().trim();
      $body.append($('<div class="bda-string-value"></div>').text(valueText));
      $table.remove();
    } else {
      $body.append($table);
    }

    // Check initial collapsed state (set via data-bda-collapsed by repository module)
    if ($h1.attr('data-bda-collapsed') === 'true') {
      $body.hide();
    }

    $card.append($header, $body);
    $h1.before($card);
    $h1.remove();
  });
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
// Component Browser page enhancements
// ---------------------------------------------------------------------------

function enhanceAdminLink(): void {
  const $adminLink = $('a').filter(function () {
    return !!($(this).text().trim().match(/^admin\/?$/));
  }).first();

  if ($adminLink.length === 0) return;

  $adminLink
    .addClass('bda-root-badge')
    .html('<i class="fa fa-home"></i> admin');

  // Place badge inside the breadcrumb, after the copy button
  const $breadcrumb = $('nav.bda-breadcrumb');
  if ($breadcrumb.length > 0) {
    $breadcrumb.append($adminLink);
  }
}

function enhanceComponentBrowserTitle(): void {
  const $title = $('h1').filter(function () {
    return $(this).text().trim() === 'Component Browser';
  }).first();

  if ($title.length > 0) {
    $title.addClass('bda-component-browser-title');
  }
}

function cleanupAtgSearchElements(): void {
  // Remove the ATG search form, its preceding "Search" link, and context/inline elements
  const $searchForm = $('form#search').first();
  if ($searchForm.length === 0) return;

  $searchForm.prevAll('a').filter(function () {
    return $(this).text().trim() === 'Search';
  }).remove();

  $searchForm.nextAll('a').filter(function () {
    return !$(this).hasClass('bda-root-badge') && !$(this).hasClass('bda-btn');
  }).remove();

  $searchForm.siblings('p').filter(function () {
    return (this as HTMLElement).style.display === 'inline';
  }).remove();

  $searchForm.remove();
}

function enhanceClassMetadata(): void {
  // Anchor: setupFindClassLink injects <span><a href="/dyn/dyn/findclass.jhtml?...">Find Class</a></span>
  const $findClassAnchor = $('a[href*="findclass.jhtml"]').first();
  if ($findClassAnchor.length === 0) return;

  // The span wrapper around "Find Class" (may or may not exist)
  const $findClassContainer = $findClassAnchor.parent('span');
  const $base = $findClassContainer.length > 0 ? $findClassContainer : $findClassAnchor;

  // setupCopyClipboardButtons inserts a copy button after the class link
  const $prevEl = $base.prev();
  let $classLink: JQuery;
  let $copyBtn: JQuery;

  if ($prevEl.is('.bda-btn--ghost, .bda-btn--icon, button')) {
    $copyBtn = $prevEl;
    $classLink = $copyBtn.prev('a');
  } else {
    $copyBtn = $();
    $classLink = $prevEl.filter('a');
  }

  if ($classLink.length === 0) return;

  const $parent = $classLink.parent();

  const $metaSection = $('<div class="bda-meta-section"></div>');
  const $classRow = $('<div class="bda-class-row"></div>');

  $classRow.append('<span class="bda-meta-label"><i class="fa fa-cube"></i> Class</span>');
  $classRow.append($classLink.clone().addClass('bda-class-name'));
  if ($copyBtn.length > 0) $classRow.append($copyBtn.clone().addClass('bda-btn bda-btn--ghost bda-btn--sm'));
  $classRow.append(
    $findClassAnchor.clone()
      .addClass('bda-btn bda-btn--ghost bda-btn--sm')
      .prepend('<i class="fa fa-search"></i> '),
  );

  $metaSection.append($classRow);

  // Action links (may be siblings of classLink or in adjacent elements)
  const $actionLinks = $('a').filter(function () {
    const text = $(this).text();
    return text.includes('Service Configuration') ||
           text.includes('Repository Template') ||
           text.includes('Examine');
  });

  if ($actionLinks.length > 0) {
    const $actionsRow = $('<div class="bda-actions-row"></div>');

    $actionLinks.each(function () {
      const $link = $(this).clone().addClass('bda-btn bda-btn--secondary');
      const text = $link.text();
      if (text.includes('Configuration')) {
        $link.prepend('<i class="fa fa-cog"></i> ');
      } else {
        $link.prepend('<i class="fa fa-file-code-o"></i> ');
      }
      $actionsRow.append($link);
    });

    $metaSection.append($actionsRow);
  }

  // Insert the new section before the class link, then remove originals
  $classLink.before($metaSection);
  $classLink.remove();
  if ($copyBtn.length > 0) $copyBtn.remove();
  ($findClassContainer.length > 0 ? $findClassContainer : $findClassAnchor).remove();
  $actionLinks.each(function () { $(this).remove(); });

  // Remove orphaned commas and "Class " text nodes in the parent
  $parent.contents().filter(function () {
    const text = (this.textContent ?? '').trim();
    return this.nodeType === 3 && (/^\s*,\s*$/.test(text) || text.startsWith('Class'));
  }).remove();
}

function buildPageHeaderSection(): void {
  const $breadcrumb = $('nav.bda-breadcrumb').first();
  const $metaSection = $('.bda-meta-section').first();

  const $anchor = $breadcrumb.length > 0 ? $breadcrumb
    : $metaSection.length > 0 ? $metaSection
    : null;
  if (!$anchor) return;

  const $header = $('<div class="bda-page-header"></div>');
  const $card = $('<div class="bda-page-header-card"></div>');
  $anchor.before($header);
  $header.append($card);

  if ($breadcrumb.length > 0) $card.append($breadcrumb);
  if ($metaSection.length > 0) $card.append($metaSection);
}

// ---------------------------------------------------------------------------
// Main init
// ---------------------------------------------------------------------------

function init(): void {
  console.time('bda');
  console.log('Start BDA script');

  const oldDynamo = isOldDynamo();
  const componentPage = isComponentPage();
  const bdaConfig = {
    oldDynamoAltSelector: OLD_DYNAMO_ALT_SELECTORS,
    isOldDynamo: oldDynamo,
    isComponentPage: componentPage,
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
  new BdaComponentSearch().init();
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

  // Normalize all ATG section tables (Properties, Event Sets, Methods, etc.)
  // Runs for every page so non-repository component pages are also covered
  normalizeAtgSectionTables();

  // Component Browser page enhancements (run after breadcrumb is set up)
  enhanceAdminLink();
  enhanceComponentBrowserTitle();
  enhanceClassMetadata();
  buildPageHeaderSection();
  cleanupAtgSearchElements();

  // Wrap remaining content in a centered container
  wrapContentInContainer();

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
