// ==UserScript==
// @name         Better Dynamo Administration v3 (TypeScript)
// @namespace    BetterDynAdmin
// @version      3.0.0
// @author       Gustavo Pickler
// @description  Refreshing ATG Dyn Admin
// @license      GPL-3.0
// @homepage     https://github.com/jc7447/BetterDynAdmin
// @homepageURL  https://github.com/jc7447/BetterDynAdmin#readme
// @source       https://github.com/jc7447/BetterDynAdmin.git
// @supportURL   https://github.com/jc7447/BetterDynAdmin/issues
// @downloadURL  https://raw.githubusercontent.com/jc7447/BetterDynAdmin/master/dist/bda.user.js
// @updateURL    https://raw.githubusercontent.com/jc7447/BetterDynAdmin/master/dist/bda.user.js
// @include      */dyn/admin/*
// @match        */dyn/admin/*
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// @require      https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery.tablesorter/2.31.3/js/jquery.tablesorter.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/xml/xml.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/show-hint.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/xml-hint.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/vis/4.21.0/vis.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/notify/0.4.2/notify.min.js
// @require      https://twitter.github.io/typeahead.js/releases/latest/typeahead.bundle.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery.textcomplete/1.8.5/jquery.textcomplete.min.js
// @resource     bootstrapCSS    https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css
// @resource     cmCSS           https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.css
// @resource     cmHint          https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/hint/show-hint.css
// @resource     fontAwesomeCSS  https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css
// @resource     hlCSS           https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css
// @resource     hljsThemeCSS    https://raw.githubusercontent.com/jc7447/BetterDynAdmin/master/lib/highlight.js/github_custom.css
// @resource     select2CSS      https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css
// @resource     tablesorterCSS  https://cdnjs.cloudflare.com/ajax/libs/jquery.tablesorter/2.31.3/css/theme.blue.min.css
// @resource     visCSS          https://cdnjs.cloudflare.com/ajax/libs/vis/4.21.0/vis.min.css
// @resource     whatsnew        https://raw.githubusercontent.com/jc7447/BetterDynAdmin/master/WHATSNEW.md
// @grant        GM_addStyle
// @grant        GM_deleteValue
// @grant        GM_getResourceText
// @grant        GM_getResourceURL
// @grant        GM_getValue
// @grant        GM_info
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        window.focus
// ==/UserScript==

