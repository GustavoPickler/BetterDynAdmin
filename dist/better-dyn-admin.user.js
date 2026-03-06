// ==UserScript==
// @name         Better Dynamo Administration v3 (TypeScript)
// @namespace    BetterDynAdmin
// @version      3.0.0
// @author       Gustavo Pickler
// @description  Refreshing ATG Dyn Admin
// @license      GPL-3.0
// @homepage     https://github.com/GustavoPickler/BetterDynAdmin
// @homepageURL  https://github.com/jc7447/BetterDynAdmin#readme
// @source       https://github.com/jc7447/BetterDynAdmin.git
// @supportURL   https://github.com/GustavoPickler/BetterDynAdmin/issues
// @downloadURL  https://raw.githubusercontent.com/GustavoPickler/BetterDynAdmin/master/dist/better-dyn-admin.user.js
// @updateURL    https://raw.githubusercontent.com/GustavoPickler/BetterDynAdmin/master/dist/better-dyn-admin.user.js
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
// @resource     hljsThemeCSS    https://raw.githubusercontent.com/GustavoPickler/BetterDynAdmin/master/lib/highlight.js/github_custom.css
// @resource     select2CSS      https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css
// @resource     tablesorterCSS  https://cdnjs.cloudflare.com/ajax/libs/jquery.tablesorter/2.31.3/css/theme.blue.min.css
// @resource     visCSS          https://cdnjs.cloudflare.com/ajax/libs/vis/4.21.0/vis.min.css
// @resource     whatsnew        https://raw.githubusercontent.com/GustavoPickler/BetterDynAdmin/master/WHATSNEW.md
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
              callback: () => {
                var _a;
                (_a = opt._callback) == null ? void 0 : _a.call(opt);
                modal.hide();
              }
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
      let $strip = $(".bda-toolbar-strip");
      if ($strip.length === 0) {
        $strip = $('<div class="bda-toolbar-strip"></div>').insertAfter("#bdaNavbar");
        $('<div class="bda-toolbar-strip__inner"></div>').appendTo($strip);
      }
      const $inner = $strip.find(".bda-toolbar-strip__inner");
      const $hist = $("<div id='history'></div>").appendTo($inner);
      const history = JSON.parse(localStorage.getItem("componentHistory") ?? "[]");
      if (history.length === 0) return;
      const $list = $('<div class="bda-history-list"></div>').appendTo($hist);
      history.forEach((comp) => {
        const name = getComponentNameFromPath(comp);
        $(`<a class="bda-history-pill" href="${comp}" title="${name}"><span>${name}</span></a>`).appendTo($list);
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
      let $strip = $(".bda-toolbar-strip");
      if ($strip.length === 0) {
        $strip = $('<div class="bda-toolbar-strip"></div>').insertAfter("#bdaNavbar");
        $('<div class="bda-toolbar-strip__inner"></div>').appendTo($strip);
      }
      const $inner = $strip.find(".bda-toolbar-strip__inner");
      $("<div id='toolbarContainer'></div>").appendTo($inner);
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
    constructor() {
      this.debounceTimer = null;
    }
    init(options = {}) {
      logTrace("BdaSearch init");
      const $searchField = $("#searchFieldBDA");
      if ($searchField.length === 0) return;
      this.build($searchField, options);
    }
    buildQueryVariants(q) {
      const variants = /* @__PURE__ */ new Set();
      variants.add(q);
      const cap0 = q.charAt(0).toUpperCase() + q.slice(1);
      variants.add(cap0);
      for (let i = 1; i < q.length; i++) {
        const arr = cap0.split("");
        arr[i] = arr[i].toUpperCase();
        variants.add(arr.join(""));
      }
      return Array.from(variants);
    }
    fetchVariants(query, scope) {
      const endpoint = "/dyn/admin/atg/dynamo/admin/en/cmpn-search.jhtml";
      const variants = this.buildQueryVariants(query);
      const requests = variants.map(
        (v) => $.get(endpoint, { query: v, scope }).then((html) => {
          const results = [];
          const $result = $(html);
          $result.filter("table").add($result.find("table")).each(function() {
            const $tbl = $(this);
            if ($tbl.find("th").text().includes("Search Results:")) {
              $tbl.find("td a").each(function() {
                const href = $(this).attr("href") ?? "";
                const path = href.replace("/dyn/admin/nucleus", "");
                if (path) results.push(path);
              });
            }
          });
          return results;
        })
      );
      return Promise.all(requests).then((all) => {
        const seen = /* @__PURE__ */ new Set();
        return all.flat().filter((p) => {
          if (seen.has(p)) return false;
          seen.add(p);
          return true;
        }).sort();
      });
    }
    build($input, options) {
      const DEBOUNCE_MS = 2e3;
      const source = (query, _sync, async) => {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.fetchVariants(query, "running").then(async);
        }, DEBOUNCE_MS);
      };
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
          limit: 20,
          source,
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
      const $navbar = $('<nav id="bdaNavbar"></nav>').prependTo("body");
      const $inner = $('<div class="bda-nav__inner"></div>').appendTo($navbar);
      const $left = $('<div class="bda-nav__left"></div>').appendTo($inner);
      const $brand = $('<div class="bda-nav__brand"></div>');
      $brand.append(
        '<div class="bda-nav__brand-icon"><i class="fa fa-database"></i></div><div class="bda-nav__brand-text">Oracle<span>Commerce</span></div>'
      );
      $brand.appendTo($left);
      this.createSearchBox($left);
      this.$navRight = $('<div class="bda-nav__right" id="bdaNavActions"></div>').appendTo($inner);
      this.createAboutItem();
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
        `<p>Better Dyn Admin has a <a target='_blank' href='https://github.com/GustavoPickler/BetterDynAdmin'>GitHub page</a>.<br>
      Please report any bug in the <a target='_blank' href='https://github.com/GustavoPickler/BetterDynAdmin/issues'>issues tracker</a>.
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
    // Search box
    // -------------------------------------------------------------------------
    createSearchBox($parent) {
      $(
        '<form class="bda-nav__search" action="/dyn/admin/atg/dynamo/admin/en/cmpn-search.jhtml"><input type="text" name="query" id="searchFieldBDA" placeholder="Search… (ctrl+shift+f)"></form>'
      ).appendTo($parent);
      this.search.init({ align: "right" });
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
      $("<div id='RQLEditor' class='bda-card'></div>").insertBefore("h2:first");
      $("<div id='RQLResults'></div>").insertBefore("#RQLEditor");
      if (hasErrors) this.showRqlErrors();
      if (hasResults && !hasErrors) this.showRQLResults();
      $("form:eq(1)").appendTo("#RQLEditor");
      $("form:eq(1)").attr("id", "RQLForm");
      const $children = $("#RQLForm").children();
      $("#RQLForm").empty().append($children);
      $("textarea[name=xmltext]").attr("id", "xmltext");
      const actionSelect = `<select id='RQLAction' class='bda-select js-example-basic-single' style='width:170px'>
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
      $("h2:contains('Run XML Operation Tags on the Repository')").remove();
      $("<div class='bda-section-header bda-section-header--dark'><h3 class='bda-section-header__title'><i class='fa fa-terminal'></i> Run XML Operation Tags on the Repository</h3></div>").prependTo("#RQLEditor");
      $("<div id='RQLToolbar'></div>").append(
        `<div class='bda-input-field'><label class='bda-input-field__label'>Action</label>${actionSelect}</div><div class='bda-input-field' id='itemIdField'><label class='bda-input-field__label'>IDs</label><input type='text' id='itemId' class='bda-input' placeholder='Id1, Id2, Id3' /></div><div class='bda-input-field' id='itemDescriptorField'><label class='bda-input-field__label'>Descriptor</label><select id='itemDescriptor' class='bda-select itemDescriptor'>${this.getDescriptorOptions()}</select></div><span id='idOnlyField' style='display:none;'><label for='idOnly'>&nbsp;id only : </label><input type='checkbox' id='idOnly' /></span><div style='display:flex;gap:8px;align-items:flex-end;padding-bottom:2px'><button type='button' id='RQLAdd' class='bda-btn bda-btn--secondary'>Add</button><button type='button' id='RQLGo' class='bda-btn bda-btn--primary'>Add &amp; Enter <i class='fa fa-play'></i></button></div>`
      ).insertBefore("#RQLEditor textarea").after("<div id='RQLText'></div>");
      $("#xmltext").appendTo("#RQLText");
      $("#RQLText").after(
        `<div id='tabs'><ul id='navbar' class='bda-tabs'><li id='propertiesTab' class='bda-tabs__item bda-tabs__item--active'>Properties</li><li id='queriesTab' class='bda-tabs__item'>Stored Queries</li></ul><div id='storedQueries'><div class='bda-empty-state'><p>No saved queries yet</p><p class='bda-empty-state__hint'>Use "Name this query" below and click Save</p></div></div><div id='descProperties'><i>Select a descriptor to see his properties</i></div></div>`
      );
      const $editorGrid = $('<div class="bda-rql-editor-grid"></div>');
      $("#RQLText").before($editorGrid);
      $editorGrid.append($("#RQLText"), $("#tabs"));
      $("#RQLForm input[type=submit]").remove();
      const splitObj = this.getStoredSplitObj();
      const itemByTab = (splitObj == null ? void 0 : splitObj.splitValue) ?? "10";
      const isChecked = (splitObj == null ? void 0 : splitObj.activeSplit) ?? false;
      const checkboxSplit = `<input type='checkbox' id='noSplit' ${isChecked ? "checked" : ""} /> don't split.`;
      $editorGrid.after(
        `<div id='RQLSave'><button id='clearQuery' type='button' class='bda-btn'>Clear <i class='fa fa-ban'></i></button><span class='rql-split-label'>Split tab every: <input type='text' value='${itemByTab}' id='splitValue' class='bda-input rql-split-input'> items. ${checkboxSplit}</span><input placeholder='Name this query' type='text' id='queryLabel' class='bda-input rql-name-input'><button type='button' id='saveQuery' class='bda-btn'>Save <i class='fa fa-save'></i></button><button type='submit' id='RQLSubmit' class='bda-btn bda-btn--primary'>Enter <i class='fa fa-play'></i></button></div>`
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
      const makeToggleBtn = (id) => `<button id='${id}' class='bda-btn bda-btn--outline bda-btn--sm bda-toggle-btn'>${toggleObj[id] === 1 ? "Show less..." : "Show more..."}</button>`;
      const $rvH2 = $(this.repositoryViewSelector);
      if ($rvH2.length > 0) {
        const $rvCard = $('<div class="bda-section-card"></div>');
        const $rvHeader = $('<div class="bda-section-card__header"></div>');
        $rvHeader.append('<h2><i class="fa fa-eye"></i> Examine the Repository, Control Debugging</h2>');
        $rvHeader.append(makeToggleBtn("showMoreRepositoryView"));
        const $rvBody = $('<div class="bda-section-card__body"></div>');
        let $next = $rvH2.next();
        while ($next.length > 0 && !$next.is("h1, h2, #itemTree, #RQLEditor, .bda-cache-card, .bda-section-card")) {
          const $move = $next;
          $next = $next.next();
          $rvBody.append($move);
        }
        $rvCard.append($rvHeader, $rvBody);
        $rvH2.before($rvCard);
        $rvH2.remove();
        if (toggleObj["showMoreRepositoryView"] !== 1) $rvBody.hide();
        $("#showMoreRepositoryView").on("click", () => this.toggleSection("showMoreRepositoryView", "showMoreRepositoryView"));
      }
      const $cacheCardHeader = $(".bda-cache-header__actions");
      if ($cacheCardHeader.length) {
        $(makeToggleBtn("showMoreCacheUsage")).prependTo($cacheCardHeader);
      } else {
        $(this.cacheUsageSelector).append(makeToggleBtn("showMoreCacheUsage"));
      }
      if (toggleObj["showMoreCacheUsage"] !== 1) this.toggleCacheUsage();
      $("#showMoreCacheUsage").on("click", () => this.toggleCacheUsage());
      $(this.propertiesSelector).append(makeToggleBtn("showMoreProperties"));
      const $propsTable = $(this.propertiesSelector).next("table");
      if ($propsTable.length > 0) {
        this.simplifyClassNames($propsTable);
        this.simplifyPropertyType($propsTable);
        this.formatAttributes($propsTable);
        this.normalizeLegacyTable($propsTable);
      }
      if (toggleObj["showMoreProperties"] !== 1) $(this.propertiesSelector).attr("data-bda-collapsed", "true");
      $("#showMoreProperties").on("click", () => this.toggleProperties());
      $(this.eventSetsSelector).append(makeToggleBtn("showMoreEventsSets"));
      if (toggleObj["showMoreEventsSets"] !== 1) $(this.eventSetsSelector).attr("data-bda-collapsed", "true");
      $("#showMoreEventsSets").on("click", () => this.toggleEventSets());
      $(this.methodsSelector).append(makeToggleBtn("showMoreMethods"));
      if (toggleObj["showMoreMethods"] !== 1) $(this.methodsSelector).attr("data-bda-collapsed", "true");
      $("#showMoreMethods").on("click", () => this.toggleMethods());
    }
    updateToggleLabel(contentDisplay, selector) {
      $(selector).html(contentDisplay === "none" ? "Show more..." : "Show less...");
    }
    /**
     * Find the toggleable content for a section.
     * After normalizeAtgSectionTables() runs, the h1 is replaced by a .bda-section-card
     * with .bda-section-card__body. We look for the card body first, then fall back
     * to the old .next() approach for non-card pages.
     */
    findToggleContent(btnId) {
      const $btn = $(`#${btnId}`);
      const $card = $btn.closest(".bda-section-card");
      if ($card.length > 0) {
        return $card.find(".bda-section-card__body");
      }
      return $btn.parent().next();
    }
    toggleSection(btnId, storageKey) {
      const $content = this.findToggleContent(btnId);
      $content.toggle();
      const display = $content.css("display");
      this.updateToggleLabel(display, `#${btnId}`);
      bdaStorage.storeToggleState(storageKey, display);
    }
    toggleRepositoryView() {
      this.toggleSection("showMoreRepositoryView", "showMoreRepositoryView");
    }
    toggleCacheUsage() {
      const $cacheBody = $(".bda-cache-card .bda-cache-body");
      if ($cacheBody.length > 0) {
        $cacheBody.toggle();
        this.updateToggleLabel($cacheBody.css("display"), "#showMoreCacheUsage");
        bdaStorage.storeToggleState("showMoreCacheUsage", $cacheBody.css("display"));
      } else {
        const $cu = $(this.cacheUsageSelector);
        $cu.next().toggle().next().toggle();
        this.updateToggleLabel($cu.next().css("display"), "#showMoreCacheUsage");
        bdaStorage.storeToggleState("showMoreCacheUsage", $cu.next().css("display"));
      }
    }
    toggleProperties() {
      this.toggleSection("showMoreProperties", "showMoreProperties");
    }
    toggleEventSets() {
      this.toggleSection("showMoreEventsSets", "showMoreEventsSets");
    }
    toggleMethods() {
      this.toggleSection("showMoreMethods", "showMoreMethods");
    }
    toggleRawXml() {
      $("#rawXml").toggle();
      const visible = $("#rawXml").is(":visible");
      $("#rawXmlLink").html(visible ? "<i class='fa fa-code'></i> Hide raw XML" : "<i class='fa fa-code'></i> Show raw XML");
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
      let html = '<div id="bdaDescriptorCard" style="padding:16px">';
      html += `<div style="margin-bottom:12px"><span class="bda-badge bda-badge--info">${descriptors.length} descriptors</span></div>`;
      html += '<div style="background:var(--bda-slate-50);border-radius:var(--bda-radius-md);border:1px solid var(--bda-slate-200);margin:0;overflow:hidden">';
      html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;padding:10px 16px;background:var(--bda-slate-100);border-bottom:1px solid var(--bda-slate-200)">';
      html += '<div style="font-size:11px;font-weight:600;color:var(--bda-slate-500);text-transform:uppercase;letter-spacing:0.05em">Descriptor</div>';
      html += '<div style="font-size:11px;font-weight:600;color:var(--bda-slate-500);text-transform:uppercase;letter-spacing:0.05em">View</div>';
      html += '<div style="font-size:11px;font-weight:600;color:var(--bda-slate-500);text-transform:uppercase;letter-spacing:0.05em">Debug</div>';
      html += "</div>";
      html += '<div style="max-height:500px;overflow-y:auto">';
      descriptors.forEach((d) => {
        const isDebugEnabled = $(`a[href='${componentURI}?action=clriddbg&itemdesc=${d}#listItemDescriptors']`).length > 0;
        html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;padding:10px 16px;border-bottom:1px solid var(--bda-slate-100);align-items:center;transition:background 0.15s" onmouseover="this.style.background='var(--bda-white)'" onmouseout="this.style.background='transparent'">`;
        html += `<div><span style="font-family:var(--bda-font-mono);font-size:var(--bda-font-size-sm);color:var(--bda-slate-700)">${d}</span></div>`;
        html += `<div style="display:flex;gap:8px"><a class='bda-btn bda-btn--outline bda-btn--sm' href='${componentURI}?action=seetmpl&itemdesc=${d}#showProperties'>Properties</a>`;
        html += `<a class='bda-btn bda-btn--outline bda-btn--sm' href='${componentURI}?action=seenamed&itemdesc=${d}#namedQuery'>Named queries</a></div>`;
        html += '<div style="display:flex;gap:8px">';
        if (isDebugEnabled) {
          html += `<a class='bda-btn bda-btn--outline bda-btn--sm' href='${componentURI}?action=clriddbg&itemdesc=${d}#listItemDescriptors'><i class='fa fa-toggle-on'></i> Disable</a>`;
        } else {
          html += `<a class='bda-btn bda-btn--outline bda-btn--sm' href='${componentURI}?action=setiddbg&itemdesc=${d}#listItemDescriptors'><i class='fa fa-toggle-off'></i> Enable</a>`;
          html += `<a class='bda-btn bda-btn--outline bda-btn--sm' href='${componentURI}?action=dbgprops&itemdesc=${d}#debugProperties'><i class='fa fa-pencil'></i> Edit</a>`;
        }
        html += "</div></div>";
      });
      html += "</div></div></div>";
      $("#descriptorTable").remove();
      $(html).insertAfter("a[name='listItemDescriptors']");
    }
    setupPropertiesTables() {
      if ($("a[name=showProperties]").length > 0) {
        $("a[name=showProperties]").next().attr("id", "propertiesTable");
        this.simplifyClassNames($("#propertiesTable"));
        this.simplifyPropertyType($("#propertiesTable"));
        this.formatAttributes($("#propertiesTable"));
        this.normalizeLegacyTable($("#propertiesTable"));
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
    normalizeLegacyTable($table) {
      $table.addClass("bda-section-table").removeAttr("style").removeAttr("bgcolor").removeAttr("background");
      $table.find("tr, td, th").removeAttr("bgcolor").removeAttr("background").removeAttr("valign").removeAttr("style");
      $table.find("tr:first-child td, tr:first-child th").addClass("bda-section-table__header");
      $table.find("tr.even td, tr.even th").addClass("bda-section-table__alt");
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
          this.addToQueryEditor(query);
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
      const current = this.editor.getDoc().getValue().trimEnd();
      const newValue = current ? `${current}

${query}` : query;
      this.editor.getDoc().setValue(newValue);
      const lines = newValue.split("\n");
      this.editor.setCursor(lines.length - 1, 0);
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
            html += `<span class='bda-query-actions'>`;
            html += `<span id='previewQuery${i}' class='previewQuery' title='Preview query'><i class='fa fa-eye'></i></span>`;
            html += `<span id='deleteQuery${i}' class='deleteQuery' title='Delete query'><i class='fa fa-trash-o'></i></span>`;
            html += `</span>`;
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
      $(".savedQuery > a").on("click", (e) => {
        const name = $(e.currentTarget).html();
        const q = bdaStorage.getStoredRQLQueries().find((q2) => q2.name === name);
        if (q) this.setQueryEditorValue(q.query + "\n");
      });
      $(".previewQuery").on("mouseenter", function() {
        $(this).closest("li").find("span.queryView").show();
      }).on("mouseleave", function() {
        $(this).closest("li").find("span.queryView").hide();
      });
      $(".deleteQuery").on("click", (e) => {
        e.stopPropagation();
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
      const $atgResult = $(this.resultsSelector).next();
      $atgResult.hide();
      let xmlContent = $atgResult.text().trim();
      xmlContent = sanitizeXml(xmlContent);
      processRepositoryXmlDef("definitionFiles", ($xmlDef) => {
        const log = this.showXMLAsTab(xmlContent, $xmlDef, $("#RQLResults"), false);
        this.showRQLLog(log, false);
        const rawText = $atgResult.text();
        this.buildRawXmlViewer(rawText);
        $atgResult.remove();
        $(this.resultsSelector).remove();
        $("#rawXmlLink").on("click", () => {
          this.toggleRawXml();
        });
      });
    }
    buildRawXmlViewer(rawText) {
      const items = [];
      const parts = rawText.split(/------\s*Printing item with id:\s*/);
      parts.forEach((part) => {
        const trimmed = part.trim();
        if (!trimmed) return;
        const firstLine = trimmed.split("\n")[0].trim();
        const restContent = trimmed.substring(firstLine.length).trim();
        const descMatch = restContent.match(/item-descriptor="([^"]+)"/);
        const descriptor = descMatch ? descMatch[1] : "unknown";
        const id = firstLine || "unknown";
        items.push({ id, descriptor, content: restContent || trimmed });
      });
      const $rawXml = $('<div id="rawXml"></div>');
      const $toolbar = $('<div class="bda-rawxml-toolbar"></div>');
      $toolbar.append(
        `<span class="bda-rawxml-toolbar__title"><i class="fa fa-code"></i> Raw XML <span class="bda-desc-card__count">${items.length} item(s)</span></span>`
      );
      $toolbar.append(
        '<div class="bda-rawxml-search"><i class="fa fa-search"></i><input type="text" class="bda-input" placeholder="Search by ID..." /></div>'
      );
      $rawXml.append($toolbar);
      const $body = $('<div class="bda-rawxml-body"></div>');
      if (items.length === 0) {
        $body.append($('<div class="bda-rawxml-item__content"></div>').text(rawText));
      } else {
        items.forEach((item, i) => {
          const $item = $(`<div class="bda-rawxml-item" data-item-id="${item.id}"></div>`);
          const $header = $(`<div class="bda-rawxml-item__header">
          <i class="fa fa-chevron-right"></i>
          <span class="bda-rawxml-item__desc">${item.descriptor}</span>
          <span style="color:var(--bda-slate-400)">&bull;</span>
          <span class="bda-rawxml-item__id">${item.id}</span>
        </div>`);
          const $content = $('<div class="bda-rawxml-item__content"></div>').text(item.content).hide();
          $header.on("click", function() {
            $content.toggle();
            $(this).find("i").toggleClass("fa-chevron-right fa-chevron-down");
          });
          $item.append($header).append($content);
          $body.append($item);
        });
      }
      $rawXml.append($body);
      $toolbar.find("input").on("input", function() {
        const term = $(this).val().toLowerCase();
        $body.find(".bda-rawxml-item").each(function() {
          const id = ($(this).attr("data-item-id") ?? "").toLowerCase();
          $(this).toggle(!term || id.includes(term));
        });
      });
      $("#RQLResults .bda-desc-grid").before($rawXml);
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
    formatPropertyName(name) {
      const lower = /^[A-Z_]+$/.test(name) ? name.toLowerCase() : name;
      return lower.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").split(/[\s_]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }
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
    renderTab(itemDesc, types, datas, tabId, isItemTree) {
      const descName = itemDesc.substring(1);
      let html = "";
      datas.forEach((d, di) => {
        const itemId = d["id"] ?? "";
        const cardId = `bda-desc-${descName}-${itemId}-${di}`;
        html += `<div class="bda-desc-card" id="${cardId}" data-descriptor="${descName}" data-item-id="${itemId}">`;
        html += '<div class="bda-desc-card__header">';
        html += '<div class="bda-desc-card__info">';
        html += `<i class="fa fa-database" style="color:var(--bda-slate-500);font-size:13px"></i>`;
        html += `<span class="bda-desc-card__descriptor">${descName}</span>`;
        html += `<span style="color:var(--bda-slate-400)">&bull;</span>`;
        html += `<span class="bda-desc-card__id">${itemId}</span>`;
        html += "</div>";
        html += '<div class="bda-desc-card__btns">';
        html += `<button class="bda-desc-card__btn bda-desc-card__btn--minimize" title="Minimize"><i class="fa fa-minus"></i></button>`;
        html += `<button class="bda-desc-card__btn bda-desc-card__btn--close" title="Close"><i class="fa fa-times"></i></button>`;
        html += "</div>";
        html += "</div>";
        html += '<div class="bda-desc-card__body">';
        html += '<div class="bda-desc-card__search"><i class="fa fa-search"></i><input type="text" class="bda-input bda-desc-card__search-input" placeholder="Search properties..." /></div>';
        html += `<table class="dataTable" data-descriptor="${descName}"${isItemTree ? ` id="${tabId}_${di}"` : ""}>`;
        types.forEach((curProp) => {
          html += "<tr>";
          html += '<td><div class="bda-desc-card__prop-label">';
          html += `<span class="bda-desc-card__prop-name">${this.formatPropertyName(curProp.name)}`;
          if (curProp.rdonly === "true") html += " <span class='bda-badge bda-badge--danger'>R</span>";
          if (curProp.derived === "true") html += " <span class='bda-badge bda-badge--success'>D</span>";
          if (curProp.exportable === "true") html += " <span class='bda-badge bda-badge--accent'>E</span>";
          html += "</span>";
          html += `<span class="bda-desc-card__prop-key">${curProp.name}</span>`;
          html += "</div></td>";
          html += `<td class="bda-desc-card__prop-value" data-property="${curProp.name}" data-item-id="${itemId}">${this.renderPropertyValue(curProp, d[curProp.name], itemId, isItemTree)}</td>`;
          html += "</tr>";
        });
        html += "</table></div>";
        html += "</div>";
      });
      return html;
    }
    renderPropertyValue(curProp, propValue, itemId, isItemTree) {
      if (propValue === null || propValue === void 0) {
        return "<i class='fa fa-pencil-square-o' aria-hidden='true'></i>";
      }
      propValue = propValue.replace(/ /g, "●");
      if (curProp.name === "descriptor") propValue = propValue.substring(1);
      const baseId = `${curProp.name}_${itemId}`;
      if (curProp.name === "id") return `<span id='${baseId}'>${propValue}</span>`;
      if (propValue.length > 50) {
        return `<a class='copyLink' href='javascript:void(0)' title='Show all' id='link_${baseId}'><span id='${baseId}'>${this.escapeHTML(propValue.substring(0, 50))}...</span></a><textarea class='copyField' id='text_${baseId}' readonly>${propValue}</textarea>`;
      }
      if (curProp.isId === true) {
        const parts = this.parseRepositoryId(propValue);
        let html = "";
        parts.forEach((p) => {
          if (p !== MAP_SEPARATOR && p !== LIST_SEPARATOR) {
            html += isItemTree ? `<a class='clickable_property' href='#id_${p}'>${p}</a>` : `<a class='clickable_property loadable_property' data-id='${p}' data-descriptor='${curProp.itemDesc ?? ""}'>${p}</a>`;
          } else html += p;
        });
        return html;
      }
      if (curProp.name === "descriptor" || curProp.rdonly === "true" || curProp.derived === "true") return propValue;
      return `<i class='fa fa-pencil-square-o' aria-hidden='true'></i>${propValue}`;
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
      const $legend = $(
        '<div class="bda-desc-legend"><div class="bda-desc-legend__item"><span class="bda-badge bda-badge--danger">R</span> read-only</div><div class="bda-desc-legend__item"><span class="bda-badge bda-badge--success">D</span> derived</div><div class="bda-desc-legend__item"><span class="bda-badge bda-badge--accent">E</span> export is false</div><div class="bda-desc-legend__actions"></div></div>'
      );
      $outputDiv.append($legend);
      let cardsHtml = "";
      const splitObj = this.getStoredSplitObj();
      let splitValue = (splitObj == null ? void 0 : splitObj.activeSplit) === false ? parseInt(splitObj.splitValue) : 0;
      for (const itemDesc in datas) {
        if (splitValue === 0) splitValue = datas[itemDesc].length;
        let nbTab = 0;
        if (datas[itemDesc].length <= splitValue) {
          cardsHtml += this.renderTab(itemDesc, types[itemDesc], datas[itemDesc], itemDesc.substring(1), isItemTree);
        } else {
          while (splitValue * nbTab < datas[itemDesc].length) {
            const start = splitValue * nbTab;
            cardsHtml += this.renderTab(itemDesc, types[itemDesc], datas[itemDesc].slice(start, Math.min(start + splitValue, datas[itemDesc].length)), `${itemDesc}_${nbTab}`, isItemTree);
            nbTab++;
          }
        }
      }
      const $grid = $(`<div class="bda-desc-grid">${cardsHtml}</div>`);
      $outputDiv.append($grid);
      const $counter = $(`<span class="bda-desc-card__count">${$addItems.length} items in ${nbTypes} descriptor(s)</span>`);
      $legend.find(".bda-desc-legend__actions").prepend($counter);
      $legend.find(".bda-desc-legend__actions").append("<a href='javascript:void(0)' id='rawXmlLink'><i class='fa fa-code'></i> Show raw XML</a>");
      if ($grid.find(".copyField").length > 0) {
        $legend.find(".bda-desc-legend__actions").append("<a href='javascript:void(0)' class='showFullTextLink'><i class='fa fa-expand'></i> Show full text</a>");
        let fullTextShown = false;
        const savedHtml = /* @__PURE__ */ new Map();
        $outputDiv.find(".showFullTextLink").on("click", function() {
          fullTextShown = !fullTextShown;
          if (fullTextShown) {
            $grid.find(".copyField").each((_, el) => {
              const $parent = $(el).parent();
              savedHtml.set($parent[0], $parent.html());
              $parent.html($(el).html());
            });
          } else {
            savedHtml.forEach((html, el) => $(el).html(html));
          }
          $(this).html(fullTextShown ? "<i class='fa fa-compress'></i> Hide full text" : "<i class='fa fa-expand'></i> Show full text");
        });
      }
      $grid.on("input", ".bda-desc-card__search-input", function() {
        const term = $(this).val().toLowerCase();
        const $table = $(this).closest(".bda-desc-card__body").find("table");
        $table.find("tr").each(function() {
          const $row = $(this);
          const propName = $row.find(".bda-desc-card__prop-name").text().toLowerCase();
          const propKey = $row.find(".bda-desc-card__prop-key").text().toLowerCase();
          $row.toggle(!term || propName.includes(term) || propKey.includes(term));
        });
      });
      $grid.on("click", ".bda-desc-card__btn--minimize", function() {
        const $card = $(this).closest(".bda-desc-card");
        const $body = $card.find(".bda-desc-card__body");
        $body.toggle();
        const isMinimized = !$body.is(":visible");
        $(this).find("i").toggleClass("fa-minus", !isMinimized).toggleClass("fa-plus", isMinimized);
        $(this).attr("title", isMinimized ? "Expand" : "Minimize");
      });
      $grid.on("click", ".bda-desc-card__btn--close", function() {
        $(this).closest(".bda-desc-card").remove();
      });
      $grid.on("click", ".loadable_property", (e) => {
        e.stopPropagation();
        $("#bda-prop-popover").remove();
        const $elm = $(e.currentTarget);
        const id = $elm.attr("data-id") ?? "";
        const desc = $elm.attr("data-descriptor") ?? "";
        const query = `<print-item id='${id}' item-descriptor='${desc}' />
`;
        const $pop = $(
          `<div id="bda-prop-popover" class="bda-prop-popover"><button class="bda-btn bda-btn--sm bda-btn--secondary" data-action="add">Add</button><button class="bda-btn bda-btn--sm bda-btn--primary" data-action="apply">Add &amp; Apply</button></div>`
        );
        const offset = $elm.offset() ?? { top: 0, left: 0 };
        $pop.css({ top: offset.top + ($elm.outerHeight() ?? 20) + 4, left: offset.left });
        $("body").append($pop);
        $pop.find('[data-action="add"]').on("click", (ev) => {
          ev.stopPropagation();
          this.addToQueryEditor(query);
          $pop.remove();
        });
        $pop.find('[data-action="apply"]').on("click", (ev) => {
          ev.stopPropagation();
          this.addToQueryEditor(query);
          $("#RQLForm").trigger("submit");
          $pop.remove();
        });
        $(document).one("click.propPopover", () => $pop.remove());
      });
      $grid.on("click", ".copyLink", function() {
        const id = ($(this).attr("id") ?? "").replace("link_", "").replace(/(:|\.|\[|\]|,)/g, "\\$1");
        $(`#${id}`).toggle();
        $(`#text_${id}`).toggle();
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
      const $card = $('<div id="itemTree" class="bda-card"></div>').insertAfter("#RQLEditor");
      $card.append(
        "<div class='bda-section-header'><h3 class='bda-section-header__title'><i class='fa fa-sitemap'></i> Get Item Tree</h3></div>"
      );
      $card.append(
        "<div class='bda-item-tree-alert'><div class='bda-item-tree-alert__content'><i class='fa fa-info-circle bda-item-tree-alert__icon'></i><div><p>This tool will recursively retrieve items and print the result with the chosen output.</p><p>For example, if you give an order ID in the form below, you will get all shipping groups, payment groups, commerceItems, priceInfo... of the given order</p></div></div><p class='bda-item-tree-alert__warning'><i class='fa fa-exclamation-triangle'></i> Be careful when using this tool on a live instance! Set a low max items value.</p></div>"
      );
      $card.append(
        "<div id='itemTreeForm'><div class='bda-item-tree-grid'><div class='bda-input-field'><label class='bda-input-field__label'>ID</label><input type='text' id='itemTreeId' class='bda-input' placeholder='Enter item ID' /></div><div class='bda-input-field'><label class='bda-input-field__label'>Descriptor</label><span id='itemTreeDescriptorField'><select id='itemTreeDesc' class='bda-select itemDescriptor'>" + this.getDescriptorOptions() + `</select></span></div><div class='bda-input-field'><label class='bda-input-field__label'>Max Items</label><input type='text' id='itemTreeMax' class='bda-input' value='50' /></div><div class='bda-input-field'><label class='bda-input-field__label'>Output Format</label><select id='itemTreeOutput' class='bda-select'><option value='HTMLtab'>HTML tab</option><option value='addItem'>add-item XML</option><option value='removeItem'>remove-item XML</option><option value='printItem'>print-item XML</option><option value='tree'>Tree (experimental)</option></select></div></div><div class='bda-item-tree-actions'><label class='bda-item-tree-checkbox'><input type='checkbox' id='printRepositoryAttr' /><span>Print attribute:</span><code>repository='${getCurrentComponentPath()}'</code></label><button id='itemTreeBtn' class='bda-btn bda-btn--primary'>Enter <i class='fa fa-play'></i></button></div></div>`
      );
      $card.append("<div id='itemTreeInfo' />");
      $card.append("<div id='itemTreeResult' />");
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
        const $card = $('<div class="bda-card bda-cache-card"></div>');
        const $headerDiv = $('<div class="bda-section-header bda-cache-header"></div>');
        const $titleRow = $('<div class="bda-cache-header__row"></div>');
        $titleRow.append('<h3 class="bda-section-header__title"><i class="fa fa-bar-chart"></i> Cache Usage Statistics</h3>');
        const $actions = $('<div class="bda-cache-header__actions"></div>');
        const $resetLink = $cacheUsage.next();
        const $resetBtn = $resetLink.find("a").first();
        if ($resetBtn.length) {
          $resetBtn.addClass("bda-btn bda-btn--danger bda-btn--sm").detach().appendTo($actions);
        }
        $("<button></button>", { id: "cacheExpandAll", class: "bda-btn bda-btn--outline bda-btn--sm", html: '<i class="fa fa-expand"></i> Expand All' }).on("click", () => {
          $cacheTable.find("tr.cache-subheader.collapsed").each((_, el) => this.toggleCacheLine(el));
        }).appendTo($actions);
        $("<button></button>", { id: "collapseAll", class: "bda-btn bda-btn--outline bda-btn--sm", html: '<i class="fa fa-compress"></i> Collapse All' }).on("click", () => {
          $cacheTable.find("tr.cache-subheader.expanded").each((_, el) => this.toggleCacheLine(el));
        }).appendTo($actions);
        $("<button></button>", { id: "exportCSV", class: "bda-btn bda-btn--outline bda-btn--sm", html: '<i class="fa fa-download"></i> Export CSV' }).on("click", () => this.exportCacheStatsAsCSV($cacheTable)).appendTo($actions);
        $titleRow.append($actions);
        $headerDiv.append($titleRow);
        $card.append($headerDiv);
        const $cardBody = $('<div class="bda-cache-body"></div>');
        $cacheTable.addClass("cache bda-section-table").removeAttr("border");
        const $header = $cacheTable.find("tr").first().detach();
        $("<thead></thead>").prependTo($cacheTable).append($header);
        let index = 0;
        $cacheTable.find("tr").each((_, tr) => {
          if ((index - 1) % 3 === 0) $(tr).addClass("odd cache-subheader");
          index++;
        });
        this.setupCacheCollapse($header, $cacheTable);
        $cacheTable.addClass("fixed_headers");
        $cacheTable.find(".cache-subheader").each((_, el) => {
          $(el).addClass("collapsed").next().css("display", "none").next().css("display", "none");
        });
        $cardBody.append($cacheTable);
        $card.append($cardBody);
        const $oldResetWrapper = $cacheUsage.next();
        const $oldTableWrapper = $oldResetWrapper.next();
        $cacheUsage.before($card);
        $oldTableWrapper.remove();
        $oldResetWrapper.remove();
        $cacheUsage.remove();
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
          const cacheModeClass = cacheMode === "disabled" ? " bda-cache-attr-value--warning" : "";
          $td.html(
            `<span class="cacheArrow"><i class="fa fa-chevron-right"></i></span><span class="bda-cache-attr">item-descriptor=</span><span class="bda-cache-descriptor-name">${itemDesc}</span><span class="bda-cache-attr">cache-mode=</span><span class="bda-cache-attr-value${cacheModeClass}">${cacheMode}</span>` + (cacheLocality ? `<span class="bda-cache-attr">cache-locality=</span><span class="bda-cache-attr-value">${cacheLocality}</span>` : "")
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
        "<button id='schemeOrientation' class='bda-btn bda-btn--secondary'>Switch orientation <i class='fa fa-retweet'></i></button><div id='pipelineScheme'></div>"
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
      const $btn = $('<button class="bda-btn bda-btn--secondary"><i class="fa fa-download"></i> Export CSV</button>');
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
      const $card = $('<div class="bda-card"></div>').insertBefore($table);
      $card.append(
        '<div class="bda-section-header"><h3 class="bda-section-header__title"><i class="fa fa-tachometer"></i> Performance Data</h3></div>'
      );
      $card.append($table);
      $table.addClass("bda-section-table");
      const $firstRow = $table.find("tr").first();
      const $thead = $("<thead></thead>");
      const $headerRow = $("<tr></tr>");
      $firstRow.find("td").each(function() {
        $headerRow.append($('<th class="bda-section-table__header"></th>').text($(this).text()));
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
      const $callerDiv = $('<div class="bda-actor-caller bda-card"></div>');
      const $titleBar = $('<div class="bda-section-header"><h3 class="bda-section-header__title"><i class="fa fa-link"></i> Call: ' + chainId + "</h3></div>");
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
      const $callBtn = $('<button class="bda-btn bda-btn--primary"><i class="fa fa-play"></i> Call Chain</button>').on("click", () => {
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
        const $tabContainer = $('<div class="bda-xml-def-tabs bda-card"></div>');
        const $tabNav = $('<ul class="nav nav-tabs twbs"></ul>');
        const $tabContent = $('<div class="tab-content twbs"></div>');
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
            '<div id="item_{0}" class="bda-card item-panel" data-item-descriptor="{0}"></div>',
            descriptorName
          )
        );
        const $heading = $(
          `<div class="bda-section-header item-descriptor-heading"><h3 class="bda-section-header__title"><i class="fa fa-cube"></i> ${descriptorName}</h3></div>`
        );
        const superType = $desc.attr("super-type");
        if (!isNull(superType)) {
          $heading.append(` <small>extends: <a href="#item_${superType}">${superType}</a></small>`);
        }
        const cacheMode = $desc.attr("cache-mode");
        const cacheSize = $desc.attr("item-cache-size");
        const cacheTimeout = $desc.attr("item-cache-timeout");
        if (cacheMode) $heading.append(` <span class="bda-badge bda-badge--default">cache: ${cacheMode}</span>`);
        if (cacheSize) $heading.append(` <span class="bda-badge bda-badge--info">size: ${cacheSize}</span>`);
        if (cacheTimeout) $heading.append(` <span class="bda-badge bda-badge--info">timeout: ${cacheTimeout}s</span>`);
        const $body = $('<div style="padding: 16px"></div>');
        const $table = $('<table class="bda-section-table bda-props-table"><thead><tr><th class="bda-section-table__header">Name</th><th class="bda-section-table__header">Data/Item Type</th><th class="bda-section-table__header">Column</th><th class="bda-section-table__header">Property Type</th><th class="bda-section-table__header">Queryable</th><th class="bda-section-table__header">Writable</th></tr></thead><tbody></tbody></table>');
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
  const PRESERVE_SELECTOR = "#bdaNavbar, .bda-toolbar-strip, .bda-main";
  const HEADER_RENAME = {
    "last time": "Last Run",
    "next time": "Next Run",
    "# times run": "# Runs"
  };
  class BdaScheduler {
    isApplicable() {
      return $("h2:contains('Scheduled jobs')").length > 0;
    }
    init() {
      if (!this.isApplicable()) return;
      logTrace("BdaScheduler init");
      this.buildScheduler();
      this.hideUnscheduledHeader();
    }
    hideUnscheduledHeader() {
      const $h2 = $("h2:contains('Unscheduled jobs')");
      if ($h2.length === 0) return;
      const $table = $h2.next("table");
      if ($table.length > 0 && $table.find("tr").length <= 1) {
        $table.hide();
      }
    }
    formatDate(raw) {
      const normalized = raw.replace(/\s+[A-Z]{2,5}\s+(\d{4})$/, " $1");
      const d = new Date(normalized);
      if (isNaN(d.getTime())) return raw;
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    findSchedulerTable($h2) {
      let $table = $h2.next("table");
      if ($table.length === 0) {
        $table = $h2.nextAll().find("table").first();
      }
      return $table.length > 0 ? $table : null;
    }
    buildScheduler() {
      const $h2 = $("h2:contains('Scheduled jobs')");
      $h2.prevAll().not(PRESERVE_SELECTOR).hide();
      $h2.hide();
      const $table = this.findSchedulerTable($h2);
      if (!$table) return;
      const $form = $table.closest("form");
      const $origDeleteBtn = $form.find('input[type="submit"][value*="Delete"], input[type="submit"][value*="delete"]');
      $origDeleteBtn.hide();
      const $card = this.buildCard();
      const $scrollWrap = $('<div class="bda-sched-scroll"></div>').append($table);
      $card.append($scrollWrap);
      if ($form.length) {
        $form.prepend($card);
      } else {
        $table.before($card);
        $card.find(".bda-sched-scroll").append($table);
      }
      this.normalizeTable($table);
      const columns = this.detectColumns($table);
      this.styleRows($table, columns);
      const totalRows = $table.find("tbody tr").length;
      const $counter = this.buildFooter($card, totalRows, $origDeleteBtn);
      this.bindSearch($table, columns, totalRows, $counter);
      this.buildTimeline($card, $table, columns);
    }
    buildCard() {
      const $card = $('<div class="bda-card"></div>');
      $card.append(
        '<div class="bda-section-header"><h3 class="bda-section-header__title"><i class="fa fa-clock-o"></i> Scheduled Jobs</h3></div>'
      );
      const $toolbar = $('<div class="bda-sched-toolbar"></div>');
      $toolbar.append(
        '<div class="bda-sched-search"><i class="fa fa-search"></i><input type="text" class="bda-input" id="bdaSchedSearch" placeholder="Search by name or source..." /></div>'
      );
      $card.append($toolbar);
      return $card;
    }
    normalizeTable($table) {
      $table.addClass("bda-section-table").removeAttr("style bgcolor background border cellpadding cellspacing width");
      $table.find("*").removeAttr("bgcolor background valign align style nowrap width height color");
      const $firstRow = $table.find("tr").first();
      const $thead = $("<thead></thead>");
      const $headerRow = $("<tr></tr>");
      $firstRow.find("td, th").each(function(ci) {
        const rawText = $(this).text().trim();
        const lower = rawText.toLowerCase();
        if (ci === 0) {
          $headerRow.append($('<th class="bda-section-table__header bda-sched-check"></th>'));
          return;
        }
        const label = HEADER_RENAME[lower] ?? rawText;
        $headerRow.append($('<th class="bda-section-table__header"></th>').text(label));
      });
      $thead.append($headerRow);
      $firstRow.remove();
      const $tbody = $("<tbody></tbody>").append($table.find("tr"));
      $table.empty().append($thead).append($tbody);
    }
    detectColumns($table) {
      const dateIndices = /* @__PURE__ */ new Set();
      let nameIdx = -1;
      let sourceIdx = -1;
      $table.find("thead th").each(function(ci) {
        const txt = $(this).text().toLowerCase();
        if (txt === "last run" || txt === "next run") dateIndices.add(ci);
        if (txt === "name") nameIdx = ci;
        if (txt === "source") sourceIdx = ci;
      });
      return { dateIndices, nameIdx, sourceIdx };
    }
    styleRows($table, columns) {
      $table.find("tbody tr").each((i, row) => {
        $(row).find("td").each((ci, cell) => {
          if (ci === 0) {
            $(cell).addClass("bda-sched-check");
          } else if (columns.dateIndices.has(ci)) {
            const raw = $(cell).text().trim();
            $(cell).text(this.formatDate(raw)).addClass("bda-sched-date");
          }
        });
        if (i % 2 === 1) $(row).find("td").addClass("bda-section-table__alt");
      });
    }
    buildFooter($card, totalRows, $origDeleteBtn) {
      const $footer = $('<div class="bda-sched-footer"></div>');
      const $counter = $(`<span class="bda-sched-counter">Showing ${totalRows} of ${totalRows} jobs</span>`);
      $footer.append($counter);
      if ($origDeleteBtn.length) {
        const $deleteBtn = $('<button type="submit" class="bda-btn bda-btn--danger bda-btn--sm"><i class="fa fa-trash-o"></i> Delete checked jobs</button>');
        $deleteBtn.on("click", (e) => {
          e.preventDefault();
          $origDeleteBtn.trigger("click");
        });
        $footer.append($deleteBtn);
      }
      $card.append($footer);
      return $counter;
    }
    bindSearch($table, columns, totalRows, $counter) {
      $("#bdaSchedSearch").on("input", function() {
        const term = $(this).val().toLowerCase();
        let visible = 0;
        $table.find("tbody tr").each(function() {
          const $cells = $(this).find("td");
          const name = (columns.nameIdx >= 0 ? $cells.eq(columns.nameIdx).text() : "").toLowerCase();
          const source = (columns.sourceIdx >= 0 ? $cells.eq(columns.sourceIdx).text() : "").toLowerCase();
          const match = !term || name.includes(term) || source.includes(term);
          $(this).toggle(match);
          if (match) visible++;
        });
        $counter.text(`Showing ${visible} of ${totalRows} jobs`);
      });
    }
    buildTimeline($card, $table, columns) {
      if (!window.vis) return;
      const $wrapper = $('<div id="timeline-wrapper"></div>').hide();
      const $toggleBtn = $(
        '<button class="bda-btn bda-btn--secondary bda-btn--sm" style="margin: 0 24px 12px"><i class="fa fa-calendar"></i> Toggle Timeline</button>'
      );
      $card.find(".bda-sched-scroll").after($wrapper).after($toggleBtn);
      $toggleBtn.on("click", () => {
        if ($wrapper.is(":visible")) {
          $wrapper.hide();
        } else {
          $wrapper.show();
          this.renderTimeline($wrapper, $table, columns);
        }
      });
    }
    renderTimeline($wrapper, $table, columns) {
      if (!window.vis) return;
      $wrapper.empty();
      const container = $wrapper.get(0);
      if (!container) return;
      const items = [];
      let id = 0;
      $table.find("tbody tr").each(function() {
        const $cells = $(this).find("td");
        if ($cells.length < 3) return;
        const jobName = columns.nameIdx >= 0 ? $cells.eq(columns.nameIdx).text().trim() : "";
        if (!jobName) return;
        columns.dateIndices.forEach((ci) => {
          const raw = $cells.eq(ci).text().trim();
          if (!raw) return;
          const d = new Date(raw);
          if (!isNaN(d.getTime())) {
            items.push({ id: id++, content: jobName, start: d });
          }
        });
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
  class BdaComponentSearch {
    isApplicable() {
      return document.location.href.includes("cmpn-search.jhtml");
    }
    init() {
      if (!this.isApplicable()) return;
      logTrace("BdaComponentSearch init");
      this.build();
    }
    build() {
      const query = $('input[name="query"]').val() ?? "";
      const scope = $('input[name="scope"]:checked').val();
      const results = this.parseResultsFromHtml(document.documentElement.outerHTML);
      results.length > 0;
      $("body").children().not("#bdaNavbar, .bda-toolbar-strip, .bda-main, script, link, style, noscript").remove();
      const $card = $(
        '<div class="bda-card bda-cmpn-search-card"></div>'
      );
      $card.append(
        '<div class="bda-section-header"><div class="bda-cmpn-search-header-content"><i class="fa fa-search" style="font-size:18px;color:var(--bda-slate-500)"></i><div><h3 class="bda-section-header__title" style="margin:0">Component Search</h3><p class="bda-cmpn-search-subtitle">Search for nucleus components or name contexts by partial name or class (begin query with "class:")</p></div></div></div>'
      );
      const $form = $(`<form class="bda-cmpn-search-form" method="GET" action="${document.location.pathname}"></form>`);
      const $formRow = $('<div class="bda-cmpn-search-form-row"></div>');
      $formRow.append(
        `<div class="bda-input-field bda-cmpn-search-query"><label class="bda-input-field__label">Query</label><input type="text" name="query" class="bda-input" placeholder="Enter component name or class:..." value="${this.escapeAttr(query)}" autofocus /></div>`
      );
      const runningChecked = !scope || scope === "running" ? "checked" : "";
      const allChecked = scope === "all" ? "checked" : "";
      $formRow.append(
        `<div class="bda-input-field bda-cmpn-search-scope"><label class="bda-input-field__label">Search Scope</label><div class="bda-cmpn-search-radios"><label class="bda-cmpn-search-radio"><input type="radio" name="scope" value="running" ${runningChecked} /><span>Running</span></label><label class="bda-cmpn-search-radio"><input type="radio" name="scope" value="all" ${allChecked} /><span>All (Slow)*</span></label></div></div>`
      );
      $formRow.append(
        '<div class="bda-cmpn-search-submit"><button type="submit" class="bda-btn bda-btn--primary"><i class="fa fa-search"></i> Search</button></div>'
      );
      $form.append($formRow);
      $form.append(
        '<p class="bda-cmpn-search-warning"><i class="fa fa-exclamation-triangle"></i> *Searching all components is resource intensive and not recommended for live production instances.</p>'
      );
      $card.append($form);
      const $resultsContainer = $('<div class="bda-cmpn-search-results-container"></div>');
      $card.append($resultsContainer);
      if ($(".bda-main").length > 0) {
        $(".bda-main").prepend($card);
      } else {
        $("body").append($card);
      }
      if (query) this.renderResults($resultsContainer, results, query);
      $form.on("submit", (e) => {
        e.preventDefault();
        const q = $form.find('input[name="query"]').val().trim();
        const s = $form.find('input[name="scope"]:checked').val();
        if (!q) return;
        $resultsContainer.html('<div class="bda-cmpn-search-loading"><i class="fa fa-spinner fa-spin"></i> Searching…</div>');
        const queries = this.buildQueryVariants(q);
        const action = $form.attr("action") ?? document.location.pathname;
        const requests = queries.map(
          (variant) => $.get(action, { query: variant, scope: s }).then(
            (html) => this.parseResultsFromHtml(html)
          )
        );
        Promise.all(requests).then((allResults) => {
          const seen = /* @__PURE__ */ new Set();
          const merged = [];
          allResults.flat().forEach((r) => {
            if (!seen.has(r.path)) {
              seen.add(r.path);
              merged.push(r);
            }
          });
          merged.sort((a, b) => a.path.localeCompare(b.path));
          this.renderResults($resultsContainer, merged, q);
        });
      });
    }
    buildQueryVariants(q) {
      const variants = /* @__PURE__ */ new Set();
      variants.add(q);
      const cap0 = q.charAt(0).toUpperCase() + q.slice(1);
      variants.add(cap0);
      for (let i = 1; i < q.length; i++) {
        const arr = cap0.split("");
        arr[i] = arr[i].toUpperCase();
        variants.add(arr.join(""));
      }
      return Array.from(variants);
    }
    parseResultsFromHtml(html) {
      const results = [];
      const $doc = $(html);
      $doc.filter("table").add($doc.find("table")).each(function() {
        const $tbl = $(this);
        if ($tbl.find("th").text().includes("Search Results:")) {
          $tbl.find("td").each(function() {
            const $td = $(this);
            const $a = $td.find("a").first();
            if ($a.length === 0) return;
            const href = $a.attr("href") ?? "";
            const path = href.replace("/dyn/admin/nucleus", "");
            if (!path) return;
            const desc = $td.contents().filter(function() {
              return this.nodeType === 3;
            }).text().trim().replace(/^[,\s]+/, "");
            results.push({ path, description: desc });
          });
        }
      });
      return results;
    }
    renderResults($container, results, query) {
      $container.empty();
      if (results.length === 0) {
        $container.append(
          `<div class="bda-cmpn-search-empty"><i class="fa fa-search"></i><p>No components found for "<strong>${this.escapeHtml(query)}</strong>"</p><p class="bda-cmpn-search-empty__hint">Try a different search term</p></div>`
        );
        return;
      }
      const $section = $('<div class="bda-cmpn-search-results"></div>');
      $section.append(
        `<div class="bda-cmpn-search-results-header"><span class="bda-cmpn-search-results-title"><i class="fa fa-list"></i> Search Results</span><span class="bda-cmpn-search-results-count">${results.length} component${results.length !== 1 ? "s" : ""} found</span></div>`
      );
      const $list = $('<div class="bda-cmpn-search-list"></div>');
      results.forEach((r) => {
        $list.append(
          `<a class="bda-cmpn-search-item" href="/dyn/admin/nucleus${r.path}"><div class="bda-cmpn-search-item__icon"><i class="fa fa-cube"></i></div><div class="bda-cmpn-search-item__content"><span class="bda-cmpn-search-item__path">${this.escapeHtml(r.path)}</span>` + (r.description ? `<span class="bda-cmpn-search-item__desc">${this.escapeHtml(r.description)}</span>` : "") + '</div><i class="fa fa-chevron-right bda-cmpn-search-item__chevron"></i></a>'
        );
      });
      $section.append($list);
      $container.append($section);
    }
    escapeHtml(s) {
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    escapeAttr(s) {
      return String(s).replace(/"/g, "&quot;");
    }
  }
  const bdaCss = `/* =============================================================================\r
   BDA Design Tokens — Oracle Commerce Redesign\r
   ============================================================================= */\r
:root {\r
  /* --- Brand (red primary, matching redesign) --- */\r
  --bda-brand:              #ef4444;\r
  --bda-brand-dark:         #dc2626;\r
  --bda-brand-light:        #fee2e2;\r
  --bda-brand-shadow:       rgba(239, 68, 68, 0.25);\r
  --bda-whatsnew:           #62a03e;\r
  --bda-whatsnew-border:    #44702b;\r
\r
  /* --- Accent (interactive elements — red-based) --- */\r
  --bda-accent:             #ef4444;\r
  --bda-accent-hover:       #dc2626;\r
  --bda-accent-active:      #b91c1c;\r
  --bda-accent-subtle:      #fef2f2;\r
  --bda-accent-ring:        rgba(239, 68, 68, 0.2);\r
\r
  /* --- Semantic --- */\r
  --bda-success:            #16a34a;\r
  --bda-success-bg:         #dcfce7;\r
  --bda-success-text:       #166534;\r
  --bda-success-light:      #f0fdf4;\r
  --bda-danger:             #ef4444;\r
  --bda-danger-dark:        #991b1b;\r
  --bda-danger-bg:          #fef2f2;\r
  --bda-warning:            #d97706;\r
  --bda-warning-bg:         #fffbeb;\r
  --bda-warning-text:       #92400e;\r
  --bda-info:               #3b82f6;\r
  --bda-info-bg:            #eff6ff;\r
  --bda-info-text:          #1e40af;\r
  --bda-info-border:        #bfdbfe;\r
\r
  /* --- Neutrals (slate palette) --- */\r
  --bda-white:              #ffffff;\r
  --bda-slate-50:           #f8fafc;\r
  --bda-slate-100:          #f1f5f9;\r
  --bda-slate-200:          #e2e8f0;\r
  --bda-slate-300:          #cbd5e1;\r
  --bda-slate-400:          #94a3b8;\r
  --bda-slate-500:          #64748b;\r
  --bda-slate-600:          #475569;\r
  --bda-slate-700:          #334155;\r
  --bda-slate-800:          #1e293b;\r
  --bda-slate-900:          #0f172a;\r
\r
  /* Semantic aliases */\r
  --bda-surface:            var(--bda-slate-50);\r
  --bda-surface-raised:     var(--bda-slate-100);\r
  --bda-surface-hover:      var(--bda-slate-200);\r
  --bda-border-subtle:      var(--bda-slate-100);\r
  --bda-border:             var(--bda-slate-200);\r
  --bda-border-input:       var(--bda-slate-200);\r
  --bda-border-muted:       var(--bda-slate-300);\r
  --bda-text-subtle:        var(--bda-slate-400);\r
  --bda-text-muted:         var(--bda-slate-500);\r
  --bda-text:               var(--bda-slate-700);\r
  --bda-text-strong:        var(--bda-slate-800);\r
  --bda-black:              #000000;\r
\r
  /* --- Typography --- */\r
  --bda-font-sans:  -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;\r
  --bda-font-mono:  ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;\r
  --bda-font-size-xs:   11px;\r
  --bda-font-size-sm:   12px;\r
  --bda-font-size-base: 13px;\r
  --bda-font-size-md:   14px;\r
  --bda-font-size-lg:   18px;\r
\r
  /* --- Border radius (larger, rounder) --- */\r
  --bda-radius-sm:  4px;\r
  --bda-radius:     8px;\r
  --bda-radius-md:  12px;\r
  --bda-radius-lg:  16px;\r
  --bda-radius-xl:  24px;\r
  --bda-radius-full: 9999px;\r
\r
  /* --- Shadows (deeper, more sophisticated) --- */\r
  --bda-shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.05);\r
  --bda-shadow:     0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);\r
  --bda-shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);\r
  --bda-shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);\r
  --bda-shadow-xl:  0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);\r
  --bda-shadow-card: 0 20px 25px -5px rgba(148, 163, 184, 0.12), 0 8px 10px -6px rgba(148, 163, 184, 0.08);\r
  --bda-shadow-ring: 0 0 0 3px var(--bda-accent-ring);\r
\r
  /* --- Transitions --- */\r
  --bda-transition: all 0.15s ease;\r
  --bda-transition-fast: all 0.1s ease;\r
  --bda-transition-colors: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;\r
}\r
\r
/* =============================================================================\r
   Global — Centered layout with gradient background\r
   ============================================================================= */\r
body {\r
  padding-top: 0;\r
  padding-left: 0;\r
  background: linear-gradient(135deg, var(--bda-slate-50) 0%, var(--bda-slate-100) 100%);\r
  min-height: 100vh;\r
  font-family: var(--bda-font-sans);\r
  color: var(--bda-text);\r
}\r
\r
a {\r
  text-decoration: none;\r
  color: var(--bda-accent);\r
}\r
\r
a:hover {\r
  color: var(--bda-accent-hover);\r
}\r
\r
tr.even td {\r
  background-color: var(--bda-white);\r
}\r
\r
.fa-pencil-square-o {\r
  cursor: pointer;\r
}\r
\r
/* =============================================================================\r
   Layout — Centered content container\r
   ============================================================================= */\r
.bda-container {\r
  max-width: 1400px;\r
  margin: 0 auto;\r
  padding: 0 24px;\r
}\r
\r
.bda-main {\r
  max-width: 1400px;\r
  margin: 0 auto;\r
  padding: 24px;\r
}\r
\r
/* Body content centering (applied to ATG page content) */\r
body > table,\r
body > form,\r
body > div:not(#bdaNavbar):not(.bda-overlay):not(#bda-help-overlay):not(.bda-toolbar-strip) {\r
  max-width: 1400px;\r
  margin-left: auto;\r
  margin-right: auto;\r
  padding-left: 32px;\r
  padding-right: 32px;\r
}\r
\r
/* Collapse empty forms that ATG generates (avoids phantom whitespace gaps) */\r
body > form:empty {\r
  padding: 0;\r
  margin: 0;\r
  display: none;\r
}\r
\r
/* =============================================================================\r
   Card — Primary container component\r
   ============================================================================= */\r
.bda-card {\r
  background: var(--bda-white);\r
  border-radius: var(--bda-radius-lg);\r
  box-shadow: var(--bda-shadow-card);\r
  border: 1px solid var(--bda-border-subtle);\r
  overflow: hidden;\r
  margin-bottom: 24px;\r
}\r
\r
.bda-card--flat {\r
  box-shadow: none;\r
  border: 1px solid var(--bda-border);\r
}\r
\r
/* =============================================================================\r
   Section Header — Card section titles\r
   ============================================================================= */\r
.bda-section-header {\r
  padding: 16px 24px;\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  border-bottom: 1px solid var(--bda-border-subtle);\r
  background: rgba(248, 250, 252, 0.5);\r
}\r
\r
.bda-section-header--dark {\r
  background: linear-gradient(to right, var(--bda-slate-800), var(--bda-slate-900));\r
  border-bottom: none;\r
}\r
\r
.bda-section-header__title {\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-md);\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  color: var(--bda-text-strong);\r
  margin: 0;\r
}\r
\r
.bda-section-header--dark .bda-section-header__title {\r
  color: var(--bda-white);\r
}\r
\r
.bda-section-header--dark .bda-section-header__title i {\r
  color: var(--bda-slate-300);\r
}\r
\r
.bda-section-header__actions {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
}\r
\r
/* =============================================================================\r
   Button System — .bda-btn (redesigned)\r
   ============================================================================= */\r
.bda-btn {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 8px;\r
  padding: 8px 16px;\r
  border: none;\r
  border-radius: var(--bda-radius);\r
  background: var(--bda-slate-100);\r
  color: var(--bda-slate-700);\r
  font-size: var(--bda-font-size-sm);\r
  font-weight: 500;\r
  font-family: inherit;\r
  cursor: pointer;\r
  transition: var(--bda-transition);\r
  text-decoration: none;\r
  line-height: 1.4;\r
  white-space: nowrap;\r
  vertical-align: middle;\r
}\r
\r
.bda-btn:hover {\r
  background: var(--bda-slate-200);\r
  color: var(--bda-text-strong);\r
  text-decoration: none;\r
}\r
\r
.bda-btn:focus-visible {\r
  outline: 2px solid var(--bda-accent);\r
  outline-offset: 2px;\r
}\r
\r
.bda-btn:focus:not(:focus-visible) {\r
  outline: none;\r
}\r
\r
/* Primary — Red gradient */\r
.bda-btn--primary {\r
  background: linear-gradient(to right, #ef4444, #dc2626);\r
  color: var(--bda-white);\r
  box-shadow: 0 4px 14px var(--bda-brand-shadow);\r
}\r
\r
.bda-btn--primary:hover,\r
.bda-btn--primary:focus {\r
  background: linear-gradient(to right, #dc2626, #b91c1c);\r
  color: var(--bda-white);\r
}\r
\r
/* Secondary — Slate */\r
.bda-btn--secondary {\r
  background: var(--bda-slate-100);\r
  color: var(--bda-slate-700);\r
}\r
\r
.bda-btn--secondary:hover {\r
  background: var(--bda-slate-200);\r
}\r
\r
/* Outline — White with border */\r
.bda-btn--outline {\r
  background: var(--bda-white);\r
  border: 1px solid var(--bda-slate-200);\r
  color: var(--bda-slate-600);\r
}\r
\r
.bda-btn--outline:hover {\r
  background: var(--bda-slate-50);\r
  border-color: var(--bda-slate-300);\r
}\r
\r
/* Ghost — Transparent */\r
.bda-btn--ghost {\r
  background: transparent;\r
  color: var(--bda-slate-500);\r
  padding: 6px 10px;\r
}\r
\r
.bda-btn--ghost:hover {\r
  color: var(--bda-slate-700);\r
  background: var(--bda-slate-100);\r
}\r
\r
/* Danger — Red subtle */\r
.bda-btn--danger {\r
  background: var(--bda-danger-bg);\r
  color: var(--bda-danger);\r
  border: 1px solid #fecaca;\r
}\r
\r
.bda-btn--danger:hover {\r
  background: #fecaca;\r
  color: var(--bda-danger-dark);\r
}\r
\r
/* Sizes */\r
.bda-btn--sm {\r
  padding: 4px 12px;\r
  font-size: var(--bda-font-size-xs);\r
  gap: 4px;\r
}\r
\r
.bda-btn--lg {\r
  padding: 12px 24px;\r
  font-size: var(--bda-font-size-md);\r
}\r
\r
.bda-btn--icon {\r
  padding: 6px 8px;\r
  line-height: 1;\r
}\r
\r
/* =============================================================================\r
   Badge — Status indicators\r
   ============================================================================= */\r
.bda-badge {\r
  display: inline-block;\r
  padding: 2px 8px;\r
  border-radius: var(--bda-radius-sm);\r
  font-size: var(--bda-font-size-xs);\r
  font-weight: 500;\r
  line-height: 1.5;\r
  text-align: center;\r
  white-space: nowrap;\r
  vertical-align: middle;\r
}\r
\r
.bda-badge--default {\r
  background: var(--bda-slate-100);\r
  color: var(--bda-slate-600);\r
}\r
\r
.bda-badge--success {\r
  background: var(--bda-success-bg);\r
  color: var(--bda-success-text);\r
}\r
\r
.bda-badge--warning {\r
  background: var(--bda-warning-bg);\r
  color: var(--bda-warning-text);\r
}\r
\r
.bda-badge--info {\r
  background: var(--bda-info-bg);\r
  color: var(--bda-info-text);\r
}\r
\r
.bda-badge--danger {\r
  background: var(--bda-danger-bg);\r
  color: var(--bda-danger-dark);\r
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
/* =============================================================================\r
   Tab — Active state with red underline\r
   ============================================================================= */\r
.bda-tabs {\r
  list-style: none;\r
  margin: 0;\r
  padding: 0;\r
  display: flex;\r
  gap: 0;\r
  border-bottom: 1px solid var(--bda-slate-100);\r
}\r
\r
.bda-tabs__item {\r
  padding: 8px 16px;\r
  font-size: var(--bda-font-size-sm);\r
  font-weight: 500;\r
  cursor: pointer;\r
  color: var(--bda-slate-400);\r
  border-bottom: 2px solid transparent;\r
  transition: var(--bda-transition-colors);\r
  user-select: none;\r
  background: transparent;\r
  border-top: none;\r
  border-left: none;\r
  border-right: none;\r
}\r
\r
.bda-tabs__item:hover {\r
  color: var(--bda-slate-600);\r
}\r
\r
.bda-tabs__item--active {\r
  color: var(--bda-accent);\r
  border-bottom-color: var(--bda-accent);\r
}\r
\r
/* =============================================================================\r
   Input Field — With label\r
   ============================================================================= */\r
.bda-input-field {\r
  flex: 1;\r
}\r
\r
.bda-input-field__label {\r
  display: block;\r
  font-size: var(--bda-font-size-xs);\r
  font-weight: 500;\r
  color: var(--bda-slate-500);\r
  margin-bottom: 6px;\r
  text-transform: uppercase;\r
  letter-spacing: 0.05em;\r
}\r
\r
.bda-input {\r
  width: 100%;\r
  height: 38px;\r
  padding: 8px 16px;\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius);\r
  font-size: var(--bda-font-size-sm);\r
  font-family: inherit;\r
  color: var(--bda-text);\r
  background: var(--bda-white);\r
  transition: border-color 0.15s, box-shadow 0.15s;\r
  outline: none;\r
  vertical-align: middle;\r
  box-sizing: border-box;\r
}\r
\r
.bda-input:focus {\r
  border-color: var(--bda-accent);\r
  box-shadow: 0 0 0 2px var(--bda-accent-ring);\r
}\r
\r
.bda-input::placeholder {\r
  color: var(--bda-slate-400);\r
}\r
\r
.bda-select {\r
  width: 100%;\r
  height: 38px;\r
  padding: 8px 16px;\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius);\r
  font-size: var(--bda-font-size-sm);\r
  font-family: inherit;\r
  color: var(--bda-text);\r
  background: var(--bda-white);\r
  transition: border-color 0.15s, box-shadow 0.15s;\r
  outline: none;\r
  cursor: pointer;\r
  box-sizing: border-box;\r
}\r
\r
.bda-select:focus {\r
  border-color: var(--bda-accent);\r
  box-shadow: 0 0 0 2px var(--bda-accent-ring);\r
}\r
\r
/* =============================================================================\r
   Info Box — Blue alert/warning box\r
   ============================================================================= */\r
.bda-info-box {\r
  padding: 16px;\r
  background: var(--bda-info-bg);\r
  border: 1px solid var(--bda-info-border);\r
  border-radius: var(--bda-radius-md);\r
  display: flex;\r
  gap: 12px;\r
  margin: 16px 24px;\r
}\r
\r
.bda-info-box i {\r
  color: var(--bda-info);\r
  flex-shrink: 0;\r
  margin-top: 2px;\r
}\r
\r
.bda-info-box p {\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-text);\r
  line-height: 1.6;\r
  margin: 0 0 4px;\r
}\r
\r
.bda-info-box .bda-warning-text {\r
  color: var(--bda-warning);\r
  font-weight: 500;\r
}\r
\r
/* =============================================================================\r
   Navbar — #bdaNavbar (sticky header, white, centered)\r
   ============================================================================= */\r
#bdaNavbar {\r
  position: sticky;\r
  top: 0;\r
  left: 0;\r
  right: 0;\r
  background: var(--bda-white);\r
  border-bottom: 1px solid var(--bda-slate-200);\r
  z-index: 8000;\r
  box-shadow: none;\r
}\r
\r
.bda-nav__inner {\r
  max-width: 1400px;\r
  margin: 0 auto;\r
  padding: 0 24px;\r
  height: 56px;\r
  display: flex;\r
  align-items: center;\r
  gap: 12px;\r
}\r
\r
.bda-nav__brand {\r
  display: flex;\r
  align-items: center;\r
  gap: 12px;\r
  font-weight: 700;\r
  font-size: var(--bda-font-size-lg);\r
  color: var(--bda-text-strong);\r
  letter-spacing: -0.02em;\r
  white-space: nowrap;\r
  text-decoration: none;\r
  text-transform: none;\r
  padding: 0;\r
  background: none;\r
  border-radius: 0;\r
}\r
\r
.bda-nav__brand-icon {\r
  width: 40px;\r
  height: 40px;\r
  background: linear-gradient(135deg, #ef4444, #dc2626);\r
  border-radius: var(--bda-radius-md);\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  box-shadow: 0 4px 14px var(--bda-brand-shadow);\r
}\r
\r
.bda-nav__brand-icon i {\r
  color: var(--bda-white);\r
  font-size: 16px;\r
}\r
\r
.bda-nav__brand-text {\r
  font-weight: 700;\r
  color: var(--bda-text-strong);\r
}\r
\r
.bda-nav__brand-text span {\r
  font-weight: 400;\r
  color: var(--bda-slate-500);\r
  margin-left: 8px;\r
}\r
\r
.bda-nav__left {\r
  display: flex;\r
  align-items: center;\r
  gap: 12px;\r
  flex: 1;\r
  min-width: 0;\r
}\r
\r
.bda-nav__left::after {\r
  display: none;\r
}\r
\r
.bda-nav__search {\r
  display: flex;\r
  align-items: center;\r
  margin: 0;\r
  margin-left: auto;\r
}\r
\r
.bda-nav__search input {\r
  height: 36px;\r
  padding: 8px 16px;\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius-full);\r
  font-size: var(--bda-font-size-sm);\r
  font-family: inherit;\r
  color: var(--bda-text);\r
  background: var(--bda-surface);\r
  transition: border-color 0.2s, box-shadow 0.2s, width 0.2s ease, background 0.15s;\r
  outline: none;\r
  width: 240px;\r
}\r
\r
.bda-nav__search input:focus {\r
  border-color: var(--bda-accent);\r
  box-shadow: var(--bda-shadow-ring);\r
  background: var(--bda-white);\r
  width: 300px;\r
}\r
\r
.bda-nav__right {\r
  display: flex;\r
  align-items: center;\r
  gap: 4px;\r
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
  gap: 6px;\r
  height: 36px;\r
  padding: 0 12px;\r
  background: transparent;\r
  border: 1px solid transparent;\r
  border-radius: var(--bda-radius);\r
  color: var(--bda-slate-600);\r
  font-size: var(--bda-font-size-sm);\r
  font-family: inherit;\r
  cursor: pointer;\r
  white-space: nowrap;\r
  transition: var(--bda-transition);\r
}\r
\r
.bda-nav__btn:hover,\r
.bda-nav__btn--active {\r
  background: var(--bda-slate-100);\r
  color: var(--bda-text-strong);\r
}\r
\r
.bda-nav__dropdown {\r
  display: none;\r
  position: absolute;\r
  top: calc(100% + 8px);\r
  right: 0;\r
  min-width: 300px;\r
  max-height: 80vh;\r
  overflow-y: auto;\r
  background: var(--bda-white);\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius-md);\r
  box-shadow: var(--bda-shadow-xl);\r
  padding: 16px 20px;\r
  z-index: 8500;\r
  color: var(--bda-text);\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
@keyframes bda-dropdown-in {\r
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }\r
  to   { opacity: 1; transform: translateY(0) scale(1); }\r
}\r
\r
.bda-nav__dropdown--open {\r
  display: block;\r
  animation: bda-dropdown-in 0.15s ease forwards;\r
  transform-origin: top right;\r
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
  min-width: 360px;\r
}\r
\r
/* =============================================================================\r
   Toolbar Strip — Component history + favorites\r
   ============================================================================= */\r
.bda-toolbar-strip {\r
  background: var(--bda-white);\r
  border-bottom: 1px solid var(--bda-slate-200);\r
}\r
\r
.bda-toolbar-strip__inner {\r
  max-width: 1400px;\r
  margin: 0 auto;\r
  padding: 0 24px;\r
}\r
\r
#history {\r
  padding: 8px 0;\r
}\r
\r
.bda-history-list {\r
  display: flex;\r
  flex-wrap: wrap;\r
  gap: 8px;\r
  align-items: center;\r
}\r
\r
.bda-history-pill {\r
  display: inline-flex;\r
  align-items: center;\r
  padding: 6px 16px;\r
  border-radius: var(--bda-radius-full);\r
  font-size: var(--bda-font-size-sm);\r
  font-weight: 500;\r
  background: var(--bda-slate-100);\r
  color: var(--bda-slate-600);\r
  text-decoration: none;\r
  transition: all 0.2s ease;\r
  max-width: 160px;\r
  overflow: hidden;\r
  white-space: nowrap;\r
}\r
\r
.bda-history-pill span {\r
  min-width: 0;\r
  overflow: hidden;\r
  text-overflow: ellipsis;\r
  white-space: nowrap;\r
  display: block;\r
}\r
\r
.bda-history-pill:hover {\r
  max-width: 400px;\r
  background: var(--bda-accent);\r
  color: var(--bda-white);\r
  box-shadow: 0 4px 14px var(--bda-brand-shadow);\r
  position: relative;\r
  z-index: 10;\r
}\r
\r
.bda-history-pill:hover span {\r
  overflow: visible;\r
  white-space: nowrap;\r
}\r
\r
/* Component tabs as pills */\r
#toolbar {\r
  display: flex;\r
  flex-wrap: wrap;\r
  gap: 8px;\r
  padding: 16px 0;\r
  align-items: flex-start;\r
}\r
\r
#toolbarContainer {\r
  max-width: 1400px;\r
  margin: 0 auto;\r
  padding: 0 24px;\r
}\r
\r
.toolbar-elem {\r
  /* flex child */\r
}\r
\r
/* =============================================================================\r
   Favorites (redesigned as pill cards)\r
   ============================================================================= */\r
.newFav {\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
}\r
\r
.fav-color-bar {\r
  height: 4px;\r
  width: 100%;\r
  border-radius: var(--bda-radius-md) var(--bda-radius-md) 0 0;\r
}\r
\r
.fav {\r
  min-width: 100px;\r
  max-width: 160px;\r
  background: var(--bda-white);\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius-md);\r
  box-shadow: var(--bda-shadow-sm);\r
  overflow: hidden;\r
  display: flex;\r
  flex-direction: column;\r
  color: var(--bda-text-strong);\r
  transition: all 0.2s ease;\r
}\r
\r
.fav:hover {\r
  transform: translateY(-2px);\r
  box-shadow: var(--bda-shadow-md);\r
  border-color: var(--bda-slate-300);\r
}\r
\r
.fav a {\r
  color: var(--bda-text-strong);\r
}\r
\r
.favLink {\r
  text-align: center;\r
  padding: 8px 10px 6px;\r
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
  color: var(--bda-slate-500);\r
  margin-top: 2px;\r
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
.favArrow {\r
  text-align: center;\r
  cursor: pointer;\r
  padding: 4px;\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-slate-400);\r
  border-top: 1px solid var(--bda-slate-100);\r
  transition: color 0.15s ease;\r
}\r
\r
.favArrow:hover {\r
  color: var(--bda-text-strong);\r
}\r
\r
.favMoreInfo {\r
  font-size: var(--bda-font-size-xs);\r
  display: none;\r
  padding: 8px 10px;\r
  text-align: left;\r
  border-top: 1px solid var(--bda-slate-100);\r
}\r
\r
.favDelete {\r
  cursor: pointer;\r
  color: var(--bda-danger);\r
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
.fav-tags {\r
  color: var(--bda-slate-500);\r
  margin-top: 2px;\r
  font-size: var(--bda-font-size-xs);\r
}\r
\r
/* Tag pills */\r
#favTagList {\r
  margin-top: 8px;\r
}\r
\r
#favSetTags {\r
  margin-bottom: 5px;\r
}\r
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
  list-style: none;\r
  margin: 2px;\r
}\r
\r
.bda-tag-pill {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 4px;\r
  padding: 4px 12px;\r
  border-radius: var(--bda-radius-full);\r
  font-size: var(--bda-font-size-sm);\r
  border: 1px solid var(--bda-slate-200);\r
  background: var(--bda-white);\r
  color: var(--bda-slate-600);\r
  cursor: pointer;\r
  user-select: none;\r
  transition: var(--bda-transition);\r
}\r
\r
.bda-tag-pill:hover {\r
  border-color: var(--bda-slate-300);\r
  color: var(--bda-text-strong);\r
}\r
\r
.bda-tag-pill--active {\r
  background: var(--bda-accent-subtle);\r
  border-color: var(--bda-accent);\r
  color: var(--bda-accent);\r
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
#oracleATGbrand {\r
  display: none;\r
}\r
\r
/* =============================================================================\r
   Page Header — Breadcrumb + Class metadata card\r
   ============================================================================= */\r
.bda-page-header {\r
  display: block;\r
  max-width: 1400px;\r
  margin: 0 auto 16px;\r
  padding: 0;\r
}\r
\r
.bda-page-header-card {\r
  background: var(--bda-white);\r
  border-radius: var(--bda-radius-lg);\r
  box-shadow: var(--bda-shadow-card);\r
  border: 1px solid var(--bda-border-subtle);\r
  overflow: hidden;\r
}\r
\r
/* Breadcrumb */\r
.bda-breadcrumb {\r
  display: flex;\r
  align-items: center;\r
  flex-wrap: wrap;\r
  gap: 4px;\r
  padding: 16px 24px;\r
  border-bottom: 1px solid var(--bda-slate-100);\r
  background: rgba(248, 250, 252, 0.5);\r
  font-size: var(--bda-font-size-sm);\r
  margin: 0;\r
  border: none;\r
  border-radius: 0;\r
}\r
\r
.bda-breadcrumb__prefix {\r
  font-size: var(--bda-font-size-xs);\r
  font-weight: 500;\r
  color: var(--bda-slate-400);\r
  text-transform: uppercase;\r
  letter-spacing: 0.05em;\r
  margin-right: 8px;\r
}\r
\r
.bda-breadcrumb__item {\r
  color: var(--bda-slate-500);\r
  text-decoration: none;\r
  padding: 2px 6px;\r
  border-radius: var(--bda-radius-sm);\r
  transition: var(--bda-transition);\r
  white-space: nowrap;\r
}\r
\r
.bda-breadcrumb__item:hover {\r
  color: var(--bda-slate-700);\r
  background: var(--bda-slate-100);\r
}\r
\r
.bda-breadcrumb__item--active {\r
  color: var(--bda-accent);\r
  font-weight: 600;\r
  cursor: default;\r
}\r
\r
.bda-breadcrumb__item--active:hover {\r
  background: transparent;\r
  color: var(--bda-accent);\r
}\r
\r
.bda-breadcrumb__sep {\r
  color: var(--bda-slate-300);\r
  font-size: 10px;\r
  user-select: none;\r
  flex-shrink: 0;\r
}\r
\r
/* Admin badge */\r
.bda-breadcrumb .bda-root-badge,\r
.bda-root-badge {\r
  margin-left: auto;\r
  font-size: var(--bda-font-size-xs);\r
  padding: 2px 8px;\r
  border-radius: var(--bda-radius-sm);\r
  background: var(--bda-success-bg);\r
  color: var(--bda-success-text);\r
  text-decoration: none;\r
  vertical-align: middle;\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 4px;\r
  border: none;\r
  font-weight: 500;\r
}\r
\r
.bda-root-badge:hover {\r
  background: var(--bda-success-bg);\r
  color: var(--bda-success-text);\r
}\r
\r
.bda-root-badge i {\r
  font-size: 11px;\r
}\r
\r
/* Breadcrumb inside page header card */\r
.bda-page-header-card .bda-breadcrumb {\r
  background: rgba(248, 250, 252, 0.5);\r
  border-bottom: 1px solid var(--bda-slate-100);\r
}\r
\r
/* Metadata section (Class + Actions) */\r
.bda-meta-section {\r
  padding: 24px;\r
  margin: 0;\r
  border: none;\r
  border-radius: 0;\r
  background: transparent;\r
}\r
\r
.bda-class-row,\r
.bda-actions-row {\r
  display: flex;\r
  align-items: center;\r
  gap: 12px;\r
  flex-wrap: wrap;\r
}\r
\r
.bda-class-row {\r
  margin-bottom: 0;\r
  padding-bottom: 0;\r
  border-bottom: none;\r
}\r
\r
.bda-actions-row {\r
  margin-top: 16px;\r
}\r
\r
.bda-meta-label {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 6px;\r
  font-size: var(--bda-font-size-xs);\r
  font-weight: 500;\r
  color: var(--bda-slate-400);\r
  text-transform: uppercase;\r
  letter-spacing: 0.06em;\r
  min-width: 56px;\r
}\r
\r
.bda-meta-label i {\r
  font-size: 10px;\r
  opacity: 0.6;\r
}\r
\r
.bda-class-name {\r
  font-family: var(--bda-font-mono);\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-info);\r
  text-decoration: none;\r
  font-weight: 500;\r
  padding: 6px 12px;\r
  border-radius: var(--bda-radius);\r
  background: var(--bda-info-bg);\r
  border: 1px solid var(--bda-info-border);\r
  transition: var(--bda-transition);\r
}\r
\r
.bda-class-name:hover {\r
  background: #dbeafe;\r
  color: var(--bda-info-text);\r
}\r
\r
.bda-action-link {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 6px;\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-slate-700);\r
  text-decoration: none;\r
  padding: 6px 14px;\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius);\r
  background: var(--bda-white);\r
  transition: var(--bda-transition);\r
  white-space: nowrap;\r
  font-weight: 500;\r
}\r
\r
.bda-action-link:hover {\r
  background: var(--bda-slate-50);\r
  border-color: var(--bda-slate-300);\r
  color: var(--bda-text-strong);\r
}\r
\r
.bda-action-link i {\r
  font-size: 12px;\r
  opacity: 0.6;\r
}\r
\r
.bda-action-link:hover i {\r
  opacity: 1;\r
}\r
\r
/* =============================================================================\r
   Component Browser Page Enhancements\r
   ============================================================================= */\r
.bda-component-browser-title {\r
  font-size: 22px !important;\r
  font-weight: 700;\r
  color: var(--bda-text-strong);\r
  margin: 20px 0;\r
  letter-spacing: -0.02em;\r
  line-height: 1.3;\r
  border-bottom: none;\r
  padding-bottom: 0;\r
}\r
\r
/* =============================================================================\r
   RQL / XML Operations (inside card with dark header)\r
   ============================================================================= */\r
#RQLToolbar {\r
  margin-bottom: 0;\r
  padding: 24px;\r
  background: var(--bda-slate-50);\r
  border: none;\r
  border-radius: 0;\r
  display: flex;\r
  align-items: flex-end;\r
  gap: 16px;\r
  flex-wrap: wrap;\r
  width: 100%;\r
  box-sizing: border-box;\r
}\r
\r
#RQLAdd {\r
  margin-left: 0;\r
}\r
\r
#RQLEditor {\r
  margin-top: 0;\r
}\r
\r
#RQLResults {\r
  margin: 0;\r
  padding: 0;\r
  overflow-x: auto;\r
}\r
\r
#RQLResults .dataTable thead th {\r
  position: sticky;\r
  top: 0;\r
  z-index: 1;\r
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
.select2-results {\r
  max-height: 220px;\r
}\r
\r
/* =============================================================================\r
   RQL Log\r
   ============================================================================= */\r
#RQLLog {\r
  overflow-x: hidden;\r
  max-height: 100px;\r
  padding: 12px 16px;\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius);\r
  width: 100%;\r
  white-space: pre-wrap;\r
  font-family: var(--bda-font-mono);\r
  font-size: var(--bda-font-size-sm);\r
  background: var(--bda-surface);\r
  color: var(--bda-slate-600);\r
  box-sizing: border-box;\r
}\r
\r
#rawXml {\r
  display: none;\r
  margin: 0 0 16px;\r
  background: var(--bda-white);\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius-lg);\r
  overflow: hidden;\r
}\r
\r
.bda-rawxml-toolbar {\r
  display: flex;\r
  align-items: center;\r
  gap: 12px;\r
  padding: 10px 16px;\r
  background: var(--bda-slate-50);\r
  border-bottom: 1px solid var(--bda-slate-200);\r
}\r
\r
.bda-rawxml-toolbar__title {\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-text-strong);\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
}\r
\r
.bda-rawxml-search {\r
  position: relative;\r
  max-width: 240px;\r
  margin-left: auto;\r
}\r
\r
.bda-rawxml-search > i {\r
  position: absolute;\r
  left: 10px;\r
  top: 50%;\r
  transform: translateY(-50%);\r
  color: var(--bda-slate-400);\r
  font-size: 12px;\r
  pointer-events: none;\r
}\r
\r
.bda-rawxml-search > input {\r
  padding-left: 30px !important;\r
  width: 100%;\r
  font-size: var(--bda-font-size-xs);\r
}\r
\r
.bda-rawxml-body {\r
  max-height: 500px;\r
  overflow: auto;\r
}\r
\r
.bda-rawxml-item {\r
  border-bottom: 1px solid var(--bda-slate-100);\r
}\r
\r
.bda-rawxml-item:last-child {\r
  border-bottom: none;\r
}\r
\r
.bda-rawxml-item__header {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  padding: 8px 16px;\r
  background: var(--bda-slate-50);\r
  border-bottom: 1px solid var(--bda-slate-100);\r
  cursor: pointer;\r
  user-select: none;\r
}\r
\r
.bda-rawxml-item__header:hover {\r
  background: var(--bda-slate-100);\r
}\r
\r
.bda-rawxml-item__header i.fa-chevron-right,\r
.bda-rawxml-item__header i.fa-chevron-down {\r
  font-size: 10px;\r
  color: var(--bda-slate-400);\r
  width: 12px;\r
}\r
\r
.bda-rawxml-item__desc {\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-slate-700);\r
}\r
\r
.bda-rawxml-item__id {\r
  font-family: var(--bda-font-mono);\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-accent);\r
}\r
\r
.bda-rawxml-item__content {\r
  padding: 12px 16px;\r
  font-family: var(--bda-font-mono);\r
  font-size: var(--bda-font-size-xs);\r
  line-height: 1.6;\r
  color: var(--bda-slate-700);\r
  word-break: break-all;\r
  white-space: pre-wrap;\r
  background: var(--bda-white);\r
}\r
\r
/* =============================================================================\r
   Data Table\r
   ============================================================================= */\r
.dataTable {\r
  font-size: var(--bda-font-size-base);\r
  margin: 0;\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius-md);\r
  z-index: 10;\r
  position: relative;\r
  background-color: var(--bda-white);\r
  border-collapse: separate;\r
  border-spacing: 0;\r
  overflow: hidden;\r
  width: 100%;\r
}\r
\r
.prop_name {\r
  font-size: 80%;\r
}\r
\r
.dataTable td,\r
.dataTable th {\r
  padding: 8px 12px;\r
}\r
\r
.dataTable th {\r
  min-width: 160px;\r
  text-align: left;\r
  background: var(--bda-slate-100);\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-slate-500);\r
  border-bottom: 1px solid var(--bda-slate-200);\r
  text-transform: uppercase;\r
  letter-spacing: 0.05em;\r
}\r
\r
/* =============================================================================\r
   Descriptor Cards — item result grid\r
   ============================================================================= */\r
.bda-desc-legend {\r
  display: flex;\r
  align-items: center;\r
  gap: 16px;\r
  margin-bottom: 12px;\r
  padding: 0 2px;\r
  flex-wrap: wrap;\r
}\r
\r
.bda-desc-legend__item {\r
  display: flex;\r
  align-items: center;\r
  gap: 6px;\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-slate-600);\r
}\r
\r
.bda-desc-legend__actions {\r
  margin-left: auto;\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
}\r
\r
.bda-desc-legend__actions a {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 4px;\r
  padding: 4px 12px;\r
  font-size: var(--bda-font-size-xs);\r
  font-weight: 500;\r
  color: var(--bda-slate-600);\r
  background: var(--bda-white);\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius);\r
  text-decoration: none;\r
  transition: background 0.15s, border-color 0.15s, color 0.15s;\r
  cursor: pointer;\r
  white-space: nowrap;\r
}\r
\r
.bda-desc-legend__actions a:hover {\r
  background: var(--bda-slate-50);\r
  border-color: var(--bda-slate-300);\r
  color: var(--bda-text-strong);\r
}\r
\r
.bda-desc-grid {\r
  display: grid;\r
  grid-template-columns: 1fr;\r
  gap: 16px;\r
  align-items: start;\r
}\r
\r
@media (min-width: 1280px) {\r
  .bda-desc-grid {\r
    grid-template-columns: repeat(2, 1fr);\r
  }\r
}\r
\r
.bda-desc-card {\r
  background: var(--bda-white);\r
  border-radius: var(--bda-radius-lg);\r
  border: 1px solid var(--bda-slate-200);\r
  box-shadow: var(--bda-shadow-card);\r
  overflow: hidden;\r
  display: flex;\r
  flex-direction: column;\r
}\r
\r
.bda-desc-card__header {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  padding: 10px 16px;\r
  background: var(--bda-slate-50);\r
  border-bottom: 1px solid var(--bda-slate-200);\r
  gap: 8px;\r
  min-height: 44px;\r
}\r
\r
.bda-desc-card__info {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  min-width: 0;\r
  overflow: hidden;\r
}\r
\r
.bda-desc-card__descriptor {\r
  font-weight: 600;\r
  color: var(--bda-text-strong);\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
.bda-desc-card__id {\r
  font-family: var(--bda-font-mono);\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-slate-600);\r
}\r
\r
.bda-desc-card__count {\r
  font-size: var(--bda-font-size-xs);\r
  padding: 2px 8px;\r
  background: var(--bda-slate-200);\r
  color: var(--bda-slate-600);\r
  border-radius: var(--bda-radius);\r
  white-space: nowrap;\r
}\r
\r
.bda-desc-card__btns {\r
  display: flex;\r
  gap: 2px;\r
  flex-shrink: 0;\r
}\r
\r
.bda-desc-card__btn {\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  width: 28px;\r
  height: 28px;\r
  border: none;\r
  background: none;\r
  border-radius: var(--bda-radius);\r
  cursor: pointer;\r
  color: var(--bda-slate-500);\r
  transition: background 0.15s, color 0.15s;\r
}\r
\r
.bda-desc-card__btn:hover {\r
  background: var(--bda-slate-200);\r
}\r
\r
.bda-desc-card__btn--close:hover {\r
  background: var(--bda-danger-bg);\r
  color: var(--bda-danger);\r
}\r
\r
.bda-desc-card__actions {\r
  display: flex;\r
  align-items: center;\r
  gap: 10px;\r
  padding: 6px 16px;\r
  border-bottom: 1px solid var(--bda-slate-100);\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
.bda-desc-card__actions a {\r
  color: var(--bda-accent);\r
  font-weight: 500;\r
}\r
\r
.bda-desc-card__actions a:hover {\r
  color: var(--bda-accent-hover);\r
}\r
\r
.bda-desc-card__actions .bda-sep {\r
  color: var(--bda-slate-300);\r
}\r
\r
.bda-desc-card__body {\r
  flex: 1;\r
  max-height: 500px;\r
  overflow-y: auto;\r
}\r
\r
.bda-desc-card__search {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  padding: 8px 12px;\r
  border-bottom: 1px solid var(--bda-slate-100);\r
  background: var(--bda-slate-50);\r
}\r
\r
.bda-desc-card__search > i {\r
  color: var(--bda-slate-400);\r
  font-size: 12px;\r
  flex-shrink: 0;\r
}\r
\r
.bda-desc-card__search > input {\r
  flex: 1;\r
  border: none;\r
  background: transparent;\r
  outline: none;\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-slate-700);\r
}\r
\r
.bda-desc-card__search > input::placeholder {\r
  color: var(--bda-slate-400);\r
}\r
\r
.bda-desc-card__body table {\r
  width: 100%;\r
  font-size: var(--bda-font-size-sm);\r
  border-collapse: collapse;\r
}\r
\r
.bda-desc-card__body tr {\r
  transition: background 0.1s;\r
}\r
\r
.bda-desc-card__body tr:hover {\r
  background: rgba(59, 130, 246, 0.04);\r
}\r
\r
.bda-desc-card__body tr:nth-child(even) {\r
  background: rgba(248, 250, 252, 0.5);\r
}\r
\r
.bda-desc-card__body tr:nth-child(even):hover {\r
  background: rgba(59, 130, 246, 0.04);\r
}\r
\r
.bda-desc-card__body td {\r
  padding: 8px 16px;\r
  vertical-align: top;\r
}\r
\r
.bda-desc-card__body td:first-child {\r
  width: 45%;\r
}\r
\r
.bda-desc-card__prop-label {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 1px;\r
}\r
\r
.bda-desc-card__prop-name {\r
  font-weight: 500;\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-slate-700);\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 6px;\r
}\r
\r
.bda-desc-card__prop-key {\r
  font-family: var(--bda-font-mono);\r
  font-size: 10px;\r
  color: var(--bda-slate-400);\r
  letter-spacing: 0.02em;\r
}\r
\r
.bda-desc-card__prop-value {\r
  color: var(--bda-slate-700);\r
  font-family: var(--bda-font-mono);\r
  font-size: var(--bda-font-size-xs);\r
  word-break: break-all;\r
}\r
\r
.bda-desc-card__prop-value .fa-pencil-square-o {\r
  color: var(--bda-slate-400);\r
  margin-right: 4px;\r
  cursor: pointer;\r
}\r
\r
.bda-desc-card__prop-value a {\r
  color: var(--bda-accent);\r
}\r
\r
.bda-desc-card__prop-value a:hover {\r
  color: var(--bda-accent-hover);\r
  text-decoration: underline;\r
}\r
\r
.bda-desc-empty {\r
  text-align: center;\r
  padding: 48px 16px;\r
  color: var(--bda-slate-400);\r
}\r
\r
.bda-desc-empty i {\r
  font-size: 40px;\r
  opacity: 0.3;\r
  margin-bottom: 12px;\r
  display: block;\r
}\r
\r
/* =============================================================================\r
   BDA Table\r
   ============================================================================= */\r
.bda-table {\r
  border-collapse: separate;\r
  border-spacing: 0;\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius-md);\r
  overflow: hidden;\r
  font-size: var(--bda-font-size-base);\r
  background: var(--bda-white);\r
  width: 100%;\r
}\r
\r
.bda-table th {\r
  background: var(--bda-slate-100);\r
  color: var(--bda-slate-500);\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-xs);\r
  text-transform: uppercase;\r
  letter-spacing: 0.05em;\r
  padding: 10px 16px;\r
  border-bottom: 1px solid var(--bda-slate-200);\r
  position: sticky;\r
  top: 0;\r
  z-index: 1;\r
  text-align: left;\r
  white-space: nowrap;\r
}\r
\r
.bda-table td {\r
  padding: 8px 16px;\r
  border-bottom: 1px solid var(--bda-slate-100);\r
  vertical-align: middle;\r
}\r
\r
.bda-table tbody tr:hover td {\r
  background: var(--bda-slate-50);\r
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
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius-md);\r
  white-space: nowrap;\r
  overflow: hidden;\r
  font-size: var(--bda-font-size-base);\r
}\r
\r
.descriptorTable th {\r
  background: var(--bda-slate-100);\r
  color: var(--bda-slate-500);\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-sm);\r
  text-transform: uppercase;\r
  letter-spacing: 0.03em;\r
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
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius);\r
  width: 100%;\r
  cursor: text;\r
  font-size: var(--bda-font-size-base);\r
}\r
\r
/* Grid container for CodeMirror + Properties/Queries side-by-side */\r
.bda-rql-editor-grid {\r
  display: grid;\r
  grid-template-columns: 1fr 1fr;\r
  gap: 16px;\r
  padding: 24px;\r
  height: 600px;\r
}\r
\r
#RQLText {\r
  min-width: 0;\r
  overflow: hidden;\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius-md);\r
  background: var(--bda-slate-50);\r
}\r
\r
#RQLText .CodeMirror {\r
  height: 100% !important;\r
}\r
\r
.xmlDefinition .CodeMirror {\r
  border: 1px solid var(--bda-slate-200);\r
  height: auto;\r
}\r
\r
.xmlDefinition .CodeMirror-scroll {\r
  overflow-y: hidden;\r
  overflow-x: auto;\r
}\r
\r
/* =============================================================================\r
   Form inputs (legacy)\r
   ============================================================================= */\r
#itemId {\r
  width: 125px;\r
  height: 38px;\r
  padding: 8px 12px;\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius);\r
  font-size: var(--bda-font-size-base);\r
}\r
\r
#splitValue {\r
  padding: 8px 12px;\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius);\r
  font-size: var(--bda-font-size-base);\r
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
  display: flex;\r
  flex-direction: column;\r
  min-width: 0;\r
  min-height: 0;\r
  overflow: hidden;\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius-md);\r
  background: var(--bda-white);\r
  box-shadow: var(--bda-shadow-sm);\r
}\r
\r
#tabs i {\r
  font-size: 80%;\r
}\r
\r
#descProperties {\r
  display: none;\r
  flex: 1;\r
  min-height: 0;\r
  overflow: auto;\r
  background: var(--bda-white);\r
}\r
\r
#descProperties tbody tr:nth-child(odd) {\r
  background-color: var(--bda-slate-50);\r
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
  background: var(--bda-slate-100);\r
  color: var(--bda-slate-500);\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-xs);\r
  text-transform: uppercase;\r
  letter-spacing: 0.05em;\r
  padding: 8px 12px;\r
  border-bottom: 1px solid var(--bda-slate-200);\r
  position: sticky;\r
  top: 0;\r
  z-index: 1;\r
}\r
\r
#descProperties td {\r
  padding: 6px 12px;\r
  border-bottom: 1px solid var(--bda-slate-100);\r
  vertical-align: middle;\r
}\r
\r
.propQueryBtn {\r
  color: var(--bda-accent);\r
  text-decoration: none;\r
  cursor: pointer;\r
}\r
\r
.propQueryBtn:hover {\r
  color: var(--bda-accent-hover);\r
  text-decoration: underline;\r
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
  border-radius: var(--bda-radius-full);\r
  font-size: 10px;\r
  background: var(--bda-slate-100);\r
  color: var(--bda-slate-600);\r
}\r
\r
.showQueriesLabel {\r
  font-size: 80%;\r
  margin: 0;\r
  padding: 5px 0 0 0;\r
}\r
\r
#storedQueries {\r
  display: none;\r
  flex: 1;\r
  min-height: 0;\r
  background: var(--bda-white);\r
  padding: 12px;\r
  overflow: auto;\r
}\r
\r
#storedQueries ul {\r
  list-style: none;\r
  margin: 0;\r
  padding: 0;\r
  display: flex;\r
  flex-direction: column;\r
  gap: 6px;\r
}\r
\r
#storedQueries .bda-empty-state {\r
  text-align: center;\r
  padding: 32px 16px;\r
  color: var(--bda-slate-400);\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
#storedQueries .bda-empty-state p {\r
  margin: 0;\r
}\r
\r
#storedQueries .bda-empty-state .bda-empty-state__hint {\r
  font-size: var(--bda-font-size-xs);\r
  margin-top: 4px;\r
}\r
\r
.error {\r
  color: var(--bda-danger);\r
}\r
\r
#RQLSave {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  margin: 0 24px 24px;\r
  padding: 12px 16px;\r
  flex-wrap: wrap;\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius-lg);\r
  background: var(--bda-slate-50);\r
}\r
\r
.rql-split-label {\r
  display: flex;\r
  align-items: center;\r
  gap: 6px;\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-slate-500);\r
  flex-shrink: 0;\r
}\r
\r
.rql-split-input {\r
  width: 60px;\r
  text-align: center;\r
  padding: 6px 8px;\r
}\r
\r
.rql-name-input {\r
  flex: 1;\r
  min-width: 140px;\r
  max-width: 220px;\r
}\r
\r
#RQLSubmit {\r
  margin-left: auto;\r
}\r
\r
.savedQuery {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  padding: 10px 12px;\r
  background: var(--bda-slate-50);\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius);\r
  transition: background-color 0.15s ease;\r
  position: relative;\r
}\r
\r
.savedQuery:hover {\r
  background: var(--bda-slate-100);\r
}\r
\r
.savedQuery a {\r
  font-weight: 500;\r
  color: var(--bda-slate-700);\r
  text-decoration: none;\r
  flex: 1;\r
  min-width: 0;\r
}\r
\r
.savedQuery a:hover {\r
  color: var(--bda-primary);\r
}\r
\r
.savedQuery .bda-query-actions {\r
  display: flex;\r
  align-items: center;\r
  gap: 4px;\r
  opacity: 0;\r
  transition: opacity 0.15s ease;\r
}\r
\r
.savedQuery:hover .bda-query-actions {\r
  opacity: 1;\r
}\r
\r
.previewQuery,\r
.deleteQuery {\r
  display: inline-flex;\r
  align-items: center;\r
  justify-content: center;\r
  width: 28px;\r
  height: 28px;\r
  border-radius: var(--bda-radius);\r
  cursor: pointer;\r
  color: var(--bda-slate-400);\r
  transition: all 0.15s ease;\r
}\r
\r
.previewQuery:hover {\r
  background: var(--bda-white);\r
  color: var(--bda-info);\r
}\r
\r
.deleteQuery:hover {\r
  background: var(--bda-white);\r
  color: var(--bda-danger);\r
}\r
\r
.queryView {\r
  display: none;\r
  position: absolute;\r
  top: 100%;\r
  left: 0;\r
  right: 0;\r
  z-index: 10;\r
  background: var(--bda-slate-800);\r
  border-radius: var(--bda-radius);\r
  box-shadow: var(--bda-shadow-lg);\r
  margin-top: 4px;\r
}\r
\r
.queryView pre {\r
  margin: 0;\r
  padding: 10px 12px;\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-slate-100);\r
  white-space: pre-wrap;\r
  word-break: break-word;\r
}\r
\r
/* Legacy prop badges */\r
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
  background-color: var(--bda-info);\r
}\r
\r
.prop_attr_green {\r
  background-color: var(--bda-success);\r
}\r
\r
.copyLink {\r
  text-decoration: none;\r
  color: var(--bda-accent);\r
}\r
\r
.copyField {\r
  width: 200px;\r
  display: none;\r
}\r
\r
#repoToolbar {\r
  margin-bottom: 20px;\r
}\r
\r
.showMore {\r
  font-size: var(--bda-font-size-xs) !important;\r
  font-weight: 500;\r
  color: var(--bda-slate-600);\r
  padding: 4px 12px;\r
  border-radius: var(--bda-radius);\r
  background: var(--bda-white);\r
  border: 1px solid var(--bda-slate-200);\r
  transition: var(--bda-transition);\r
  vertical-align: middle;\r
  display: inline-block;\r
  text-decoration: none;\r
}\r
\r
.showMore:hover {\r
  background: var(--bda-slate-50);\r
  border-color: var(--bda-slate-300);\r
  color: var(--bda-text-strong);\r
}\r
\r
/* "N descriptors available." */\r
a[name='listItemDescriptors'] + p {\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-slate-500);\r
  margin: 0 0 10px;\r
  font-style: italic;\r
}\r
\r
/* =============================================================================\r
   Misc\r
   ============================================================================= */\r
#xmlHighlight {\r
  margin-bottom: 0;\r
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
  border: 1px solid var(--bda-slate-200);\r
}\r
\r
#sqlResult td,\r
#sqlResult th {\r
  text-align: center;\r
  border-right: 1px solid var(--bda-slate-200);\r
  background: none;\r
}\r
\r
#sqlResult tbody tr:nth-child(odd) {\r
  background-color: var(--bda-slate-50);\r
}\r
\r
table.tablesorter tbody tr.normal-row td {\r
  background: var(--bda-white);\r
  color: var(--bda-text);\r
}\r
\r
table.tablesorter tbody tr.alt-row td {\r
  background: var(--bda-slate-50);\r
  color: var(--bda-text);\r
}\r
\r
table.tablesorter tr.normal-row:hover td,\r
table.tablesorter tr.alt-row:hover td {\r
  background-color: var(--bda-slate-100);\r
}\r
\r
.clickable:hover {\r
  color: var(--bda-accent);\r
  text-decoration: underline;\r
}\r
\r
/* =============================================================================\r
   Modal — .bda-overlay / .bda-modal (redesigned)\r
   ============================================================================= */\r
.bda-overlay {\r
  position: fixed;\r
  inset: 0;\r
  background: rgba(15, 23, 42, 0.5);\r
  backdrop-filter: blur(4px);\r
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
  box-shadow: var(--bda-shadow-xl);\r
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
  padding: 16px 20px 12px;\r
  border-bottom: 1px solid var(--bda-slate-200);\r
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
  opacity: 0.5;\r
  cursor: pointer;\r
}\r
\r
.bda-modal__close:hover {\r
  opacity: 1;\r
}\r
\r
.bda-modal__body {\r
  padding: 20px;\r
  overflow-y: auto;\r
  flex: 1;\r
}\r
\r
.bda-modal__footer {\r
  padding: 12px 20px;\r
  border-top: 1px solid var(--bda-slate-200);\r
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
  border: 1px solid var(--bda-slate-300);\r
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
  padding-inline-start: 0;\r
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
   Item Tree form (redesigned)\r
   ============================================================================= */\r
#itemTree {\r
  margin: 24px 0 24px;\r
}\r
\r
/* Alert / info box */\r
.bda-item-tree-alert {\r
  margin: 16px 24px;\r
  padding: 16px;\r
  background: var(--bda-info-bg);\r
  border: 1px solid var(--bda-info-border);\r
  border-radius: var(--bda-radius-md);\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-text);\r
  line-height: 1.6;\r
}\r
\r
.bda-item-tree-alert__content {\r
  display: flex;\r
  gap: 12px;\r
}\r
\r
.bda-item-tree-alert__content p {\r
  margin: 0 0 4px;\r
}\r
\r
.bda-item-tree-alert__icon {\r
  color: var(--bda-info);\r
  font-size: 16px;\r
  flex-shrink: 0;\r
  margin-top: 2px;\r
}\r
\r
.bda-item-tree-alert__warning {\r
  margin: 8px 0 0;\r
  color: var(--bda-warning);\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
.bda-item-tree-alert__warning i {\r
  margin-right: 4px;\r
}\r
\r
/* Form grid: 4 columns */\r
.bda-item-tree-grid {\r
  display: grid;\r
  grid-template-columns: 1fr 1fr 1fr 1fr;\r
  gap: 16px;\r
}\r
\r
#itemTreeForm {\r
  padding: 24px;\r
}\r
\r
#itemTreeForm .bda-input,\r
#itemTreeForm .bda-select {\r
  width: 100%;\r
}\r
\r
/* Actions row: checkbox + button */\r
.bda-item-tree-actions {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  margin-top: 16px;\r
}\r
\r
.bda-item-tree-checkbox {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-slate-600);\r
  cursor: pointer;\r
}\r
\r
.bda-item-tree-checkbox input[type='checkbox'] {\r
  width: 16px;\r
  height: 16px;\r
  accent-color: var(--bda-primary);\r
  cursor: pointer;\r
}\r
\r
.bda-item-tree-checkbox code {\r
  background: var(--bda-slate-100);\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius-sm);\r
  padding: 2px 8px;\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-slate-600);\r
  font-family: var(--bda-font-mono);\r
}\r
\r
/* =============================================================================\r
   DASH Terminal (redesigned)\r
   ============================================================================= */\r
.bda-dash-screen {\r
  font-family: var(--bda-font-mono);\r
  background: var(--bda-slate-900);\r
  color: #a9b1d6;\r
  border-radius: var(--bda-radius-md);\r
  padding: 16px;\r
  height: 300px;\r
  overflow-y: auto;\r
  margin-bottom: 12px;\r
  font-size: var(--bda-font-size-sm);\r
  line-height: 1.6;\r
}\r
\r
.bda-dash-input-row {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
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
  border-radius: var(--bda-radius);\r
  padding: 8px 12px;\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
.bda-dash-input:focus {\r
  outline: none;\r
  border-color: #7aa2f7;\r
  box-shadow: 0 0 0 2px rgba(122, 162, 247, 0.2);\r
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
  padding: 2px 6px;\r
  font-size: 11px;\r
  background: transparent;\r
  border: 1px solid #3b4261;\r
  color: #565f89;\r
  border-radius: var(--bda-radius-sm);\r
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
  padding: 12px;\r
  background: var(--bda-slate-50);\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius);\r
}\r
\r
.bda-dash-script-row {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  margin-bottom: 4px;\r
  padding: 4px 0;\r
  border-bottom: 1px solid var(--bda-slate-100);\r
}\r
\r
#dashInput {\r
  font-family: var(--bda-font-mono);\r
}\r
\r
#dashForm {\r
  font-family: var(--bda-font-mono);\r
}\r
\r
#dashForm .tt-hint {\r
  color: var(--bda-slate-300);\r
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
  resize: none;\r
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
  padding: 2px 6px;\r
  font-size: 90%;\r
  color: var(--bda-white);\r
  background-color: var(--bda-slate-800);\r
  border-radius: var(--bda-radius-sm);\r
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.25);\r
}\r
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
   Cache Stats (redesigned — expandable rows)\r
   ============================================================================= */\r
table.cache {\r
  border-spacing: 0;\r
  border-collapse: collapse;\r
  width: 100%;\r
}\r
\r
.cache tr.cache-subheader {\r
  cursor: pointer;\r
  transition: background 0.15s ease;\r
}\r
\r
.cache tr.cache-subheader:hover {\r
  background: var(--bda-slate-50);\r
}\r
\r
.cacheArrow i {\r
  display: inline-block;\r
  transition: transform 0.2s ease;\r
  margin-right: 8px;\r
  color: var(--bda-slate-400);\r
}\r
\r
.cache-subheader.expanded .cacheArrow i {\r
  transform: rotate(90deg);\r
}\r
\r
.cache td,\r
.cache th {\r
  padding: 10px 12px;\r
}\r
\r
.cache th {\r
  font-size: var(--bda-font-size-xs);\r
  font-weight: 500;\r
  color: var(--bda-slate-500);\r
  text-transform: uppercase;\r
  letter-spacing: 0.05em;\r
  text-align: center;\r
}\r
\r
.cache td {\r
  border-bottom: 1px solid var(--bda-slate-100);\r
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
  font-size: var(--bda-font-size-xs);\r
  font-weight: 500;\r
  padding: 4px;\r
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
/* Cache item descriptor display */\r
.bda-cache-descriptor-name {\r
  font-weight: 600;\r
  color: var(--bda-text-strong);\r
}\r
\r
.bda-cache-attr {\r
  color: var(--bda-slate-500);\r
  margin-left: 12px;\r
}\r
\r
.bda-cache-attr-value {\r
  color: var(--bda-slate-700);\r
}\r
\r
.bda-cache-attr-value--warning {\r
  color: var(--bda-warning);\r
  font-weight: 500;\r
}\r
\r
/* Cache card layout */\r
.bda-cache-card {\r
  overflow: hidden;\r
}\r
\r
.bda-cache-header__row {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  flex-wrap: wrap;\r
  gap: 12px;\r
}\r
\r
.bda-cache-header__actions {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  flex-wrap: wrap;\r
}\r
\r
.bda-cache-body {\r
  padding: 0;\r
  overflow-x: auto;\r
}\r
\r
.cache tr.cache-subheader td {\r
  padding: 10px 16px;\r
  border-bottom: 1px solid var(--bda-slate-100);\r
}\r
\r
.cache tr.cache-subheader:hover {\r
  background: var(--bda-slate-50);\r
}\r
\r
/* Expanded cache detail panel */\r
.bda-cache-detail {\r
  margin: 4px 0 12px 28px;\r
  padding: 16px;\r
  background: var(--bda-slate-50);\r
  border-radius: var(--bda-radius);\r
  border: 1px solid var(--bda-slate-200);\r
}\r
\r
.bda-cache-detail-grid {\r
  display: grid;\r
  grid-template-columns: repeat(5, 1fr);\r
  gap: 16px;\r
}\r
\r
.bda-cache-detail-label {\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-slate-400);\r
  text-transform: uppercase;\r
  letter-spacing: 0.05em;\r
}\r
\r
.bda-cache-detail-value {\r
  font-family: var(--bda-font-mono);\r
  color: var(--bda-slate-700);\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
/* =============================================================================\r
   Scheduler (redesigned)\r
   ============================================================================= */\r
#timeline-wrapper {\r
  margin-bottom: 20px;\r
}\r
\r
.twbs caption {\r
  padding-top: 8px;\r
  padding-bottom: 8px;\r
  color: var(--bda-slate-500);\r
  text-align: left;\r
}\r
\r
/* =============================================================================\r
   XML Definition\r
   ============================================================================= */\r
#xmlDefAsTable {\r
  margin-top: 15px;\r
  color: var(--bda-text-strong);\r
}\r
\r
.bda-xml-def-tabs {\r
  margin-top: 16px;\r
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
  background-color: var(--bda-slate-50);\r
  text-transform: capitalize;\r
  font-weight: 600;\r
}\r
\r
.item-panel .panel-heading {\r
  padding: 12px 16px;\r
}\r
\r
.item-panel .panel-body {\r
  padding: 0 15px;\r
}\r
\r
.item-panel .row > [class^="col-"] {\r
  padding: 10px;\r
  border-right: 1px solid var(--bda-slate-200);\r
}\r
\r
.table-def [class^="col-"] {\r
  text-transform: none;\r
  background-color: var(--bda-info-bg);\r
}\r
\r
.item-panel .highlight {\r
  background-color: #fef08a;\r
}\r
\r
.item-panel .property:hover {\r
  background-color: var(--bda-slate-50);\r
}\r
\r
#quickNavLinks {\r
  margin-top: 10px;\r
  max-height: 400px;\r
  overflow-y: auto;\r
  overflow-x: hidden;\r
}\r
\r
#xmlDefQuickNav .btn.sorted {\r
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
  padding: 5px 15px;\r
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
  color: var(--bda-slate-300);\r
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
  border-radius: var(--bda-radius-full);\r
  font-size: var(--bda-font-size-xs);\r
  font-weight: 500;\r
  background: var(--bda-slate-100);\r
  color: var(--bda-slate-500);\r
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
.row.subtableHeader .col-lg-05 {\r
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
#xmlDefAsTable .popover ul {\r
  padding-left: 10px;\r
}\r
\r
#xmlDefAsTable .popover {\r
  max-width: inherit;\r
  width: 600px;\r
  width: intrinsic;\r
  width: -moz-max-content;\r
  width: -webkit-max-content;\r
}\r
\r
/* =============================================================================\r
   Actor Chain (redesigned)\r
   ============================================================================= */\r
.bda-actor-caller {\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius-md);\r
  padding: 20px 24px;\r
  margin: 16px 0;\r
  background: var(--bda-white);\r
  box-shadow: var(--bda-shadow-sm);\r
}\r
\r
.bda-actor-title {\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-md);\r
  margin-bottom: 12px;\r
  color: var(--bda-text-strong);\r
}\r
\r
.bda-actor-endpoint {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  margin-bottom: 12px;\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
.bda-actor-inputs {\r
  margin: 12px 0;\r
}\r
\r
.bda-actor-input-row {\r
  display: flex;\r
  align-items: center;\r
  gap: 10px;\r
  margin-bottom: 8px;\r
}\r
\r
.bda-actor-input-row label {\r
  min-width: 120px;\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-slate-500);\r
}\r
\r
.bda-actor-result {\r
  margin-top: 12px;\r
  padding: 12px;\r
  background: var(--bda-slate-900);\r
  border: 1px solid var(--bda-slate-700);\r
  border-radius: var(--bda-radius);\r
  font-family: var(--bda-font-mono);\r
  font-size: var(--bda-font-size-sm);\r
  max-height: 200px;\r
  overflow-y: auto;\r
  white-space: pre-wrap;\r
  color: #10b981;\r
}\r
\r
/* =============================================================================\r
   Autocomplete / Search\r
   ============================================================================= */\r
#searchField {\r
  width: 300px;\r
}\r
\r
.bda-search-suggestion {\r
  padding: 6px 12px;\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
/* =============================================================================\r
   Extend Bootstrap grid\r
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
  display: inline-block;\r
  color: var(--bda-white);\r
  border-radius: var(--bda-radius);\r
  font-size: var(--bda-font-size-xs);\r
  padding: 4px 8px;\r
  margin: 5px;\r
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
  display: flex;\r
  height: 100%;\r
}\r
\r
#treeInfo {\r
  display: none;\r
  float: left;\r
}\r
\r
#treeContainer {\r
  height: 100%;\r
  flex: 1;\r
}\r
\r
/* =============================================================================\r
   Keyboard Help Overlay (redesigned)\r
   ============================================================================= */\r
#bda-help-overlay {\r
  position: fixed;\r
  inset: 0;\r
  background: rgba(15, 23, 42, 0.5);\r
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
  padding: 24px 28px;\r
  max-width: 500px;\r
  width: 90%;\r
  max-height: 80vh;\r
  overflow-y: auto;\r
  box-shadow: var(--bda-shadow-xl);\r
}\r
\r
.bda-help-header {\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-md);\r
  margin-bottom: 16px;\r
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
  padding: 10px 0 4px;\r
  color: var(--bda-slate-500);\r
  font-size: var(--bda-font-size-xs);\r
  text-transform: uppercase;\r
  letter-spacing: 0.05em;\r
}\r
\r
.bda-help-table tr td {\r
  padding: 4px 8px 4px 0;\r
  vertical-align: middle;\r
}\r
\r
.bda-help-table kbd {\r
  display: inline-block;\r
  padding: 2px 8px;\r
  background: var(--bda-slate-100);\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius-sm);\r
  font-family: var(--bda-font-mono);\r
  font-size: 11px;\r
  color: var(--bda-text-strong);\r
  white-space: nowrap;\r
  box-shadow: none;\r
}\r
\r
.bda-help-hint {\r
  margin-top: 14px;\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-slate-400);\r
  text-align: center;\r
}\r
\r
/* =============================================================================\r
   ATG Section Tables (Properties, Event Sets, Methods, String Value)\r
   Redesigned as cards with proper headings\r
   ============================================================================= */\r
.bda-section-table {\r
  width: 100%;\r
  border-collapse: collapse;\r
  font-size: var(--bda-font-size-sm);\r
  border: none;\r
  margin-bottom: 0;\r
}\r
\r
.bda-section-table td,\r
.bda-section-table th {\r
  background-color: var(--bda-white) !important;\r
  padding: 10px 16px;\r
  border-bottom: 1px solid var(--bda-slate-100);\r
  vertical-align: middle;\r
  color: var(--bda-text);\r
  text-align: left;\r
  font-weight: normal;\r
}\r
\r
.bda-section-table__header {\r
  background-color: var(--bda-slate-100) !important;\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-slate-500);\r
  text-transform: uppercase;\r
  letter-spacing: 0.07em;\r
  padding: 10px 16px;\r
  border-bottom: 1px solid var(--bda-slate-200);\r
}\r
\r
.bda-section-table__header b,\r
.bda-section-table__header font {\r
  font-weight: inherit;\r
  color: inherit;\r
  font-size: inherit;\r
}\r
\r
.bda-section-table__alt {\r
  background-color: var(--bda-slate-50) !important;\r
}\r
\r
.bda-section-table tr:hover td,\r
.bda-section-table tr:hover th {\r
  background-color: var(--bda-slate-50) !important;\r
  transition: background-color 0.15s ease;\r
}\r
\r
.bda-section-table td:first-child,\r
.bda-section-table th:first-child {\r
  color: var(--bda-slate-700);\r
  white-space: nowrap;\r
  min-width: 200px;\r
  max-width: 320px;\r
}\r
\r
.bda-section-table td a,\r
.bda-section-table th a {\r
  color: var(--bda-accent);\r
  text-decoration: none;\r
}\r
\r
.bda-section-table td a:hover,\r
.bda-section-table th a:hover {\r
  text-decoration: underline;\r
}\r
\r
/* =============================================================================\r
   ATG Page Content Headings — redesigned\r
   ============================================================================= */\r
h1, h2, h3 {\r
  font-weight: 600;\r
  color: var(--bda-text-strong);\r
  border-bottom: none;\r
  padding-bottom: 0;\r
  margin: 24px 0 12px;\r
  letter-spacing: -0.02em;\r
  line-height: 1.4;\r
}\r
\r
h1 { font-size: 20px; }\r
h2 { font-size: 17px; }\r
h3 { font-size: 15px; }\r
\r
/* Don't clobber Bootstrap panel headings */\r
.panel-heading h4 {\r
  font-size: 13px;\r
  font-weight: 600;\r
  margin: 0;\r
  border: none;\r
  padding: 0;\r
}\r
\r
/* =============================================================================\r
   Scheduler page — redesigned\r
   ============================================================================= */\r
.bda-sched-toolbar {\r
  display: flex;\r
  align-items: center;\r
  gap: 12px;\r
  padding: 12px 24px;\r
  border-bottom: 1px solid var(--bda-slate-100);\r
}\r
\r
.bda-sched-search {\r
  position: relative;\r
  flex: 1;\r
  max-width: 360px;\r
}\r
\r
.bda-sched-search > i {\r
  position: absolute;\r
  left: 12px;\r
  top: 50%;\r
  transform: translateY(-50%);\r
  color: var(--bda-slate-400);\r
  font-size: 13px;\r
  pointer-events: none;\r
}\r
\r
.bda-sched-search > input {\r
  padding-left: 36px !important;\r
  width: 100%;\r
}\r
\r
.bda-sched-scroll {\r
  max-height: 700px;\r
  overflow-y: auto;\r
}\r
\r
.bda-sched-scroll thead {\r
  position: sticky;\r
  top: 0;\r
  z-index: 1;\r
}\r
\r
.bda-sched-footer {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  padding: 10px 24px;\r
  border-top: 1px solid var(--bda-slate-100);\r
}\r
\r
.bda-sched-counter {\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-slate-500);\r
}\r
\r
.bda-sched-date {\r
  white-space: nowrap;\r
  min-width: 110px;\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-slate-500);\r
  font-family: var(--bda-font-mono);\r
}\r
\r
.bda-sched-check {\r
  width: 30px;\r
  min-width: 30px;\r
  max-width: 30px;\r
  text-align: center !important;\r
  padding: 4px 6px !important;\r
}\r
\r
form[action*="Scheduler"],\r
h2 + button.bda-button,\r
h2 + button.btn {\r
  margin-top: 16px;\r
}\r
\r
form[action*="Scheduler"] input[type="submit"],\r
form[action*="Scheduler"] button {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 6px;\r
  padding: 8px 16px;\r
  font-size: var(--bda-font-size-sm);\r
  font-weight: 500;\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius);\r
  background: var(--bda-white);\r
  color: var(--bda-slate-700);\r
  cursor: pointer;\r
  transition: var(--bda-transition);\r
  margin-bottom: 10px;\r
}\r
\r
form[action*="Scheduler"] input[type="submit"]:hover,\r
form[action*="Scheduler"] button:hover {\r
  background: var(--bda-slate-50);\r
  border-color: var(--bda-slate-300);\r
  color: var(--bda-text-strong);\r
}\r
\r
/* =============================================================================\r
   Invoke Method page\r
   ============================================================================= */\r
h1 + p,\r
h2 + p {\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-slate-500);\r
  line-height: 1.6;\r
  margin-bottom: 12px;\r
}\r
\r
form input[type="submit"],\r
form input[type="reset"] {\r
  display: inline-flex;\r
  align-items: center;\r
  padding: 8px 16px;\r
  font-size: var(--bda-font-size-sm);\r
  font-weight: 500;\r
  border-radius: var(--bda-radius);\r
  cursor: pointer;\r
  transition: var(--bda-transition);\r
  border: 1px solid var(--bda-slate-200);\r
  background: var(--bda-white);\r
  color: var(--bda-slate-700);\r
  margin-right: 8px;\r
}\r
\r
form input[type="submit"]:first-of-type {\r
  background: linear-gradient(to right, #ef4444, #dc2626);\r
  border-color: transparent;\r
  color: #fff;\r
  box-shadow: 0 4px 14px var(--bda-brand-shadow);\r
}\r
\r
form input[type="submit"]:first-of-type:hover {\r
  background: linear-gradient(to right, #dc2626, #b91c1c);\r
}\r
\r
form input[type="reset"]:hover,\r
form input[type="submit"]:not(:first-of-type):hover {\r
  background: var(--bda-slate-50);\r
  border-color: var(--bda-slate-300);\r
  color: var(--bda-text-strong);\r
}\r
\r
/* =============================================================================\r
   JDBC Switcher\r
   ============================================================================= */\r
.bda-jdbc-switcher {\r
  margin: 16px 0;\r
  display: flex;\r
  align-items: center;\r
  gap: 12px;\r
}\r
\r
.bda-jdbc-switcher label {\r
  font-size: var(--bda-font-size-sm);\r
  font-weight: 500;\r
  color: var(--bda-slate-600);\r
}\r
\r
/* =============================================================================\r
   String Value — Dark code block\r
   ============================================================================= */\r
.bda-string-value {\r
  background: var(--bda-slate-900);\r
  border-radius: var(--bda-radius-md);\r
  padding: 16px 20px;\r
  font-family: var(--bda-font-mono);\r
  font-size: var(--bda-font-size-sm);\r
  color: #10b981;\r
  overflow-x: auto;\r
  margin: 16px;\r
  line-height: 1.6;\r
  word-break: break-all;\r
}\r
\r
/* =============================================================================\r
   Search Row\r
   ============================================================================= */\r
.bda-search-row {\r
  display: flex;\r
  align-items: center;\r
  gap: 10px;\r
  margin: 16px 0 20px;\r
  padding: 12px 16px;\r
  background: var(--bda-white);\r
  border: 1px solid var(--bda-slate-200);\r
  border-radius: var(--bda-radius);\r
}\r
\r
.bda-search-toggle,\r
.bda-context-toggle {\r
  font-size: var(--bda-font-size-sm);\r
  font-weight: 500;\r
  color: var(--bda-accent);\r
  text-decoration: none;\r
  padding: 4px 8px;\r
  border-radius: var(--bda-radius-sm);\r
  transition: var(--bda-transition);\r
  white-space: nowrap;\r
}\r
\r
.bda-search-toggle:hover,\r
.bda-context-toggle:hover {\r
  background: var(--bda-accent-subtle);\r
  color: var(--bda-accent-hover);\r
}\r
\r
.bda-search-by-name {\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-slate-500);\r
  white-space: nowrap;\r
}\r
\r
.bda-context-group {\r
  display: flex;\r
  align-items: center;\r
  gap: 4px;\r
  margin-left: auto;\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-slate-500);\r
}\r
\r
.bda-search-field {\r
  flex: 1;\r
  min-width: 280px;\r
  height: 36px;\r
}\r
\r
/* =============================================================================\r
   Responsive\r
   ============================================================================= */\r
@media (max-width: 1200px) {\r
  #toolbar { gap: 6px; }\r
  .fav { min-width: 80px; }\r
  .bda-container,\r
  .bda-main,\r
  .bda-nav__inner,\r
  .bda-toolbar-strip__inner,\r
  #toolbarContainer {\r
    padding-left: 16px;\r
    padding-right: 16px;\r
  }\r
}\r
\r
@media (max-width: 768px) {\r
  body { padding-top: 0; }\r
\r
  .bda-nav__inner {\r
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
  .bda-nav__brand-text span {\r
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
\r
  .bda-container,\r
  .bda-main,\r
  .bda-page-header {\r
    padding-left: 12px;\r
    padding-right: 12px;\r
  }\r
}\r
\r
/* =============================================================================\r
   BDA Properties table — redesigned as card sections\r
   ============================================================================= */\r
.bda-props-table {\r
  width: 100%;\r
  border-collapse: collapse;\r
}\r
\r
.bda-props-table th {\r
  background: var(--bda-slate-100);\r
  color: var(--bda-slate-500);\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-xs);\r
  text-transform: uppercase;\r
  letter-spacing: 0.05em;\r
  padding: 8px 12px;\r
  border-bottom: 1px solid var(--bda-slate-200);\r
}\r
\r
.bda-props-table td {\r
  padding: 6px 12px;\r
  border-bottom: 1px solid var(--bda-slate-100);\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
.bda-props-table tbody tr:hover td {\r
  background: var(--bda-slate-50);\r
}\r
\r
/* =============================================================================\r
   Section Card Wrapper — wraps h1 + table pairs into styled cards\r
   ============================================================================= */\r
.bda-section-card {\r
  background: var(--bda-white);\r
  border-radius: var(--bda-radius-lg);\r
  box-shadow: var(--bda-shadow-card);\r
  border: 1px solid var(--bda-border-subtle);\r
  overflow: hidden;\r
  margin-bottom: 24px;\r
}\r
\r
.bda-section-card__header {\r
  padding: 16px 24px;\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  gap: 12px;\r
  border-bottom: 1px solid var(--bda-border-subtle);\r
  background: rgba(248, 250, 252, 0.5);\r
}\r
\r
.bda-section-card__header h1,\r
.bda-section-card__header h2,\r
.bda-section-card__header h3 {\r
  margin: 0;\r
  padding: 0;\r
  border: none;\r
  font-size: var(--bda-font-size-md);\r
}\r
\r
.bda-section-card__header i {\r
  color: var(--bda-slate-500);\r
  font-size: 14px;\r
}\r
\r
.bda-section-card__body {\r
  padding: 0;\r
}\r
\r
.bda-section-card__body--padded {\r
  padding: 24px;\r
}\r
\r
/* Toggle button inside section card header */\r
.bda-section-card__header .bda-toggle-btn,\r
.bda-section-card__header .showMore {\r
  flex-shrink: 0;\r
  white-space: nowrap;\r
}\r
\r
.bda-toggle-btn {\r
  cursor: pointer;\r
}\r
\r
/* =============================================================================\r
   Component Search\r
   ============================================================================= */\r
.bda-cmpn-search-card {\r
  max-width: 900px;\r
}\r
\r
.bda-cmpn-search-header-content {\r
  display: flex;\r
  align-items: flex-start;\r
  gap: 12px;\r
}\r
\r
.bda-cmpn-search-subtitle {\r
  margin: 4px 0 0;\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-slate-500);\r
  line-height: 1.5;\r
}\r
\r
.bda-cmpn-search-form {\r
  padding: 24px;\r
}\r
\r
.bda-cmpn-search-form-row {\r
  display: flex;\r
  align-items: flex-end;\r
  gap: 16px;\r
  flex-wrap: wrap;\r
}\r
\r
.bda-cmpn-search-query {\r
  flex: 1;\r
  min-width: 220px;\r
}\r
\r
.bda-cmpn-search-scope .bda-input-field__label {\r
  display: block;\r
  margin-bottom: 6px;\r
}\r
\r
.bda-cmpn-search-radios {\r
  display: flex;\r
  align-items: center;\r
  gap: 16px;\r
  height: 34px;\r
}\r
\r
.bda-cmpn-search-radio {\r
  display: flex;\r
  align-items: center;\r
  gap: 6px;\r
  cursor: pointer;\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-slate-700);\r
}\r
\r
.bda-cmpn-search-radio input[type="radio"] {\r
  width: 14px;\r
  height: 14px;\r
  accent-color: var(--bda-brand);\r
  cursor: pointer;\r
}\r
\r
.bda-cmpn-search-submit {\r
  padding-bottom: 2px;\r
}\r
\r
.bda-cmpn-search-warning {\r
  margin: 12px 0 0;\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-warning);\r
}\r
\r
.bda-cmpn-search-results {\r
  border-top: 1px solid var(--bda-slate-100);\r
}\r
\r
.bda-cmpn-search-results-header {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  padding: 10px 24px;\r
  background: var(--bda-slate-50);\r
}\r
\r
.bda-cmpn-search-results-title {\r
  font-weight: 600;\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-slate-700);\r
  display: flex;\r
  align-items: center;\r
  gap: 6px;\r
}\r
\r
.bda-cmpn-search-results-count {\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-slate-500);\r
}\r
\r
.bda-cmpn-search-list {\r
  max-height: 400px;\r
  overflow-y: auto;\r
}\r
\r
.bda-cmpn-search-item {\r
  display: flex;\r
  align-items: center;\r
  gap: 12px;\r
  padding: 10px 24px;\r
  border-bottom: 1px solid var(--bda-slate-100);\r
  text-decoration: none;\r
  transition: background 0.12s;\r
}\r
\r
.bda-cmpn-search-item:hover {\r
  background: rgba(59, 130, 246, 0.04);\r
}\r
\r
.bda-cmpn-search-item__icon {\r
  width: 30px;\r
  height: 30px;\r
  border-radius: var(--bda-radius);\r
  background: var(--bda-slate-100);\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  flex-shrink: 0;\r
  transition: background 0.12s;\r
}\r
\r
.bda-cmpn-search-item:hover .bda-cmpn-search-item__icon {\r
  background: var(--bda-info-bg);\r
}\r
\r
.bda-cmpn-search-item__icon i {\r
  font-size: 13px;\r
  color: var(--bda-slate-500);\r
  transition: color 0.12s;\r
}\r
\r
.bda-cmpn-search-item:hover .bda-cmpn-search-item__icon i {\r
  color: var(--bda-info);\r
}\r
\r
.bda-cmpn-search-item__content {\r
  flex: 1;\r
  min-width: 0;\r
  display: flex;\r
  flex-direction: column;\r
  gap: 2px;\r
}\r
\r
.bda-cmpn-search-item__path {\r
  font-family: var(--bda-font-mono);\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-brand);\r
  overflow: hidden;\r
  text-overflow: ellipsis;\r
  white-space: nowrap;\r
}\r
\r
.bda-cmpn-search-item:hover .bda-cmpn-search-item__path {\r
  color: var(--bda-brand-dark);\r
}\r
\r
.bda-cmpn-search-item__desc {\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-slate-500);\r
  overflow: hidden;\r
  text-overflow: ellipsis;\r
  white-space: nowrap;\r
}\r
\r
.bda-cmpn-search-item__chevron {\r
  font-size: 11px;\r
  color: var(--bda-slate-300);\r
  flex-shrink: 0;\r
  transition: color 0.12s;\r
}\r
\r
.bda-cmpn-search-item:hover .bda-cmpn-search-item__chevron {\r
  color: var(--bda-slate-500);\r
}\r
\r
.bda-cmpn-search-empty {\r
  padding: 48px 24px;\r
  text-align: center;\r
}\r
\r
.bda-cmpn-search-empty i {\r
  font-size: 36px;\r
  color: var(--bda-slate-300);\r
  display: block;\r
  margin-bottom: 12px;\r
}\r
\r
.bda-cmpn-search-empty p {\r
  color: var(--bda-slate-500);\r
  margin: 0;\r
}\r
\r
.bda-cmpn-search-loading {\r
  padding: 32px 24px;\r
  text-align: center;\r
  color: var(--bda-slate-500);\r
  font-size: var(--bda-font-size-sm);\r
}\r
\r
.bda-cmpn-search-loading i {\r
  margin-right: 6px;\r
}\r
\r
.bda-cmpn-search-empty__hint {\r
  font-size: var(--bda-font-size-xs);\r
  color: var(--bda-slate-400) !important;\r
  margin-top: 4px !important;\r
}\r
\r
/* =============================================================================\r
   Property Popover\r
   ============================================================================= */\r
\r
.bda-prop-popover {\r
  position: absolute;\r
  z-index: 9999;\r
  display: flex;\r
  gap: 6px;\r
  background: var(--bda-surface);\r
  border: 1px solid var(--bda-border);\r
  border-radius: var(--bda-radius);\r
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);\r
  padding: 6px 8px;\r
}\r
\r
/* =============================================================================\r
   Footer\r
   ============================================================================= */\r
.bda-footer {\r
  text-align: center;\r
  padding: 32px 0;\r
  font-size: var(--bda-font-size-sm);\r
  color: var(--bda-slate-400);\r
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
  function wrapContentInContainer() {
    const $body = $("body");
    const $children = $body.children().not("#bdaNavbar, .bda-overlay, #bda-help-overlay, .bda-toolbar-strip, script, link, style, noscript");
    if ($children.length === 0) return;
    if ($(".bda-main").length > 0) return;
    const $container = $('<div class="bda-main"></div>');
    $children.first().before($container);
    $container.append($children);
  }
  function setupCopyClipboardButtons(oldDynamo) {
    const $breadcrumb = oldDynamo ? $("h1:eq(0)") : $("h1:eq(1)");
    if ($breadcrumb.length === 0) return;
    $breadcrumb.attr("id", "breadcrumb").append(
      $("<button></button>", { class: "bda-btn bda-btn--ghost bda-btn--sm", html: "<i class='fa fa-files-o'></i>" }).on("click", () => {
        const path = document.location.pathname.replace("/dyn/admin/nucleus", "");
        GM_setClipboard(path);
      })
    );
    const $classLink = $breadcrumb.next();
    $("<button></button>", { class: "bda-btn bda-btn--ghost bda-btn--sm", html: "<i class='fa fa-files-o'></i>" }).on("click", () => {
      GM_setClipboard($classLink.attr("title") ?? $classLink.text());
    }).insertAfter($classLink);
  }
  function setupBreadcrumb(oldDynamo) {
    var _a;
    const $h1 = $("#breadcrumb");
    if ($h1.length === 0) return;
    const $copyBtn = $h1.find(".bda-btn--ghost, .bda-btn--icon").detach();
    const $nav = $('<nav class="bda-breadcrumb" id="breadcrumb" aria-label="Component path"></nav>');
    $('<span class="bda-breadcrumb__prefix">Path:</span>').appendTo($nav);
    const $links = $h1.find("a");
    const total = $links.length;
    $links.each(function(i) {
      const text = $(this).text().replace(/\//g, "").trim();
      if (!text || text === "/") return;
      if ($nav.find(".bda-breadcrumb__item").length > 0) {
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
        if ($nav.find(".bda-breadcrumb__item").length > 0) {
          $('<i class="fa fa-chevron-right bda-breadcrumb__sep"></i>').appendTo($nav);
        }
        $(`<span class="bda-breadcrumb__item bda-breadcrumb__item--active">${text}</span>`).appendTo($nav);
      }
    }
    if ($copyBtn.length) $nav.append($copyBtn);
    $h1.replaceWith($nav);
  }
  function normalizeAtgSectionTables() {
    $("h1").each(function() {
      const $h1 = $(this);
      const $table = $h1.next("table");
      if ($table.length === 0) return;
      if (!$table.hasClass("bda-section-table")) {
        $table.addClass("bda-section-table");
        $table.removeAttr("style").removeAttr("bgcolor").removeAttr("background");
        $table.find("tr, td, th").removeAttr("bgcolor").removeAttr("background").removeAttr("valign").removeAttr("style");
        $table.find("tr:first-child td, tr:first-child th").addClass("bda-section-table__header");
        $table.find("tr.even td, tr.even th").addClass("bda-section-table__alt");
        $table.find("td").each(function() {
          const $td = $(this);
          const text = $td.text().trim();
          if (text.includes(".") && /^[\w.]+$/.test(text) && !text.startsWith("/")) {
            const simpleName = text.split(".").pop() ?? text;
            $td.text(simpleName).attr("title", text);
            return;
          }
          const classMatch = text.match(/^Class\s+([\w.]+)$/);
          if (classMatch) {
            const fullName = classMatch[1];
            const simpleName = fullName.split(".").pop() ?? fullName;
            const $link = $td.find("a").first();
            if ($link.length > 0) {
              $link.text(simpleName).attr("title", fullName);
              $td.contents().filter(function() {
                return this.nodeType === 3;
              }).remove();
            } else {
              $td.text(simpleName).attr("title", `Class ${fullName}`);
            }
          }
        });
      }
      const heading = $h1.text().trim();
      const $card = $('<div class="bda-section-card"></div>');
      const $header = $('<div class="bda-section-card__header"></div>');
      let icon = "fa-list";
      if (heading.includes("Properties")) icon = "fa-list-ul";
      else if (heading.includes("Event")) icon = "fa-bolt";
      else if (heading.includes("Method")) icon = "fa-code";
      else if (heading.includes("String Value")) icon = "fa-hashtag";
      const $toggleInH1 = $h1.find(".bda-toggle-btn, .showMore");
      const $toggleAfterTable = $table.next(".bda-toggle-btn, .showMore, a.showMore");
      const cleanHeading = heading.replace(/Show (more|less)\.\.\./g, "").trim();
      $header.append(`<h2><i class="fa ${icon}"></i> ${cleanHeading}</h2>`);
      if ($toggleInH1.length > 0) {
        $header.append($toggleInH1.detach());
      } else if ($toggleAfterTable.length > 0) {
        $header.append($toggleAfterTable.detach());
      }
      const $body = $('<div class="bda-section-card__body"></div>');
      $table.css("display", "");
      if (heading.includes("String Value")) {
        const valueText = $table.find("td").text().trim();
        $body.append($('<div class="bda-string-value"></div>').text(valueText));
        $table.remove();
      } else {
        $body.append($table);
      }
      if ($h1.attr("data-bda-collapsed") === "true") {
        $body.hide();
      }
      $card.append($header, $body);
      $h1.before($card);
      $h1.remove();
    });
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
  function enhanceAdminLink() {
    const $adminLink = $("a").filter(function() {
      return !!$(this).text().trim().match(/^admin\/?$/);
    }).first();
    if ($adminLink.length === 0) return;
    $adminLink.addClass("bda-root-badge").html('<i class="fa fa-home"></i> admin');
    const $breadcrumb = $("nav.bda-breadcrumb");
    if ($breadcrumb.length > 0) {
      $breadcrumb.append($adminLink);
    }
  }
  function enhanceComponentBrowserTitle() {
    const $title = $("h1").filter(function() {
      return $(this).text().trim() === "Component Browser";
    }).first();
    if ($title.length > 0) {
      $title.addClass("bda-component-browser-title");
    }
  }
  function cleanupAtgSearchElements() {
    const $searchForm = $("form#search").first();
    if ($searchForm.length === 0) return;
    $searchForm.prevAll("a").filter(function() {
      return $(this).text().trim() === "Search";
    }).remove();
    $searchForm.nextAll("a").filter(function() {
      return !$(this).hasClass("bda-root-badge") && !$(this).hasClass("bda-btn");
    }).remove();
    $searchForm.siblings("p").filter(function() {
      return this.style.display === "inline";
    }).remove();
    $searchForm.remove();
  }
  function enhanceClassMetadata() {
    const $findClassAnchor = $('a[href*="findclass.jhtml"]').first();
    if ($findClassAnchor.length === 0) return;
    const $findClassContainer = $findClassAnchor.parent("span");
    const $base = $findClassContainer.length > 0 ? $findClassContainer : $findClassAnchor;
    const $prevEl = $base.prev();
    let $classLink;
    let $copyBtn;
    if ($prevEl.is(".bda-btn--ghost, .bda-btn--icon, button")) {
      $copyBtn = $prevEl;
      $classLink = $copyBtn.prev("a");
    } else {
      $copyBtn = $();
      $classLink = $prevEl.filter("a");
    }
    if ($classLink.length === 0) return;
    const $parent = $classLink.parent();
    const $metaSection = $('<div class="bda-meta-section"></div>');
    const $classRow = $('<div class="bda-class-row"></div>');
    $classRow.append('<span class="bda-meta-label"><i class="fa fa-cube"></i> Class</span>');
    $classRow.append($classLink.clone().addClass("bda-class-name"));
    if ($copyBtn.length > 0) $classRow.append($copyBtn.clone().addClass("bda-btn bda-btn--ghost bda-btn--sm"));
    $classRow.append(
      $findClassAnchor.clone().addClass("bda-btn bda-btn--ghost bda-btn--sm").prepend('<i class="fa fa-search"></i> ')
    );
    $metaSection.append($classRow);
    const $actionLinks = $("a").filter(function() {
      const text = $(this).text();
      return text.includes("Service Configuration") || text.includes("Repository Template") || text.includes("Examine");
    });
    if ($actionLinks.length > 0) {
      const $actionsRow = $('<div class="bda-actions-row"></div>');
      $actionLinks.each(function() {
        const $link = $(this).clone().addClass("bda-btn bda-btn--secondary");
        const text = $link.text();
        if (text.includes("Configuration")) {
          $link.prepend('<i class="fa fa-cog"></i> ');
        } else {
          $link.prepend('<i class="fa fa-file-code-o"></i> ');
        }
        $actionsRow.append($link);
      });
      $metaSection.append($actionsRow);
    }
    $classLink.before($metaSection);
    $classLink.remove();
    if ($copyBtn.length > 0) $copyBtn.remove();
    ($findClassContainer.length > 0 ? $findClassContainer : $findClassAnchor).remove();
    $actionLinks.each(function() {
      $(this).remove();
    });
    $parent.contents().filter(function() {
      const text = (this.textContent ?? "").trim();
      return this.nodeType === 3 && (/^\s*,\s*$/.test(text) || text.startsWith("Class"));
    }).remove();
  }
  function buildPageHeaderSection() {
    const $breadcrumb = $("nav.bda-breadcrumb").first();
    const $metaSection = $(".bda-meta-section").first();
    const $anchor = $breadcrumb.length > 0 ? $breadcrumb : $metaSection.length > 0 ? $metaSection : null;
    if (!$anchor) return;
    const $header = $('<div class="bda-page-header"></div>');
    const $card = $('<div class="bda-page-header-card"></div>');
    $anchor.before($header);
    $header.append($card);
    if ($breadcrumb.length > 0) $card.append($breadcrumb);
    if ($metaSection.length > 0) $card.append($metaSection);
  }
  function init() {
    console.time("bda");
    console.log("Start BDA script");
    const oldDynamo = isOldDynamo();
    const componentPage = isComponentPage();
    const bdaConfig = {
      oldDynamoAltSelector: OLD_DYNAMO_ALT_SELECTORS,
      isOldDynamo: oldDynamo,
      isComponentPage: componentPage
    };
    if (oldDynamo) {
      console.log("isOldDynamo");
      fixCss();
    }
    registerJQueryExtensions();
    if (typeof $.tablesorter !== "undefined") {
      $.tablesorter.defaults.sortInitialOrder = "desc";
    }
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
    normalizeAtgSectionTables();
    enhanceAdminLink();
    enhanceComponentBrowserTitle();
    enhanceClassMetadata();
    buildPageHeaderSection();
    cleanupAtgSearchElements();
    wrapContentInContainer();
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