(function () {
  'use strict';

  class BdaModal {
    constructor(opts) {
      this.mounted = false;
      this.keydownHandler = null;
      this.opts = opts;
      this.$overlay = $('<div class="bda-overlay" role="dialog" aria-modal="true"></div>');
      this.$modal = $('<div class="bda-modal"></div>');
      const $header = $('<div class="bda-modal__header"></div>');
      this.$titleEl = $('<h4 class="bda-modal__title"></h4>');
      if (opts.title !== void 0) this.$titleEl.text(opts.title);
      const $closeBtn = $(
        '<button class="bda-modal__close bda-btn bda-btn--icon" aria-label="Close"><i class="fa fa-times"></i></button>'
      );
      $closeBtn.on("click", () => this.hide());
      $header.append(this.$titleEl, $closeBtn);
      this.$body = $('<div class="bda-modal__body"></div>');
      this.setContent(opts.content);
      this.$modal.append($header, this.$body);
      if (opts.buttons && opts.buttons.length > 0) {
        const $footer = $('<div class="bda-modal__footer"></div>');
        opts.buttons.forEach((btn) => {
          const modifiers = btn.primary ? " bda-btn--primary" : btn.danger ? " bda-btn--danger" : "";
          const $btn = $(`<button class="bda-btn${modifiers}">${btn.label}</button>`);
          if (btn.id) $btn.attr("id", btn.id);
          if (btn.callback) $btn.on("click", () => btn.callback());
          $footer.append($btn);
        });
        this.$modal.append($footer);
      }
      if (opts.width) this.$modal.css({ width: opts.width, maxWidth: opts.width });
      this.$overlay.append(this.$modal);
      if (opts.closeOnBackdrop !== false) {
        this.$overlay.on("click", (e) => {
          if (e.target === this.$overlay[0]) this.hide();
        });
      }
    }
    /** The .bda-modal element — use to access inner content before first show */
    get $el() {
      return this.$modal;
    }
    setContent(content) {
      this.$body.empty();
      if (typeof content === "string") {
        this.$body.html(content);
      } else {
        this.$body.append(content);
      }
    }
    setTitle(title) {
      this.$titleEl.text(title);
    }
    /**
     * Append to <body> immediately (hidden) so event bindings on inner IDs
     * work before the first `.show()` call.
     */
    mount() {
      if (!$.contains(document.body, this.$overlay[0])) {
        this.mounted = true;
        this.$overlay.addClass("bda-overlay--hidden");
        $("body").append(this.$overlay);
      }
      return this;
    }
    show() {
      if (!$.contains(document.body, this.$overlay[0])) {
        $("body").append(this.$overlay);
      }
      this.$overlay.removeClass("bda-overlay--hidden");
      requestAnimationFrame(() => {
        this.$overlay.addClass("bda-overlay--visible");
      });
      this.keydownHandler = (e) => {
        if (e.key === "Escape") this.hide();
      };
      document.addEventListener("keydown", this.keydownHandler);
      return this;
    }
    hide() {
      this.$overlay.removeClass("bda-overlay--visible");
      setTimeout(() => {
        var _a, _b;
        if (this.mounted) {
          this.$overlay.addClass("bda-overlay--hidden");
        } else {
          this.$overlay.detach();
        }
        if (this.keydownHandler) {
          document.removeEventListener("keydown", this.keydownHandler);
          this.keydownHandler = null;
        }
        (_b = (_a = this.opts).onClose) == null ? void 0 : _b.call(_a);
      }, 200);
    }
    destroy() {
      if (this.keydownHandler) {
        document.removeEventListener("keydown", this.keydownHandler);
        this.keydownHandler = null;
      }
      this.$overlay.remove();
    }
  }
  const xmlDefinitionCacheTimeout = 1200;
  function formatString(template, ...args) {
    return template.replace(/{(\d+)}/g, (match, number) => {
      const idx = parseInt(number, 10);
      return typeof args[idx] !== "undefined" ? String(args[idx]) : match;
    });
  }
  function isNull(object) {
    return object === null || object === void 0;
  }
  function buildArray(stringIn) {
    const cleaned = stringIn.replace(/[ \t]/g, "").replace(/,,+/g, ",");
    if (cleaned !== "") return cleaned.split(",");
    return [];
  }
  function buildTagsFromArray(tagNames, defaultValue) {
    const value = defaultValue;
    const tags = {};
    for (const tagName of tagNames) {
      const tag = { selected: value, name: tagName };
      tags[tagName] = tag;
    }
    logTrace("buildTagsFromArray " + JSON.stringify(tags));
    return tags;
  }
  function unique(array) {
    const seen = {};
    const result = [];
    for (const item of array) {
      const key = String(item);
      if (!seen[key]) {
        seen[key] = true;
        result.push(item);
      }
    }
    return result;
  }
  function stringCompare(a, b) {
    if (a !== null && b !== null) return a.localeCompare(b, "en", { caseFirst: "upper" });
    if (b !== null) return -1;
    return 0;
  }
  function sortArray(array) {
    logTrace("beforeSort : " + array);
    const sorted = [...array].sort(stringCompare);
    logTrace("after sort : " + sorted);
    return sorted;
  }
  function purgeSlashes(str) {
    return str.replace(/([^:/])\/\/+/g, "$1/");
  }
  function getCurrentComponentPath() {
    return purgeSlashes(document.location.pathname.replace("/dyn/admin/nucleus", ""));
  }
  function getComponentNameFromPath(componentPath) {
    let path = componentPath;
    if (path[path.length - 1] === "/") path = path.substring(0, path.length - 1);
    const tab = path.split("/");
    return tab[tab.length - 1];
  }
  function getComponentShortName(componentName) {
    let shortName = "";
    for (const character of componentName) {
      if (character === character.toUpperCase() && character !== ".") shortName += character;
    }
    return shortName;
  }
  function logTrace(...args) {
  }
  function copyToClipboard(text) {
    GM_setClipboard(text);
    $.notify("Data has been added to your clipboard", {
      position: "top center",
      className: "success"
    });
  }
  function colorToCss(colors) {
    return "rgb(" + colors.join(",") + ")";
  }
  function verifyColor(colors) {
    return colors.map((c) => c > 210 ? 210 : c);
  }
  function stringToColour(str) {
    const colors = [];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    for (let i = 0; i < 3; i++) {
      const value = hash >> i * 8 & 255;
      const hexVal = ("00" + value.toString(16)).substr(-2);
      colors.push(parseInt(hexVal, 16));
    }
    return verifyColor(colors);
  }
  function processRepositoryXmlDef(property, callback) {
    if (callback === void 0) return;
    const rawXmlDef = getXmlDef(getCurrentComponentPath());
    if (rawXmlDef !== null) {
      logTrace("Getting XML def from cache");
      const xmlDoc = jQuery.parseXML(rawXmlDef);
      callback($(xmlDoc));
      return;
    }
    const url = location.protocol + "//" + location.host + location.pathname + "?propertyName=" + property;
    logTrace(url);
    jQuery.ajax({
      url,
      success(result) {
        const $result = $(result);
        if ($result.find("pre").length > 0) {
          let raw = $result.find("pre").html().trim().replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace("&nbsp;", "").replace(
            '<!DOCTYPE gsa-template SYSTEM "dynamosystemresource:/atg/dtds/gsa/gsa_1.0.dtd">',
            ""
          );
          try {
            logTrace("XML def length : " + raw.length);
            const xmlDoc = jQuery.parseXML(raw);
            storeXmlDef(getCurrentComponentPath(), raw);
            callback($(xmlDoc));
          } catch (err) {
            logTrace("Unable to parse XML def file !");
            callback(null);
            logTrace(err);
          }
        } else {
          callback(null);
        }
      }
    });
  }
  function getXmlDef(componentPath) {
    logTrace("Getting XML def for : " + componentPath);
    const timestamp = Math.floor(Date.now() / 1e3);
    const raw = localStorage.getItem("XMLDefMetaData");
    if (!raw) return null;
    const xmlDefMetaData = JSON.parse(raw);
    if (xmlDefMetaData.componentPath !== componentPath || xmlDefMetaData.timestamp + xmlDefinitionCacheTimeout < timestamp) {
      logTrace("Xml def is outdated or from a different component");
      return null;
    }
    return localStorage.getItem("XMLDefData");
  }
  function storeXmlDef(componentPath, rawXML) {
    logTrace("Storing XML def : " + componentPath);
    const timestamp = Math.floor(Date.now() / 1e3);
    localStorage.setItem("XMLDefMetaData", JSON.stringify({ componentPath, timestamp }));
    localStorage.setItem("XMLDefData", rawXML);
  }
  function highlightAndIndentXml($elm) {
    logTrace("Start highlightAndIndentXml");
    $elm.each(function() {
      var _a;
      const escapeXML = $(this).html();
      const div = document.createElement("div");
      div.innerHTML = escapeXML;
      let unescapeXML = div.textContent ?? "";
      unescapeXML = ((_a = window.vkbeautify) == null ? void 0 : _a.xml(unescapeXML, 2)) ?? unescapeXML;
      const $codeBlock = $(this).empty().append("<code class='xml'></code>").find("code").text(unescapeXML);
      logTrace($codeBlock.get(0));
      if (window.hljs && $codeBlock.get(0)) {
        window.hljs.highlightElement($codeBlock.get(0));
      }
      $codeBlock.find(
        "span.hljs-attribute:contains('jndi'), span.hljs-attribute:contains('repository')"
      ).each(function() {
        const $value = $(this).next();
        const url = "/dyn/admin/nucleus" + $value.text().replace(/"/g, "");
        $value.wrap("<a target='_blank' class='clickable' href='" + url + "' ></a>");
        $value.append("<i class='fa fa-external-link'></i>");
      });
    });
  }
  function sanitizeXml(xmlContent) {
    console.time("sanitizeXml");
    const regexp = /<\!--(.*)(<set\-property.*><\!\[CDATA\[[\S\s]*?\]\]\><\/set\-property\>).*-->/gi;
    const xmlStr = xmlContent.replace(regexp, (_str, p1, p2) => {
      let attributes = "set-property ";
      if (p1.indexOf("derived") !== -1) attributes += 'derived="true" ';
      if (p1.indexOf("rdonly") !== -1) attributes += 'rdonly="true" ';
      if (p1.indexOf("export") !== -1) attributes += 'export="true" ';
      return p2.replace("set-property", attributes);
    });
    console.timeEnd("sanitizeXml");
    return xmlStr;
  }
  function registerJQueryExtensions() {
    $.fn.outerHTML = function(s) {
      if (s !== void 0) return this.before(s).remove();
      return $("<p>").append(this.eq(0).clone()).html();
    };
    $.fn.adjustToFit = function($parent, targetTotalSize, minSize) {
      const curSize = $parent.fullHeight();
      const delta = targetTotalSize - curSize;
      let hThis = parseFloat(this.css("height").replace("px", ""));
      hThis += delta;
      if (!isNull(minSize) && minSize !== void 0 && minSize !== null) {
        hThis = Math.max(minSize, hThis);
      }
      this.setHeightAndMax(hThis);
      return this;
    };
    $.fn.fullHeight = function() {
      const h = parseFloat(this.css("height").replace("px", ""));
      const mBot = parseFloat(this.css("margin-bottom").replace("px", ""));
      const mTop = parseFloat(this.css("margin-top").replace("px", ""));
      return h + mTop + mBot;
    };
    $.fn.setHeightAndMax = function(value) {
      this.css("max-height", value + "px");
      this.css("height", value + "px");
      return this;
    };
    $.fn.toCSV = function() {
      const data = [];
      $(this).find("tr").each(function(_, elem) {
        const $tr = $(elem);
        const line = [];
        $tr.children("th").each(function() {
          line.push($(this).text());
        });
        $tr.children("td").each(function() {
          line.push($(this).text());
        });
        if (line.length > 0) data.push(line);
      });
      return data.map((row) => row.join(";")).join("\n");
    };
    $.fn.sortContent = function(selector, sortFunction) {
      const $this = $(this);
      let $elems = $this.find(selector);
      logTrace("selector " + selector);
      logTrace($elems.length);
      $elems = $(Array.from($elems).sort(sortFunction));
      $elems.detach().appendTo($this);
      return this;
    };
    $.fn.highlight = function(pat) {
      function innerHighlight(node, patUpper) {
        var _a;
        let skip = 0;
        if (node.nodeType === 3) {
          const textNode = node;
          const pos = (textNode.data ?? "").toUpperCase().indexOf(patUpper);
          if (pos >= 0) {
            const spannode = document.createElement("span");
            spannode.className = "highlight";
            const middlebit = textNode.splitText(pos);
            middlebit.splitText(patUpper.length);
            const middleclone = middlebit.cloneNode(true);
            spannode.appendChild(middleclone);
            (_a = middlebit.parentNode) == null ? void 0 : _a.replaceChild(spannode, middlebit);
            skip = 1;
          }
        } else if (node.nodeType === 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
          for (let i = 0; i < node.childNodes.length; ++i) {
            i += innerHighlight(node.childNodes[i], patUpper);
          }
        }
        return skip;
      }
      return this.length && pat && pat.length ? this.each(function() {
        innerHighlight(this, pat.toUpperCase());
      }) : this;
    };
    $.fn.removeHighlight = function() {
      return this.find("span.highlight").each(function() {
        const parent = this.parentNode;
        if (parent) {
          parent.replaceChild(this.firstChild, this);
          parent.normalize();
        }
      }).end();
    };
    const pluginName = "bdaAlert";
    $.fn[pluginName] = function(options) {
      try {
        return this.each(function() {
          const modal = new BdaModal({
            content: options.msg,
            closeOnBackdrop: false,
            buttons: options.options.map((opt) => ({
              label: opt.label,
              callback: opt._callback
            }))
          });
          modal.show();
        });
      } catch (e) {
        console.error(e);
      }
      return this;
    };
  }
  function rotateArrow($arrow) {
    if ($arrow.hasClass("fa-arrow-down"))
      $arrow.removeClass("fa-arrow-down").addClass("fa-arrow-up");
    else $arrow.removeClass("fa-arrow-up").addClass("fa-arrow-down");
  }
  const STORED_CONFIG = "BdaConfiguration";
  const STORED_COMPONENTS = "BdaComponents";
  const STORED_QUERIES = "BdaRQLQueries";
  const STORED_SCRIPTS = "BdaDashScripts";
  const STORED_TOGGLE = "BdaToggleState";
  const STORED_HISTORY = "BdaComponentHistory";
  const GM_VALUE_BACKUP = "BDA_GM_Backup";
  class BdaStorage {
    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------
    getConfigurationValue(name) {
      const config = this.getStoredConfiguration();
      return (config == null ? void 0 : config[name]) ?? null;
    }
    getStoredConfiguration() {
      const raw = localStorage.getItem(STORED_CONFIG);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    storeConfiguration(name, value) {
      const config = this.getStoredConfiguration() ?? {};
      config[name] = value;
      this.storeItem(STORED_CONFIG, config);
    }
    // -------------------------------------------------------------------------
    // Generic storage with mono-instance support
    // -------------------------------------------------------------------------
    storeItem(itemName, itemValue) {
      const json = JSON.stringify(itemValue);
      localStorage.setItem(itemName, json);
      const monoInstance = this.getConfigurationValue("mono_instance");
      if (monoInstance === true) {
        GM_setValue(GM_VALUE_BACKUP + "_" + itemName, json);
      }
    }
    getItem(itemName) {
      let raw = localStorage.getItem(itemName);
      if (!raw) {
        const monoInstance = this.getConfigurationValue("mono_instance");
        if (monoInstance === true) {
          const backup = GM_getValue(GM_VALUE_BACKUP + "_" + itemName);
          if (backup) {
            localStorage.setItem(itemName, backup);
            raw = backup;
          }
        }
      }
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    // -------------------------------------------------------------------------
    // Array helpers
    // -------------------------------------------------------------------------
    getStoredArray(name) {
      return this.getItem(name) ?? [];
    }
    storeUniqueArray(name, array, doConcat) {
      let existing = this.getStoredArray(name);
      if (doConcat) existing = existing.concat(array);
      else existing = array;
      this.storeItem(name, unique(existing));
    }
    // -------------------------------------------------------------------------
    // Components (favorites)
    // -------------------------------------------------------------------------
    getStoredComponents() {
      return this.getItem(STORED_COMPONENTS) ?? [];
    }
    storeComponent(component) {
      const components = this.getStoredComponents();
      const idx = components.findIndex((c) => c.path === component.path);
      if (idx >= 0) components[idx] = component;
      else components.push(component);
      this.storeItem(STORED_COMPONENTS, components);
    }
    deleteComponent(path) {
      const components = this.getStoredComponents().filter((c) => c.path !== path);
      this.storeItem(STORED_COMPONENTS, components);
    }
    // -------------------------------------------------------------------------
    // Component history
    // -------------------------------------------------------------------------
    getComponentHistory() {
      return this.getItem(STORED_HISTORY) ?? [];
    }
    addToHistory(path) {
      const history = this.getComponentHistory().filter((p) => p !== path);
      history.unshift(path);
      this.storeItem(STORED_HISTORY, history.slice(0, 50));
    }
    // -------------------------------------------------------------------------
    // Tags
    // -------------------------------------------------------------------------
    getTags() {
      const config = this.getStoredConfiguration();
      return (config == null ? void 0 : config["tags"]) ?? [];
    }
    saveTags(tags) {
      this.storeConfiguration("tags", tags);
    }
    // -------------------------------------------------------------------------
    // RQL Queries
    // -------------------------------------------------------------------------
    getStoredRQLQueries() {
      return this.getItem(STORED_QUERIES) ?? [];
    }
    getQueryByName(name) {
      return this.getStoredRQLQueries().find((q) => q.name === name);
    }
    storeQuery(query) {
      const queries = this.getStoredRQLQueries();
      const idx = queries.findIndex((q) => q.name === query.name);
      if (idx >= 0) queries[idx] = query;
      else queries.push(query);
      this.storeItem(STORED_QUERIES, queries);
    }
    deleteQuery(name) {
      const queries = this.getStoredRQLQueries().filter((q) => q.name !== name);
      this.storeItem(STORED_QUERIES, queries);
    }
    // -------------------------------------------------------------------------
    // DASH Scripts
    // -------------------------------------------------------------------------
    getScripts() {
      return this.getItem(STORED_SCRIPTS) ?? [];
    }
    storeScript(script) {
      const scripts = this.getScripts();
      const idx = scripts.findIndex((s) => s.name === script.name);
      if (idx >= 0) scripts[idx] = script;
      else scripts.push(script);
      this.storeItem(STORED_SCRIPTS, scripts);
    }
    deleteScript(name) {
      const scripts = this.getScripts().filter((s) => s.name !== name);
      this.storeItem(STORED_SCRIPTS, scripts);
    }
    // -------------------------------------------------------------------------
    // Toggle state
    // -------------------------------------------------------------------------
    getToggleObj() {
      return this.getItem(STORED_TOGGLE) ?? {};
    }
    storeToggleState(key, value) {
      const toggleObj = this.getToggleObj();
      toggleObj[key] = value;
      this.storeItem(STORED_TOGGLE, toggleObj);
    }
    // -------------------------------------------------------------------------
    // Backup / Restore
    // -------------------------------------------------------------------------
    getData() {
      return {
        components: this.getStoredComponents(),
        queries: this.getStoredRQLQueries(),
        config: this.getStoredConfiguration() ?? {},
        scripts: this.getScripts()
      };
    }
    restoreData(data, reloadUI) {
      logTrace("Restoring BDA data");
      if (data.components) this.storeItem(STORED_COMPONENTS, data.components);
      if (data.queries) this.storeItem(STORED_QUERIES, data.queries);
      if (data.config) this.storeItem(STORED_CONFIG, data.config);
      if (data.scripts) this.storeItem(STORED_SCRIPTS, data.scripts);
      if (reloadUI) location.reload();
    }
    // -------------------------------------------------------------------------
    // Utility: component name from stored path
    // -------------------------------------------------------------------------
    getComponentLabel(path) {
      return getComponentNameFromPath(path);
    }
  }
  const bdaStorage = new BdaStorage();
  class BdaToolbar {
    constructor(bda) {
      this.addComponentModal = null;
      this.bda = bda;
    }
    init() {
      console.time("bdaToolbar");
      logTrace("BdaToolbar init");
      this.showComponentHistory();
      this.createToolbar();
      if (this.bda.isComponentPage) this.collectHistory();
      console.timeEnd("bdaToolbar");
    }
    // -------------------------------------------------------------------------
    // History
    // -------------------------------------------------------------------------
    collectHistory() {
      if (document.URL.indexOf("?") >= 0) return;
      if (document.URL.indexOf("#") >= 0) return;
      const componentPath = purgeSlashes(document.location.pathname);
      const history = JSON.parse(localStorage.getItem("componentHistory") ?? "[]");
      if (history.indexOf(componentPath) === -1) {
        logTrace("Collect : " + componentPath);
        history.unshift(componentPath);
        const trimmed = history.slice(0, 10);
        bdaStorage.storeItem("componentHistory", trimmed);
      }
    }
    showComponentHistory() {
      const $hist = $("<div id='history'></div>").insertAfter(this.bda.logoSelector);
      const history = JSON.parse(localStorage.getItem("componentHistory") ?? "[]");
      if (history.length === 0) return;
      const $list = $('<div class="bda-history-list"></div>').appendTo($hist);
      history.forEach((comp) => {
        $(`<a class="bda-history-pill" href="${comp}">${getComponentNameFromPath(comp)}</a>`).appendTo($list);
      });
    }
    // -------------------------------------------------------------------------
    // Tag management
    // -------------------------------------------------------------------------
    addTags(newTags) {
      const existingTags = bdaStorage.getTags();
      for (const name in newTags) {
        if (!(name in existingTags)) {
          existingTags[name] = newTags[name];
        }
      }
      bdaStorage.saveTags(existingTags);
    }
    clearTags() {
      const savedTags = bdaStorage.getTags();
      for (const tagName in savedTags) savedTags[tagName].selected = false;
      bdaStorage.saveTags(savedTags);
      this.reloadToolbar();
    }
    // -------------------------------------------------------------------------
    // Toolbar management
    // -------------------------------------------------------------------------
    deleteComponent(componentName) {
      const components = bdaStorage.getStoredComponents();
      const filtered = components.filter((c) => c.name !== componentName);
      bdaStorage.storeItem("Components", filtered);
      this.reloadToolbar();
    }
    storeComponent(componentPath, methods, vars, tags) {
      const compName = getComponentNameFromPath(componentPath);
      const storedComps = bdaStorage.getStoredComponents();
      storedComps.length > 0 ? storedComps[storedComps.length - 1].path.length : 0;
      const component = {
        path: componentPath,
        name: compName,
        color: stringToColour(compName),
        tags,
        shortName: getComponentShortName(compName)
      };
      bdaStorage.storeComponent(component);
      const tagMap = buildTagsFromArray(tags, false);
      this.addTags(tagMap);
    }
    isComponentAlreadyStored(componentPath) {
      return bdaStorage.getStoredComponents().some((c) => c.path === componentPath);
    }
    reloadToolbar() {
      this.deleteToolbar();
      this.createToolbar();
    }
    deleteToolbar() {
      $("#toolbar").remove();
      $("#toolbarHeader").remove();
      $("#toolbarContainer").remove();
      $("#addComponentToolbarPopup").remove();
    }
    getBorderColor(colors) {
      return colorToCss(colors.map((c) => Math.max(0, c - 50)));
    }
    // -------------------------------------------------------------------------
    // Create toolbar
    // -------------------------------------------------------------------------
    createToolbar() {
      this.createAddPopup();
      this.addExistingTagsToToolbarPopup();
      const favs = bdaStorage.getStoredComponents();
      $("<div id='toolbarContainer'></div>").insertAfter(this.bda.logoSelector);
      $("<div id='toolbar'></div>").appendTo("#toolbarContainer");
      const tags = bdaStorage.getTags();
      const selectedTags = [];
      for (const tagName in tags) {
        if (tags[tagName].selected) selectedTags.push(tagName);
      }
      favs.forEach((fav) => {
        const show = selectedTags.length === 0 || fav.tags && fav.tags.some((t) => selectedTags.includes(t));
        if (!show) return;
        const colors = fav.color ?? stringToColour(fav.name);
        const shortName = fav.shortName ?? getComponentShortName(fav.name);
        const favId = encodeURIComponent(fav.path);
        const favTags = (fav.tags ?? []).map((t, i, arr) => "#" + t + (i < arr.length - 1 ? "," : "")).join("");
        $("<div class='toolbar-elem fav'></div>").html(
          `<div class='fav-color-bar' style='background:${colorToCss(colors)}'></div><div class='favLink'><a href='${fav.path}' title='${fav.name}'><div class='favTitle'>${shortName}</div><div class='favName'>${fav.name}</div></a></div><div class='favArrow' id='favArrow${favId}'><i class='fa fa-chevron-down'></i></div><div class='favMoreInfo' id='favMoreInfo${favId}'><div class='favLogDebug'><form method='POST' action='${fav.path}' id='logDebugForm${fav.name}'><input type='hidden' value='loggingDebug' name='propertyName'><input type='hidden' value='' name='newValue'>logDebug : <a href='javascript:void(0)' class='logdebug' id='logDebug${fav.name}'>true</a>&nbsp;|&nbsp;<a href='javascript:void(0)' class='logdebug' id='logDebug${fav.name}'>false</a></form></div><div class='favDelete' id='delete${fav.name}'><i class='fa fa-trash-o'></i> Delete</div><div class='fav-tags'>${favTags}</div></div>`
        ).appendTo("#toolbar");
      });
      $(".favArrow").on("click", function() {
        const id = this.id;
        const idToExpand = "#" + id.replace("favArrow", "favMoreInfo");
        $(idToExpand).slideToggle();
        rotateArrow($("#" + id + " i"));
      });
      $(".favDelete").on("click", (e) => {
        const componentName = e.currentTarget.id.replace("delete", "");
        this.deleteComponent(componentName);
      });
      $(".logdebug").on("click", function() {
        const componentName = this.id.replace("logDebug", "");
        const logDebugState = this.innerHTML;
        $(`#logDebugForm${componentName} input[name=newValue]`).val(logDebugState);
        $(`#logDebugForm${componentName}`).trigger("submit");
      });
      if (this.bda.isComponentPage) {
        const componentPath = purgeSlashes(document.location.pathname);
        if (!this.isComponentAlreadyStored(componentPath)) {
          $("<div class='toolbar-elem newFav'><button class='bda-btn bda-btn--sm' id='addComponent' title='Add to favorites'><i class='fa fa-plus'></i> Add</button></div>").appendTo("#toolbar");
          $("#submitComponent").on("click", () => {
            var _a;
            (_a = this.addComponentModal) == null ? void 0 : _a.hide();
            const methods = [];
            const vars = [];
            $(".method:checked").each(function() {
              var _a2;
              methods.push(((_a2 = this.parentElement) == null ? void 0 : _a2.textContent) ?? "");
            });
            $(".variable:checked").each(function() {
              var _a2;
              vars.push(((_a2 = this.parentElement) == null ? void 0 : _a2.textContent) ?? "");
            });
            let tags2 = buildArray($("#newtags").val());
            $(".tag:checked").each(function() {
              var _a2;
              tags2.push(((_a2 = this.parentElement) == null ? void 0 : _a2.textContent) ?? "");
            });
            tags2 = unique(tags2);
            this.storeComponent(componentPath, methods, vars, tags2);
            this.reloadToolbar();
          });
          $("#addComponent").on("click", () => {
            var _a;
            const $methodsList = $("#methods").empty();
            const $varsList = $("#vars").empty();
            $('h1:contains("Methods")').next().find("tr").each(function(index) {
              if (index > 0) {
                const linkMethod = $(this).find("a").first();
                const methodName = (linkMethod.attr("href") ?? "").split("=")[1];
                if (methodName) {
                  $methodsList.append(
                    `<li><input type="checkbox" class="method" id="method_${methodName}"><label for="method_${methodName}">${methodName}</label></li>`
                  );
                }
              }
            });
            const defMethods = bdaStorage.getConfigurationValue("default_methods");
            if (defMethods) defMethods.forEach((m) => {
              $(`#method_${m}`).prop("checked", true);
            });
            $('h1:contains("Properties")').next().find("tr").each(function(index) {
              if (index > 0) {
                const linkVariable = $(this).find("a").first();
                const variableName = (linkVariable.attr("href") ?? "").split("=")[1];
                if (variableName) {
                  $varsList.append(
                    `<li><input type="checkbox" class="variable" id="var_${variableName}"><label for="var_${variableName}">${variableName}</label></li>`
                  );
                }
              }
            });
            const defProperties = bdaStorage.getConfigurationValue("default_properties");
            if (defProperties) defProperties.forEach((p) => {
              $(`#var_${p}`).prop("checked", true);
            });
            (_a = this.addComponentModal) == null ? void 0 : _a.show();
          });
        }
      }
      this.addFavTagList();
    }
    createAddPopup() {
      const $content = $(
        "<p>Choose methods and/or properties to shortcut : </p><div id='addComponentToolbarPopupContent'><div id='methods'></div><div id='vars'></div></div><div id='favSetTags'><div class='favline'><div>Add tags:</div><div><ul id='existingTags'></ul></div></div><div class='favline'><div>New tags:</div><div><input id='newtags' class='newtags' type='text' placeholder='comma separated'></div></div></div><div class='addFavSubmit'><button type='button' id='submitComponent' class='bda-btn bda-btn--primary'>Add <i class='fa fa-play'></i></button></div>"
      );
      this.addComponentModal = new BdaModal({
        title: "Add new component",
        content: $content
      }).mount();
    }
    addExistingTagsToToolbarPopup() {
      const tags = bdaStorage.getTags();
      const $tagList = $("#existingTags");
      const sortedTags = sortArray(Object.keys(tags));
      sortedTags.forEach((tagValue) => {
        const $li = $("<li></li>").appendTo($tagList);
        $("<input/>", { id: `tagSelector_${tagValue}`, type: "checkbox", name: tagValue, class: "tag" }).appendTo($li);
        $(`<label for='tagSelector_${tagValue}'>${tagValue}</label>`).appendTo($li);
      });
    }
    addFavTagList() {
      logTrace("addFavTagList");
      const tags = bdaStorage.getTags();
      const $favline = $("<div id='favTagList' class='favline'>").appendTo("#toolbar");
      const $list = $("<ul></ul>");
      if (Object.keys(tags).length > 0) {
        $('<button id="clear-filters" class="bda-btn bda-btn--icon" title="Clear"><i class="fa fa-times" aria-hidden="true"></i></button>').on("click", () => {
          this.clearTags();
        }).appendTo($('<li class="tag-filter"></li>').appendTo($list));
      }
      const sortedTags = sortArray(Object.keys(tags));
      sortedTags.forEach((tagName) => {
        const tag = tags[tagName];
        const $li = $(`<li class="bda-tag-pill${tag.selected ? " bda-tag-pill--active" : ""}"></li>`).appendTo($list);
        $("<input/>", {
          id: `favFilter_${tagName}`,
          type: "checkbox",
          name: tagName,
          class: "favFilterTag",
          checked: tag.selected
        }).on("change", (e) => {
          const name = $(e.currentTarget).attr("name") ?? "";
          const allTags = bdaStorage.getTags();
          if (allTags[name]) allTags[name].selected = $(e.currentTarget).prop("checked");
          bdaStorage.saveTags(allTags);
          this.reloadToolbar();
        }).appendTo($li);
        $(`<label for='favFilter_${tagName}'>#${tagName}</label>`).appendTo($li);
      });
      $list.appendTo($favline);
    }
  }
  class BdaSearch {
    init(options = {}) {
      logTrace("BdaSearch init");
      const $searchField = $("#searchField");
      if ($searchField.length === 0) return;
      this.build($searchField, options);
    }
    build($input, options) {
      if (!window.Bloodhound) {
        logTrace("Bloodhound not available for search autocomplete");
        return;
      }
      const searchEndpoint = "/dyn/admin/atg/dynamo/admin/en/cmpn-search.jhtml?query=";
      const engine = new window.Bloodhound({
        datumTokenizer: window.Bloodhound.tokenizers.whitespace,
        queryTokenizer: window.Bloodhound.tokenizers.whitespace,
        remote: {
          url: searchEndpoint + "%QUERY",
          wildcard: "%QUERY",
          transform: (response) => {
            const $result = $(response);
            const results = [];
            $result.find("th:contains('Search Results:')").closest("table").find("td a").each(function() {
              const href = $(this).attr("href") ?? "";
              const path = href.replace("/dyn/admin/nucleus", "");
              if (path) results.push(path);
            });
            return results;
          }
        }
      });
      engine.initialize();
      const $wrapper = $('<div class="twbs bda-search-wrapper"></div>');
      $input.wrap($wrapper);
      $input.typeahead(
        {
          hint: true,
          highlight: true,
          minLength: 3
        },
        {
          name: "components",
          limit: 15,
          source: engine.ttAdapter(),
          templates: {
            suggestion: (data) => `<div class="bda-search-suggestion">${data}</div>`
          }
        }
      );
      if (options.align === "right") {
        $input.closest(".twitter-typeahead").find(".tt-menu").css("right", 0).css("left", "auto");
      }
      $input.on("typeahead:select", (_event, suggestion) => {
        location.href = `/dyn/admin/nucleus${suggestion}`;
      });
      logTrace("BdaSearch typeahead initialized");
    }
  }
  class BdaMenu {
    constructor() {
      this.search = new BdaSearch();
    }
    init() {
      console.time("bdaMenu");
      logTrace("BdaMenu init");
      if (bdaStorage.getConfigurationValue("dark_mode") === true) {
        $("body").addClass("bda-dark");
      }
      const $navbar = $('<nav id="bdaNavbar"></nav>').appendTo("body");
      const $left = $('<div class="bda-nav__left"></div>').appendTo($navbar);
      $('<span class="bda-nav__brand">BDA</span>').appendTo($left);
      this.createSearchBox($left);
      this.$navRight = $('<div class="bda-nav__right" id="bdaNavActions"></div>').appendTo($navbar);
      this.createAboutItem();
      this.createConfigItem();
      this.createWhatsnewItem();
      $(document).on("click.bdaNav", (e) => {
        if (!$(e.target).closest("#bdaNavbar").length) {
          this.closeAllDropdowns();
        }
      });
      console.timeEnd("bdaMenu");
    }
    // -------------------------------------------------------------------------
    // Navigation helpers
    // -------------------------------------------------------------------------
    createNavItem(id, icon, label) {
      const $item = $(`<div class="bda-nav__item" id="${id}"></div>`).appendTo(this.$navRight);
      const $btn = $(`<button class="bda-nav__btn"><i class="fa ${icon}"></i> ${label}</button>`).appendTo($item);
      const $dropdown = $(`<div class="bda-nav__dropdown" id="${id}Dropdown"></div>`).appendTo($item);
      $btn.on("click", (e) => {
        e.stopPropagation();
        const isOpen = $dropdown.hasClass("bda-nav__dropdown--open");
        this.closeAllDropdowns();
        if (!isOpen) {
          $dropdown.addClass("bda-nav__dropdown--open");
          $btn.addClass("bda-nav__btn--active");
        }
      });
      return { $btn, $dropdown };
    }
    closeAllDropdowns() {
      this.$navRight.find(".bda-nav__dropdown").removeClass("bda-nav__dropdown--open");
      this.$navRight.find(".bda-nav__btn").removeClass("bda-nav__btn--active");
    }
    // -------------------------------------------------------------------------
    // About panel
    // -------------------------------------------------------------------------
    createAboutItem() {
      const { $dropdown } = this.createNavItem("bdaBug", "fa-info-circle", "About");
      $dropdown.html(
        `<p>Better Dyn Admin has a <a target='_blank' href='https://github.com/jc7447/BetterDynAdmin'>GitHub page</a>.<br>
      Please report any bug in the <a target='_blank' href='https://github.com/jc7447/BetterDynAdmin/issues'>issues tracker</a>.
      <br><br><strong>BDA version ${GM_info.script.version}</strong></p>`
      );
    }
    // -------------------------------------------------------------------------
    // What's new panel
    // -------------------------------------------------------------------------
    createWhatsnewItem() {
      const { $btn, $dropdown } = this.createNavItem("whatsnew", "fa-star", "What's New");
      let loaded = false;
      $btn.on("click", () => {
        if (!loaded && $dropdown.hasClass("bda-nav__dropdown--open")) {
          $dropdown.html(GM_getResourceText("whatsnew"));
          loaded = true;
        }
      });
    }
    // -------------------------------------------------------------------------
    // Backup panel
    // -------------------------------------------------------------------------
    createBackupItem() {
      const { $dropdown } = this.createNavItem("bdaBackup", "fa-database", "Backup");
      $dropdown.html(
        "<p>Backup BDA data to keep your favorite components and stored queries safe.<br><br><strong>You can also import a backup from another domain!</strong></p><textarea id='bdaData' placeholder='Paste your data here to restore it.'></textarea><div style='margin-top:6px'><button id='bdaDataBackup' class='bda-btn'>Backup</button> <button id='bdaDataRestore' class='bda-btn'>Restore</button></div>"
      );
      $("#bdaDataBackup").on("click", () => {
        const data = bdaStorage.getData();
        logTrace("bdaDataBackup", data);
        copyToClipboard(JSON.stringify(data));
      });
      $("#bdaDataRestore").on("click", () => {
        if (window.confirm("Restore BDA data? This will overwrite current data.")) {
          const raw = $("#bdaData").val().trim();
          try {
            const data = JSON.parse(raw);
            bdaStorage.restoreData(data, true);
          } catch {
            alert("Invalid backup data.");
          }
        }
      });
    }
    // -------------------------------------------------------------------------
    // Configuration panel
    // -------------------------------------------------------------------------
    createConfigItem() {
      const { $dropdown } = this.createNavItem("bdaConfig", "fa-cog", "Config");
      const isDarkMode = bdaStorage.getConfigurationValue("dark_mode") === true;
      $dropdown.html(
        `<p>Dark mode: <input type='checkbox' id='dark_mode_checkbox' ${isDarkMode ? "checked" : ""}></p>`
      );
      $("#dark_mode_checkbox").on("change", function() {
        const checked = $(this).prop("checked");
        bdaStorage.storeConfiguration("dark_mode", checked);
        $("body").toggleClass("bda-dark", checked);
      });
      const monoInstanceKey = "mono_instance";
      const isMonoInstance = GM_getValue(monoInstanceKey) === true;
      $dropdown.append(
        `<p>Same BDA data on every domain: <input type='checkbox' id='mono_instance_checkbox' ${isMonoInstance ? "checked" : ""}></p>`
      );
      $("#mono_instance_checkbox").on("change", function() {
        const checked = $(this).prop("checked");
        GM_setValue(monoInstanceKey, checked);
        if (checked) GM_setValue("BDA_GM_Backup", JSON.stringify(bdaStorage.getData()));
      });
      this.createCheckBoxConfig($dropdown, {
        name: "search_autocomplete",
        description: "Search AutoComplete",
        message: "<p>Note: Reload dyn/admin to apply.</p>"
      });
      this.createCheckBoxConfig($dropdown, {
        name: "defaultOpenXmlDefAsTable",
        description: "Display XML Def as table by default"
      });
      this.createDefaultMethodsConfig($dropdown);
      this.createDataSourceFolderConfig($dropdown);
    }
    createCheckBoxConfig($parent, options) {
      const value = bdaStorage.getConfigurationValue(options.name) === true;
      const checked = value ? "checked" : "";
      $parent.append(
        `<p class="config">${options.description}: <input type="checkbox" id="${options.name}_config" ${checked}/></p>${options.message ?? ""}`
      );
      $(`#${options.name}_config`).on("change", function() {
        bdaStorage.storeConfiguration(options.name, $(this).is(":checked"));
      });
    }
    createDefaultMethodsConfig($parent) {
      const $config = $('<div id="advancedConfig"></div>').appendTo($parent);
      const savedMethods = bdaStorage.getConfigurationValue("default_methods") ?? [];
      $config.append(
        `<p>Default methods when bookmarking:</p><textarea id='config-methods-data' placeholder='Comma separated'>${savedMethods.join(",")}</textarea>`
      );
      $('<button class="bda-btn">Save methods</button>').on("click", () => {
        const arr = $("#config-methods-data").val().replace(/ /g, "").split(",").filter(Boolean);
        bdaStorage.storeConfiguration("default_methods", arr);
      }).appendTo($config);
      const savedProps = bdaStorage.getConfigurationValue("default_properties") ?? [];
      $config.append(
        `<p>Default properties when bookmarking:</p><textarea id='config-properties-data' placeholder='Comma separated'>${savedProps.join(",")}</textarea>`
      );
      $('<button class="bda-btn">Save properties</button>').on("click", () => {
        const arr = $("#config-properties-data").val().replace(/ /g, "").split(",").filter(Boolean);
        bdaStorage.storeConfiguration("default_properties", arr);
      }).appendTo($config);
    }
    createDataSourceFolderConfig($parent) {
      const $config = $("<div></div>").appendTo($parent);
      const saved = bdaStorage.getConfigurationValue("data_source_folder") ?? "";
      $config.append(
        `<p>JDBC datasource folders:</p><textarea id='config-data-source-folders-data' placeholder='Comma separated paths'>${saved}</textarea>`
      );
      $('<button class="bda-btn">Save folders</button>').on("click", () => {
        const val = $("#config-data-source-folders-data").val().trim();
        bdaStorage.storeConfiguration("data_source_folder", val);
      }).appendTo($config);
    }
    // -------------------------------------------------------------------------
    // Search box
    // -------------------------------------------------------------------------
    createSearchBox($parent) {
      $(
        '<form class="bda-nav__search" action="/dyn/admin/atg/dynamo/admin/en/cmpn-search.jhtml"><input type="text" name="query" id="searchFieldBDA" placeholder="Search… (ctrl+shift+f)"></form>'
      ).appendTo($parent);
      try {
        const autocomplete = bdaStorage.getConfigurationValue("search_autocomplete") === true;
        if (autocomplete) {
          this.search.init({ align: "right" });
        }
      } catch (e) {
        console.error(e);
      }
      $(document).on("keypress", (e) => {
        const isFocusKey = e.which === 70 && e.ctrlKey && e.shiftKey || e.which === 6 && e.ctrlKey && e.shiftKey;
        if (isFocusKey) $("#searchFieldBDA").trigger("focus");
      });
    }
  }
  const DEFAULT_DESCRIPTOR = {
    OrderRepository: "order",
    CsrRepository: "returnRequest",
    ProfileAdapterRepository: "user",
    ProductCatalog: "sku",
    InventoryRepository: "inventory",
    PriceLists: "price"
  };
  const CACHE_STAT_TITLE_REGEXP = /item-descriptor=(.*) cache-mode=(.*)( cache-locality=(.*))?/;
  const MAP_SEPARATOR = "=";
  const LIST_SEPARATOR = ",";
  class BdaRepository {
    constructor() {
      this.editor = null;
      this.descriptorList = null;
      this.itemTree = /* @__PURE__ */ new Map();
      this.nbItemReceived = 0;
      this.xmlDefinitionMaxSize = 15e4;
      this.edgesToIgnore = ["order", "relationships", "orderRef"];
      this.repositoryViewSelector = "h2:contains('Examine the Repository, Control Debugging')";
      this.cacheUsageSelector = "h2:contains('Cache usage statistics')";
      this.propertiesSelector = "h1:contains('Properties')";
      this.eventSetsSelector = "h1:contains('Event Sets')";
      this.methodsSelector = "h1:contains('Methods')";
      this.resultsSelector = "h2:contains('Results:')";
      this.errorsSelector1 = "p:contains('Errors:')";
      this.errorsSelector2 = "code:contains('*** Query:')";
      this.xmlTags = {
        "!top": ["add-item", "query-items", "print-item", "remove-item"],
        "!attrs": {},
        "add-item": { attrs: { "id": null, "item-descriptor": null }, children: ["set-property"] },
        "print-item": { attrs: { "id": null, "item-descriptor": null }, children: [] },
        "remove-item": { attrs: { "id": null, "item-descriptor": null }, children: ["set-property"] },
        "query-items": { attrs: { "item-descriptor": null, "id-only": ["true", "false"] }, children: [] },
        "set-property": { attrs: { name: null }, children: [] }
      };
    }
    isApplicable() {
      return $("h2:contains('Run XML Operation Tags on the Repository')").length > 0;
    }
    init() {
      if (!this.isApplicable()) return;
      console.time("bdaRepository");
      logTrace("BdaRepository init");
      this.setupRepositoryPage();
      console.timeEnd("bdaRepository");
    }
    // -------------------------------------------------------------------------
    // Page setup
    // -------------------------------------------------------------------------
    setupRepositoryPage() {
      const hasErrors = $(this.errorsSelector1).length > 0 || $(this.errorsSelector2).length > 0;
      const hasResults = $(this.resultsSelector).length > 0;
      $("table:eq(0)").attr("id", "descriptorTable");
      $("<div id='RQLEditor'></div>").insertBefore("h2:first");
      $("<div id='RQLResults'></div>").insertBefore("#RQLEditor");
      if (hasErrors) this.showRqlErrors();
      if (hasResults && !hasErrors) this.showRQLResults();
      $("form:eq(1)").appendTo("#RQLEditor");
      $("form:eq(1)").attr("id", "RQLForm");
      const $children = $("#RQLForm").children();
      $("#RQLForm").empty().append($children);
      $("textarea[name=xmltext]").attr("id", "xmltext");
      const actionSelect = `<select id='RQLAction' class='js-example-basic-single' style='width:170px'>
      <optgroup label='Empty queries'>
        <option value='print-item'>print-item</option>
        <option value='query-items'>query-items</option>
        <option value='remove-item'>remove-item</option>
        <option value='add-item'>add-item</option>
        <option value='update-item'>update-item</option>
      </optgroup>
      <optgroup label='Predefined queries'>
        <option value='all'>query-items ALL</option>
        <option value='last_10'>query-items last 10</option>
      </optgroup>
    </select>`;
      $("<div id='RQLToolbar'></div>").append(
        `<div> Action : ${actionSelect} <span id='editor'><span id='itemIdField'>ids : <input type='text' id='itemId' class='bda-input' placeholder='Id1,Id2,Id3' /></span><span id='itemDescriptorField'> descriptor : <select id='itemDescriptor' class='itemDescriptor'>${this.getDescriptorOptions()}</select></span><span id='idOnlyField' style='display:none;'><label for='idOnly'>&nbsp;id only : </label><input type='checkbox' id='idOnly' /></span></span><button type='button' id='RQLAdd' class='bda-btn'>Add</button><button type='button' id='RQLGo' class='bda-btn bda-btn--primary'>Add &amp; Enter <i class='fa fa-play fa-x'></i></button></div>`
      ).insertBefore("#RQLEditor textarea").after("<div id='RQLText'></div>");
      $("#xmltext").appendTo("#RQLText");
      $("#RQLText").after(
        "<div id='tabs'><ul id='navbar' class='bda-tabs'><li id='propertiesTab' class='bda-tabs__item bda-tabs__item--active'>Properties</li><li id='queriesTab' class='bda-tabs__item'>Stored Queries</li></ul><div id='storedQueries'><i>No stored query for this repository</i></div><div id='descProperties'><i>Select a descriptor to see his properties</i></div></div>"
      );
      $("#RQLForm input[type=submit]").remove();
      const splitObj = this.getStoredSplitObj();
      const itemByTab = (splitObj == null ? void 0 : splitObj.splitValue) ?? "10";
      const isChecked = (splitObj == null ? void 0 : splitObj.activeSplit) ?? false;
      const checkboxSplit = `<input type='checkbox' id='noSplit' ${isChecked ? "checked" : ""} /> don't split.`;
      $("#tabs").after(
        `<div id='RQLSave'><div style='display:inline-block;width:200px'><button id='clearQuery' type='button' class='bda-btn'>Clear <i class='fa fa-ban fa-x'></i></button></div><div style='display:inline-block;width:530px'>Split tab every : <input type='text' value='${itemByTab}' id='splitValue' class='bda-input' style='height:auto;'> items. ${checkboxSplit}</div><button type='submit' id='RQLSubmit' class='bda-btn bda-btn--primary'>Enter <i class='fa fa-play fa-x'></i></button></div><div><input placeholder='Name this query' type='text' id='queryLabel' class='bda-input' style='height:auto;'>&nbsp;<button type='button' id='saveQuery' class='bda-btn'>Save <i class='fa fa-save fa-x'></i></button></div>`
      );
      this.showQueryList();
      this.setupItemTreeForm();
      this.setupItemDescriptorTable();
      this.setupPropertiesTables();
      const defaultDescriptor = DEFAULT_DESCRIPTOR[getComponentNameFromPath(getCurrentComponentPath())];
      if (defaultDescriptor !== void 0) this.showItemPropertyList(defaultDescriptor);
      $("#descProperties").css("display", "inline-block");
      $("#storedQueries").css("display", "none");
      this.bindEvents();
      this.setupRepositoryCacheSection();
      this.setupToggleSections();
      this.setupEditableTable();
      this.editor = this.initCodeMirror();
      window["_bdaRepository"] = this;
      if (typeof $.fn["select2"] === "function") {
        $("#RQLAction").select2({
          width: "style",
          minimumResultsForSearch: -1
        });
        $(".itemDescriptor").select2({
          placeholder: "Select a descriptor",
          allowClear: false,
          width: "element"
        });
      }
      $("#itemDescriptor").on("change", (e) => {
        this.showItemPropertyList(e.currentTarget.value);
      });
    }
    getStoredSplitObj() {
      try {
        const raw = localStorage.getItem("BDA_SplitObj");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
    storeSplitValue() {
      const splitValue = $("#splitValue").val() ?? "10";
      const activeSplit = !$("#noSplit").is(":checked");
      try {
        localStorage.setItem("BDA_SplitObj", JSON.stringify({ splitValue, activeSplit }));
      } catch {
      }
    }
    // -------------------------------------------------------------------------
    // Event binding
    // -------------------------------------------------------------------------
    bindEvents() {
      $("#queriesTab").on("click", () => {
        $("#descProperties").css("display", "none");
        $("#storedQueries").css("display", "inline-block");
        $("#queriesTab").addClass("selected bda-tabs__item--active");
        $("#propertiesTab").removeClass("selected bda-tabs__item--active");
      });
      $("#propertiesTab").on("click", () => {
        $("#descProperties").css("display", "inline-block");
        $("#storedQueries").css("display", "none");
        $("#propertiesTab").addClass("selected bda-tabs__item--active");
        $("#queriesTab").removeClass("selected bda-tabs__item--active");
      });
      $("#RQLAction").on("change", () => {
        const action = $("#RQLAction").val();
        if (action === "print-item" || action === "remove-item" || action === "update-item") this.getPrintItemEditor();
        else if (action === "query-items" || action === "all" || action === "last_10") this.getQueryItemsEditor();
        else if (action === "add-item") this.getAddItemEditor();
      });
      $("#RQLSubmit").on("click", () => this.submitRQLQuery(false));
      $("#RQLGo").on("click", () => this.submitRQLQuery(true));
      $("#RQLAdd").on("click", () => this.addToQueryEditor(this.getRQLQuery()));
      $("#saveQuery").on("click", () => {
        const val = this.getQueryEditorValue().trim();
        const label = $("#queryLabel").val().trim();
        if (val.length > 0 && label.length > 0) {
          bdaStorage.storeQuery({ name: label, query: val });
          this.showQueryList();
        }
      });
      $("#clearQuery").on("click", () => this.setQueryEditorValue(""));
      $("#noSplit").on("change", () => this.storeSplitValue());
      $("#splitValue").on("change", () => this.storeSplitValue());
      $(document).on("keydown.bdaRepo", (e) => {
        if (e.ctrlKey && e.key === "Enter") {
          e.preventDefault();
          this.submitRQLQuery(false);
        }
        if (e.ctrlKey && !e.shiftKey && e.key === "s") {
          e.preventDefault();
          $("#saveQuery").trigger("click");
        }
        if (e.ctrlKey && e.shiftKey && e.key === "C") {
          e.preventDefault();
          this.setQueryEditorValue("");
        }
      });
    }
    // -------------------------------------------------------------------------
    // Toggle sections
    // -------------------------------------------------------------------------
    setupToggleSections() {
      const toggleObj = bdaStorage.getToggleObj();
      const makeLink = (id) => `&nbsp;<a href='javascript:void(0)' id='${id}' class='showMore'>${toggleObj[id] === 1 ? "Show less..." : "Show more..."}</a>`;
      $(this.repositoryViewSelector).append(makeLink("showMoreRepositoryView"));
      if (toggleObj["showMoreRepositoryView"] === 0) this.toggleRepositoryView();
      $("#showMoreRepositoryView").on("click", () => this.toggleRepositoryView());
      $(this.cacheUsageSelector).append(makeLink("showMoreCacheUsage"));
      if (toggleObj["showMoreCacheUsage"] !== 1) this.toggleCacheUsage();
      $("#showMoreCacheUsage").on("click", () => this.toggleCacheUsage());
      $(this.propertiesSelector).append(makeLink("showMoreProperties"));
      const $propsTable = $(this.propertiesSelector).next("table");
      if ($propsTable.length > 0) {
        this.simplifyClassNames($propsTable);
        this.simplifyPropertyType($propsTable);
        this.formatAttributes($propsTable);
      }
      if (toggleObj["showMoreProperties"] !== 1) this.toggleProperties();
      $("#showMoreProperties").on("click", () => this.toggleProperties());
      $(this.eventSetsSelector).append(makeLink("showMoreEventsSets"));
      if (toggleObj["showMoreEventsSets"] !== 1) this.toggleEventSets();
      $("#showMoreEventsSets").on("click", () => this.toggleEventSets());
      $(this.methodsSelector).append(makeLink("showMoreMethods"));
      if (toggleObj["showMoreMethods"] !== 1) this.toggleMethods();
      $("#showMoreMethods").on("click", () => this.toggleMethods());
    }
    updateToggleLabel(contentDisplay, selector) {
      $(selector).html(contentDisplay === "none" ? "Show more..." : "Show less...");
    }
    toggleRepositoryView() {
      $(this.repositoryViewSelector).next().toggle().next().toggle();
      this.updateToggleLabel($(this.repositoryViewSelector).next().css("display"), "#showMoreRepositoryView");
      bdaStorage.storeToggleState("showMoreRepositoryView", $(this.repositoryViewSelector).next().css("display"));
    }
    toggleCacheUsage() {
      const $cu = $(this.cacheUsageSelector);
      $cu.next().toggle().next().toggle();
      this.updateToggleLabel($cu.next().css("display"), "#showMoreCacheUsage");
      bdaStorage.storeToggleState("showMoreCacheUsage", $cu.next().css("display"));
    }
    toggleProperties() {
      $(this.propertiesSelector).next().toggle();
      this.updateToggleLabel($(this.propertiesSelector).next().css("display"), "#showMoreProperties");
      bdaStorage.storeToggleState("showMoreProperties", $(this.propertiesSelector).next().css("display"));
    }
    toggleEventSets() {
      $(this.eventSetsSelector).next().toggle();
      this.updateToggleLabel($(this.eventSetsSelector).next().css("display"), "#showMoreEventsSets");
      bdaStorage.storeToggleState("showMoreEventsSets", $(this.eventSetsSelector).next().css("display"));
    }
    toggleMethods() {
      $(this.methodsSelector).next().toggle();
      this.updateToggleLabel($(this.methodsSelector).next().css("display"), "#showMoreMethods");
      bdaStorage.storeToggleState("showMoreMethods", $(this.methodsSelector).next().css("display"));
    }
    toggleRawXml() {
      $("#rawXml").toggle();
      $("#rawXmlLink").html($("#rawXml").css("display") === "none" ? "show raw XML" : "hide raw XML");
    }
    // -------------------------------------------------------------------------
    // Descriptor helpers
    // -------------------------------------------------------------------------
    getDescriptorList() {
      if (this.descriptorList) return this.descriptorList;
      const descriptors = [];
      $("table:eq(0) tr th:first-child:not([colspan])").toArray().sort((a, b) => $(a).text().toLowerCase() > $(b).text().toLowerCase() ? 1 : -1).forEach((el) => descriptors.push($(el).html().trim()));
      this.descriptorList = descriptors;
      return descriptors;
    }
    getDescriptorOptions() {
      const descriptors = this.getDescriptorList();
      const defaultDesc = DEFAULT_DESCRIPTOR[getComponentNameFromPath(getCurrentComponentPath())];
      let opts = defaultDesc === void 0 ? "<option></option>" : "";
      descriptors.forEach((d) => {
        opts += `<option value='${d}'${d === defaultDesc ? " selected='selected'" : ""}>${d}</option>
`;
      });
      return opts;
    }
    setupItemDescriptorTable() {
      const descriptors = this.getDescriptorList();
      const componentURI = window.location.pathname;
      const splitValue = 20;
      let html = `<p>${descriptors.length} descriptors available.</p><div>`;
      descriptors.forEach((d, i) => {
        if (i === 0 || i % splitValue === 0) {
          html += "<table class='descriptorTable'><th>Descriptor</th><th>View</th><th>Debug</th>";
        }
        const rowClass = i % 2 === 0 ? "even" : "odd";
        const isDebugEnabled = $(`a[href='${componentURI}?action=clriddbg&itemdesc=${d}#listItemDescriptors']`).length > 0;
        html += `<tr class='${rowClass}'>`;
        html += `<td class='descriptor'>${d}</td>`;
        html += `<td><a class='bda-btn bda-btn--sm' href='${componentURI}?action=seetmpl&itemdesc=${d}#showProperties'>Properties</a>`;
        html += `&nbsp;<a class='bda-btn bda-btn--sm' href='${componentURI}?action=seenamed&itemdesc=${d}#namedQuery'>Named queries</a></td>`;
        html += "<td>";
        if (isDebugEnabled) {
          html += `<a class='bda-btn bda-btn--sm bda-btn--danger' href='${componentURI}?action=clriddbg&itemdesc=${d}#listItemDescriptors'>Disable</a>`;
        } else {
          html += `<a class='bda-btn bda-btn--sm' href='${componentURI}?action=setiddbg&itemdesc=${d}#listItemDescriptors'>Enable</a>`;
          html += `&nbsp;<a class='bda-btn bda-btn--sm' href='${componentURI}?action=dbgprops&itemdesc=${d}#debugProperties'>Edit</a>`;
        }
        html += "</td></tr>";
        if (i !== 0 && ((i + 1) % splitValue === 0 || i + 1 === descriptors.length)) html += "</table>";
      });
      html += '</div><div style="clear:both" />';
      $("#descriptorTable").remove();
      $(html).insertAfter("a[name='listItemDescriptors']");
    }
    setupPropertiesTables() {
      if ($("a[name=showProperties]").length > 0) {
        $("a[name=showProperties]").next().attr("id", "propertiesTable");
        this.simplifyClassNames($("#propertiesTable"));
        this.simplifyPropertyType($("#propertiesTable"));
        this.formatAttributes($("#propertiesTable"));
        $("#propertiesTable").find("tr:nth-child(odd)").addClass("odd");
      }
    }
    simplifyClassNames($table) {
      $table.find("td").each((_, td) => {
        const $td = $(td);
        const text = $td.text().trim();
        if (text.includes(".") && /^[\w.]+$/.test(text)) {
          const simpleName = text.split(".").pop() ?? text;
          $td.text(simpleName).attr("title", text);
        }
      });
    }
    formatAttributes($table) {
      $table.find("td").each((_, td) => {
        const $td = $(td);
        const text = $td.text().trim();
        if (/^\{.*\}$/.test(text) && text.includes("=")) {
          const entries = text.slice(1, -1).split(",").map((s) => s.trim());
          const html = entries.filter((entry) => {
            const val = entry.split("=")[1] ?? "";
            return val !== "false";
          }).map((entry) => {
            const [key, val] = entry.split("=");
            const label = (key ?? "").replace(/^template\./, "");
            const value = val ?? "";
            const cls = value === "true" ? "bda-attr-true" : "";
            return `<span class="bda-attr ${cls}" title="${key}=${value}">${label}</span>`;
          }).join(" ");
          $td.html(html);
        }
      });
    }
    simplifyPropertyType($table) {
      $table.find("td").each((_, td) => {
        const $td = $(td);
        const text = $td.text().trim();
        const enumMatch = text.match(/^(\w+)\s+as one of\s+\[([^\]]+)\]$/i);
        if (enumMatch) {
          const values = enumMatch[2].split(",").map((s) => s.trim());
          const isBool = values.length === 2 && values.includes("true") && values.includes("false");
          if (isBool) {
            $td.text("Boolean");
          } else {
            const valuesHtml = values.map((v) => `<span class="bda-enum-value">${v}</span>`).join(" ");
            $td.html(`<span class="bda-enum-toggle" title="Click to expand">Enum</span><div class="bda-enum-values">${valuesHtml}</div>`);
            $td.find(".bda-enum-toggle").on("click", function() {
              $(this).next(".bda-enum-values").toggle();
            });
          }
        }
      });
    }
    showItemPropertyList(item) {
      logTrace("showItemPropertyList");
      const componentURI = window.location.pathname;
      const url = `${componentURI}?action=seetmpl&itemdesc=${item}#showProperties`;
      $.get(url, (data) => {
        const $pTable = $(data).find("a[name='showProperties']").next();
        $pTable.find("th:nth-child(2), td:nth-child(2), th:nth-child(4), td:nth-child(4), th:nth-child(5), td:nth-child(5), th:nth-child(6), td:nth-child(6)").remove();
        $pTable.find("tr").each((_, tr) => {
          $(tr).find("td").each((i, td) => {
            const $td = $(td);
            if (i === 0) {
              $td.html($td.html().replace(/[\w\s']+\((\w+)\)$/i, "<a class='itemPropertyBtn' href='javascript:void(0)'> $1 </a>"));
              const propName = $td.contents().first().text().trim();
              if (propName) {
                $td.contents().first().replaceWith(`<a class='propQueryBtn' href='javascript:void(0)' title='Query by ${propName}'>${propName}</a>`);
              }
            } else if (i === 1) {
              const classText = $td.text().replace("Class", "").trim();
              const simpleName = classText.includes(".") ? classText.split(".").pop() ?? classText : classText;
              $td.text(simpleName).attr("title", classText);
            }
          });
        });
        this.simplifyClassNames($pTable);
        this.simplifyPropertyType($pTable);
        this.formatAttributes($pTable);
        $("#descProperties").empty().append($pTable);
        $(".itemPropertyBtn").on("click", (e) => {
          const name = $(e.currentTarget).text().trim();
          this.addToQueryEditor(`<set-property name="${name}"><![CDATA[]]></set-property>
`);
        });
        $(".propQueryBtn").on("click", (e) => {
          const propName = $(e.currentTarget).text().trim();
          const query = `<query-items item-descriptor="${item}" id-only="false">
${propName}=""
</query-items>
`;
          this.setQueryEditorValue(query);
        });
      });
    }
    // -------------------------------------------------------------------------
    // CodeMirror
    // -------------------------------------------------------------------------
    initCodeMirror() {
      const el = document.getElementById("xmltext");
      if (!el || typeof CodeMirror === "undefined") return null;
      const tags = this.xmlTags;
      function completeAfter(cm, pred) {
        cm.getCursor();
        if (!pred || pred()) {
          setTimeout(() => {
            if (!cm.state.completionActive) cm.showHint({ completeSingle: false });
          }, 100);
        }
        return CodeMirror.Pass;
      }
      const editor = CodeMirror.fromTextArea(el, {
        lineNumbers: false,
        mode: "xml",
        extraKeys: {
          "'<'": (cm) => completeAfter(cm),
          "'/'": (cm) => completeAfter(cm, () => {
            const cur = cm.getCursor();
            return cm.getRange(CodeMirror.Pos(cur.line, cur.ch - 1), cur) === "<";
          }),
          "' '": (cm) => completeAfter(cm, () => {
            const tok = cm.getTokenAt(cm.getCursor());
            if (tok.type === "string" && (!/['"]/.test(tok.string.charAt(tok.string.length - 1)) || tok.string.length === 1)) return false;
            return !!CodeMirror.innerMode(cm.getMode(), tok.state).state.tagName;
          }),
          "'='": (cm) => completeAfter(cm, () => {
            const tok = cm.getTokenAt(cm.getCursor());
            return !!CodeMirror.innerMode(cm.getMode(), tok.state).state.tagName;
          }),
          "Ctrl-Space": "autocomplete"
        },
        hintOptions: { schemaInfo: tags }
      });
      if (navigator.userAgent.toLowerCase().includes("firefox")) {
        CodeMirror.on(editor, "cursorActivity", (cm) => {
          if (cm.state.completionActive) cm.showHint({ completeSingle: false });
        });
      }
      return editor;
    }
    // -------------------------------------------------------------------------
    // Query editor
    // -------------------------------------------------------------------------
    addToQueryEditor(query) {
      if (!this.editor) return;
      const cur = this.editor.getCursor();
      if (cur.ch !== 0) this.editor.setCursor(cur.line + 1, 0);
      this.editor.replaceSelection(query);
    }
    setQueryEditorValue(value) {
      var _a;
      (_a = this.editor) == null ? void 0 : _a.getDoc().setValue(value);
    }
    getQueryEditorValue() {
      var _a;
      return ((_a = this.editor) == null ? void 0 : _a.getDoc().getValue()) ?? "";
    }
    getPrintItemEditor() {
      $("#itemIdField").show();
      $("#itemDescriptorField").show();
      $("#idOnlyField").hide();
    }
    getAddItemEditor() {
      $("#itemIdField").hide();
      $("#itemDescriptorField").show();
      $("#idOnlyField").hide();
    }
    getQueryItemsEditor() {
      $("#itemIdField").hide();
      $("#itemDescriptorField").show();
      $("#idOnlyField").show();
    }
    getMultiId() {
      const ids = $("#itemId").val().trim();
      return ids.includes(",") ? ids.split(",") : [ids];
    }
    getRQLQuery() {
      const action = $("#RQLAction").val();
      const descriptor = $("#itemDescriptor").val();
      const idOnly = $("#idOnly").prop("checked").toString();
      if (action === "print-item" || action === "remove-item") {
        return this.getMultiId().map((id) => `<${action} id="${id.trim()}" item-descriptor="${descriptor}" />
`).join("");
      } else if (action === "update-item") {
        return this.getMultiId().map(
          (id) => `<update-item id="${id.trim()}" item-descriptor="${descriptor}" >
  <set-property name=""><![CDATA[]]></set-property>
</update-item>
`
        ).join("");
      } else if (action === "add-item") {
        return `<add-item item-descriptor="${descriptor}" >
  <set-property name=""><![CDATA[]]></set-property>
</add-item>
`;
      } else if (action === "all") {
        return `<query-items item-descriptor="${descriptor}" id-only="${idOnly}">
ALL
</query-items>
`;
      } else if (action === "last_10") {
        return `<query-items item-descriptor="${descriptor}" id-only="${idOnly}">
ALL ORDER BY ID DESC RANGE 0+10
</query-items>
`;
      }
      return `<query-items item-descriptor="${descriptor}" id-only="${idOnly}">

</query-items>
`;
    }
    submitRQLQuery(addText) {
      if (addText) this.setQueryEditorValue(this.getQueryEditorValue() + this.getRQLQuery());
      this.setQueryEditorValue(this.getQueryEditorValue().replace(/repository="[^"]+"/gi, ""));
      this.storeSplitValue();
      location.hash = "#RQLResults";
      $("#RQLForm").trigger("submit");
    }
    // -------------------------------------------------------------------------
    // Stored queries
    // -------------------------------------------------------------------------
    showQueryList() {
      let html = "";
      const rqlQueries = bdaStorage.getStoredRQLQueries();
      const currComponentName = getComponentNameFromPath(getCurrentComponentPath());
      let nbQuery = 0;
      if (rqlQueries && rqlQueries.length > 0) {
        html += "<ul>";
        for (let i = 0; i < rqlQueries.length; i++) {
          const q = rqlQueries[i];
          if (!("repo" in q) || q["repo"] === currComponentName) {
            const escapedQuery = $("<div>").text(q.query).html();
            html += `<li class='savedQuery'><a href='javascript:void(0)'>${q.name}</a>`;
            html += `<span id='previewQuery${i}' class='previewQuery'><i class='fa fa-eye'></i></span>`;
            html += `<span id='deleteQuery${i}' class='deleteQuery'><i class='fa fa-trash-o'></i></span>`;
            html += `<span id='queryView${i}' class='queryView'><pre>${escapedQuery}</pre></span></li>`;
            nbQuery++;
          }
        }
        html += "</ul>";
        if (nbQuery > 0) $("#storedQueries").html(html);
      }
      if (typeof hljs !== "undefined") {
        $("#storedQueries .queryView").each((_, block) => hljs.highlightBlock(block));
      }
      $(".savedQuery").on("click", (e) => {
        const name = $(e.currentTarget).find("a").html();
        const q = bdaStorage.getStoredRQLQueries().find((q2) => q2.name === name);
        if (q) this.setQueryEditorValue(q.query + "\n");
      });
      $(".previewQuery").on("mouseenter", function() {
        $(this).parent("li").find("span.queryView").show();
      }).on("mouseleave", function() {
        $(this).parent("li").find("span.queryView").hide();
      });
      $(".deleteQuery").on("click", (e) => {
        const index = parseInt(e.currentTarget.id.replace("deleteQuery", ""));
        bdaStorage.deleteQuery(index);
        this.reloadQueryList();
      });
    }
    reloadQueryList() {
      $("#storedQueries").empty();
      this.showQueryList();
    }
    // -------------------------------------------------------------------------
    // RQL Results
    // -------------------------------------------------------------------------
    showRQLResults() {
      logTrace("Start showRQLResults");
      $("#RQLResults").append("<p><a href='javascript:void(0)' id='rawXmlLink'>Show raw xml</a></p>\n<p id='rawXml'></p>");
      let xmlContent = $(this.resultsSelector).next().text().trim();
      xmlContent = sanitizeXml(xmlContent);
      processRepositoryXmlDef("definitionFiles", ($xmlDef) => {
        const log = this.showXMLAsTab(xmlContent, $xmlDef, $("#RQLResults"), false);
        this.showRQLLog(log, false);
        $(this.resultsSelector).next().appendTo("#rawXml");
        $(this.resultsSelector).remove();
        $("#rawXmlLink").on("click", () => {
          var _a;
          this.toggleRawXml();
          const xmlSize = ((_a = $("#rawXml pre").html()) == null ? void 0 : _a.length) ?? 0;
          if (xmlSize < this.xmlDefinitionMaxSize) {
            if (typeof hljs !== "undefined") $("#rawXml").each((_, block) => hljs.highlightBlock(block));
          } else if ($("#xmlHighlight").length === 0) {
            $("<p id='xmlHighlight' />").html('The XML result is big. XML highlight disabled. <br><button id="xmlHighlightBtn">Highlight XML now</button>').prependTo("#rawXml");
            $("#xmlHighlightBtn").on("click", () => {
              if (typeof hljs !== "undefined") $("#rawXml pre").each((_, block) => hljs.highlightBlock(block));
            });
          }
        });
        $(".copyLink").on("click", function() {
          const id = ($(this).attr("id") ?? "").replace("link_", "").replace(/(:|\.|\[|\]|,)/g, "\\$1");
          $(`#${id}`).toggle();
          $(`#text_${id}`).toggle();
        });
      });
    }
    showRqlErrors() {
      let error = "";
      if ($(this.errorsSelector1).length > 0) {
        error = $(this.errorsSelector1).next().text();
        $(this.resultsSelector).next().remove();
        $(this.resultsSelector).remove();
        $(this.errorsSelector1).next().remove();
        $(this.errorsSelector1).remove();
      } else {
        error = $(this.errorsSelector2).text();
      }
      error = error.split("\n").filter((l) => !(l.trim().startsWith("<") && l.trim().endsWith(">"))).join("\n");
      this.showRQLLog(error, true);
    }
    showRQLLog(log, error) {
      if (log && log.length > 0) {
        $("<h3>Execution log</h3><div id='RQLLog'></div>").insertAfter("#RQLResults");
        $("#RQLLog").html(log.replace(/\n{2,}/g, "\n").replace(/------ /g, "").trim());
      }
      if (error) $("#RQLLog").addClass("error");
    }
    // -------------------------------------------------------------------------
    // XML Tab rendering
    // -------------------------------------------------------------------------
    escapeHTML(s) {
      return String(s).replace(/&(?!\w+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    isPropertyId(propertyName, $itemDesc) {
      let isId = null;
      let propertyFound = false;
      $itemDesc.find(`property[name=${propertyName}]`).each((_, el) => {
        propertyFound = true;
        const $p = $(el);
        if ($p.attr("item-type") !== void 0 && $p.attr("repository") === void 0) isId = $p.attr("item-type") ?? null;
        else if ($p.attr("component-item-type") !== void 0 && $p.attr("repository") === void 0) isId = $p.attr("component-item-type") ?? null;
      });
      if (propertyFound && isId === null) return "FOUND_NOT_ID";
      return isId;
    }
    isTypeId(propertyName, itemDesc, $xmlDef) {
      if (!$xmlDef) return null;
      let $itemDesc = $xmlDef.find(`item-descriptor[name='${itemDesc}']`);
      let isId = this.isPropertyId(propertyName, $itemDesc);
      if (isId === "FOUND_NOT_ID") return null;
      if (isId !== null) return isId;
      let superType = $itemDesc.attr("super-type");
      while (superType !== void 0 && isId === null) {
        const $parent = $xmlDef.find(`item-descriptor[name='${superType}']`);
        isId = this.isPropertyId(propertyName, $parent);
        superType = $parent.attr("super-type");
      }
      return isId === "FOUND_NOT_ID" ? null : isId;
    }
    parseRepositoryId(id) {
      const result = [];
      if (!id.includes(MAP_SEPARATOR) && !id.includes(LIST_SEPARATOR)) {
        result.push(id);
      } else if (!id.includes(MAP_SEPARATOR)) {
        id.split(LIST_SEPARATOR).forEach((part, i) => {
          if (i !== 0) result.push(LIST_SEPARATOR);
          result.push(part);
        });
      } else {
        id.split(LIST_SEPARATOR).forEach((entry, a) => {
          if (a !== 0) result.push(LIST_SEPARATOR);
          entry.split(MAP_SEPARATOR).forEach((val, b) => {
            if (b !== 0) result.push(MAP_SEPARATOR);
            result.push(val);
          });
        });
      }
      return result;
    }
    renderProperty(curProp, propValue, itemId, isItemTree) {
      const td = `<td data-property='${curProp.name}' data-item-id='${itemId ?? ""}'>`;
      if (propValue === null || propValue === void 0) {
        return `${td}<i class='fa fa-pencil-square-o' aria-hidden='true'></i></td>`;
      }
      propValue = propValue.replace(/ /g, "●");
      if (curProp.name === "descriptor") propValue = propValue.substring(1);
      const baseId = `${curProp.name}_${itemId}`;
      if (curProp.name === "id") return `<td id='${baseId}'>${propValue}</td>`;
      if (propValue.length > 25) {
        return `${td}<a class='copyLink' href='javascript:void(0)' title='Show all' id='link_${baseId}'><span id='${baseId}'>${this.escapeHTML(propValue.substring(0, 25))}...</span></a><textarea class='copyField' id='text_${baseId}' readonly>${propValue}</textarea></td>`;
      }
      if (curProp.isId === true) {
        const parts = this.parseRepositoryId(propValue);
        let html = td;
        parts.forEach((p) => {
          if (p !== MAP_SEPARATOR && p !== LIST_SEPARATOR) {
            html += isItemTree ? `<a class='clickable_property' href='#id_${p}'>${p}</a>` : `<a class='clickable_property loadable_property' data-id='${p}' data-descriptor='${curProp.itemDesc ?? ""}'>${p}</a>`;
          } else html += p;
        });
        return html + "</td>";
      }
      if (curProp.name === "descriptor" || curProp.rdonly === "true" || curProp.derived === "true") return `<td>${propValue}</td>`;
      return `${td}<i class='fa fa-pencil-square-o' aria-hidden='true'></i>${propValue}</td>`;
    }
    renderTab(itemDesc, types, datas, tabId, isItemTree) {
      let html = `<table class='dataTable' data-descriptor='${itemDesc.substring(1)}'${isItemTree ? ` id='${tabId}'` : ""}>`;
      types.forEach((curProp, i) => {
        let extra = curProp.name === "id" ? " id" : curProp.name === "descriptor" ? " descriptor" : "";
        html += `<tr class='${i % 2 === 0 ? "even" : "odd"}${extra}'>`;
        html += `<th>${curProp.name}<span class='prop_name'>`;
        if (curProp.rdonly === "true") html += "<span class='bda-badge bda-badge--danger'>R</span>";
        if (curProp.derived === "true") html += "<span class='bda-badge bda-badge--success'>D</span>";
        if (curProp.exportable === "true") html += "<span class='bda-badge bda-badge--accent'>E</span>";
        html += "</span></th>";
        datas.forEach((d) => {
          html += this.renderProperty(curProp, d[curProp.name], d["id"], isItemTree);
        });
        html += "</tr>";
      });
      return html + "</table>";
    }
    showXMLAsTab(xmlContent, $xmlDef, $outputDiv, isItemTree) {
      console.time("renderTab");
      const xmlDoc = $.parseXML(`<xml>${xmlContent}</xml>`);
      const $xml = $(xmlDoc);
      const $addItems = $xml.find("add-item");
      const log = $(`<xml>${xmlContent}</xml>`).children().remove().end().text().trim();
      const types = {};
      const typesNames = {};
      const datas = {};
      let nbTypes = 0;
      $addItems.each((_, item) => {
        const $item = $(item);
        const curItemDesc = "_" + ($item.attr("item-descriptor") ?? "");
        if (!types[curItemDesc]) types[curItemDesc] = [];
        if (!typesNames[curItemDesc]) typesNames[curItemDesc] = [];
        if (!datas[curItemDesc]) {
          datas[curItemDesc] = [];
          nbTypes++;
        }
        const curData = {};
        $item.find("set-property").each((_2, prop) => {
          const $p = $(prop);
          const name = $p.attr("name") ?? "";
          curData[name] = $p.text();
          if (!typesNames[curItemDesc].includes(name)) {
            const typeItemDesc = this.isTypeId(name, curItemDesc.substring(1), $xmlDef);
            types[curItemDesc].push({
              name,
              rdonly: $p.attr("rdonly"),
              derived: $p.attr("derived"),
              exportable: $p.attr("exportable"),
              isId: typeItemDesc !== null,
              itemDesc: typeItemDesc ?? void 0
            });
            typesNames[curItemDesc].push(name);
          }
        });
        if (!typesNames[curItemDesc].includes("descriptor")) {
          types[curItemDesc].unshift({ name: "descriptor" });
          typesNames[curItemDesc].push("descriptor");
        }
        if (!typesNames[curItemDesc].includes("id")) {
          types[curItemDesc].unshift({ name: "id" });
          typesNames[curItemDesc].push("id");
        }
        curData["descriptor"] = curItemDesc;
        curData["id"] = $item.attr("id");
        datas[curItemDesc].push(curData);
      });
      let html = `<p class='nbResults'>${$addItems.length} items in ${nbTypes} descriptor(s)</p>`;
      const splitObj = this.getStoredSplitObj();
      let splitValue = (splitObj == null ? void 0 : splitObj.activeSplit) === false ? parseInt(splitObj.splitValue) : 0;
      for (const itemDesc in datas) {
        if (splitValue === 0) splitValue = datas[itemDesc].length;
        let nbTab = 0;
        if (datas[itemDesc].length <= splitValue) {
          html += this.renderTab(itemDesc, types[itemDesc], datas[itemDesc], itemDesc.substring(1), isItemTree);
        } else {
          while (splitValue * nbTab < datas[itemDesc].length) {
            const start = splitValue * nbTab;
            html += this.renderTab(itemDesc, types[itemDesc], datas[itemDesc].slice(start, Math.min(start + splitValue, datas[itemDesc].length)), `${itemDesc}_${nbTab}`, isItemTree);
            nbTab++;
          }
        }
      }
      $outputDiv.append(html);
      $outputDiv.prepend(
        "<span class='bda-badge bda-badge--danger'>R</span> : read-only <span class='bda-badge bda-badge--success'>D</span> : derived <span class='bda-badge bda-badge--accent'>E</span> : export is false"
      );
      if ($(".copyField").length > 0) {
        $outputDiv.find("p.nbResults").append("<br><a href='javascript:void(0)' class='showFullTextLink'>Show full text</a>");
        $outputDiv.find(".showFullTextLink").on("click", function() {
          $(".copyField").each((_, el) => $(el).parent().html($(el).html()));
          $(this).hide();
        });
      }
      $(".loadable_property").on("click", (e) => {
        var _a, _b;
        const $elm = $(e.currentTarget);
        const id = $elm.attr("data-id") ?? "";
        const desc = $elm.attr("data-descriptor") ?? "";
        const query = `<print-item id='${id}' item-descriptor='${desc}' />
`;
        (_b = (_a = $("body")).bdaAlert) == null ? void 0 : _b.call(_a, {
          msg: `You are about to add this query and reload the page: 
${query}`,
          options: [
            { label: "Add & Reload", _callback: () => {
              this.setQueryEditorValue(this.getQueryEditorValue() + query);
              $("#RQLForm").trigger("submit");
            } },
            { label: "Just Add", _callback: () => {
              this.setQueryEditorValue(this.getQueryEditorValue() + query);
            } },
            { label: "Cancel" }
          ]
        });
      });
      if (isItemTree) this.createSpeedbar();
      console.timeEnd("renderTab");
      return log;
    }
    // -------------------------------------------------------------------------
    // Editable table
    // -------------------------------------------------------------------------
    setupEditableTable() {
      $("body").on("click", ".dataTable .fa-pencil-square-o", function(event) {
        const $target = $(event.target).parent();
        const initialValue = $target.text().replace(/●/g, " ");
        $target.html(`<input type="text" value="${initialValue}" />`);
        const $input = $($target.children()[0]);
        $input.trigger("focus").on("blur", function() {
          const $t = $(this);
          const descriptor = $t.parents(".dataTable").attr("data-descriptor") ?? "";
          const itemId = $t.parent().attr("data-item-id") ?? "";
          const propertyName = $t.parent().attr("data-property") ?? "";
          if (propertyName === "id" || propertyName === "descriptor") {
            $input.parent().html($input.val());
            return;
          }
          const newValue = $t.val();
          const query = `<update-item id="${itemId}" item-descriptor="${descriptor}">
  <set-property name="${propertyName}"><![CDATA[${newValue}]]></set-property>
</update-item>`;
          if (confirm(`You are about to execute this query: 
${query}`)) {
            jQuery.post(document.location.href, `xmltext=${query}`, (res) => {
              const errMsg = $(res).find("code").text().trim();
              if ($(res).text().includes("Errors:")) {
                console.error("Update error:", errMsg);
                $input.parent().html(`<i class="fa fa-pencil-square-o"></i>${initialValue}`);
              } else {
                $input.parent().html(`<i class="fa fa-pencil-square-o"></i>${newValue}`);
              }
            });
          } else {
            $input.parent().html(`<i class="fa fa-pencil-square-o"></i>${initialValue}`);
          }
        });
      });
    }
    // -------------------------------------------------------------------------
    // Item Tree
    // -------------------------------------------------------------------------
    setupItemTreeForm() {
      $("<div id='itemTree' />").insertAfter("#RQLEditor");
      const $itemTree = $("#itemTree");
      $itemTree.append("<h2>Get Item Tree</h2>");
      $itemTree.append(
        "<p>This tool will recursively retrieve items and print the result with the chosen output.<br> For example, if you give an order ID in the form below, you will get all shipping groups, payment groups, commerceItems, priceInfo... of the given order<br><b> Be careful when using this tool on a live instance ! Set a low max items value.</b></p>"
      );
      $itemTree.append(
        "<div id='itemTreeForm'>id : <input type='text' id='itemTreeId' /> &nbsp;descriptor : <span id='itemTreeDescriptorField'><select id='itemTreeDesc' class='itemDescriptor'>" + this.getDescriptorOptions() + `</select></span>max items : <input type='text' id='itemTreeMax' value='50' />&nbsp;<br><br>output format : <select id='itemTreeOutput'><option value='HTMLtab'>HTML tab</option><option value='addItem'>add-item XML</option><option value='removeItem'>remove-item XML</option><option value='printItem'>print-item XML</option><option value='tree'>Tree (experimental)</option></select>&nbsp;<input type='checkbox' id='printRepositoryAttr' /><label for='printRepositoryAttr'>Print attribute : </label><pre style='margin:0; display:inline;'>repository='${getCurrentComponentPath()}'</pre> <br><br><button id='itemTreeBtn' class='bda-btn bda-btn--primary'>Enter <i class='fa fa-play fa-x'></i></button></div>`
      );
      $itemTree.append("<div id='itemTreeInfo' />");
      $itemTree.append("<div id='itemTreeResult' />");
      $("#itemTreeBtn").on("click", () => {
        this.getItemTree(
          $("#itemTreeId").val().trim(),
          $("#itemTreeDesc").val(),
          parseInt($("#itemTreeMax").val()),
          $("#itemTreeOutput").val(),
          $("#printRepositoryAttr").is(":checked")
        );
      });
    }
    getItemTree(id, descriptor, maxItem, outputType, printRepoAttr) {
      $("#itemTreeResult").empty();
      $("#itemTreeInfo").empty();
      if (!id) {
        $("#itemTreeInfo").html("<p>Please provide a valid ID</p>");
        return;
      }
      console.time("getItemTree");
      $("#itemTreeInfo").html("<p>Getting XML definition of this repository...</p>");
      processRepositoryXmlDef("definitionFiles", ($xmlDef) => {
        if (!$xmlDef) {
          $("#itemTreeInfo").html("<p>Unable to parse XML definition of this repository!</p>");
          return;
        }
        this.itemTree = /* @__PURE__ */ new Map();
        this.nbItemReceived = 0;
        this.getSubItems([{ id, desc: descriptor }], $xmlDef, maxItem, outputType, printRepoAttr);
      });
    }
    getSubItems(items, $xmlDef, maxItem, outputType, printRepoAttr) {
      if (this.nbItemReceived >= maxItem) return;
      let xmlText = "";
      let batchSize = 0;
      for (let i = 0; i < items.length; i++) {
        if (this.nbItemReceived + i >= maxItem) break;
        xmlText += `<print-item id='${items[i].id}' item-descriptor='${items[i].desc}' />
`;
        batchSize++;
      }
      if (batchSize === 0) return;
      $.ajax({
        type: "POST",
        url: document.URL,
        data: { xmltext: xmlText },
        success: (result) => {
          let rawXml = $(result).find("code").html() ?? "";
          const tab = rawXml.split("\n");
          tab.splice(0, 2);
          rawXml = `<xml>${tab.join("\n").trim().replace(/&lt;/g, "<").replace(/&gt;/g, ">")}</xml>`;
          try {
            const xmlDoc = jQuery.parseXML(rawXml);
            this.nbItemReceived += $(xmlDoc).find("add-item").length;
            $("#itemTreeInfo").html(`<p>${this.nbItemReceived} items retrieved</p>`);
            const subItems = [];
            $(xmlDoc).find("add-item").each((_, el) => {
              const $item = $(el);
              const itemId = $item.attr("id") ?? "";
              if (!this.itemTree.has(itemId)) {
                this.itemTree.set(itemId, el.outerHTML);
                const desc = $item.attr("item-descriptor") ?? "";
                let $itemDesc = $xmlDef.find(`item-descriptor[name=${desc}]`);
                let superType = $itemDesc.attr("super-type");
                while (superType !== void 0) {
                  const $parent = $xmlDef.find(`item-descriptor[name=${superType}]`);
                  $itemDesc = $itemDesc.add($parent);
                  superType = $parent.attr("super-type");
                }
                $itemDesc.find("property[item-type]").each((_2, p) => {
                  const $p = $(p);
                  if ($p.attr("repository") === void 0) {
                    const subId = $item.find(`set-property[name=${$p.attr("name")}]`).text();
                    if (subId.length > 0 && !this.itemTree.has(subId)) subItems.push({ id: subId, desc: $p.attr("item-type") ?? "" });
                  }
                });
                $itemDesc.find("property[component-item-type]").each((_2, p) => {
                  const $p = $(p);
                  if ($p.attr("repository") === void 0) {
                    const subId = $item.find(`set-property[name=${$p.attr("name")}]`).text();
                    if (subId.length > 0) {
                      this.parseRepositoryId(subId).filter((v) => v !== MAP_SEPARATOR && v !== LIST_SEPARATOR && !this.itemTree.has(v)).forEach((v) => subItems.push({ id: v, desc: $p.attr("component-item-type") ?? "" }));
                    }
                  }
                });
              }
            });
            if (subItems.length > 0 && this.nbItemReceived < maxItem) this.getSubItems(subItems, $xmlDef, maxItem, outputType, printRepoAttr);
            else this.renderItemTreeTab(outputType, printRepoAttr, $xmlDef, maxItem);
          } catch {
            this.renderItemTreeTab(outputType, printRepoAttr, $xmlDef, maxItem);
          }
        }
      });
    }
    renderItemTreeTab(outputType, printRepoAttr, $xmlDef, maxItem) {
      if (this.nbItemReceived >= maxItem) console.warn("Item tree stopped: max items reached:", maxItem);
      $("#itemTreeInfo").empty();
      $("#itemTreeResult").empty();
      const componentPath = getCurrentComponentPath();
      if (outputType !== "HTMLtab" && outputType !== "tree") {
        $("#itemTreeInfo").append("<button type='button' id='itemTreeCopyButton' class='bda-btn'>Copy result to clipboard</button>");
        $("#itemTreeCopyButton").on("click", () => copyToClipboard($("#itemTreeResult").text()));
      }
      if (outputType === "addItem") {
        let res = "";
        this.itemTree.forEach((data) => {
          var _a;
          if (printRepoAttr) {
            try {
              const xmlDoc = jQuery.parseXML(data);
              const $item = $(xmlDoc).find("add-item");
              $item.attr("repository", componentPath);
              res += ((_a = $item[0]) == null ? void 0 : _a.outerHTML) ?? "";
            } catch {
              res += data;
            }
          } else res += data;
          res += "\n\n";
        });
        $("#itemTreeResult").append("<pre />").find("pre").text(`<import-items>
${res}
</import-items>`);
      } else if (outputType === "HTMLtab") {
        let allXml = "";
        this.itemTree.forEach((data) => {
          allXml += data;
        });
        this.showXMLAsTab(allXml, $xmlDef, $("#itemTreeResult"), true);
      } else if (outputType === "removeItem" || outputType === "printItem") {
        let res = "";
        this.itemTree.forEach((data) => {
          try {
            const xmlDoc = jQuery.parseXML(data);
            const $item = $(xmlDoc).find("add-item");
            const tag = outputType === "removeItem" ? "remove-item" : "print-item";
            res += `<${tag} id="${$item.attr("id")}" item-descriptor="${$item.attr("item-descriptor")}"${printRepoAttr ? ` repository='${componentPath}'` : ""} />
`;
          } catch {
          }
        });
        $("#itemTreeResult").append("<pre />").find("pre").text(res);
      } else if (outputType === "tree") {
        this.renderAsTree($xmlDef);
      }
      console.timeEnd("getItemTree");
    }
    renderAsTree($xmlDef) {
      const vis = window["vis"];
      if (!vis) return;
      const nodes = new vis.DataSet();
      const edges = new vis.DataSet();
      const itemIdToVisId = {};
      let i = 0;
      this.itemTree.forEach((_, id) => {
        itemIdToVisId[id] = i++;
      });
      this.itemTree.forEach((data, id) => {
        try {
          const xmlDoc = $.parseXML(`<xml>${data}</xml>`);
          const $xml = $(xmlDoc);
          const $addItem = $xml.find("add-item").first();
          const itemDesc = $addItem.attr("item-descriptor") ?? "";
          const itemId = $addItem.attr("id") ?? "";
          $addItem.children().each((_, propEl) => {
            const $p = $(propEl);
            const pName = $p.attr("name") ?? "";
            const pVal = $p.text();
            if (!this.edgesToIgnore.includes(pName)) {
              const isId = this.isTypeId(pName, itemDesc, $xmlDef);
              if (isId !== null) {
                this.parseRepositoryId(pVal).filter((v) => v !== "," && v !== "=" && itemIdToVisId[v] !== void 0).forEach((v) => edges.add({ from: itemIdToVisId[itemId], to: itemIdToVisId[v], arrows: "to", title: pName }));
              }
            }
          });
          nodes.add({ id: itemIdToVisId[itemId], label: `${itemDesc}
${itemId}`, color: colorToCss(stringToColour(itemDesc)), shape: "box" });
        } catch {
        }
      });
      $("#itemTreeResult").empty().append("<div id='treeContainer' style='height:600px;'></div>");
      const container = document.getElementById("treeContainer");
      if (!container) return;
      const network = new vis.Network(container, { nodes, edges }, {});
      network.on("click", (params) => {
        var _a;
        if (((_a = params.nodes) == null ? void 0 : _a.length) > 0) {
          const visId = params.nodes[0];
          const itemId = Object.keys(itemIdToVisId).find((k) => itemIdToVisId[k] === visId);
          if (itemId) {
            const data = this.itemTree.get(itemId);
            if (data) this.showXMLAsTab(data, null, $("#treeInfo"), false);
          }
        }
      });
    }
    createSpeedbar() {
      var _a;
      let html = "<a class='close' href='javascript:void(0)'><i class='fa fa-times'></i></a><p>Quick links :</p><ul>";
      $("#itemTreeResult .dataTable").each((_, table) => {
        const id = $(table).attr("id") ?? "";
        const name = id.includes("_") ? id.split("_")[1] : id;
        const nbItem = Math.floor($(table).find("td").length / $(table).find("tr").length);
        html += `<li><i class='fa fa-arrow-right'></i>&nbsp;&nbsp;<a href='#${id}'>${name.trim()} (${nbItem})</a></li>`;
      });
      html += "</ul>";
      $("#itemTreeInfo").append(`<div id='speedbar'><div id='widget' class='sticky'>${html}</div></div>`);
      $("#speedbar .close").on("click", () => $("#speedbar").fadeOut(200));
      const stickyTop = ((_a = $(".sticky").offset()) == null ? void 0 : _a.top) ?? 0;
      $(window).on("scroll", () => {
        if (stickyTop < ($(window).scrollTop() ?? 0)) $(".sticky").css({ position: "fixed", top: 100 });
        else $(".sticky").css("position", "static");
      });
    }
    // -------------------------------------------------------------------------
    // Cache section
    // -------------------------------------------------------------------------
    setupRepositoryCacheSection() {
      try {
        console.time("setupRepositoryCacheSection");
        const $cacheUsage = $(this.cacheUsageSelector);
        const $cacheTable = $cacheUsage.next().next().find("table");
        if ($cacheTable.length === 0) return;
        $cacheTable.addClass("cache").removeAttr("border");
        const $header = $cacheTable.find("tr").first().detach();
        $("<thead></thead>").prependTo($cacheTable).append($header);
        let index = 0;
        $cacheTable.find("tr").each((_, tr) => {
          if ((index - 1) % 3 === 0) $(tr).addClass("odd cache-subheader");
          index++;
        });
        this.setupCacheCollapse($header, $cacheTable);
        const $resetLink = $cacheUsage.next();
        const $buttons = $("<div></div>").appendTo($resetLink);
        $("<button></button>", { id: "cacheExpandAll", class: "cache expand", html: "Expand All" }).on("click", () => {
          $cacheTable.find("tr.cache-subheader.collapsed").each((_, el) => this.toggleCacheLine(el));
        }).appendTo($buttons);
        $("<button></button>", { id: "collapseAll", class: "cache collapse", html: "Collapse All" }).on("click", () => {
          $cacheTable.find("tr.cache-subheader.expanded").each((_, el) => this.toggleCacheLine(el));
        }).appendTo($buttons);
        $("<button></button>", { id: "exportCSV", class: "cache export", html: "Export as CSV" }).on("click", () => this.exportCacheStatsAsCSV($cacheTable)).appendTo($buttons);
        $cacheTable.addClass("fixed_headers");
        $cacheTable.find(".cache-subheader").each((_, el) => {
          $(el).addClass("collapsed").next().css("display", "none").next().css("display", "none");
        });
        console.timeEnd("setupRepositoryCacheSection");
      } catch (err) {
        console.error(err);
      }
    }
    setupCacheCollapse($header, $cacheTable) {
      $cacheTable.find(".cache-subheader").each((_, el) => {
        const $tr = $(el);
        const $td = $tr.find("td").first();
        $td.attr("colspan", 23);
        const $queryCols = $tr.next().next().children("td");
        if ($queryCols.length === 1) $queryCols.attr("colspan", 23);
        const text = $td.find('b:contains("item-descriptor")').first().text();
        const match = CACHE_STAT_TITLE_REGEXP.exec(text);
        if (match) {
          const [, itemDesc = "", cacheMode = "", , cacheLocality = ""] = match;
          $tr.attr("data-item-desc", itemDesc).attr("data-cache-mode", cacheMode).attr("data-cache-locality", cacheLocality);
          $td.html(
            `<span class="cacheArrow"><i class="fa fa-chevron-right"></i></span><span> item-descriptor=<b>${itemDesc}</b></span><span> cache-mode=<b>${cacheMode}</b></span>` + (cacheLocality ? `<span> cache-locality=<b>${cacheLocality}</b></span>` : "")
          );
        }
        $tr.on("click", () => this.toggleCacheLine(el));
      });
    }
    toggleCacheLine(el) {
      const $tr = $(el);
      if ($tr.hasClass("collapsed")) {
        $tr.removeClass("collapsed").addClass("expanded").next().show().next().show();
      } else {
        $tr.removeClass("expanded").addClass("collapsed").next().hide().next().hide();
      }
    }
    exportCacheStatsAsCSV($cacheTable) {
      let csv = "";
      $cacheTable.find("tr").each((_, tr) => {
        const row = [];
        $(tr).find("th, td").each((_2, td) => row.push(`"${$(td).text().trim().replace(/"/g, '""')}"`));
        csv += row.join(",") + "\n";
      });
      copyToClipboard(csv);
    }
  }
  class BdaPipeline {
    constructor() {
      this.$pipelineDef = null;
      this.network = null;
      this.graphDirection = "LR";
      this.pipelineModal = null;
      this.visOptions = {
        width: "100%",
        height: "550px",
        interaction: {
          zoomView: true,
          selectable: true,
          dragNodes: false,
          dragView: true,
          hover: false
        },
        layout: {
          hierarchical: {
            direction: "LR",
            sortMethod: "directed",
            nodeSpacing: 300,
            levelSeparation: 250
          }
        },
        edges: {
          smooth: { type: "cubicBezier", forceDirection: "horizontal", roundness: 0.4 }
        },
        nodes: { font: { size: 11 }, shape: "box" },
        physics: false
      };
    }
    isApplicable() {
      return $("h2:contains('Pipeline Chains')").length === 1;
    }
    init() {
      if (!this.isApplicable()) return;
      console.time("bdaPipeline");
      logTrace("BdaPipeline init");
      this.setupPipelineManagerPage();
      console.timeEnd("bdaPipeline");
    }
    setupPipelineManagerPage() {
      const $h2 = $("h2:contains('Pipeline Chains')");
      const $content = $(
        "<button id='schemeOrientation' class='bda-btn'>Switch orientation <i class='fa fa-retweet'></i></button><div id='pipelineScheme'></div>"
      );
      this.pipelineModal = new BdaModal({
        title: "",
        content: $content,
        width: "90vw"
      }).mount();
      const $pipelineTable = $h2.next().attr("id", "pipelineTable");
      $pipelineTable.find("tr:nth-child(odd)").addClass("odd");
      $pipelineTable.find("tr:first").append("<th>Show XML</th><th>Show graph</th>");
      $pipelineTable.find("tr:gt(0)").append(
        "<td align='center'><i class='fa fa-code link'></i></td><td align='center'><i class='fa fa-eye link'></i><sup style='font-size:8px'>&nbsp;BETA</sup></td>"
      );
      processRepositoryXmlDef("definitionFile", ($xmlDef) => {
        this.$pipelineDef = $xmlDef;
        $pipelineTable.find("tr").each((_, elem) => {
          const $elem = $(elem);
          const chainName = $elem.find("td:eq(0)").text().trim();
          $elem.attr("id", chainName);
          $elem.find("td:eq(7)").on("click", (e) => {
            const $td = $(e.currentTarget);
            if ($td.hasClass("open")) {
              $td.removeClass("open");
              $(`#xml_${chainName}`).remove();
            } else {
              $td.addClass("open");
              const isOdd = $elem.hasClass("odd");
              this._showPipelineXml(chainName, isOdd);
            }
          });
          $elem.find("td:eq(8)").on("click", () => {
            this.graphDirection = "LR";
            this.showPipelineGraph(chainName);
          });
        });
      });
    }
    _showPipelineXml(chainName, isOdd) {
      if (!this.$pipelineDef) return;
      const trId = `xml_${chainName}`;
      if ($(`#${trId}`).length !== 0) return;
      const xmlEl = this.$pipelineDef.find(`pipelinechain[name=${chainName}]`).get(0);
      if (!xmlEl) return;
      const $codeBlock = $(`<tr id='${trId}'><td colspan='9'><pre></pre></td></tr>`).insertAfter(`#${chainName}`).find("pre").text(xmlEl.outerHTML);
      if (isOdd) $(`#${trId}`).addClass("odd");
      highlightAndIndentXml($codeBlock);
    }
    showPipelineGraph(chainName) {
      this.pipelineModal.setTitle(chainName);
      this.pipelineModal.show();
      const container = document.getElementById("pipelineScheme");
      if (!container || !window.vis) return;
      const data = this.createNodesAndEdges(chainName);
      this.drawGraph(container, data, chainName);
      $("#schemeOrientation").off("click").on("click", () => {
        var _a;
        (_a = this.network) == null ? void 0 : _a.destroy();
        this.graphDirection = this.graphDirection === "LR" ? "UD" : "LR";
        this.drawGraph(container, data, chainName);
      });
    }
    drawGraph(container, data, chainName) {
      if (!window.vis) return;
      const opts = {
        ...this.visOptions,
        layout: {
          hierarchical: {
            ...this.visOptions.layout.hierarchical,
            direction: this.graphDirection
          }
        }
      };
      this.network = new window.vis.Network(container, data, opts);
      this.network.on(
        "click",
        (params) => {
          const id = params.nodes[0];
          if (id !== void 0) {
            const nodes = data.nodes;
            const node = nodes.get(id);
            window.open("/dyn/admin/nucleus/" + node.pipelineLinkPath, "_blank");
          }
        }
      );
    }
    createNodesAndEdges(chainName) {
      if (!this.$pipelineDef || !window.vis) return { nodes: null, edges: null };
      const $chainDef = this.$pipelineDef.find(`pipelinechain[name=${chainName}]`);
      const nodes = new window.vis.DataSet();
      const edges = new window.vis.DataSet();
      $chainDef.find("pipelinelink").each((index, el) => {
        const pipelineLinkName = $(el).attr("name") ?? "";
        const $processor = $(el).find("processor");
        const pipelineLinkPath = $processor.attr("jndi") ?? $processor.attr("class") ?? "";
        nodes.add({
          id: index,
          label: pipelineLinkName,
          name: pipelineLinkName,
          pipelineLinkPath
        });
      });
      $chainDef.find("pipelinelink").each((index, el) => {
        const pipelineLinkName = $(el).attr("name") ?? "";
        $(el).find("transition").each((_, transition) => {
          const transitionName = $(transition).attr("link") ?? "";
          const fromId = this.findNodeId(nodes, pipelineLinkName);
          const toId = this.findNodeId(nodes, transitionName);
          edges.add({
            from: fromId,
            to: toId,
            arrows: "to",
            label: $(transition).attr("returnvalue") ?? ""
          });
        });
      });
      return { nodes, edges };
    }
    findNodeId(nodes, name) {
      let id;
      nodes.forEach((node) => {
        if (node.name === name) id = node.id;
      });
      return id;
    }
  }
  class BdaJdbc {
    constructor() {
      this.DEFAULT_DATASOURCE_DIR = "/atg/dynamo/service/jdbc/";
      this.CONNECTION_POOL_POINTER = "/atg/dynamo/admin/jdbcbrowser/ConnectionPoolPointer/";
    }
    isExecuteQueryPage() {
      return location.pathname.indexOf("executeQuery.jhtml") !== -1;
    }
    isJdbcHomePage() {
      return location.pathname.indexOf("/dyn/admin/nucleus/atg/dynamo/service/jdbc") !== -1 || $("h1:contains('JDBC Browser')").length > 0;
    }
    isApplicable() {
      return this.isExecuteQueryPage() || this.isJdbcHomePage();
    }
    init() {
      if (!this.isApplicable()) return;
      logTrace("BdaJdbc init");
      if (this.isExecuteQueryPage()) this.setupExecuteQueryPage();
      if (this.isJdbcHomePage()) this.setupJdbcHomePage();
    }
    setupExecuteQueryPage() {
      logTrace("setupExecuteQueryPage");
      const $h1 = $("h1:contains('Execute Query')");
      if ($h1.length === 0) return;
      const $switcher = $('<div class="bda-jdbc-switcher"></div>');
      const $label = $("<label>Data Source: </label>");
      const $select = $('<select class="bda-select"></select>');
      this.getAvailableDataSources().then((sources) => {
        sources.forEach((src) => {
          $select.append($("<option></option>").val(src).text(src));
        });
        this.getCurrentDataSource().then((current) => {
          if (current) $select.val(current);
        });
        $select.on("change", () => {
          const selected = $select.val();
          this.switchDataSource(selected).catch((e) => logTrace("switchDataSource error:", e));
        });
      });
      $switcher.append($label, $select);
      $h1.after($switcher);
      this.addCsvExport();
    }
    addCsvExport() {
      const $resultTable = $("table").filter(function() {
        return $(this).find("tr").length > 1;
      }).first();
      if ($resultTable.length === 0) return;
      const $btn = $('<button class="bda-button btn btn-default"><i class="fa fa-download"></i> Export CSV</button>');
      $btn.on("click", () => {
        const csv = $resultTable.toCSV();
        copyToClipboard(csv);
      });
      $resultTable.before($btn);
    }
    async getAvailableDataSources() {
      const customFolder = bdaStorage.getConfigurationValue("data_source_folder");
      const folder = customFolder ?? this.DEFAULT_DATASOURCE_DIR;
      const url = `/dyn/admin/nucleus${folder}`;
      return new Promise((resolve) => {
        jQuery.ajax({
          url,
          success: (result) => {
            const sources = [];
            $(result).find("a").each(function() {
              const href = $(this).attr("href") ?? "";
              if (href.indexOf(folder) !== -1) {
                sources.push(href.replace("/dyn/admin/nucleus", ""));
              }
            });
            resolve(sources);
          },
          error: () => resolve([])
        });
      });
    }
    async getCurrentDataSource() {
      const url = `/dyn/admin/nucleus${this.CONNECTION_POOL_POINTER}/?propertyName=dataSource`;
      return new Promise((resolve) => {
        jQuery.ajax({
          url,
          success: (result) => {
            const $result = $(result);
            const value = $result.find("h3:contains('Value')").next().text().trim();
            resolve(value || null);
          },
          error: () => resolve(null)
        });
      });
    }
    async switchDataSource(path) {
      const url = `/dyn/admin/nucleus${this.CONNECTION_POOL_POINTER}/`;
      return new Promise((resolve, reject) => {
        jQuery.ajax({
          url,
          type: "POST",
          data: { propertyName: "dataSource", dataSource: path },
          success: () => {
            logTrace("Switched datasource to", path);
            resolve();
          },
          error: (xhr) => reject(new Error(`Switch failed: ${xhr.status}`))
        });
      });
    }
    setupJdbcHomePage() {
      logTrace("setupJdbcHomePage");
      $("td").each(function() {
        const text = $(this).text().trim();
        if (text.startsWith("/") && !$(this).find("a").length) {
          const url = `/dyn/admin/nucleus${text}`;
          $(this).html(`<a href="${url}">${text}</a>`);
        }
      });
    }
  }
  class BdaPerfMonitor {
    isPerfMonitorPage() {
      return location.pathname.indexOf("performance-monitor.jhtml") !== -1;
    }
    isPerfMonitorTimePage() {
      return location.pathname.indexOf("performance-data-time.jhtml") !== -1;
    }
    isApplicable() {
      return this.isPerfMonitorPage() || this.isPerfMonitorTimePage();
    }
    init() {
      if (!this.isApplicable()) return;
      logTrace("BdaPerfMonitor init");
      this.setupSortingTabPerfMonitor();
    }
    setupSortingTabPerfMonitor() {
      const tableIndex = this.isPerfMonitorPage() ? 1 : 0;
      const $table = $("table").eq(tableIndex);
      if ($table.length === 0) return;
      const $firstRow = $table.find("tr").first();
      const $thead = $("<thead></thead>");
      const $headerRow = $("<tr></tr>");
      $firstRow.find("td").each(function() {
        $headerRow.append($("<th></th>").text($(this).text()));
      });
      $thead.append($headerRow);
      $firstRow.remove();
      $table.prepend($thead);
      $table.tablesorter({
        theme: "blue",
        widgets: ["zebra"]
      });
      logTrace("PerfMonitor tablesorter applied");
    }
  }
  class BdaActor {
    isApplicable() {
      return $("h2:contains('Actor Chain:')").length > 0;
    }
    init() {
      if (!this.isApplicable()) return;
      logTrace("BdaActor init");
      this.createActorCaller();
    }
    createActorCaller() {
      const componentPath = getCurrentComponentPath();
      const chainId = new URLSearchParams(location.search).get("chainId") ?? "";
      const $h2 = $("h2:contains('Actor Chain:')");
      if ($h2.length === 0) return;
      const $inputsTable = $("h3:contains('Inputs')").next("table");
      const $outputsTable = $("h3:contains('Outputs')").next("table");
      const inputs = [];
      $inputsTable.find("tr").each(function() {
        const $cells = $(this).find("td");
        if ($cells.length >= 2) {
          inputs.push({
            name: $cells.eq(0).text().trim(),
            type: $cells.eq(1).text().trim()
          });
        }
      });
      const restEndpoint = `/rest/model${componentPath}`;
      const $callerDiv = $('<div class="bda-actor-caller"></div>');
      const $titleBar = $('<div class="bda-actor-title"></div>').text(`Call: ${chainId}`);
      const $endpointRow = $('<div class="bda-actor-endpoint"></div>');
      const $endpointLabel = $("<span>REST endpoint: </span>");
      const $endpointLink = $("<code></code>").text(restEndpoint);
      const $copyBtn = $('<button class="bda-btn bda-btn--icon"><i class="fa fa-files-o"></i></button>').on("click", () => {
        copyToClipboard(restEndpoint);
      });
      $endpointRow.append($endpointLabel, $endpointLink, $copyBtn);
      $callerDiv.append($titleBar, $endpointRow);
      if (inputs.length > 0) {
        const $inputSection = $('<div class="bda-actor-inputs"><strong>Inputs:</strong></div>');
        inputs.forEach((input) => {
          const $row = $(`<div class="bda-actor-input-row"><label>${input.name} <em>(${input.type})</em>: </label></div>`);
          const $field = $(`<input type="text" class="bda-input" placeholder="${input.name}" data-name="${input.name}" />`);
          $row.append($field);
          $inputSection.append($row);
        });
        $callerDiv.append($inputSection);
      }
      const $callBtn = $('<button class="bda-btn bda-btn--primary">Call Chain</button>').on("click", () => {
        const params = {};
        $callerDiv.find("input[data-name]").each(function() {
          params[$(this).data("name")] = $(this).val();
        });
        logTrace("Calling actor chain", params);
        jQuery.ajax({
          url: restEndpoint,
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify(params),
          success: (result) => {
            $resultPre.text(JSON.stringify(result, null, 2));
          },
          error: (xhr) => {
            $resultPre.text(`Error: ${xhr.status} ${xhr.statusText}`);
          }
        });
      });
      const $resultPre = $('<pre class="bda-actor-result"></pre>');
      $callerDiv.append($callBtn, $resultPre);
      if ($outputsTable.length > 0) $outputsTable.after($callerDiv);
      else $h2.after($callerDiv);
    }
  }
  class BdaXmlDef {
    constructor() {
      this.xmlDefinitionMaxSize = 15e4;
      this.repositoryRootNode = "gsa-template";
    }
    isXMLDefinitionFilePage() {
      return $("h1:contains('XML Definition File')").length > 0;
    }
    isApplicable() {
      return this.isXMLDefinitionFilePage() || location.search.indexOf("propertyName=") !== -1;
    }
    init() {
      if (!this.isApplicable()) return;
      logTrace("BdaXmlDef init");
      this.setupXmlDefPage();
    }
    setupXmlDefPage() {
      const showAsTable = bdaStorage.getConfigurationValue("defaultOpenXmlDefAsTable") === true;
      if (this.isXMLDefinitionFilePage()) {
        this.renderXmlDefFromPage(showAsTable);
      } else {
        this.renderXmlDefFromProperty(showAsTable);
      }
    }
    renderXmlDefFromPage(showAsTable) {
      const $pre = $("pre").first();
      if ($pre.length === 0) return;
      const xmlContent = $pre.text().trim();
      if (xmlContent.length > this.xmlDefinitionMaxSize) {
        logTrace("XML definition too large to render as table");
        return;
      }
      this.renderXmlDef(xmlContent, showAsTable);
    }
    renderXmlDefFromProperty(showAsTable) {
      processRepositoryXmlDef("definitionFile", ($xmlDoc) => {
        var _a;
        if (!$xmlDoc) return;
        const xmlContent = ((_a = $xmlDoc.find(this.repositoryRootNode).get(0)) == null ? void 0 : _a.outerHTML) ?? "";
        this.renderXmlDef(xmlContent, showAsTable);
      });
    }
    renderXmlDef(xmlContent, showAsTable) {
      try {
        const xmlDoc = jQuery.parseXML(xmlContent);
        const $xml = $(xmlDoc);
        const $root = $xml.find(this.repositoryRootNode);
        if ($root.length === 0) return;
        const $tabContainer = $('<div class="bda-xml-def-tabs twbs"></div>');
        const $tabNav = $('<ul class="nav nav-tabs"></ul>');
        const $tabContent = $('<div class="tab-content"></div>');
        $tabContainer.append($tabNav, $tabContent);
        $tabNav.append('<li class="active"><a href="#xmldef-raw" data-toggle="tab">XML</a></li>');
        const $rawTab = $('<div class="tab-pane active" id="xmldef-raw"></div>');
        const $pre = $("<pre></pre>").text(xmlContent);
        $rawTab.append($pre);
        $tabContent.append($rawTab);
        if (window.hljs) {
          window.hljs.highlightElement($pre.get(0));
        }
        $tabNav.append('<li><a href="#xmldef-table" data-toggle="tab">Table</a></li>');
        const $tableTab = $('<div class="tab-pane" id="xmldef-table"></div>');
        this.buildItemDescriptorTables($root, $tableTab);
        $tabContent.append($tableTab);
        $("h1").first().after($tabContainer);
        if (showAsTable) {
          $tabNav.find('a[href="#xmldef-table"]').trigger("click");
        }
        logTrace("XmlDef rendered");
      } catch (e) {
        logTrace("Failed to render XML def:", e);
      }
    }
    buildItemDescriptorTables($root, $container) {
      $root.find("item-descriptor").each((index, el) => {
        const $desc = $(el);
        const descriptorName = $desc.attr("name") ?? `item-${index}`;
        const $panel = $(
          formatString(
            '<div id="item_{0}" class="panel panel-default item-panel" data-item-descriptor="{0}"></div>',
            descriptorName
          )
        );
        const $heading = $(
          `<div class="panel-heading item-descriptor-heading"><h4>${descriptorName}</h4></div>`
        );
        const superType = $desc.attr("super-type");
        if (!isNull(superType)) {
          $heading.append(` <small>extends: <a href="#item_${superType}">${superType}</a></small>`);
        }
        const cacheMode = $desc.attr("cache-mode");
        const cacheSize = $desc.attr("item-cache-size");
        const cacheTimeout = $desc.attr("item-cache-timeout");
        if (cacheMode) $heading.append(` <span class="label label-default">cache: ${cacheMode}</span>`);
        if (cacheSize) $heading.append(` <span class="label label-info">size: ${cacheSize}</span>`);
        if (cacheTimeout) $heading.append(` <span class="label label-info">timeout: ${cacheTimeout}s</span>`);
        const $body = $('<div class="panel-body"></div>');
        const $table = $('<table class="table table-condensed table-bordered bda-props-table"><thead><tr><th>Name</th><th>Data/Item Type</th><th>Column</th><th>Property Type</th><th>Queryable</th><th>Writable</th></tr></thead><tbody></tbody></table>');
        const $tbody = $table.find("tbody");
        $desc.find("property").each(function() {
          const $prop = $(this);
          const name = $prop.attr("name") ?? "";
          const dataType = $prop.attr("data-type") ?? "";
          const itemType = $prop.attr("item-type") ?? "";
          const columnName = $prop.attr("column-name") ?? "";
          const propertyType = $prop.attr("property-type") ?? "";
          const propertyTypeSimple = propertyType ? propertyType.split(".").pop() ?? propertyType : "";
          const queryable = $prop.attr("queryable") ?? "";
          const writable = $prop.attr("writable") ?? "";
          const typeDisplay = dataType || (itemType ? `<a href="#item_${itemType}">${itemType}</a>` : "");
          $tbody.append(
            `<tr><td>${name}</td><td>${typeDisplay}</td><td>${columnName}</td><td><span title="${propertyType}">${propertyTypeSimple}</span></td><td>${queryable}</td><td>${writable}</td></tr>`
          );
        });
        $body.append($table);
        $panel.append($heading, $body);
        $container.append($panel);
      });
    }
  }
  class BdaCompConfig {
    isServiceConfigurationPage() {
      return location.search.indexOf("propertyName=serviceConfiguration") !== -1;
    }
    isPropertyPage() {
      return $("form[method=POST] input[name=propertyName]").length > 0;
    }
    isApplicable() {
      return this.isServiceConfigurationPage() || this.isPropertyPage();
    }
    init() {
      if (!this.isApplicable()) return;
      logTrace("BdaCompConfig init");
      if (this.isServiceConfigurationPage()) {
        this.setupServiceConfigurationPage();
      }
      if (this.isPropertyPage()) {
        this.setupPropertyPage();
      }
    }
    setupPropertyPage() {
      logTrace("setupPropertyPage");
      const $form = $("form[method=POST]");
      const $textarea = $form.find("textarea").first();
      if ($textarea.length === 0) return;
      $form.on("submit", (e) => {
        e.preventDefault();
        const propertyName = $form.find("input[name=propertyName]").val();
        const propertyValue = $textarea.val();
        jQuery.ajax({
          url: $form.attr("action") ?? location.href,
          type: "POST",
          contentType: "application/x-www-form-urlencoded; charset=UTF-8",
          data: { propertyName, propertyValue },
          success: () => {
            logTrace("Property saved successfully");
            location.reload();
          },
          error: (xhr) => {
            logTrace("Property save error:", xhr.status);
          }
        });
      });
    }
    setupServiceConfigurationPage() {
      logTrace("setupServiceConfigurationPage");
      if (!window.hljs) return;
      window.hljs.registerLanguage("properties", () => {
        return {
          case_insensitive: true,
          contains: [
            {
              className: "comment",
              begin: /#/,
              end: /$/
            },
            {
              className: "attr",
              begin: /^[^\s=]+/,
              end: /=/,
              excludeEnd: true
            },
            {
              className: "string",
              begin: /=/,
              end: /$/,
              excludeBegin: true
            }
          ]
        };
      });
      $("pre").each(function() {
        $(this).addClass("properties");
        if (window.hljs) {
          window.hljs.highlightElement(this);
        }
      });
    }
  }
  class KeyboardShortcuts {
    constructor() {
      this.shortcuts = [];
      this.helpVisible = false;
    }
    register(shortcut) {
      this.shortcuts.push(shortcut);
    }
    unregister(module) {
      this.shortcuts = this.shortcuts.filter((s) => s.module !== module);
    }
    getAll() {
      return [...this.shortcuts];
    }
    init() {
      $(document).on("keydown.bdaKeyboard", (e) => {
        const target = e.target;
        const inInput = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable === true;
        for (const s of this.shortcuts) {
          const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
          const ctrlMatch = !!s.ctrl === e.ctrlKey;
          const altMatch = !!s.alt === e.altKey;
          const shiftMatch = !!s.shift === e.shiftKey;
          if (!keyMatch || !ctrlMatch || !altMatch || !shiftMatch) continue;
          if (inInput && !s.ctrl && !s.alt && !s.shift) continue;
          e.preventDefault();
          s.handler();
          return;
        }
      });
    }
    showHelp() {
      if (this.helpVisible) {
        this.hideHelp();
        return;
      }
      this.helpVisible = true;
      const byModule = {};
      for (const s of this.shortcuts) {
        if (!byModule[s.module]) byModule[s.module] = [];
        byModule[s.module].push(s);
      }
      const formatKey = (s) => {
        const parts = [];
        if (s.ctrl) parts.push("Ctrl");
        if (s.alt) parts.push("Alt");
        if (s.shift) parts.push("Shift");
        parts.push(s.key === "?" ? "?" : s.key.toUpperCase());
        return parts.join("+");
      };
      let rows = "";
      for (const [mod, shortcuts] of Object.entries(byModule)) {
        rows += `<tr class="bda-help-module-row"><td colspan="2"><strong>${mod}</strong></td></tr>`;
        for (const s of shortcuts) {
          rows += `<tr><td><kbd>${formatKey(s)}</kbd></td><td>${s.description}</td></tr>`;
        }
      }
      const $overlay = $('<div id="bda-help-overlay"></div>');
      const $panel = $(`
      <div class="bda-help-panel">
        <div class="bda-help-header">
          <span>Keyboard Shortcuts</span>
          <button class="bda-btn bda-btn--icon" id="bda-help-close"><i class="fa fa-times"></i></button>
        </div>
        <table class="bda-help-table">${rows}</table>
        <p class="bda-help-hint">Press <kbd>?</kbd> or <kbd>Esc</kbd> to close</p>
      </div>
    `);
      $overlay.append($panel);
      $("body").append($overlay);
      $overlay.on("click", (e) => {
        if (e.target === $overlay[0]) this.hideHelp();
      });
      $("#bda-help-close").on("click", () => this.hideHelp());
      requestAnimationFrame(() => {
        $overlay.addClass("bda-help-overlay--visible");
      });
    }
    hideHelp() {
      this.helpVisible = false;
      const $overlay = $("#bda-help-overlay");
      $overlay.removeClass("bda-help-overlay--visible");
      setTimeout(() => $overlay.remove(), 200);
    }
  }
  const bdaKeyboard = new KeyboardShortcuts();
  class BdaComponent {
    /**
     * Set a property value on an ATG Dynamo component
     */
    setProperty(domain, component, property, value) {
      const url = `${domain}/dyn/admin/nucleus${component}/?propertyName=${property}`;
      logTrace(`setProperty: POST ${url}`);
      return new Promise((resolve, reject) => {
        jQuery.ajax({
          url,
          type: "POST",
          data: { atg_admin_property_name: property, atg_admin_property_value: value },
          success: () => resolve(),
          error: (xhr, status, err) => reject(new Error(`setProperty failed: ${status} ${err}`))
        });
      });
    }
    /**
     * Get a property value from an ATG Dynamo component
     */
    getProperty(domain, component, property) {
      const url = `${domain}/dyn/admin/nucleus${component}/?propertyName=${property}`;
      logTrace(`getProperty: GET ${url}`);
      return new Promise((resolve, reject) => {
        jQuery.ajax({
          url,
          success: (result) => {
            try {
              const value = this.extractValueFromPropertyPage(result);
              resolve(value);
            } catch (e) {
              reject(e);
            }
          },
          error: (xhr, status, err) => reject(new Error(`getProperty failed: ${status} ${err}`))
        });
      });
    }
    /**
     * Call a method on an ATG Dynamo component
     */
    call(domain, component, method) {
      const url = `${domain}/dyn/admin/nucleus${component}/`;
      logTrace(`call: POST ${url}, method=${method}`);
      return new Promise((resolve, reject) => {
        jQuery.ajax({
          url,
          type: "POST",
          data: { atg_admin_invoke_method: method },
          success: (result) => {
            try {
              const value = this.extractMethodCallReturnValue(result);
              resolve(value);
            } catch (e) {
              reject(e);
            }
          },
          error: (xhr, status, err) => reject(new Error(`call failed: ${status} ${err}`))
        });
      });
    }
    /**
     * Extract property value from a Dynamo property page HTML response
     */
    extractValueFromPropertyPage(result) {
      const $result = $(result);
      const $valueHeader = $result.find("h3:contains('Value')");
      if ($valueHeader.length === 0) return null;
      const $valueCell = $valueHeader.closest("table").find("td").first();
      if (isNull($valueCell) || $valueCell.length === 0) return null;
      return $valueCell.text().trim();
    }
    /**
     * Extract return value from a Dynamo method call HTML response
     */
    extractMethodCallReturnValue(result) {
      const $result = $(result);
      const $failure = $result.find("h3:contains('Invocation Failure')");
      if ($failure.length > 0) {
        throw new Error($failure.next().text().trim());
      }
      const $returnedObj = $result.find("h3:contains('Returned Object')");
      if ($returnedObj.length > 0) {
        return $returnedObj.next().text().trim();
      }
      return null;
    }
  }
  const bdaComponent = new BdaComponent();
  class BdaDash {
    constructor(bda) {
      this.commandHistory = [];
      this.variables = {};
      this.lastOutput = null;
      this.dashModal = null;
      this.HIST_PERSIST_SIZE = 20;
      this.historyIndex = -1;
      this.bda = bda;
    }
    init() {
      logTrace("BdaDash init");
      this.loadHistory();
      this.createModal();
    }
    // -------------------------------------------------------------------------
    // Modal setup
    // -------------------------------------------------------------------------
    createModal() {
      const $content = $(
        '<div id="dashScreen" class="bda-dash-screen"></div><div class="bda-dash-input-row"><span class="bda-dash-prompt">$</span><input type="text" id="dashInput" class="bda-dash-input" placeholder="Type a command..." autocomplete="off"><button class="bda-btn bda-btn--primary bda-btn--sm" id="dashSubmit">Run</button></div><div id="dashScripts" class="bda-dash-scripts" style="display:none"><div id="dashScriptList"></div><input type="text" id="dashScriptName" placeholder="Script name"><button class="bda-btn bda-btn--sm" id="dashSaveScript">Save</button></div>'
      );
      this.dashModal = new BdaModal({
        title: "DASH — DynAdmin SHell",
        content: $content,
        width: "800px",
        buttons: [
          { label: "Close", callback: () => this.dashModal.hide() },
          { id: "dashToggleScripts", label: '<i class="fa fa-file-text-o"></i> Scripts' },
          { id: "dashClear", label: '<i class="fa fa-trash-o"></i> Clear' }
        ]
      }).mount();
      this.bindModalEvents();
    }
    createLaunchButton() {
      const $btn = $('<button class="bda-nav__btn" id="dashLaunch" title="Open DASH"><i class="fa fa-terminal"></i> DASH</button>');
      $btn.on("click", () => {
        var _a;
        (_a = this.dashModal) == null ? void 0 : _a.show();
      });
      const $navActions = $("#bdaNavActions");
      if ($navActions.length) {
        $('<div class="bda-nav__item"></div>').append($btn).appendTo($navActions);
      } else {
        $("body").append($btn);
      }
    }
    bindModalEvents() {
      const $input = $("#dashInput");
      const $submit = $("#dashSubmit");
      $submit.on("click", () => this.executeCommand($input.val()));
      $input.on("keydown", (e) => {
        if (e.key === "Enter" || e.key === "Enter" && e.ctrlKey) {
          e.preventDefault();
          this.executeCommand($input.val());
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          this.navigateHistory(-1, $input);
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          this.navigateHistory(1, $input);
        }
        if (e.key === "l" && e.ctrlKey) {
          e.preventDefault();
          $("#dashScreen").empty();
        }
      });
      $("#dashClear").on("click", () => {
        $("#dashScreen").empty();
      });
      $("#dashToggleScripts").on("click", () => {
        $("#dashScripts").toggle();
        if ($("#dashScripts").is(":visible")) this.renderScripts();
      });
      $("#dashSaveScript").on("click", () => {
        const name = $("#dashScriptName").val().trim();
        if (!name) return;
        const commands = $("#dashScreen .bda-dash-line-input").map(function() {
          return $(this).text();
        }).get().join("\n");
        bdaStorage.storeScript({ name, content: commands });
        this.renderScripts();
      });
      bdaKeyboard.register({
        key: "t",
        ctrl: true,
        alt: true,
        description: "Open DASH (alternate)",
        module: "DASH",
        handler: () => {
          var _a;
          (_a = this.dashModal) == null ? void 0 : _a.show();
        }
      });
    }
    navigateHistory(direction, $input) {
      this.historyIndex = Math.max(-1, Math.min(this.commandHistory.length - 1, this.historyIndex + direction));
      $input.val(this.historyIndex >= 0 ? this.commandHistory[this.historyIndex] : "");
    }
    async executeCommand(rawInput) {
      const input = rawInput.trim();
      if (!input) return;
      $("#dashInput").val("");
      this.appendInputLine(input);
      this.addToHistory(input);
      this.historyIndex = -1;
      try {
        let lines;
        try {
          lines = DASH_LINES_SPLITTER.parse(input);
        } catch {
          lines = [input];
        }
        for (const line of lines) {
          if (!line.trim()) continue;
          await this.executeSingleCommand(line.trim());
        }
      } catch (e) {
        this.appendErrorLine(String(e));
      }
    }
    async executeSingleCommand(line) {
      let parsed;
      try {
        parsed = BDA_DASH_PARSER.parse(line);
      } catch (e) {
        await this.executeRawXml(line);
        return;
      }
      const cmd = parsed.function.toLowerCase();
      const params = parsed.params;
      switch (cmd) {
        case "get":
        case "print":
          await this.cmdGetProperty(params);
          break;
        case "set":
          await this.cmdSetProperty(params);
          break;
        case "call":
        case "invoke":
          await this.cmdCallMethod(params);
          break;
        case "help":
          this.cmdHelp();
          break;
        case "clear":
          $("#dashScreen").empty();
          break;
        case "history":
          this.cmdShowHistory();
          break;
        default:
          await this.executeRawXml(line);
      }
    }
    async cmdGetProperty(params) {
      const component = this.resolveComponent(params);
      const propertyParam = params.find((p) => p.type === "value");
      if (!component || !propertyParam) {
        this.appendErrorLine("Usage: get @component propertyName");
        return;
      }
      try {
        const value = await bdaComponent.getProperty(location.origin, component, String(propertyParam.value));
        this.appendOutputLine(String(value ?? "null"));
        this.lastOutput = value;
      } catch (e) {
        this.appendErrorLine(String(e));
      }
    }
    async cmdSetProperty(params) {
      const component = this.resolveComponent(params);
      const propParam = params.find((p) => p.name === "p" || p.name === "property");
      const valParam = params.find((p) => p.name === "v" || p.name === "value");
      if (!component || !propParam || !valParam) {
        this.appendErrorLine("Usage: set @component -p propertyName -v value");
        return;
      }
      try {
        await bdaComponent.setProperty(location.origin, component, String(propParam.value), String(valParam.value));
        this.appendOutputLine("Property set successfully.");
      } catch (e) {
        this.appendErrorLine(String(e));
      }
    }
    async cmdCallMethod(params) {
      const component = this.resolveComponent(params);
      const methodParam = params.find((p) => p.type === "value");
      if (!component || !methodParam) {
        this.appendErrorLine("Usage: call @component methodName");
        return;
      }
      try {
        const result = await bdaComponent.call(location.origin, component, String(methodParam.value));
        this.appendOutputLine(String(result ?? "void"));
        this.lastOutput = result;
      } catch (e) {
        this.appendErrorLine(String(e));
      }
    }
    async executeRawXml(xml) {
      const componentPath = getCurrentComponentPath();
      const url = `${location.origin}/dyn/admin/nucleus${componentPath}/`;
      return new Promise((resolve) => {
        jQuery.ajax({
          url,
          type: "POST",
          data: { xmltext: xml },
          success: (result) => {
            const $result = $(result);
            const $pre = $result.find("pre").first();
            if ($pre.length > 0) {
              this.appendOutputLine($pre.text());
            } else {
              const text = $result.find("h2").first().text();
              this.appendOutputLine(text || "Done.");
            }
            resolve();
          },
          error: (xhr) => {
            this.appendErrorLine(`HTTP ${xhr.status}: ${xhr.statusText}`);
            resolve();
          }
        });
      });
    }
    cmdHelp() {
      this.appendOutputLine(
        "Available commands:\n  get @component property       - Get a property value\n  set @component -p prop -v val - Set a property value\n  call @component method        - Invoke a method\n  clear                         - Clear screen\n  history                       - Show command history\n  help                          - Show this help\n\n  @this refers to the current component\n  @# refers to the last output value"
      );
    }
    cmdShowHistory() {
      this.appendOutputLine(this.commandHistory.slice(0, 20).join("\n"));
    }
    // -------------------------------------------------------------------------
    // Component resolution
    // -------------------------------------------------------------------------
    resolveComponent(params) {
      const compParam = params.find((p) => p.type === "component");
      if (!compParam) return getCurrentComponentPath();
      const name = String(compParam.name ?? "");
      if (name === "this") return getCurrentComponentPath();
      if (name === "#") return String(this.lastOutput ?? "");
      const stored = bdaStorage.getStoredComponents();
      const match = stored.find((c) => getComponentNameFromPath(c.path).toLowerCase().includes(name.toLowerCase()));
      return (match == null ? void 0 : match.path) ?? "/" + name;
    }
    // -------------------------------------------------------------------------
    // Screen output
    // -------------------------------------------------------------------------
    appendInputLine(text) {
      $("#dashScreen").append(
        `<div class="bda-dash-line"><span class="bda-dash-prompt">$</span><span class="bda-dash-line-input">${this.escapeHtml(text)}</span><button class="bda-btn bda-btn--sm bda-dash-copy" title="Copy"><i class="fa fa-files-o"></i></button></div>`
      );
      this.bindCopyButtons();
      this.scrollToBottom();
    }
    appendOutputLine(text) {
      this.lastOutput = text;
      $("#dashScreen").append(
        `<div class="bda-dash-line bda-dash-output"><pre>${this.escapeHtml(text)}</pre></div>`
      );
      this.scrollToBottom();
    }
    appendErrorLine(text) {
      $("#dashScreen").append(
        `<div class="bda-dash-line bda-dash-error"><span class="text-danger">${this.escapeHtml(text)}</span></div>`
      );
      this.scrollToBottom();
    }
    bindCopyButtons() {
      $("#dashScreen .bda-dash-copy").off("click").on("click", function() {
        const text = $(this).siblings(".bda-dash-line-input").text();
        copyToClipboard(text);
      });
    }
    scrollToBottom() {
      const el = document.getElementById("dashScreen");
      if (el) el.scrollTop = el.scrollHeight;
    }
    escapeHtml(text) {
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    // -------------------------------------------------------------------------
    // History persistence
    // -------------------------------------------------------------------------
    addToHistory(command) {
      this.commandHistory = [command, ...this.commandHistory.filter((c) => c !== command)].slice(
        0,
        this.HIST_PERSIST_SIZE
      );
      bdaStorage.storeItem("DashHistory", this.commandHistory);
    }
    loadHistory() {
      var _a;
      this.commandHistory = ((_a = bdaStorage["getItem"]) == null ? void 0 : _a.call(bdaStorage, "DashHistory")) ?? [];
      if (!Array.isArray(this.commandHistory)) this.commandHistory = [];
    }
    // -------------------------------------------------------------------------
    // Scripts
    // -------------------------------------------------------------------------
    renderScripts() {
      const $list = $("#dashScriptList").empty();
      const scripts = bdaStorage.getScripts();
      if (scripts.length === 0) {
        $list.html("<p>No saved scripts.</p>");
        return;
      }
      scripts.forEach((s) => {
        const $row = $(`<div class="bda-dash-script-row"><strong>${s.name}</strong></div>`);
        const $runBtn = $('<button class="bda-btn bda-btn--sm bda-btn--primary">Run</button>');
        const $delBtn = $('<button class="bda-btn bda-btn--sm bda-btn--danger">Delete</button>');
        $runBtn.on("click", async () => {
          for (const line of s.content.split("\n")) {
            if (line.trim()) await this.executeCommand(line.trim());
          }
        });
        $delBtn.on("click", () => {
          bdaStorage.deleteScript(s.name);
          this.renderScripts();
        });
        $row.append(" ", $runBtn, " ", $delBtn);
        $list.append($row);
      });
    }
  }
  class BdaScheduler {
    isApplicable() {
      return $("h2:contains('Scheduled jobs')").length > 0;
    }
    init() {
      if (!this.isApplicable()) return;
      logTrace("BdaScheduler init");
      this.buildScheduler();
    }
    buildScheduler() {
      const $h2 = $("h2:contains('Scheduled jobs')");
      const $table = $h2.next("table");
      if ($table.length === 0) return;
      const $firstRow = $table.find("tr").first();
      const $thead = $("<thead></thead>");
      const $headerRow = $("<tr></tr>");
      $firstRow.find("td").each(function() {
        $headerRow.append($("<th></th>").text($(this).text()));
      });
      $thead.append($headerRow);
      $firstRow.remove();
      $table.prepend($thead);
      $table.tablesorter({ theme: "blue", widgets: ["zebra"] });
      this.buildTimeline($h2, $table);
    }
    buildTimeline($h2, $table) {
      if (!window.vis) {
        logTrace("vis.js not available for scheduler timeline");
        return;
      }
      const $wrapper = $('<div id="timeline-wrapper"></div>');
      const $toggleBtn = $(
        '<button class="bda-button btn btn-default"><i class="fa fa-calendar"></i> Toggle Timeline</button>'
      );
      $h2.after($wrapper).after($toggleBtn);
      $wrapper.hide();
      $toggleBtn.on("click", () => {
        if ($wrapper.is(":visible")) {
          $wrapper.hide();
        } else {
          $wrapper.show();
          this.renderTimeline($wrapper, $table);
        }
      });
    }
    renderTimeline($wrapper, $table) {
      if (!window.vis) return;
      $wrapper.empty();
      const container = $wrapper.get(0);
      if (!container) return;
      const items = [];
      let id = 0;
      $table.find("tbody tr, tr").each(function() {
        const $cells = $(this).find("td");
        if ($cells.length < 3) return;
        const jobName = $cells.eq(0).text().trim();
        const nextRun = $cells.eq(1).text().trim();
        const prevRun = $cells.eq(2).text().trim();
        if (!jobName || jobName === "") return;
        const nextDate = nextRun ? new Date(nextRun) : null;
        const prevDate = prevRun ? new Date(prevRun) : null;
        if (!isNull(nextDate) && nextDate && !isNaN(nextDate.getTime())) {
          items.push({ id: id++, content: jobName + " (next)", start: nextDate });
        }
        if (!isNull(prevDate) && prevDate && !isNaN(prevDate.getTime())) {
          items.push({ id: id++, content: jobName + " (prev)", start: prevDate });
        }
      });
      if (items.length === 0) {
        $wrapper.text("No scheduled job data available for timeline.");
        return;
      }
      const dataset = new window.vis.DataSet(items);
      new window.vis.Timeline(container, dataset, {
        height: "300px",
        start: new Date(Date.now() - 24 * 60 * 60 * 1e3),
        end: new Date(Date.now() + 24 * 60 * 60 * 1e3)
      });
      logTrace("Scheduler timeline rendered");
    }
  }
  const bdaCss = `/* =============================================================================\r
   BDA Design Tokens\r
   ============================================================================= */\r
:root {\r
  /* --- Brand --- */\r
  --bda-brand:              #007bb8;\r
  --bda-brand-dark:         #00486c;\r
  --bda-whatsnew:           #62a03e;\r
  --bda-whatsnew-border:    #44702b;\r
\r
  /* --- Accent (interactive elements) --- */\r
  --bda-accent:             #2563eb;\r
  --bda-accent-hover:       #1d4ed8;\r
  --bda-accent-active:      #1e40af;\r
  --bda-accent-subtle:      #dbeafe;\r
\r
  /* --- Semantic --- */\r
  --bda-success:            #16a34a;\r
  --bda-success-bg:         #d1e7dd;\r
  --bda-success-text:       #0f5132;\r
  --bda-success-light:      #dff0d8;\r
  --bda-danger:             #dc2626;\r
  --bda-danger-dark:        #880000;\r
  --bda-warning:            #d97706;\r
\r
  /* --- Neutrals (light → dark) --- */\r
  --bda-white:              #ffffff;\r
  --bda-surface:            #f8f9fb;   /* subtle backgrounds, toolbars */\r
  --bda-surface-raised:     #f1f3f5;   /* table headers, elevated surfaces */\r
  --bda-surface-hover:      #e9ecef;   /* hover state backgrounds */\r
  --bda-border-subtle:      #e0e0e0;   /* very light borders */\r
  --bda-border:             #dee2e6;   /* standard borders */\r
  --bda-border-input:       #ced4da;   /* form element borders */\r
  --bda-border-muted:       #adb5bd;   /* muted / secondary borders */\r
  --bda-text-subtle:        #6c757d;   /* tertiary / placeholder text */\r
  --bda-text-muted:         #495057;   /* secondary body text */\r
  --bda-text:               #212529;   /* primary body text */\r
  --bda-text-strong:        #111827;   /* headings, selected state */\r
  --bda-black:              #000000;\r
\r
  /* --- Typography --- */\r
  --bda-font-sans:  -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;\r
  --bda-font-mono:  ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;\r
  --bda-font-size-xs:   11px;\r
  --bda-font-size-sm:   12px;\r
  --bda-font-size-base: 13px;\r
  --bda-font-size-md:   14px;\r
\r
  /* --- Border radius --- */\r
  --bda-radius-sm:  3px;\r
  --bda-radius:     4px;\r
  --bda-radius-md:  6px;\r
  --bda-radius-lg:  10px;\r
\r
  /* --- Shadows --- */\r
  --bda-shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.06);\r
  --bda-shadow:     0 0 5px rgba(0, 0, 0, 0.25);\r
\r
  /* --- Transitions --- */\r
  --bda-transition: all 0.15s ease;\r
}\r
\r
/* Dark mode overrides — apply .bda-dark to <body> or a wrapper */\r
.bda-dark {\r
  --bda-white:           #1e2124;\r
  --bda-surface:         #23272b;\r
  --bda-surface-raised:  #2c3034;\r
  --bda-surface-hover:   #343a40;\r
  --bda-border-subtle:   #3a3f44;\r
  --bda-border:          #444c55;\r
  --bda-border-input:    #555e68;\r
  --bda-border-muted:    #6c757d;\r
  --bda-text-subtle:     #8c9aab;\r
  --bda-text-muted:      #a8b4c0;\r
  --bda-text:            #dde2e8;\r
  --bda-text-strong:     #f0f3f6;\r
  --bda-black:           #f8f9fa;\r
  --bda-accent-subtle:   #1e3a5f;\r
  --bda-success-light:   #0a2e1a;\r
}\r
\r
/* =============================================================================\r
   Global\r
   ============================================================================= */\r
body {\r
  padding-left: 15px;\r
  padding-top: 48px;\r
}\r
\r
tr.even td {\r
  background-color: var(--bda-white);\r
}\r
\r
#itemTreeId {\r
  width: 100px;\r
}\r
\r
#itemTreeMax {\r
  width: 40px;\r
}\r
\r
a {\r
  text-decoration: none\r
}\r
\r
.fa-pencil-square-o {\r
  cursor: pointer;\r
}\r
\r
/* =============================================================================\r
   RQL Toolbar\r
   ============================================================================= */\r
#RQLToolbar {\r
  margin-bottom: 12px;\r
  padding: 10px 14px;\r
  background: var(--bda-surface);\r
  border: 1px solid var(--bda-border-subtle);\r
  border-radius: var(--bda-radius-md);\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  flex-wrap: wrap;\r
  width: fit-content;\r
}\r
\r
/* =============================================================================\r
   Select2 overrides\r
   ============================================================================= */\r
.select2-container .select2-choices .select2-search-field input,\r
.select2-container .select2-choice,\r
.select2-container .select2-choices {\r
  font-family: var(--bda-font-sans);\r
  font-size: var(--bda-font-size-base);\r
  color: var(--bda-text-strong);\r
}\r
\r
.select2-chosen,\r
.select2-choice > span:first-child,\r
.select2-container .select2-choices .select2-search-field input {\r
  padding: 4px 6px;\r
}\r
\r
#select2-drop {\r
  font-size: var(--bda-font-size-base);\r
}\r
\r
.select2-container .select2-choice {\r
  height: 24px;\r
}\r
\r
.select2-container .select2-choice .select2-arrow b,\r
.select2-container .select2-choice div b {\r
  background-position: 0 0;\r
}\r
\r
.select2-results {\r
  max-height: 220px;\r
}\r
\r
/* =============================================================================\r
   RQL Buttons (positional overrides — base styles from .bda-btn)\r
   ============================================================================= */\r
#RQLAdd {\r
  margin-left: 10px;\r
}\r
\r
#RQLResults {\r
  margin-top: 10px;\r
  overflow-x: auto;\r
}\r
\r
#RQLResults .dataTable thead th {\r
  position: sticky;\r
  top: 0;\r
  background: var(--bda-bg);\r
  z-index: 1;\r
  box-shadow: 0 1px 0 var(--bda-border);\r
}\r
\r
/* =============================================================================\r
   RQL Log\r
   ============================================================================= */\r
#RQLLog {\r
  overflow-x: hidden;\r
  max-height: 100px;\r
  padding: 8px 12px;\r
  border: 1px solid var(--bda-border);\r
  border-radius: var(--bda-radius-md);\r
  width: 800px;\r
  white-space: pre-wrap;\r
  font-family: var(--bda-font-mono);\r
  font-size: var(--bda-font-size-sm);\r
  background: var(--bda-surface);\r
  color: var(--bda-text-muted);\r
}\r
\r
#rawXml {\r
  display: none;\r
  margin: 0px;\r
  padding: 0px;\r
}\r
\r
/* =============================================================================\r
   Data Table\r
   ============================================================================= */\r
.dataTable {\r
  font-size: var(--bda-font-size-base);\r
  margin: 5px;\r
  border: 1px solid var(--bda-border);\r
  border-radius: var(--bda-radius-md);\r
  z-index: 10;\r
  position: relative;\r
  background-color: var(--bda-white);\r
  border-collapse: separate;\r
  border-spacing: 0;\r
  overflow: hidden;\r
}\r
\r
.prop_name {\r
  font-size: 80%;\r
}\r
\r
/* Badge — .bda-badge\r
   ============================================================================= */\r
.bda-badge {\r
  display: inline-block;\r
  padding: 2px 7px;\r
  border-radius: var(--bda-radius-lg);\r
  font-size: var(--bda-font-size-xs);\r
  font-weight: 700;\r
  line-height: 1.5;\r
  text-align: center;\r
  white-space: nowrap;\r
  vertical-align: middle;\r
}\r
\r
.bda-badge--danger {\r
  background: #fee2e2;\r
  color: var(--bda-danger);\r
}\r
\r
.bda-badge--success {\r
  background: var(--bda-success-bg);\r
  color: var(--bda-success-text);\r
}\r
\r
.bda-badge--accent {\r
  background: var(--bda-accent-subtle);\r
  color: var(--bda-accent-active);\r
}\r
\r
.bda-badge--neutral {\r
  background: var(--bda-surface-raised);\r
  color: var(--bda-text-subtle);\r
}\r
\r
/* Legacy aliases for backward compat */\r
.prop_attr {\r
  display: inline-block;\r
  margin: 2px;\r
  padding: 1px;\r
  color: var(--bda-white);\r
  vertical-align: middle;\r
}\r
\r
.prop_attr_red {\r
  background-color: var(--bda-danger);\r
}\r
\r
.prop_attr_blue {\r
  background-color: var(--bda-accent);\r
}\r
\r
.prop_attr_green {\r
  background-color: var(--bda-success);\r
}\r
\r
.copyLink {\r
  text-decoration: none;\r
  color: var(--bda-accent-active);\r
}\r
\r
.copyField {\r
  width: 200px;\r
  display: none;\r
}\r
\r
.dataTable td,\r
.dataTable th {\r
  padding: 6px 10px;\r
}\r
\r
.dataTable th {\r
  min-width: 160px;\r
  text-align: left;\r
  background: var(--bda-surface-raised);\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-text-muted);\r
  border-bottom: 2px solid var(--bda-border);\r
}\r
\r
/* =============================================================================\r
   Form inputs\r
   ============================================================================= */\r
#itemId {\r
  width: 125px;\r
  height: 28px;\r
  padding: 4px 8px;\r
  border: 1px solid var(--bda-border-input);\r
  border-radius: var(--bda-radius);\r
  font-size: var(--bda-font-size-base);\r
}\r
\r
#splitValue {\r
  padding: 4px 8px;\r
  border: 1px solid var(--bda-border-input);\r
  border-radius: var(--bda-radius);\r
  font-size: var(--bda-font-size-base);\r
}\r
\r
/* =============================================================================\r
   Input — .bda-input\r
   ============================================================================= */\r
.bda-input {\r
  height: 28px;\r
  padding: 4px 8px;\r
  border: 1px solid var(--bda-border-input);\r
  border-radius: var(--bda-radius);\r
  font-size: var(--bda-font-size-base);\r
  font-family: inherit;\r
  color: var(--bda-text);\r
  background: var(--bda-white);\r
  transition: border-color 0.15s, box-shadow 0.15s;\r
  outline: none;\r
  vertical-align: middle;\r
}\r
\r
.bda-input:focus {\r
  border-color: var(--bda-accent);\r
  box-shadow: 0 0 0 3px var(--bda-accent-subtle);\r
}\r
\r
/* =============================================================================\r
   Table — .bda-table\r
   ============================================================================= */\r
.bda-table {\r
  border-collapse: separate;\r
  border-spacing: 0;\r
  border: 1px solid var(--bda-border);\r
  border-radius: var(--bda-radius-md);\r
  overflow: hidden;\r
  font-size: var(--bda-font-size-base);\r
  background: var(--bda-white);\r
  width: 100%;\r
}\r
\r
.bda-table th {\r
  background: var(--bda-surface-raised);\r
  color: var(--bda-text-muted);\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-sm);\r
  text-transform: uppercase;\r
  letter-spacing: 0.3px;\r
  padding: 8px 12px;\r
  border-bottom: 2px solid var(--bda-border);\r
  position: sticky;\r
  top: 0;\r
  z-index: 1;\r
  text-align: left;\r
  white-space: nowrap;\r
}\r
\r
.bda-table td {\r
  padding: 6px 12px;\r
  border-bottom: 1px solid var(--bda-surface-hover);\r
  vertical-align: middle;\r
}\r
\r
.bda-table tbody tr:nth-child(odd) td {\r
  background: var(--bda-surface);\r
}\r
\r
.bda-table tbody tr:hover td {\r
  background: var(--bda-accent-subtle);\r
}\r
\r
/* =============================================================================\r
   Descriptor Table\r
   ============================================================================= */\r
.descriptor {\r
  margin: 5px 10px 5px 5px;\r
}\r
\r
.descriptorTable {\r
  float: left;\r
  margin-right: 10px;\r
  margin-bottom: 10px;\r
  border: 1px solid var(--bda-border);\r
  border-radius: var(--bda-radius-md);\r
  white-space: nowrap;\r
  overflow: hidden;\r
  font-size: var(--bda-font-size-base);\r
}\r
\r
.descriptorTable th {\r
  background: var(--bda-surface-raised);\r
  color: var(--bda-text-muted);\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-sm);\r
  text-transform: uppercase;\r
  letter-spacing: 0.3px;\r
  padding: 8px 10px;\r
}\r
\r
.descriptorTable td {\r
  padding: 5px 8px;\r
}\r
\r
/* =============================================================================\r
   CodeMirror\r
   ============================================================================= */\r
#RQLText .CodeMirror {\r
  border: 1px solid var(--bda-border-input);\r
  border-radius: var(--bda-radius-md);\r
  height: 355px;\r
  width: 800px;\r
  cursor: text;\r
  font-size: var(--bda-font-size-base);\r
}\r
\r
#RQLText {\r
  display: inline-block;\r
  vertical-align: top;\r
}\r
\r
.xmlDefinition .CodeMirror {\r
  border: 1px solid var(--bda-surface-hover);\r
  height: auto;\r
}\r
\r
.xmlDefinition .CodeMirror-scroll {\r
  overflow-y: hidden;\r
  overflow-x: auto;\r
}\r
\r
/* =============================================================================\r
   Button System — .bda-btn\r
   ============================================================================= */\r
.bda-btn {\r
  display: inline-block;\r
  padding: 5px 12px;\r
  border: 1px solid var(--bda-border-input);\r
  border-radius: var(--bda-radius);\r
  background: var(--bda-white);\r
  color: var(--bda-text-muted);\r
  font-size: var(--bda-font-size-base);\r
  font-family: inherit;\r
  cursor: pointer;\r
  transition: var(--bda-transition);\r
  text-decoration: none;\r
  line-height: 1.4;\r
  white-space: nowrap;\r
  vertical-align: middle;\r
}\r
\r
.bda-btn:hover,\r
.bda-btn:focus {\r
  background: var(--bda-surface-hover);\r
  border-color: var(--bda-border-muted);\r
  color: var(--bda-text);\r
  text-decoration: none;\r
  outline: none;\r
}\r
\r
.bda-btn--primary {\r
  background: var(--bda-accent);\r
  color: var(--bda-white);\r
  border-color: var(--bda-accent);\r
}\r
\r
.bda-btn--primary:hover,\r
.bda-btn--primary:focus {\r
  background: var(--bda-accent-hover);\r
  border-color: var(--bda-accent-active);\r
  color: var(--bda-white);\r
}\r
\r
.bda-btn--danger {\r
  color: var(--bda-danger-dark);\r
  border-color: var(--bda-danger);\r
}\r
\r
.bda-btn--danger:hover,\r
.bda-btn--danger:focus {\r
  background: var(--bda-danger);\r
  color: var(--bda-white);\r
  border-color: var(--bda-danger-dark);\r
}\r
\r
.bda-btn--sm {\r
  padding: 3px 8px;\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
.bda-btn--icon {\r
  padding: 4px 6px;\r
  line-height: 1;\r
}\r
\r
#repoToolbar {\r
  margin-bottom: 20px;\r
}\r
\r
.showMore {\r
  font-size: 80%;\r
}\r
\r
/* =============================================================================\r
   Stored Queries / Properties tabs\r
   ============================================================================= */\r
.storedQueriesTitle {\r
  font-size: var(--bda-font-size-base);\r
  font-weight: bold;\r
}\r
\r
#tabs {\r
  display: inline-block;\r
  vertical-align: top;\r
  margin-left: 5px;\r
  max-width: calc(100% - 820px);\r
}\r
\r
#tabs i {\r
  font-size: 80%;\r
}\r
\r
/* =============================================================================\r
   Tabs — .bda-tabs / .bda-tabs__item\r
   ============================================================================= */\r
.bda-tabs {\r
  list-style: none;\r
  margin: 0;\r
  overflow: hidden;\r
  padding: 0;\r
  display: flex;\r
  gap: 2px;\r
}\r
\r
.bda-tabs__item {\r
  padding: 6px 16px;\r
  font-size: var(--bda-font-size-base);\r
  font-weight: 500;\r
  cursor: pointer;\r
  background: var(--bda-surface-raised);\r
  color: var(--bda-text-muted);\r
  border: 1px solid var(--bda-border);\r
  border-bottom: none;\r
  border-radius: var(--bda-radius-md) var(--bda-radius-md) 0 0;\r
  transition: background-color 0.15s, color 0.15s;\r
  user-select: none;\r
}\r
\r
.bda-tabs__item:hover {\r
  background: var(--bda-surface-hover);\r
  color: var(--bda-text-strong);\r
}\r
\r
.bda-tabs__item--active {\r
  background: var(--bda-white);\r
  color: var(--bda-text-strong);\r
  border-bottom: 1px solid var(--bda-white);\r
  margin-bottom: -1px;\r
}\r
\r
#descProperties {\r
  display: none;\r
  border: 1px solid var(--bda-border);\r
  border-radius: 0 var(--bda-radius-md) var(--bda-radius-md) var(--bda-radius-md);\r
  max-height: 320px;\r
  overflow: auto;\r
  background: var(--bda-white);\r
  box-shadow: var(--bda-shadow-sm);\r
}\r
\r
#descProperties tbody tr:nth-child(odd) {\r
  background-color: var(--bda-surface);\r
}\r
\r
#descProperties tbody tr:hover {\r
  background-color: var(--bda-accent-subtle);\r
}\r
\r
#descProperties table {\r
  font-size: var(--bda-font-size-base);\r
  border: none;\r
  border-collapse: collapse;\r
  width: 100%;\r
}\r
\r
#descProperties th {\r
  background: var(--bda-surface-raised);\r
  color: var(--bda-text-muted);\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-sm);\r
  text-transform: uppercase;\r
  letter-spacing: 0.3px;\r
  padding: 8px 10px;\r
  border-bottom: 2px solid var(--bda-border);\r
  position: sticky;\r
  top: 0;\r
  z-index: 1;\r
}\r
\r
#descProperties td {\r
  padding: 6px 10px;\r
  border-bottom: 1px solid var(--bda-surface-hover);\r
  vertical-align: middle;\r
}\r
\r
.propQueryBtn {\r
  color: var(--bda-text);\r
  text-decoration: none;\r
  cursor: pointer;\r
  border-bottom: 1px dashed var(--bda-border-muted);\r
}\r
\r
.propQueryBtn:hover {\r
  color: var(--bda-accent);\r
  border-bottom-color: var(--bda-accent);\r
}\r
\r
/* =============================================================================\r
   Enum badges\r
   ============================================================================= */\r
.bda-enum-toggle {\r
  cursor: pointer;\r
  color: var(--bda-accent);\r
  font-weight: 500;\r
}\r
\r
.bda-enum-toggle:hover {\r
  color: var(--bda-accent-active);\r
}\r
\r
.bda-enum-values {\r
  display: none;\r
  margin-top: 4px;\r
  max-width: 160px;\r
}\r
\r
.bda-enum-value {\r
  display: inline-block;\r
  padding: 1px 6px;\r
  margin: 1px 2px;\r
  border-radius: var(--bda-radius-lg);\r
  font-size: 10px;\r
  background: var(--bda-surface-hover);\r
  color: var(--bda-text-muted);\r
}\r
\r
.showQueriesLabel {\r
  font-size: 80%;\r
  margin: 0px;\r
  padding: 5px 0px 0px 0px;\r
}\r
\r
#storedQueries {\r
  display: inline-block;\r
  vertical-align: top;\r
  border: 1px solid var(--bda-border);\r
  border-radius: 0 var(--bda-radius-md) var(--bda-radius-md) var(--bda-radius-md);\r
  min-width: 350px;\r
  max-height: 320px;\r
  background: var(--bda-white);\r
  box-shadow: var(--bda-shadow-sm);\r
  padding: 8px;\r
  overflow: auto;\r
}\r
\r
.error {\r
  color: var(--bda-danger);\r
}\r
\r
#RQLSave {\r
  margin: 5px;\r
}\r
\r
.queryView {\r
  display: none;\r
}\r
\r
.previewQuery {\r
  margin-top: 5px;\r
  margin-left: 10px;\r
  cursor: pointer;\r
}\r
\r
.deleteQuery {\r
  margin-top: 5px;\r
  margin-left: 10px;\r
  cursor: pointer;\r
}\r
\r
/* =============================================================================\r
   Navbar — #bdaNavbar\r
   ============================================================================= */\r
#bdaNavbar {\r
  position: fixed;\r
  top: 0;\r
  left: 0;\r
  right: 0;\r
  height: 44px;\r
  background: var(--bda-white);\r
  border-bottom: 1px solid var(--bda-border);\r
  display: flex;\r
  align-items: center;\r
  padding: 0 12px;\r
  z-index: 8000;\r
  gap: 8px;\r
  box-shadow: var(--bda-shadow-sm);\r
}\r
\r
.bda-nav__brand {\r
  font-weight: 700;\r
  font-size: var(--bda-font-size-md);\r
  color: var(--bda-accent);\r
  letter-spacing: 0.5px;\r
  padding: 0 4px;\r
  white-space: nowrap;\r
}\r
\r
.bda-nav__left {\r
  display: flex;\r
  align-items: center;\r
  gap: 10px;\r
  flex: 1;\r
  min-width: 0;\r
}\r
\r
.bda-nav__search {\r
  display: flex;\r
  align-items: center;\r
  margin: 0;\r
}\r
\r
.bda-nav__search input {\r
  height: 28px;\r
  padding: 4px 10px;\r
  border: 1px solid var(--bda-border-input);\r
  border-radius: var(--bda-radius);\r
  font-size: var(--bda-font-size-base);\r
  font-family: inherit;\r
  color: var(--bda-text);\r
  background: var(--bda-surface);\r
  transition: border-color 0.15s, box-shadow 0.15s;\r
  outline: none;\r
  width: 220px;\r
}\r
\r
.bda-nav__search input:focus {\r
  border-color: var(--bda-accent);\r
  box-shadow: 0 0 0 3px var(--bda-accent-subtle);\r
  background: var(--bda-white);\r
}\r
\r
.bda-nav__right {\r
  display: flex;\r
  align-items: center;\r
  gap: 2px;\r
  flex-shrink: 0;\r
}\r
\r
.bda-nav__item {\r
  position: relative;\r
}\r
\r
.bda-nav__btn {\r
  display: flex;\r
  align-items: center;\r
  gap: 5px;\r
  height: 32px;\r
  padding: 0 10px;\r
  background: transparent;\r
  border: 1px solid transparent;\r
  border-radius: var(--bda-radius);\r
  color: var(--bda-text-muted);\r
  font-size: var(--bda-font-size-sm);\r
  font-family: inherit;\r
  cursor: pointer;\r
  white-space: nowrap;\r
  transition: var(--bda-transition);\r
}\r
\r
.bda-nav__btn:hover,\r
.bda-nav__btn--active {\r
  background: var(--bda-surface-raised);\r
  border-color: var(--bda-border-subtle);\r
  color: var(--bda-text-strong);\r
}\r
\r
.bda-nav__dropdown {\r
  display: none;\r
  position: absolute;\r
  top: calc(100% + 6px);\r
  right: 0;\r
  min-width: 280px;\r
  max-height: 80vh;\r
  overflow-y: auto;\r
  background: var(--bda-white);\r
  border: 1px solid var(--bda-border);\r
  border-radius: var(--bda-radius-md);\r
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);\r
  padding: 12px;\r
  z-index: 8500;\r
  color: var(--bda-text);\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
.bda-nav__dropdown--open {\r
  display: block;\r
}\r
\r
.bda-nav__dropdown a {\r
  color: var(--bda-accent);\r
  text-decoration: underline;\r
}\r
\r
.bda-nav__dropdown p {\r
  margin-top: 0;\r
}\r
\r
.bda-nav__dropdown textarea {\r
  width: 100%;\r
  box-sizing: border-box;\r
}\r
\r
#whatsnewDropdown {\r
  min-width: 340px;\r
}\r
\r
#history {\r
  padding: 4px 0 8px;\r
}\r
\r
.bda-history-list {\r
  display: flex;\r
  flex-wrap: wrap;\r
  gap: 6px;\r
  align-items: center;\r
}\r
\r
.bda-history-pill {\r
  display: inline-flex;\r
  align-items: center;\r
  padding: 2px 10px;\r
  border-radius: 999px;\r
  font-size: var(--bda-font-size-sm);\r
  background: var(--bda-surface);\r
  border: 1px solid var(--bda-border);\r
  color: var(--bda-text-muted);\r
  text-decoration: none;\r
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;\r
}\r
\r
.bda-history-pill:hover {\r
  background: var(--bda-border-subtle);\r
  border-color: var(--bda-border-muted);\r
  color: var(--bda-text-strong);\r
}\r
\r
#toolbar {\r
  display: flex;\r
  flex-wrap: wrap;\r
  gap: 8px;\r
  padding: 8px 0;\r
  align-items: flex-start;\r
}\r
\r
.toolbar-elem {\r
  /* flex child — no float */\r
}\r
\r
/* =============================================================================\r
   Favorites\r
   ============================================================================= */\r
.newFav {\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
}\r
\r
#favTagList {\r
  margin-top: 4px;\r
}\r
\r
#favSetTags {\r
  margin-bottom: 5px;\r
}\r
\r
\r
.tag-filter {\r
  cursor: pointer;\r
}\r
\r
.tag-filter label {\r
  margin-left: 5px;\r
  cursor: pointer;\r
}\r
\r
.favline {\r
  margin-bottom: 5px;\r
  display: block;\r
}\r
\r
.favline ul {\r
  margin: 0;\r
  padding: 0;\r
  list-style-type: none;\r
  width: 100%;\r
  overflow-x: auto;\r
  white-space: nowrap;\r
}\r
\r
.favline div {\r
  display: inline-block;\r
}\r
\r
.favline li {\r
  display: inline-block;\r
  list-style: none; /* pour enlever les puces sur IE7 */\r
  margin: 2px;\r
}\r
\r
.bda-tag-pill {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 4px;\r
  padding: 2px 10px;\r
  border-radius: 999px;\r
  font-size: var(--bda-font-size-sm);\r
  border: 1px solid var(--bda-border);\r
  background: var(--bda-surface);\r
  color: var(--bda-text-muted);\r
  cursor: pointer;\r
  user-select: none;\r
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;\r
}\r
\r
.bda-tag-pill:hover {\r
  border-color: var(--bda-border-muted);\r
  color: var(--bda-text-strong);\r
}\r
\r
.bda-tag-pill--active {\r
  background: rgba(66, 133, 244, 0.1);\r
  border-color: #4285f4;\r
  color: #4285f4;\r
}\r
\r
.bda-tag-pill input[type='checkbox'] {\r
  display: none;\r
}\r
\r
.bda-tag-pill label {\r
  cursor: pointer;\r
  margin: 0;\r
}\r
\r
.newtags {\r
  width: 85%;\r
}\r
\r
.fav-color-bar {\r
  height: 4px;\r
  width: 100%;\r
  border-radius: var(--bda-radius-md) var(--bda-radius-md) 0 0;\r
}\r
\r
.fav {\r
  min-width: 90px;\r
  max-width: 140px;\r
  background: var(--bda-white);\r
  border: 1px solid var(--bda-border);\r
  border-radius: var(--bda-radius-md);\r
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);\r
  overflow: hidden;\r
  display: flex;\r
  flex-direction: column;\r
  color: var(--bda-text-strong);\r
}\r
\r
.fav a {\r
  color: var(--bda-text-strong);\r
}\r
\r
.favLink {\r
  text-align: center;\r
  padding: 6px 8px 4px;\r
  line-height: 16px;\r
  flex: 1;\r
}\r
\r
.favLink a,\r
.logdebug {\r
  color: var(--bda-text-strong);\r
  text-decoration: none;\r
}\r
\r
.favName {\r
  display: block;\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-text-muted);\r
  margin-top: 1px;\r
}\r
\r
.favArrow {\r
  text-align: center;\r
  cursor: pointer;\r
  padding: 4px;\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-text-muted);\r
  border-top: 1px solid var(--bda-border-subtle);\r
  transition: color 0.15s ease;\r
}\r
\r
.favArrow:hover {\r
  color: var(--bda-text-strong);\r
}\r
\r
.fav-tags {\r
  color: var(--bda-text-muted);\r
  margin-top: 2px;\r
  font-size: var(--bda-font-size-xs);\r
}\r
\r
.favTitle {\r
  font-size: var(--bda-font-size-sm);\r
  font-weight: 600;\r
  margin-bottom: 2px;\r
  text-align: center;\r
  color: var(--bda-text-strong);\r
}\r
\r
.favMoreInfo {\r
  font-size: var(--bda-font-size-xs);\r
  display: none;\r
  padding: 6px 8px;\r
  text-align: left;\r
  border-top: 1px solid var(--bda-border-subtle);\r
}\r
\r
.favDelete {\r
  cursor: pointer;\r
  color: var(--bda-danger, #dc3545);\r
  margin-top: 4px;\r
}\r
\r
.favLogDebug form {\r
  margin: 0;\r
}\r
\r
.favLogDebug {\r
  margin-bottom: 2px;\r
  margin-top: 2px;\r
}\r
\r
\r
#oracleATGbrand {\r
  width: 120px;\r
  cursor: pointer;\r
}\r
\r
/* =============================================================================\r
   Misc\r
   ============================================================================= */\r
#xmlHighlight {\r
  margin-bottom: 0px;\r
}\r
\r
#rawXml pre {\r
  margin: 0;\r
}\r
\r
#sqltext {\r
  display: block;\r
}\r
\r
#curDataSourceName {\r
  font-weight: bold;\r
}\r
\r
#sqlResult {\r
  border-collapse: collapse;\r
  width: 100%;\r
  border: 1px solid var(--bda-border-input);\r
}\r
\r
#sqlResult td,\r
#sqlResult th {\r
  text-align: center;\r
  border-right: 1px solid var(--bda-border-input);\r
  background: none;\r
}\r
\r
#sqlResult tbody tr:nth-child(odd) {\r
  background-color: var(--bda-surface);\r
}\r
\r
/* Extra selectors needed to override the default styling */\r
table.tablesorter tbody tr.normal-row td {\r
  background: var(--bda-white);\r
  color: var(--bda-text-muted);\r
}\r
\r
table.tablesorter tbody tr.alt-row td {\r
  background: var(--bda-accent-subtle);\r
  color: var(--bda-text-muted);\r
}\r
\r
table.tablesorter tr.normal-row:hover td,\r
table.tablesorter tr.alt-row:hover td {\r
  background-color: var(--bda-surface-hover);\r
}\r
\r
.clickable:hover {\r
  color: var(--bda-danger);\r
  text-decoration: underline;\r
}\r
\r
/* =============================================================================\r
   Modal — .bda-overlay / .bda-modal\r
   ============================================================================= */\r
.bda-overlay {\r
  position: fixed;\r
  inset: 0;\r
  background: rgba(0, 0, 0, 0.45);\r
  backdrop-filter: blur(2px);\r
  z-index: 9000;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  opacity: 0;\r
  transition: opacity 0.2s ease;\r
  padding: 20px;\r
}\r
\r
.bda-overlay--visible {\r
  opacity: 1;\r
}\r
\r
.bda-overlay--hidden {\r
  display: none !important;\r
}\r
\r
.bda-modal {\r
  background: var(--bda-white);\r
  border-radius: var(--bda-radius-lg);\r
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.12);\r
  width: 600px;\r
  max-width: 95vw;\r
  max-height: 90vh;\r
  display: flex;\r
  flex-direction: column;\r
  transform: translateY(-10px);\r
  transition: transform 0.2s ease;\r
  overflow: hidden;\r
}\r
\r
.bda-overlay--visible .bda-modal {\r
  transform: translateY(0);\r
}\r
\r
.bda-modal__header {\r
  display: flex;\r
  align-items: center;\r
  padding: 14px 16px 10px;\r
  border-bottom: 1px solid var(--bda-border);\r
  flex-shrink: 0;\r
}\r
\r
.bda-modal__title {\r
  margin: 0;\r
  font-size: var(--bda-font-size-md);\r
  font-weight: 600;\r
  color: var(--bda-text-strong);\r
  flex: 1;\r
}\r
\r
.bda-modal__close {\r
  margin-left: auto;\r
  opacity: 0.55;\r
}\r
\r
.bda-modal__close:hover {\r
  opacity: 1;\r
}\r
\r
.bda-modal__body {\r
  padding: 18px;\r
  overflow-y: auto;\r
  flex: 1;\r
}\r
\r
.bda-modal__footer {\r
  padding: 10px 16px;\r
  border-top: 1px solid var(--bda-border);\r
  display: flex;\r
  gap: 8px;\r
  justify-content: flex-end;\r
  flex-shrink: 0;\r
}\r
\r
#pipelineTable {\r
  font-size: var(--bda-font-size-md);\r
}\r
\r
#addComponentToolbarPopupContent {\r
  max-height: 40vh;\r
  overflow: auto;\r
}\r
\r
.fav-submit-button {\r
  float: right;\r
  color: var(--bda-text-strong);\r
}\r
\r
#methods,\r
#vars {\r
  float: left;\r
  width: 50%;\r
}\r
\r
#methods li,\r
#vars li {\r
  list-style-position: inside;\r
  white-space: nowrap;\r
  overflow: hidden;\r
  text-overflow: ellipsis;\r
}\r
\r
/* =============================================================================\r
   Speedbar / Item Tree\r
   ============================================================================= */\r
#speedbar {\r
  float: right;\r
  width: 210px;\r
  margin-right: 100px;\r
  margin-top: 100px;\r
}\r
\r
#speedbar #widget {\r
  width: 240px;\r
  border: 1px solid var(--bda-border-muted);\r
  font-size: var(--bda-font-size-base);\r
  padding: 10px;\r
}\r
\r
#widget i {\r
  font-size: var(--bda-font-size-xs);\r
}\r
\r
#widget ul {\r
  list-style-type: none;\r
  padding-inline-start: 0px;\r
  margin-block-end: 0;\r
  margin-block-start: 0;\r
}\r
\r
#widget p {\r
  margin-top: 0;\r
}\r
\r
#widget li {\r
  margin-top: 5px;\r
}\r
\r
.link {\r
  cursor: pointer;\r
}\r
\r
#pipelineTable pre {\r
  margin: 0;\r
}\r
\r
.clickable_property {\r
  text-decoration: underline;\r
  cursor: pointer;\r
}\r
\r
/* =============================================================================\r
   DASH (Dashboard)\r
   ============================================================================= */\r
#dashInput {\r
  font-family: var(--bda-font-mono);\r
}\r
\r
#dashForm {\r
  font-family: var(--bda-font-mono);\r
}\r
\r
#dashForm .tt-hint {\r
  color: var(--bda-border-input);\r
}\r
\r
#dashForm .form-group {\r
  margin-bottom: 0;\r
}\r
\r
#dashEditorForm {\r
  font-size: var(--bda-font-size-md);\r
}\r
\r
#dashEditor {\r
  resize: none; /* min-height: 100px; */\r
}\r
\r
#dashScreen {\r
  font-family: var(--bda-font-mono);\r
  overflow-y: auto;\r
  max-height: 250px;\r
  height: 250px;\r
  margin-bottom: 15px;\r
}\r
\r
.fullscreen #dashScreen {\r
  margin-bottom: 0;\r
  height: 100%;\r
  max-height: 100%;\r
}\r
\r
#dashScreen .alert {\r
  padding-top: 5px;\r
  padding-bottom: 5px;\r
  margin-bottom: 5px;\r
}\r
\r
#dashScreen pre {\r
  background-color: inherit;\r
  font-family: inherit;\r
  border: 0;\r
  color: inherit;\r
}\r
\r
#dashScreen .dl-horizontal dt {\r
  width: 80px;\r
}\r
\r
#dashScreen .dl-horizontal dd {\r
  margin-left: 90px;\r
}\r
\r
.typeahead.dropdown-menu {\r
  text-align: left;\r
}\r
\r
table.table {\r
  background-color: var(--bda-white);\r
}\r
\r
/* Override dyn/admin style */\r
.table th {\r
  background-color: inherit;\r
  border-style: inherit;\r
}\r
\r
.printItem {\r
  margin-top: 15px;\r
}\r
\r
#dashSaveForm {\r
  margin-bottom: 0;\r
}\r
\r
.no-padding {\r
  padding: 0 !important;\r
}\r
\r
kbd {\r
  padding: 2px 4px;\r
  font-size: 90%;\r
  color: var(--bda-white);\r
  background-color: var(--bda-text-strong);\r
  border-radius: var(--bda-radius-sm);\r
  -webkit-box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .25);\r
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .25);\r
}\r
\r
\r
\r
#dashTips {\r
  margin-top: 10px;\r
  margin-bottom: 5px;\r
}\r
\r
.footer-right {\r
  cursor: pointer;\r
}\r
\r
.footer-right a {\r
  border: 1px solid transparent;\r
}\r
\r
/* =============================================================================\r
   Cache Stats\r
   ============================================================================= */\r
table.cache {\r
  border-spacing: 0;\r
  border-collapse: collapse;\r
}\r
\r
.cache tr.cache-subheader {\r
  cursor: pointer;\r
  background: var(--bda-surface);\r
  transition: background 0.15s ease;\r
}\r
\r
.cache tr.cache-subheader:hover {\r
  background: var(--bda-border-subtle);\r
}\r
\r
.cacheArrow i {\r
  display: inline-block;\r
  transition: transform 0.2s ease;\r
  margin-right: 6px;\r
}\r
\r
.cache-subheader.expanded .cacheArrow i {\r
  transform: rotate(90deg);\r
}\r
\r
.cache td,\r
.cache th {\r
  padding: 6px;\r
}\r
\r
.cache td,\r
.cache th {\r
  border: 1px solid var(--bda-border);\r
}\r
\r
button.cache {\r
  cursor: pointer;\r
}\r
\r
.fixed_headers {\r
  table-layout: fixed;\r
  width: 100%;\r
}\r
\r
.fixed_headers thead {\r
  width: 100%;\r
}\r
\r
.fixed_headers thead th {\r
  font-size: var(--bda-font-size-sm);\r
  font-weight: 500;\r
  padding: 2px;\r
  overflow: hidden;\r
}\r
\r
.fixed_headers th,\r
.fixed_headers td {\r
  width: 4%;\r
}\r
\r
.fixed_headers.oldDynamo th,\r
.fixed_headers.oldDynamo td {\r
  width: 5.3%;\r
}\r
\r
\r
/* =============================================================================\r
   Scheduler\r
   ============================================================================= */\r
#timeline-wrapper {\r
  margin-bottom: 20px;\r
}\r
\r
.twbs caption {\r
  padding-top: 8px;\r
  padding-bottom: 8px;\r
  color: var(--bda-text-subtle);\r
  text-align: left;\r
}\r
\r
/* =============================================================================\r
   XML Definition\r
   ============================================================================= */\r
#xmlDefAsTable {\r
  margin-top: 15px;\r
  /* for whatever reason on some pages\r
  the whole section is inside an <a> tag\r
  on native dyn/admin : need to reset color*/\r
  color: var(--bda-text-strong);\r
}\r
\r
.item-descriptor-heading,\r
.table-def {\r
  text-transform: capitalize;\r
  cursor: pointer;\r
}\r
\r
#xmlDefAsTable .item-panel .panel-heading {\r
  background-color: var(--bda-success-light);\r
}\r
\r
.subtableHeader {\r
  background-color: var(--bda-surface);\r
  text-transform: capitalize;\r
  font-weight: 600;\r
}\r
\r
.item-panel .panel-heading {\r
  padding: 10px;\r
}\r
\r
/* Remove padding top/bot */\r
.item-panel .panel-body {\r
  padding: 0 15px;\r
}\r
\r
.item-panel .row > [class^="col-"] {\r
  padding: 10px;\r
  border-right: 1px solid var(--bda-border);\r
}\r
\r
.table-def [class^="col-"] {\r
  text-transform: none;\r
  background-color: var(--bda-accent-subtle);\r
}\r
\r
.item-panel .highlight {\r
  background-color: yellow;\r
}\r
\r
.item-panel .property:hover {\r
  background-color: var(--bda-surface);\r
}\r
\r
#quickNavLinks {\r
  margin-top: 10px;\r
  max-height: 400px;\r
  overflow-y: auto;\r
  overflow-x: hidden;\r
}\r
\r
#xmlDefQuickNav .btn.sorted{\r
  background-color: var(--bda-success-light);\r
}\r
\r
#xmlDefQuickNav h3.panel-title {\r
  padding-top: 4px;\r
}\r
\r
#definitionsContainer {\r
  max-width: inherit;\r
}\r
\r
#quickNavLinks .nav > li > a {\r
  padding: 5px 15px\r
}\r
\r
#xmlDefSearchBox {\r
  font-size: 0.9em;\r
}\r
\r
ol.itemDescAttributes {\r
  text-transform: none;\r
  margin: 0;\r
  padding: 0;\r
  font-weight: 500;\r
}\r
\r
.itemDescAttributes > li {\r
  display: inline-block;\r
  padding-right: 5px;\r
}\r
\r
.itemDescAttributes > li + li:before {\r
  content: "/\\00a0";\r
  padding: 0 5px;\r
  color: var(--bda-border-input);\r
}\r
\r
.attr-value {\r
  font-weight: 600;\r
}\r
\r
.table-name {\r
  font-weight: 600;\r
  text-transform: none;\r
}\r
\r
.property-type,\r
.enum,\r
.derivation {\r
  text-decoration: underline;\r
}\r
\r
/* =============================================================================\r
   Attribute badges\r
   ============================================================================= */\r
.bda-attr {\r
  display: inline-block;\r
  padding: 2px 8px;\r
  margin: 2px 3px;\r
  border-radius: var(--bda-radius-lg);\r
  font-size: var(--bda-font-size-xs);\r
  font-weight: 500;\r
  background: var(--bda-surface-hover);\r
  color: var(--bda-text-subtle);\r
}\r
\r
.bda-attr-true {\r
  background: var(--bda-success-bg);\r
  color: var(--bda-success-text);\r
}\r
\r
.data-type,\r
.component-data-type {\r
  text-transform: capitalize;\r
}\r
\r
.row.subtableHeader .col-lg-05{\r
  padding-left: 0;\r
  padding-right: 0;\r
  font-size: 8px;\r
  text-align: center;\r
}\r
\r
#xmlDefAsTable .tooltip-inner {\r
  max-width: inherit;\r
}\r
\r
#xmlDefAsTable  .popover ul {\r
  padding-left: 10px;\r
}\r
\r
#xmlDefAsTable .popover{\r
  max-width: inherit;\r
  width: 600px;\r
  width: intrinsic;           /* Safari/WebKit uses a non-standard name */\r
  width: -moz-max-content;    /* Firefox/Gecko */\r
  width: -webkit-max-content; /* Chrome */\r
}\r
\r
/* =============================================================================\r
   Autocomplete\r
   ============================================================================= */\r
#searchField {\r
  width: 300px;\r
}\r
\r
/* =============================================================================\r
   Extend Bootstrap grid — 0.5 column\r
   ============================================================================= */\r
.twbs .col-xs-05,\r
.twbs .col-sm-05,\r
.twbs .col-md-05,\r
.twbs .col-lg-05 {\r
  width: 4.166666665%;\r
  position: relative;\r
  min-height: 1px;\r
  padding-left: 15px;\r
  padding-right: 15px;\r
  float: left;\r
}\r
\r
.notifyjs-bootstrap-base {\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
.legend {\r
  display : inline-block;\r
  color : var(--bda-white);\r
  border-radius : 5px;\r
  font-size : var(--bda-font-size-xs);\r
  padding : 3px;\r
  margin : 5px;\r
}\r
\r
/* =============================================================================\r
   Tree popup / Vis.js network\r
   ============================================================================= */\r
#treePopup {\r
  height: 90%;\r
  width: 95%;\r
  overflow: hidden;\r
}\r
\r
.flexContainer {\r
  display:flex;\r
  height: 100%;\r
}\r
\r
#treeInfo {\r
  display:none;\r
  float:left;\r
}\r
\r
#treeContainer  {\r
  height: 100%;\r
  flex : 1;\r
}\r
\r
/* =============================================================================\r
   DASH Terminal\r
   ============================================================================= */\r
.bda-dash-screen {\r
  font-family: var(--bda-font-mono);\r
  background: #1a1b26;\r
  color: #a9b1d6;\r
  border-radius: var(--bda-radius-md);\r
  padding: 12px;\r
  height: 300px;\r
  overflow-y: auto;\r
  margin-bottom: 8px;\r
  font-size: var(--bda-font-size-sm);\r
  line-height: 1.5;\r
}\r
\r
.bda-dash-input-row {\r
  display: flex;\r
  align-items: center;\r
  gap: 6px;\r
}\r
\r
.bda-dash-prompt {\r
  font-family: var(--bda-font-mono);\r
  color: #7dcfff;\r
  font-weight: bold;\r
  flex-shrink: 0;\r
}\r
\r
.bda-dash-input {\r
  font-family: var(--bda-font-mono);\r
  flex: 1;\r
  background: #16161e;\r
  color: #a9b1d6;\r
  border: 1px solid #3b4261;\r
  border-radius: var(--bda-radius-sm);\r
  padding: 4px 8px;\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
.bda-dash-input:focus {\r
  outline: none;\r
  border-color: #7aa2f7;\r
}\r
\r
.bda-dash-line {\r
  display: flex;\r
  align-items: flex-start;\r
  gap: 6px;\r
  margin-bottom: 2px;\r
}\r
\r
.bda-dash-line-input {\r
  color: #c0caf5;\r
  flex: 1;\r
}\r
\r
.bda-dash-copy {\r
  opacity: 0;\r
  transition: opacity 0.15s ease;\r
  padding: 1px 4px;\r
  font-size: 11px;\r
  background: transparent;\r
  border: 1px solid #3b4261;\r
  color: #565f89;\r
}\r
\r
.bda-dash-line:hover .bda-dash-copy {\r
  opacity: 1;\r
}\r
\r
.bda-dash-output pre {\r
  color: #9ece6a;\r
  margin: 0;\r
  white-space: pre-wrap;\r
  word-break: break-word;\r
}\r
\r
.bda-dash-error {\r
  color: #f7768e;\r
}\r
\r
.bda-dash-scripts {\r
  margin-top: 8px;\r
  padding: 8px;\r
  background: var(--bda-surface);\r
  border: 1px solid var(--bda-border);\r
  border-radius: var(--bda-radius-sm);\r
}\r
\r
.bda-dash-script-row {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  margin-bottom: 4px;\r
  padding: 4px 0;\r
  border-bottom: 1px solid var(--bda-border-subtle);\r
}\r
\r
/* =============================================================================\r
   Actor Chain\r
   ============================================================================= */\r
.bda-actor-caller {\r
  border: 1px solid var(--bda-border);\r
  border-radius: var(--bda-radius-md);\r
  padding: 12px 16px;\r
  margin: 12px 0;\r
  background: var(--bda-surface);\r
}\r
\r
.bda-actor-title {\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-md);\r
  margin-bottom: 8px;\r
  color: var(--bda-text-strong);\r
}\r
\r
.bda-actor-endpoint {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  margin-bottom: 10px;\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
.bda-actor-inputs {\r
  margin: 8px 0;\r
}\r
\r
.bda-actor-input-row {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  margin-bottom: 6px;\r
}\r
\r
.bda-actor-input-row label {\r
  min-width: 120px;\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-text-muted);\r
}\r
\r
.bda-actor-result {\r
  margin-top: 10px;\r
  padding: 8px;\r
  background: var(--bda-bg);\r
  border: 1px solid var(--bda-border);\r
  border-radius: var(--bda-radius-sm);\r
  font-family: var(--bda-font-mono);\r
  font-size: var(--bda-font-size-sm);\r
  max-height: 200px;\r
  overflow-y: auto;\r
  white-space: pre-wrap;\r
}\r
\r
/* =============================================================================\r
   Keyboard Help Overlay\r
   ============================================================================= */\r
#bda-help-overlay {\r
  position: fixed;\r
  inset: 0;\r
  background: rgba(0, 0, 0, 0.5);\r
  z-index: 10000;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  opacity: 0;\r
  transition: opacity 0.2s ease;\r
}\r
\r
#bda-help-overlay.bda-help-overlay--visible {\r
  opacity: 1;\r
}\r
\r
.bda-help-panel {\r
  background: var(--bda-white);\r
  border-radius: var(--bda-radius-lg);\r
  padding: 20px 24px;\r
  max-width: 480px;\r
  width: 90%;\r
  max-height: 80vh;\r
  overflow-y: auto;\r
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);\r
}\r
\r
.bda-help-header {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-md);\r
  margin-bottom: 14px;\r
  color: var(--bda-text-strong);\r
}\r
\r
.bda-help-table {\r
  width: 100%;\r
  border-collapse: collapse;\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
.bda-help-module-row td {\r
  padding: 8px 0 4px;\r
  color: var(--bda-text-muted);\r
  font-size: var(--bda-font-size-xs);\r
  text-transform: uppercase;\r
  letter-spacing: 0.05em;\r
}\r
\r
.bda-help-table tr td {\r
  padding: 3px 8px 3px 0;\r
  vertical-align: middle;\r
}\r
\r
.bda-help-table kbd {\r
  display: inline-block;\r
  padding: 1px 6px;\r
  background: var(--bda-surface);\r
  border: 1px solid var(--bda-border);\r
  border-radius: var(--bda-radius-sm);\r
  font-family: var(--bda-font-mono);\r
  font-size: 11px;\r
  color: var(--bda-text-strong);\r
  white-space: nowrap;\r
}\r
\r
.bda-help-hint {\r
  margin-top: 12px;\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-text-muted);\r
  text-align: center;\r
}\r
\r
/* =============================================================================\r
   Component Breadcrumb\r
   ============================================================================= */\r
.bda-breadcrumb {\r
  display: flex;\r
  align-items: center;\r
  flex-wrap: wrap;\r
  gap: 2px;\r
  padding: 8px 12px;\r
  background: var(--bda-surface);\r
  border: 1px solid var(--bda-border-subtle);\r
  border-radius: var(--bda-radius);\r
  font-size: var(--bda-font-size-base);\r
  margin-bottom: 12px;\r
}\r
\r
.bda-breadcrumb__item {\r
  color: var(--bda-accent);\r
  text-decoration: none;\r
  padding: 2px 6px;\r
  border-radius: var(--bda-radius-sm);\r
  transition: background 0.15s ease, color 0.15s ease;\r
  white-space: nowrap;\r
}\r
\r
.bda-breadcrumb__item:hover {\r
  background: var(--bda-surface-hover);\r
  color: var(--bda-accent-hover);\r
}\r
\r
.bda-breadcrumb__item--active {\r
  color: var(--bda-text-strong);\r
  font-weight: 600;\r
  cursor: default;\r
}\r
\r
.bda-breadcrumb__item--active:hover {\r
  background: transparent;\r
  color: var(--bda-text-strong);\r
}\r
\r
.bda-breadcrumb__sep {\r
  color: var(--bda-border-muted);\r
  font-size: 10px;\r
  user-select: none;\r
  flex-shrink: 0;\r
}\r
\r
/* =============================================================================\r
   Responsive\r
   ============================================================================= */\r
@media (max-width: 1200px) {\r
  #toolbar { gap: 6px; }\r
  .fav { min-width: 80px; }\r
}\r
\r
@media (max-width: 768px) {\r
  body { padding-top: 60px; }\r
\r
  #bdaNavbar {\r
    height: auto;\r
    flex-wrap: wrap;\r
    padding: 4px 8px;\r
  }\r
\r
  .bda-nav__left {\r
    width: 100%;\r
    margin-bottom: 4px;\r
  }\r
\r
  .bda-nav__right {\r
    width: 100%;\r
    flex-wrap: wrap;\r
  }\r
\r
  .bda-nav__brand {\r
    display: none;\r
  }\r
\r
  .bda-nav__search {\r
    flex: 1;\r
  }\r
\r
  #toolbar {\r
    gap: 6px;\r
  }\r
\r
  .fav {\r
    min-width: 0;\r
    max-width: none;\r
    flex: 1 1 calc(50% - 6px);\r
  }\r
\r
  .bda-history-list {\r
    flex-wrap: wrap;\r
  }\r
}\r
`;
  function insertCss(resourceName) {
    $("<link />").attr("href", GM_getResourceURL(resourceName)).attr("rel", "stylesheet").attr("type", "text/css").appendTo("head");
  }
  function injectFontAwesome() {
    $("<link />").attr("href", "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css").attr("rel", "stylesheet").attr("type", "text/css").appendTo("head");
  }
  function injectCss() {
    const resources = [
      "bootstrapCSS",
      "cmCSS",
      "hlCSS",
      "hljsThemeCSS",
      "tablesorterCSS",
      "select2CSS",
      "visCSS",
      "cmHint"
    ];
    for (const name of resources) {
      try {
        GM_addStyle(GM_getResourceText(name));
      } catch (e) {
        console.error("Failed to inject CSS resource:", name, e);
      }
    }
    GM_addStyle(bdaCss);
  }
  const OLD_DYNAMO_ALT_SELECTORS = [
    "Dynamo Component Browser",
    "Dynamo Administration",
    "Performance Monitor",
    "Dynamo Batch Compiler",
    "Dynamo Configuration",
    "JDBC Browser"
  ];
  function isOldDynamo() {
    for (const img of Array.from(document.getElementsByTagName("img"))) {
      if (OLD_DYNAMO_ALT_SELECTORS.includes(img.alt)) return true;
    }
    return false;
  }
  function isComponentPage() {
    return $("h1:contains('Directory Listing')").length === 0 && document.URL.indexOf("/dyn/admin/nucleus/") !== -1 && document.URL.indexOf("?") === -1;
  }
  function buildOldDynamoLogoSelector() {
    return OLD_DYNAMO_ALT_SELECTORS.map((s) => `img[alt='${s}']`).join(",");
  }
  function fixCss() {
    const cssUri = "/dyn/admin/atg/dynamo/admin/admin.css";
    if ($(`link[href='${cssUri}']`).length === 0) {
      const $link = $("<link />").attr("href", cssUri).attr("type", "text/css").attr("rel", "stylesheet");
      if ($("head").length > 0) $("head").append($link);
      else $("body").append($link);
    }
  }
  function setupPageTitle(componentPath) {
    const parts = componentPath.replace(/\/$/, "").split("/");
    $("title").text(parts[parts.length - 1] ?? document.title);
  }
  function setupFindClassLink(oldDynamo) {
    const $classLink = oldDynamo ? $("h1:eq(0)").next() : $("h1:eq(1)").next();
    const fullClassName = $classLink.text().trim();
    if (fullClassName) {
      const simpleName = fullClassName.split(".").pop() ?? fullClassName;
      $classLink.text(simpleName).attr("title", fullClassName);
      $(`<span style='margin-left:25px'><a href='/dyn/dyn/findclass.jhtml?className=${fullClassName}&debug=true'>Find Class</a></span>`).insertAfter($classLink);
    }
  }
  function setupCopyClipboardButtons(oldDynamo) {
    const $breadcrumb = oldDynamo ? $("h1:eq(0)") : $("h1:eq(1)");
    if ($breadcrumb.length === 0) return;
    $breadcrumb.attr("id", "breadcrumb").append(
      $("<button></button>", { class: "bda-btn bda-btn--icon", html: "<i class='fa fa-files-o'></i>" }).on("click", () => {
        const path = document.location.pathname.replace("/dyn/admin/nucleus", "");
        GM_setClipboard(path);
      })
    );
    const $classLink = $breadcrumb.next();
    $("<button></button>", { class: "bda-btn bda-btn--icon", html: "<i class='fa fa-files-o'></i>" }).on("click", () => {
      GM_setClipboard($classLink.attr("title") ?? $classLink.text());
    }).insertAfter($classLink);
  }
  function setupBreadcrumb(oldDynamo) {
    var _a;
    const $h1 = $("#breadcrumb");
    if ($h1.length === 0) return;
    const $copyBtn = $h1.find(".bda-btn--icon").detach();
    const $nav = $('<nav class="bda-breadcrumb" id="breadcrumb" aria-label="Component path"></nav>');
    const $links = $h1.find("a");
    const total = $links.length;
    $links.each(function(i) {
      const text = $(this).text().replace(/\//g, "").trim();
      if (!text || text === "/") return;
      if ($nav.children().length > 0) {
        $('<i class="fa fa-chevron-right bda-breadcrumb__sep"></i>').appendTo($nav);
      }
      if (i === total - 1) {
        $(`<span class="bda-breadcrumb__item bda-breadcrumb__item--active">${text}</span>`).appendTo($nav);
      } else {
        $(`<a class="bda-breadcrumb__item" href="${$(this).attr("href") ?? "#"}">${text}</a>`).appendTo($nav);
      }
    });
    const lastChild = (_a = $h1[0]) == null ? void 0 : _a.lastChild;
    if (lastChild && lastChild.nodeType === 3) {
      const text = (lastChild.textContent ?? "").replace(/\//g, "").trim();
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
  function bindEscapeKey() {
    $(document).on("keyup", (e) => {
      if (e.key === "Escape" || e.keyCode === 27) {
        $(".bda-nav__dropdown").removeClass("bda-nav__dropdown--open");
        $(".bda-nav__btn").removeClass("bda-nav__btn--active");
        if ($("#bda-help-overlay").length) bdaKeyboard.hideHelp();
      }
    });
  }
  function init() {
    console.time("bda");
    console.log("Start BDA script");
    const oldDynamo = isOldDynamo();
    const componentPage = isComponentPage();
    const logoSelector = oldDynamo ? buildOldDynamoLogoSelector() : "div#oracleATGbrand";
    const bdaConfig = {
      componentBrowserPageSelector: "h1:contains('Component Browser')",
      logoSelector,
      oldDynamoAltSelector: OLD_DYNAMO_ALT_SELECTORS,
      isOldDynamo: oldDynamo,
      isComponentPage: componentPage,
      dynAdminCssUri: "/dyn/admin/atg/dynamo/admin/admin.css"
    };
    if (oldDynamo) {
      console.log("isOldDynamo");
      fixCss();
    }
    registerJQueryExtensions();
    if (typeof $.tablesorter !== "undefined") {
      $.tablesorter.defaults.sortInitialOrder = "desc";
    }
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
    const autocomplete = bdaStorage.getConfigurationValue("search_autocomplete") === true;
    if (autocomplete) {
      new BdaSearch().init();
    }
    if (componentPage) {
      const componentPath = document.location.pathname.replace("/dyn/admin/nucleus", "");
      setupPageTitle(componentPath);
      setupFindClassLink(oldDynamo);
      setupCopyClipboardButtons(oldDynamo);
      setupBreadcrumb();
      $("#search").css("display", "inline");
    }
    bindEscapeKey();
    bdaKeyboard.register({
      key: "k",
      ctrl: true,
      description: "Focus search",
      module: "Global",
      handler: () => {
        $("#searchFieldBDA").trigger("focus").trigger("select");
      }
    });
    bdaKeyboard.register({
      key: "?",
      description: "Show keyboard shortcuts",
      module: "Global",
      handler: () => {
        bdaKeyboard.showHelp();
      }
    });
    bdaKeyboard.init();
    logTrace("BDA init complete");
    console.timeEnd("bda");
  }
  injectFontAwesome();
  const isChrome = !!window.chrome;
  if (!isChrome) {
    const cssResources = [
      "bootstrapCSS",
      "cmCSS",
      "hlCSS",
      "hljsThemeCSS",
      "tablesorterCSS",
      "select2CSS",
      "visCSS",
      "cmHint"
    ];
    for (const name of cssResources) {
      try {
        insertCss(name);
      } catch {
      }
    }
    try {
      GM_addStyle(bdaCss);
    } catch {
    }
  } else {
    try {
      injectCss();
    } catch (e) {
      console.error("CSS injection failed:", e);
    }
  }
  jQuery(document).ready(function() {
    (function($2) {
      if (document.getElementById("oracleATGbrand") !== null || isOldDynamo()) {
        console.log("Loading BDA");
        try {
          init();
        } catch (err) {
          console.error("BDA init error:", err);
        }
      } else {
        console.log("BDA script not starting - not an ATG admin page");
      }
    })(jQuery);
  });

})();