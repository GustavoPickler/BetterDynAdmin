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
    const ALERT_MODAL_TEMPLATE = '<div class="bda-alert-wrapper twbs"><div class="modal fade bda-modal" tabindex="-1" role="dialog"><div class="modal-dialog" role="document"><div class="modal-content"><div class="modal-body bda-alert-body"></div><div class="modal-footer bda-alert-footer"></div></div></div></div></div>';
    $.fn[pluginName] = function(options) {
      try {
        return this.each(function() {
          const $parent = $(this);
          const wrapper = $(ALERT_MODAL_TEMPLATE);
          $parent.append(wrapper);
          const modal = wrapper.find(".modal");
          modal.find(".bda-alert-body").html(options.msg);
          const $footer = modal.find(".bda-alert-footer").empty();
          const hide = () => {
            modal.modal("hide");
            wrapper.detach();
          };
          for (const opt of options.options) {
            $("<input>", {
              type: "button",
              value: opt.label,
              class: "btn btn-default"
            }).on("click", () => {
              if (opt._callback) opt._callback();
              hide();
            }).appendTo($footer);
          }
          modal.modal("show");
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
      $("<div id='history'></div>").insertAfter(this.bda.logoSelector);
      const history = JSON.parse(localStorage.getItem("componentHistory") ?? "[]");
      let html = "Component history : ";
      history.forEach((comp, i) => {
        if (i !== 0) html += ", ";
        html += `<a href='${comp}'>${getComponentNameFromPath(comp)}</a>`;
      });
      $("#history").html(html);
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
        $("<div class='toolbar-elem fav'></div>").css("background-color", colorToCss(colors)).css("border", "1px solid " + this.getBorderColor(colors)).html(
          `<div class='favLink'><a href='${fav.path}' title='${fav.name}'><div class='favTitle'>${shortName}</div><div class='favName'>${fav.name}</div></a></div><div class='favArrow' id='favArrow${favId}'><i class='up fa fa-arrow-down'></i></div><div class='favMoreInfo' id='favMoreInfo${favId}'><div class='favLogDebug'><form method='POST' action='${fav.path}' id='logDebugForm${fav.name}'><input type='hidden' value='loggingDebug' name='propertyName'><input type='hidden' value='' name='newValue'>logDebug : <a href='javascript:void(0)' class='logdebug' id='logDebug${fav.name}'>true</a>&nbsp;|&nbsp;<a href='javascript:void(0)' class='logdebug' id='logDebug${fav.name}'>false</a></form></div><div class='favDelete' id='delete${fav.name}'><i class='fa fa-trash-o'></i> Delete</div><div class='fav-tags'>${favTags}</div></div>`
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
          $("<div class='toolbar-elem newFav'><a href='javascript:void(0)' id='addComponent' title='Add component to toolbar'>+</a></div>").appendTo("#toolbar");
          $(".close").on("click", () => {
            $(".popup_block").fadeOut();
          });
          $("#submitComponent").on("click", () => {
            $(".popup_block").fadeOut();
            const methods = [];
            const vars = [];
            $(".method:checked").each(function() {
              var _a;
              methods.push(((_a = this.parentElement) == null ? void 0 : _a.textContent) ?? "");
            });
            $(".variable:checked").each(function() {
              var _a;
              vars.push(((_a = this.parentElement) == null ? void 0 : _a.textContent) ?? "");
            });
            let tags2 = buildArray($("#newtags").val());
            $(".tag:checked").each(function() {
              var _a;
              tags2.push(((_a = this.parentElement) == null ? void 0 : _a.textContent) ?? "");
            });
            tags2 = unique(tags2);
            this.storeComponent(componentPath, methods, vars, tags2);
            this.reloadToolbar();
          });
          $(".newFav").on("click", () => {
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
            $("#addComponentToolbarPopup").fadeIn();
          });
        }
      }
      this.addFavTagList();
    }
    createAddPopup() {
      $(
        "<div id='addComponentToolbarPopup' class='popup_block'><div class='addFavOptions'><a href='#' class='close'><i class='fa fa-times'></i></a><h3 class='popup_title'>Add new component</h3><p>Choose methods and/or properties to shortcut : </p><div id='addComponentToolbarPopupContent'><div id='methods'><ul></ul></div><div id='vars'><ul></ul></div></div><br><div id='favSetTags'><div class='favline'><div>Add tags:</div><div><ul id='existingTags'></ul></div></div><div class='favline'><div>New tags:</div><div><input id='newtags' class='newtags' type='text' placeholder='comma separated'></div></div></div><div class='addFavSubmit'><button type='button' id='submitComponent'>Add <i class='fa fa-play'></i></button></div></div></div>"
      ).insertAfter(this.bda.logoSelector);
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
        $('<button id="clear-filters" class="bda-button bda-button-icon" title="Clear"><i class="fa fa-times" aria-hidden="true"></i></button>').on("click", () => {
          this.clearTags();
        }).appendTo($('<li class="tag-filter"></li>').appendTo($list));
      }
      const sortedTags = sortArray(Object.keys(tags));
      sortedTags.forEach((tagName) => {
        const tag = tags[tagName];
        const tagColor = stringToColour(tagName);
        const $li = $('<li class="bda-button tag-filter"></li>').css("background-color", colorToCss(tagColor)).css("border", "1px solid " + this.getBorderColor(tagColor)).appendTo($list);
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
      this.$menuBar = $("<div id='menuBar'></div>").appendTo("body");
      this.createBugReportPanel();
      this.createBackupPanel();
      this.createConfigurationPanel();
      this.createWhatsnewPanel();
      this.createSearchBox();
      this.$menuBar.on("click", ".menu", (event) => {
        const $thisParent = $(event.currentTarget);
        $(".menu").each(function() {
          const $this = $(this);
          const $panel2 = $("#" + $this.attr("data-panel"));
          if ($this.attr("id") !== $thisParent.attr("id") && $panel2.css("display") !== "none") {
            $panel2.slideToggle();
            rotateArrow($this.find(".menuArrow i"));
          }
        });
        const $panel = $("#" + $thisParent.attr("data-panel"));
        $panel.slideToggle();
        rotateArrow($thisParent.find(".menuArrow i"));
      });
      console.timeEnd("bdaMenu");
    }
    // -------------------------------------------------------------------------
    // Bug report panel
    // -------------------------------------------------------------------------
    createBugReportPanel() {
      $("<div id='bdaBug' class='menu' data-panel='bdaBugPanel'></div>").appendTo(this.$menuBar).html("<p>About</p><div class='menuArrow'><i class='up fa fa-arrow-down'></i></div>");
      $("<div id='bdaBugPanel' class='menuPanel'></div>").appendTo("body").html(
        `<p>Better Dyn Admin has a <a target='_blank' href='https://github.com/jc7447/BetterDynAdmin'>GitHub page</a>.<br>
      Please report any bug in the <a target='_blank' href='https://github.com/jc7447/BetterDynAdmin/issues'>issues tracker</a>.
      <br><br><strong>BDA version ${GM_info.script.version}</strong></p>`
      );
    }
    // -------------------------------------------------------------------------
    // What's new panel
    // -------------------------------------------------------------------------
    createWhatsnewPanel() {
      $("<div id='whatsnew' class='menu' data-panel='whatsnewPanel'></div>").appendTo(this.$menuBar).html("<p>What's new</p><div class='menuArrow'><i class='up fa fa-arrow-down'></i></div>");
      $("<div id='whatsnewPanel' class='menuPanel'></div>").appendTo("body").html("<p id='whatsnewContent'></p>");
      $("#whatsnew").on("click", () => {
        if ($("#whatsnewPanel").css("display") === "none") {
          $("#whatsnewContent").html(GM_getResourceText("whatsnew"));
        }
      });
    }
    // -------------------------------------------------------------------------
    // Backup panel
    // -------------------------------------------------------------------------
    createBackupPanel() {
      $("<div id='bdaBackup' class='menu' data-panel='bdaBackupPanel'></div>").appendTo(this.$menuBar).html("<p>Backup</p><div class='menuArrow'><i class='up fa fa-arrow-down'></i></div>");
      $("<div id='bdaBackupPanel' class='menuPanel'></div>").appendTo("body").html(
        "<p>Backup BDA data to keep your favorite components and stored queries safe.<br><br><strong>You can also import a backup from another domain!</strong></p><textarea id='bdaData' placeholder='Paste your data here to restore it.'></textarea><button id='bdaDataBackup'>Backup</button><button id='bdaDataRestore'>Restore</button>"
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
    createConfigurationPanel() {
      $("<div id='bdaConfig' class='menu' data-panel='bdaConfigPanel'></div>").appendTo(this.$menuBar).html("<p>Configuration</p><div class='menuArrow'><i class='up fa fa-arrow-down'></i></div>");
      const $panel = $("<div id='bdaConfigPanel' class='menuPanel'></div>").appendTo("body");
      const monoInstanceKey = "mono_instance";
      const isMonoInstance = GM_getValue(monoInstanceKey) === true;
      $panel.html(
        `<p>Same BDA data on every domain: <input type='checkbox' id='mono_instance_checkbox' ${isMonoInstance ? "checked" : ""}></p>`
      );
      $("#mono_instance_checkbox").on("change", function() {
        const checked = $(this).prop("checked");
        GM_setValue(monoInstanceKey, checked);
        if (checked) GM_setValue("BDA_GM_Backup", JSON.stringify(bdaStorage.getData()));
      });
      this.createCheckBoxConfig($panel, {
        name: "search_autocomplete",
        description: "Search AutoComplete",
        message: "<p>Note: Reload dyn/admin to apply.</p>"
      });
      this.createCheckBoxConfig($panel, {
        name: "defaultOpenXmlDefAsTable",
        description: "Display XML Def as table by default"
      });
      this.createDefaultMethodsConfig($panel);
      this.createDataSourceFolderConfig($panel);
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
      $("<button>Save methods</button>").on("click", () => {
        const arr = $("#config-methods-data").val().replace(/ /g, "").split(",").filter(Boolean);
        bdaStorage.storeConfiguration("default_methods", arr);
      }).appendTo($config);
      const savedProps = bdaStorage.getConfigurationValue("default_properties") ?? [];
      $config.append(
        `<p>Default properties when bookmarking:</p><textarea id='config-properties-data' placeholder='Comma separated'>${savedProps.join(",")}</textarea>`
      );
      $("<button>Save properties</button>").on("click", () => {
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
      $("<button>Save folders</button>").on("click", () => {
        const val = $("#config-data-source-folders-data").val().trim();
        bdaStorage.storeConfiguration("data_source_folder", val);
      }).appendTo($config);
    }
    // -------------------------------------------------------------------------
    // Search box
    // -------------------------------------------------------------------------
    createSearchBox() {
      $("<div id='bdaSearch' class='menu'></div>").appendTo(this.$menuBar).html(
        '<p>Search</p><form action="/dyn/admin/atg/dynamo/admin/en/cmpn-search.jhtml"><input type="text" name="query" id="searchFieldBDA" placeholder="focus: ctrl+shift+f"></form>'
      );
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
        `<div> Action : ${actionSelect} <span id='editor'><span id='itemIdField'>ids : <input type='text' id='itemId' placeholder='Id1,Id2,Id3' /></span><span id='itemDescriptorField'> descriptor : <select id='itemDescriptor' class='itemDescriptor'>${this.getDescriptorOptions()}</select></span><span id='idOnlyField' style='display:none;'><label for='idOnly'>&nbsp;id only : </label><input type='checkbox' id='idOnly' /></span></span><button type='button' id='RQLAdd'>Add</button><button type='button' id='RQLGo'>Add &amp; Enter <i class='fa fa-play fa-x'></i></button></div>`
      ).insertBefore("#RQLEditor textarea").after("<div id='RQLText'></div>");
      $("#xmltext").appendTo("#RQLText");
      $("#RQLText").after(
        "<div id='tabs'><ul id='navbar'><li id='propertiesTab' class='selected'>Properties</li><li id='queriesTab'>Stored Queries</li></ul><div id='storedQueries'><i>No stored query for this repository</i></div><div id='descProperties'><i>Select a descriptor to see his properties</i></div></div>"
      );
      $("#RQLForm input[type=submit]").remove();
      const splitObj = this.getStoredSplitObj();
      const itemByTab = (splitObj == null ? void 0 : splitObj.splitValue) ?? "10";
      const isChecked = (splitObj == null ? void 0 : splitObj.activeSplit) ?? false;
      const checkboxSplit = `<input type='checkbox' id='noSplit' ${isChecked ? "checked" : ""} /> don't split.`;
      $("#tabs").after(
        `<div id='RQLSave'><div style='display:inline-block;width:200px'><button id='clearQuery' type='button'>Clear <i class='fa fa-ban fa-x'></i></button></div><div style='display:inline-block;width:530px'>Split tab every : <input type='text' value='${itemByTab}' id='splitValue'> items. ${checkboxSplit}</div><button type='submit' id='RQLSubmit'>Enter <i class='fa fa-play fa-x'></i></button></div><div><input placeholder='Name this query' type='text' id='queryLabel'>&nbsp;<button type='button' id='saveQuery'>Save <i class='fa fa-save fa-x'></i></button></div>`
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
        $("#queriesTab").addClass("selected");
        $("#propertiesTab").removeClass("selected");
      });
      $("#propertiesTab").on("click", () => {
        $("#descProperties").css("display", "inline-block");
        $("#storedQueries").css("display", "none");
        $("#propertiesTab").addClass("selected");
        $("#queriesTab").removeClass("selected");
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
        html += `<td><a class='btn-desc' href='${componentURI}?action=seetmpl&itemdesc=${d}#showProperties'>Properties</a>`;
        html += `&nbsp;<a class='btn-desc' href='${componentURI}?action=seenamed&itemdesc=${d}#namedQuery'>Named queries</a></td>`;
        html += "<td>";
        if (isDebugEnabled) {
          html += `<a class='btn-desc red' href='${componentURI}?action=clriddbg&itemdesc=${d}#listItemDescriptors'>Disable</a>`;
        } else {
          html += `<a class='btn-desc' href='${componentURI}?action=setiddbg&itemdesc=${d}#listItemDescriptors'>Enable</a>`;
          html += `&nbsp;<a class='btn-desc' href='${componentURI}?action=dbgprops&itemdesc=${d}#debugProperties'>Edit</a>`;
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
        if (curProp.rdonly === "true") html += "<div class='prop_attr prop_attr_red'>R</div>";
        if (curProp.derived === "true") html += "<div class='prop_attr prop_attr_green'>D</div>";
        if (curProp.exportable === "true") html += "<div class='prop_attr prop_attr_blue'>E</div>";
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
        "<div class='prop_attr prop_attr_red'>R</div> : read-only <div class='prop_attr prop_attr_green'>D</div> : derived <div class='prop_attr prop_attr_blue'>E</div> : export is false"
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
        "<div id='itemTreeForm'>id : <input type='text' id='itemTreeId' /> &nbsp;descriptor : <span id='itemTreeDescriptorField'><select id='itemTreeDesc' class='itemDescriptor'>" + this.getDescriptorOptions() + `</select></span>max items : <input type='text' id='itemTreeMax' value='50' />&nbsp;<br><br>output format : <select id='itemTreeOutput'><option value='HTMLtab'>HTML tab</option><option value='addItem'>add-item XML</option><option value='removeItem'>remove-item XML</option><option value='printItem'>print-item XML</option><option value='tree'>Tree (experimental)</option></select>&nbsp;<input type='checkbox' id='printRepositoryAttr' /><label for='printRepositoryAttr'>Print attribute : </label><pre style='margin:0; display:inline;'>repository='${getCurrentComponentPath()}'</pre> <br><br><button id='itemTreeBtn'>Enter <i class='fa fa-play fa-x'></i></button></div>`
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
        $("#itemTreeInfo").append("<input type='button' id='itemTreeCopyButton' value='Copy result to clipboard' />");
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
            `<span class="cacheArrow"><i class="up fa fa-arrow-right"></i></span><span> item-descriptor=<b>${itemDesc}</b></span><span> cache-mode=<b>${cacheMode}</b></span>` + (cacheLocality ? `<span> cache-locality=<b>${cacheLocality}</b></span>` : "")
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
      $h2.append(
        "<div class='popup_block' id='pipelinePopup'><div><a href='javascript:void(0)' class='close'><i class='fa fa-times'></i></a></div><div><h3></h3></div><button id='schemeOrientation'>Switch orientation <i class='fa fa-retweet'></i></button><div id='pipelineScheme'></div></div>"
      );
      $("#pipelinePopup .close").on("click", () => {
        $("#pipelinePopup").fadeOut();
      });
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
      $("#pipelinePopup h3").text(chainName);
      $("#pipelinePopup").show();
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
      const $copyBtn = $('<button class="bda-button bda-button-clipboard"><i class="fa fa-files-o"></i></button>').on("click", () => {
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
      const $callBtn = $('<button class="bda-button btn btn-primary">Call Chain</button>').on("click", () => {
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
      this.HIST_PERSIST_SIZE = 20;
      this.MODAL_HTML = `
    <div id="dashModal" class="twbs modal fade" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal">&times;</button>
            <h4 class="modal-title">DASH - DynAdmin SHell</h4>
          </div>
          <div class="modal-body">
            <div id="dashScreen" class="bda-dash-screen"></div>
            <div class="bda-dash-input-row">
              <span class="bda-dash-prompt">$</span>
              <input type="text" id="dashInput" class="bda-dash-input" placeholder="Type a command..." autocomplete="off">
              <button class="bda-button btn btn-primary btn-sm" id="dashSubmit">Run</button>
            </div>
            <div id="dashScripts" class="bda-dash-scripts" style="display:none">
              <div id="dashScriptList"></div>
              <input type="text" id="dashScriptName" placeholder="Script name">
              <button class="bda-button btn btn-sm btn-default" id="dashSaveScript">Save</button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-default" data-dismiss="modal">Close</button>
            <button class="btn btn-default" id="dashToggleScripts"><i class="fa fa-file-text-o"></i> Scripts</button>
            <button class="btn btn-default" id="dashClear"><i class="fa fa-trash-o"></i> Clear</button>
          </div>
        </div>
      </div>
    </div>`;
      this.historyIndex = -1;
      this.bda = bda;
    }
    init() {
      logTrace("BdaDash init");
      this.loadHistory();
      this.createModal();
      this.createLaunchButton();
    }
    // -------------------------------------------------------------------------
    // Modal setup
    // -------------------------------------------------------------------------
    createModal() {
      $("body").append(this.MODAL_HTML);
      this.bindModalEvents();
    }
    createLaunchButton() {
      const $btn = $(
        '<div id="dashLaunch" class="bda-dash-launch"><a href="javascript:void(0)" title="Open DASH"><i class="fa fa-terminal"></i> DASH</a></div>'
      );
      $btn.on("click", () => {
        $("#dashModal").modal("show");
      });
      $("body").append($btn);
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
      $(document).on("keydown", (e) => {
        if (e.ctrlKey && e.altKey && e.key === "t") {
          $("#dashModal").modal("show");
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
        `<div class="bda-dash-line"><span class="bda-dash-prompt">$</span><span class="bda-dash-line-input">${this.escapeHtml(text)}</span><button class="bda-button bda-dash-copy btn btn-xs" title="Copy"><i class="fa fa-files-o"></i></button></div>`
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
        const $runBtn = $('<button class="bda-button btn btn-xs btn-primary">Run</button>');
        const $delBtn = $('<button class="bda-button btn btn-xs btn-danger">Delete</button>');
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
  const bdaCss = 'body {\r\n  padding-left: 15px;\r\n}\r\n\r\ntr.even td {\r\n  background-color: #FFF;\r\n}\r\n\r\n#itemTreeId {\r\n  width: 100px;\r\n}\r\n\r\n#itemTreeMax {\r\n  width: 40px;\r\n}\r\n\r\na {\r\n  text-decoration: none\r\n}\r\n\r\n.fa-pencil-square-o {\r\n  cursor: pointer;\r\n}\r\n\r\n#RQLToolbar {\r\n  margin-bottom: 12px;\r\n  padding: 10px 14px;\r\n  background: #f8f9fa;\r\n  border: 1px solid #e0e0e0;\r\n  border-radius: 6px;\r\n  display: flex;\r\n  align-items: center;\r\n  gap: 8px;\r\n  flex-wrap: wrap;\r\n  width: fit-content;\r\n}\r\n\r\n.select2-container .select2-choices .select2-search-field input,\r\n.select2-container .select2-choice,\r\n.select2-container .select2-choices {\r\n  font-family: "Arial";\r\n  font-size: 13px;\r\n  color: black;\r\n}\r\n\r\n.select2-chosen,\r\n.select2-choice > span:first-child,\r\n.select2-container .select2-choices .select2-search-field input {\r\n  padding: 4px 6px;\r\n}\r\n\r\n#select2-drop {\r\n  font-size: 13px;\r\n}\r\n\r\n.select2-container .select2-choice {\r\n  height: 24px;\r\n}\r\n\r\n.select2-container .select2-choice .select2-arrow b,\r\n.select2-container .select2-choice div b {\r\n  background-position: 0 0;\r\n}\r\n\r\n.select2-results {\r\n  max-height: 220px;\r\n}\r\n\r\n#RQLAdd,\r\n#RQLGo {\r\n  padding: 5px 14px;\r\n  border: 1px solid #ced4da;\r\n  border-radius: 4px;\r\n  background: #fff;\r\n  color: #495057;\r\n  font-size: 13px;\r\n  cursor: pointer;\r\n  transition: all 0.15s;\r\n}\r\n\r\n#RQLAdd:hover,\r\n#RQLGo:hover {\r\n  background: #e9ecef;\r\n  border-color: #adb5bd;\r\n}\r\n\r\n#RQLGo {\r\n  background: #0d6efd;\r\n  color: #fff;\r\n  border-color: #0d6efd;\r\n}\r\n\r\n#RQLGo:hover {\r\n  background: #0b5ed7;\r\n  border-color: #0a58ca;\r\n  color: #fff;\r\n}\r\n\r\n#RQLAdd {\r\n  margin-left: 10px;\r\n}\r\n\r\n#RQLResults {\r\n  margin-top: 10px;\r\n}\r\n\r\n#RQLLog {\r\n  overflow-x: hidden;\r\n  max-height: 100px;\r\n  padding: 8px 12px;\r\n  border: 1px solid #dee2e6;\r\n  border-radius: 6px;\r\n  width: 800px;\r\n  white-space: pre-wrap;\r\n  font-family: monospace;\r\n  font-size: 12px;\r\n  background: #f8f9fa;\r\n  color: #495057;\r\n}\r\n\r\n#rawXml {\r\n  display: none;\r\n  margin: 0px;\r\n  padding: 0px;\r\n}\r\n\r\n.dataTable {\r\n  font-size: 13px;\r\n  margin: 5px;\r\n  border: 1px solid #dee2e6;\r\n  border-radius: 6px;\r\n  z-index: 10;\r\n  position: relative;\r\n  background-color: #FFF;\r\n  border-collapse: separate;\r\n  border-spacing: 0;\r\n  overflow: hidden;\r\n}\r\n\r\n.prop_name {\r\n  font-size: 80%;\r\n}\r\n\r\n.prop_attr {\r\n  display: inline-block;\r\n  margin: 2px;\r\n  padding: 1px;\r\n  color: white;\r\n  vertical-align: middle;\r\n}\r\n\r\n.prop_attr_red {\r\n  background-color: red;\r\n}\r\n\r\n.prop_attr_blue {\r\n  background-color: blue;\r\n}\r\n\r\n.prop_attr_green {\r\n  background-color: green;\r\n}\r\n\r\n.copyLink {\r\n  text-decoration: none;\r\n  color: #00214a;\r\n}\r\n\r\n.copyField {\r\n  width: 200px;\r\n  display: none;\r\n}\r\n\r\n.dataTable td,\r\n.dataTable th {\r\n  padding: 6px 10px;\r\n}\r\n\r\n.dataTable th {\r\n  min-width: 160px;\r\n  text-align: left;\r\n  background: #f1f3f5;\r\n  font-weight: 600;\r\n  font-size: 12px;\r\n  color: #495057;\r\n  border-bottom: 2px solid #dee2e6;\r\n}\r\n\r\n#itemId {\r\n  width: 125px;\r\n  height: 28px;\r\n  padding: 4px 8px;\r\n  border: 1px solid #ced4da;\r\n  border-radius: 4px;\r\n  font-size: 13px;\r\n}\r\n\r\n#splitValue {\r\n  padding: 4px 8px;\r\n  border: 1px solid #ced4da;\r\n  border-radius: 4px;\r\n  font-size: 13px;\r\n}\r\n\r\n.descriptor {\r\n  margin: 5px 10px 5px 5px;\r\n}\r\n\r\n.descriptorTable {\r\n  float: left;\r\n  margin-right: 10px;\r\n  margin-bottom: 10px;\r\n  border: 1px solid #dee2e6;\r\n  border-radius: 6px;\r\n  white-space: nowrap;\r\n  overflow: hidden;\r\n  font-size: 13px;\r\n}\r\n\r\n.descriptorTable th {\r\n  background: #f1f3f5;\r\n  color: #495057;\r\n  font-weight: 600;\r\n  font-size: 12px;\r\n  text-transform: uppercase;\r\n  letter-spacing: 0.3px;\r\n  padding: 8px 10px;\r\n}\r\n\r\n.descriptorTable td {\r\n  padding: 5px 8px;\r\n}\r\n\r\n#RQLText .CodeMirror {\r\n  border: 1px solid #ced4da;\r\n  border-radius: 6px;\r\n  height: 355px;\r\n  width: 800px;\r\n  cursor: text;\r\n  font-size: 13px;\r\n}\r\n\r\n#RQLText {\r\n  display: inline-block;\r\n  vertical-align: top;\r\n}\r\n\r\n.xmlDefinition .CodeMirror {\r\n  border: 1px solid #eee;\r\n  height: auto;\r\n}\r\n\r\n.xmlDefinition .CodeMirror-scroll {\r\n  overflow-y: hidden;\r\n  overflow-x: auto;\r\n}\r\n\r\n.btn-desc {\r\n  display: inline-block;\r\n  background-color: #fff;\r\n  color: #495057;\r\n  border: 1px solid #ced4da;\r\n  padding: 3px 8px;\r\n  font-size: 12px;\r\n  border-radius: 4px;\r\n  transition: all 0.15s;\r\n  text-decoration: none;\r\n}\r\n\r\n.btn-desc:hover {\r\n  background-color: #e9ecef;\r\n  color: #212529;\r\n  border-color: #adb5bd;\r\n  text-decoration: none;\r\n}\r\n\r\n.btn-toolbar {\r\n  display: inline-block;\r\n  background-color: #fff;\r\n  color: #495057;\r\n  border: 1px solid #ced4da;\r\n  padding: 6px 12px;\r\n  font-size: 13px;\r\n  margin-right: 12px;\r\n  border-radius: 4px;\r\n  cursor: pointer;\r\n  transition: all 0.15s;\r\n}\r\n\r\n#repoToolbar {\r\n  margin-bottom: 20px;\r\n}\r\n\r\n.btn-toolbar:hover {\r\n  background-color: #e9ecef;\r\n  color: #212529;\r\n  border-color: #adb5bd;\r\n}\r\n\r\n.red {\r\n  color: #880000;\r\n}\r\n\r\n.showMore {\r\n  font-size: 80%;\r\n}\r\n\r\n.storedQueriesTitle {\r\n  font-size: 13px;\r\n  font-weight: bold;\r\n}\r\n\r\n#tabs {\r\n  display: inline-block;\r\n  vertical-align: top;\r\n  margin-left: 5px;\r\n  max-width: calc(100% - 820px);\r\n}\r\n\r\n#tabs i {\r\n  font-size: 80%;\r\n}\r\n\r\n#navbar {\r\n  list-style-type: none;\r\n  margin: 0;\r\n  overflow: hidden;\r\n  padding: 0;\r\n  display: flex;\r\n  gap: 2px;\r\n}\r\n\r\n#navbar li {\r\n  float: left;\r\n  background-color: #f0f0f0;\r\n  color: #555;\r\n  padding: 6px 16px;\r\n  font-size: 13px;\r\n  font-weight: 500;\r\n  cursor: pointer;\r\n  border: 1px solid #ddd;\r\n  border-bottom: none;\r\n  border-radius: 6px 6px 0 0;\r\n  transition: background-color 0.15s, color 0.15s;\r\n}\r\n\r\n#navbar li:hover {\r\n  background-color: #e8e8e8;\r\n  color: #333;\r\n}\r\n\r\n#navbar li.selected {\r\n  background-color: #fff;\r\n  color: #111;\r\n  border-bottom: 1px solid #fff;\r\n  margin-bottom: -1px;\r\n}\r\n\r\n#descProperties {\r\n  display: none;\r\n  border: 1px solid #ddd;\r\n  border-radius: 0 6px 6px 6px;\r\n  max-height: 320px;\r\n  overflow: auto;\r\n  background: #fff;\r\n  box-shadow: 0 1px 3px rgba(0,0,0,0.06);\r\n}\r\n\r\n#descProperties tbody tr:nth-child(odd) {\r\n  background-color: #f8f9fa;\r\n}\r\n\r\n#descProperties tbody tr:hover {\r\n  background-color: #e9f0f8;\r\n}\r\n\r\n#descProperties table {\r\n  font-size: 13px;\r\n  border: none;\r\n  border-collapse: collapse;\r\n  width: 100%;\r\n}\r\n\r\n#descProperties th {\r\n  background: #f1f3f5;\r\n  color: #495057;\r\n  font-weight: 600;\r\n  font-size: 12px;\r\n  text-transform: uppercase;\r\n  letter-spacing: 0.3px;\r\n  padding: 8px 10px;\r\n  border-bottom: 2px solid #dee2e6;\r\n  position: sticky;\r\n  top: 0;\r\n  z-index: 1;\r\n}\r\n\r\n#descProperties td {\r\n  padding: 6px 10px;\r\n  border-bottom: 1px solid #eee;\r\n  vertical-align: middle;\r\n}\r\n\r\n.propQueryBtn {\r\n  color: #212529;\r\n  text-decoration: none;\r\n  cursor: pointer;\r\n  border-bottom: 1px dashed #adb5bd;\r\n}\r\n\r\n.propQueryBtn:hover {\r\n  color: #0d6efd;\r\n  border-bottom-color: #0d6efd;\r\n}\r\n\r\n.bda-enum-toggle {\r\n  cursor: pointer;\r\n  color: #0d6efd;\r\n  font-weight: 500;\r\n}\r\n\r\n.bda-enum-toggle:hover {\r\n  color: #0a58ca;\r\n}\r\n\r\n.bda-enum-values {\r\n  display: none;\r\n  margin-top: 4px;\r\n  max-width: 160px;\r\n}\r\n\r\n.bda-enum-value {\r\n  display: inline-block;\r\n  padding: 1px 6px;\r\n  margin: 1px 2px;\r\n  border-radius: 10px;\r\n  font-size: 10px;\r\n  background: #e9ecef;\r\n  color: #495057;\r\n}\r\n\r\n.showQueriesLabel {\r\n  font-size: 80%;\r\n  margin: 0px;\r\n  padding: 5px 0px 0px 0px;\r\n}\r\n\r\n#storedQueries {\r\n  display: inline-block;\r\n  vertical-align: top;\r\n  border: 1px solid #ddd;\r\n  border-radius: 0 6px 6px 6px;\r\n  min-width: 350px;\r\n  max-height: 320px;\r\n  background: #fff;\r\n  box-shadow: 0 1px 3px rgba(0,0,0,0.06);\r\n  padding: 8px;\r\n  overflow: auto;\r\n}\r\n\r\n.error {\r\n  color: red;\r\n}\r\n\r\n#RQLSave {\r\n  margin: 5px;\r\n}\r\n\r\n.queryView {\r\n  display: none;\r\n}\r\n\r\n.previewQuery {\r\n  margin-top: 5px;\r\n  margin-left: 10px;\r\n  cursor: pointer;\r\n}\r\n\r\n.deleteQuery {\r\n  margin-top: 5px;\r\n  margin-left: 10px;\r\n  cursor: pointer;\r\n}\r\n\r\n.menuArrow {\r\n  text-align: center;\r\n  cursor: pointer;\r\n  padding-top: 5px;\r\n}\r\n\r\n.menuArrow img {\r\n  width: 15px;\r\n  height: 8px;\r\n}\r\n\r\n/** MENU **/\r\n#menuBar {\r\n  position: absolute;\r\n  top: 0px;\r\n  right: 30px;\r\n}\r\n\r\n.menu {\r\n  height: 32px;\r\n  font-size: 11px;\r\n  color: white;\r\n  border: 1px solid #00486c;\r\n  background-color: #007bb8;\r\n  border-top: none;\r\n  padding: 3px;\r\n  text-align: center;\r\n  float: right;\r\n  margin-top: 0px;\r\n  margin-right: 3px;\r\n}\r\n\r\n.menu p {\r\n  margin: 0;\r\n}\r\n\r\n.menuPanel {\r\n  position: absolute;\r\n  top: 39px;\r\n  right: 33px;\r\n  width: 296px;\r\n  font-size: 11px;\r\n  color: white;\r\n  border: 1px solid #00486c;\r\n  border-top: none;\r\n  padding: 3px;\r\n  display: none;\r\n}\r\n\r\n.menuPanel a {\r\n  text-decoration: underline;\r\n  color: white;\r\n}\r\n\r\n.menuPanel textarea {\r\n  width: 100%;\r\n}\r\n\r\n#bdaBug {\r\n  background-color: #007bb8;\r\n}\r\n\r\n#bdaBugPanel {\r\n  background-color: #007bb8;\r\n}\r\n\r\n#bdaBackup {\r\n  background-color: #007bb8;\r\n}\r\n\r\n#bdaBackupPanel {\r\n  background-color: #007bb8;\r\n}\r\n\r\n#bdaSearch {\r\n  background-color: #007bb8;\r\n}\r\n\r\n#bdaSearch input {\r\n  margin-top: 1px;\r\n  height: 20px;\r\n}\r\n\r\n#whatsnew {\r\n  background-color: #62A03E;\r\n  border-color: #44702B;\r\n}\r\n\r\n#whatsnewPanel {\r\n  border-color: #44702B;\r\n  background-color: #62A03E;\r\n}\r\n\r\n#bdaConfig {\r\n  background-color: #007bb8;\r\n}\r\n\r\n#bdaConfigPanel {\r\n  background-color: #007bb8;\r\n}\r\n\r\n#history {\r\n  clear: both;\r\n}\r\n\r\n#toolbar {\r\n  padding: 5px;\r\n}\r\n\r\n.toolbar-elem {\r\n  float: left;\r\n}\r\n\r\n.newFav {\r\n  font-size: 30px;\r\n  border: 1px dashed #AAAAAA;\r\n  height: 54px;\r\n  width: 50px;\r\n  text-align: center;\r\n  margin: 4px;\r\n  line-height: 48px;\r\n  cursor: pointer;\r\n}\r\n\r\n.favFilter {\r\n  border: 1px dashed #AAAAAA;\r\n  height: 54px;\r\n  width: 50px;\r\n  margin: 4px;\r\n  cursor: pointer;\r\n  text-align: center;\r\n  font-size: 20px;\r\n  margin: 4px;\r\n  line-height: 48px;\r\n}\r\n\r\n#favFilter {\r\n  margin-top: 15px;\r\n}\r\n\r\n.fav-chevron {\r\n  line-height: 48px;\r\n}\r\n\r\n#favTagList {\r\n  clear: left;\r\n  margin-left: 5px;\r\n  margin-top: 3px;\r\n}\r\n\r\n#addComponent {\r\n  color: #AAAAAA;\r\n  text-decoration: none;\r\n}\r\n\r\n#favSetTags {\r\n  margin-bottom: 5px;\r\n}\r\n\r\n.bda-button {\r\n  color: white;\r\n  border: 1px solid #ccc;\r\n  border-radius: 3px;\r\n  font-size: 12px;\r\n  padding: 0px 6px 0px 0px;\r\n  cursor: pointer;\r\n}\r\n\r\n.bda-button label,\r\n.bda-button input,\r\n.bda-button button {\r\n  vertical-align: middle;\r\n}\r\n\r\n.bda-button-icon {\r\n  height: 22px;\r\n  width: 22px;\r\n  padding: 0px 0px 0px 0px;\r\n  vertical-align: middle;\r\n}\r\n\r\n.bda-button-clipboard {\r\n  margin-left: 10px;\r\n  padding: 3px;\r\n  color: black;\r\n  vertical-align: middle;\r\n  border-radius: 5px;\r\n}\r\n\r\n.tag-filter-button {\r\n  color: black;\r\n}\r\n\r\n.tag-filter {\r\n  cursor: pointer;\r\n}\r\n\r\n.tag-filter label {\r\n  margin-left: 5px;\r\n  cursor: pointer;\r\n}\r\n\r\n.favline {\r\n  margin-bottom: 5px;\r\n  display: block;\r\n}\r\n\r\n.favline ul {\r\n  margin: 0;\r\n  padding: 0;\r\n  list-style-type: none;\r\n  width: 100%;\r\n  overflow-x: auto;\r\n  white-space: nowrap;\r\n}\r\n\r\n.favline div {\r\n  display: inline-block;\r\n}\r\n\r\n.favline li {\r\n  display: inline-block;\r\n  list-style: none; /* pour enlever les puces sur IE7 */\r\n  margin: 2px;\r\n}\r\n\r\n.newtags {\r\n  width: 85%;\r\n}\r\n\r\n.fav {\r\n  min-height: 50px;\r\n  min-width: 75px;\r\n  margin: 4px;\r\n  padding: 2px;\r\n  color: white;\r\n}\r\n\r\n.fav a {\r\n  color: white;\r\n}\r\n\r\n.favLink {\r\n  text-align: center;\r\n  line-height: 16px;\r\n}\r\n\r\n.favLink a,\r\n.logdebug {\r\n  color: white;\r\n  text-decoration: none;\r\n}\r\n\r\n.favName {\r\n  display: inline-block;\r\n  vertical-align: bottom;\r\n  font-size: 11px;\r\n}\r\n\r\n.favArrow {\r\n  text-align: center;\r\n  cursor: pointer;\r\n  padding-top: 2px;\r\n  font-size: 11px;\r\n}\r\n\r\n.favArrow img {\r\n  width: 15px;\r\n  height: 8px;\r\n}\r\n\r\n.favTitle {\r\n  font-size: 14px;\r\n  font-weight: bold;\r\n  margin-bottom: 5px;\r\n  text-align: center;\r\n}\r\n\r\n.favMoreInfo {\r\n  font-size: 11px;\r\n  display: none;\r\n  padding: 0;\r\n  text-align: left;\r\n}\r\n\r\n.favDelete {\r\n  cursor: pointer;\r\n}\r\n\r\n.fav-button {\r\n  cursor: pointer;\r\n  margin-right: 5px;\r\n}\r\n\r\n.favLogDebug form {\r\n  margin: 0;\r\n}\r\n\r\n.favLogDebug {\r\n  margin-bottom: 2px;\r\n  margin-top: 2px;\r\n}\r\n\r\n.del-cross {\r\n  font-weight: bold;\r\n  font-size: 13px;\r\n}\r\n\r\n#oracleATGbrand {\r\n  width: 120px;\r\n  cursor: pointer;\r\n}\r\n\r\n#xmlHighlight {\r\n  margin-bottom: 0px;\r\n}\r\n\r\n#rawXml pre {\r\n  margin: 0;\r\n}\r\n\r\n#sqltext {\r\n  display: block;\r\n}\r\n\r\n#curDataSourceName {\r\n  font-weight: bold;\r\n}\r\n\r\n#sqlResult {\r\n  border-collapse: collapse;\r\n  width: 100%;\r\n  border: 1px solid #ccc;\r\n}\r\n\r\n#sqlResult td,\r\n#sqlResult th {\r\n  text-align: center;\r\n  border-right: 1px solid #ccc;\r\n  background: none;\r\n}\r\n\r\n#sqlResult tbody tr:nth-child(odd) {\r\n  background-color: #F0F0F6;\r\n}\r\n\r\n/* Extra selectors needed to override the default styling */\r\ntable.tablesorter tbody tr.normal-row td {\r\n  background: #fff;\r\n  color: #3d3d3d;\r\n}\r\n\r\ntable.tablesorter tbody tr.alt-row td {\r\n  background: #EAF2FA;\r\n  color: #3d3d3d;\r\n}\r\n\r\ntable.tablesorter tr.normal-row:hover td,\r\ntable.tablesorter tr.alt-row:hover td {\r\n  background-color: #eee;\r\n}\r\n\r\n.clickable:hover {\r\n  color: #d14;\r\n  text-decoration: underline;\r\n}\r\n\r\n.popup_block {\r\n  background: #fff none repeat scroll 0 0;\r\n  border: 5px solid #ddd;\r\n  box-shadow: 0 0 5px #000;\r\n  display: none;\r\n  font-size: 0.9em;\r\n  padding: 10px;\r\n  position: fixed;\r\n  left: 50%;\r\n  transform: translate(-50%, 0);\r\n  z-index: 1;\r\n  height: 400px;\r\n  width: 700px;\r\n  top: 30px;\r\n}\r\n\r\n#pipelinePopup {\r\n  height: 600px;\r\n  width: 90%;\r\n  font-size: 14px;\r\n}\r\n\r\n#pipelineTable {\r\n  font-size: 14px;\r\n}\r\n\r\n.popup_title {\r\n  margin-top: 0;\r\n}\r\n\r\n#addComponentToolbarPopupContent {\r\n  height: 58%;\r\n  overflow: auto;\r\n}\r\n\r\n.close,\r\n#submitComponent {\r\n  float: right;\r\n  color: black;\r\n}\r\n\r\n.fav-submit-button {\r\n  float: right;\r\n  color: black;\r\n}\r\n\r\n#methods,\r\n#vars {\r\n  float: left;\r\n  width: 50%;\r\n}\r\n\r\n#methods li,\r\n#vars li {\r\n  list-style-position: inside;\r\n  white-space: nowrap;\r\n  overflow: hidden;\r\n  text-overflow: ellipsis;\r\n}\r\n\r\n#speedbar {\r\n  float: right;\r\n  width: 210px;\r\n  margin-right: 100px;\r\n  margin-top: 100px;\r\n}\r\n\r\n#speedbar #widget {\r\n  width: 240px;\r\n  border: 1px solid #999;\r\n  font-size: 13px;\r\n  padding: 10px;\r\n}\r\n\r\n#widget i {\r\n  font-size: 11px;\r\n}\r\n\r\n#widget ul {\r\n  list-style-type: none;\r\n  padding-inline-start: 0px;\r\n  margin-block-end: 0;\r\n  margin-block-start: 0;\r\n}\r\n\r\n#widget p {\r\n  margin-top: 0;\r\n}\r\n\r\n#widget li {\r\n  margin-top: 5px;\r\n}\r\n\r\n.link {\r\n  cursor: pointer;\r\n}\r\n\r\n#pipelineTable pre {\r\n  margin: 0;\r\n}\r\n\r\n.clickable_property {\r\n  text-decoration: underline;\r\n  cursor: pointer;\r\n}\r\n\r\n/* DASH */\r\n.modal-dialog.modal-lg {\r\n  width: 60%;\r\n}\r\n\r\n.fullscreen .modal-dialog.modal-lg {\r\n  width: 95%;\r\n}\r\n\r\n#dashModal .modal-content {\r\n}\r\n\r\n#dashModal .modal-footer .tab-pane {\r\n  text-align: left;\r\n}\r\n\r\n#dashInput {\r\n  font-family: monospace;\r\n}\r\n\r\n#dashForm {\r\n  font-family: monospace;\r\n}\r\n\r\n#dashForm .tt-hint {\r\n  color: #ccc;\r\n}\r\n\r\n#dashForm .form-group {\r\n  margin-bottom: 0;\r\n}\r\n\r\n#dashEditorForm {\r\n  font-size: 14px;\r\n}\r\n\r\n#dashEditor {\r\n  resize: none; /* min-height: 100px; */\r\n}\r\n\r\n#dashScreen {\r\n  font-family: monospace;\r\n  overflow-y: auto;\r\n  max-height: 250px;\r\n  height: 250px;\r\n  margin-bottom: 15px;\r\n}\r\n\r\n.fullscreen #dashScreen {\r\n  margin-bottom: 0;\r\n  height: 100%;\r\n  max-height: 100%;\r\n}\r\n\r\n#dashScreen .alert {\r\n  padding-top: 5px;\r\n  padding-bottom: 5px;\r\n  margin-bottom: 5px;\r\n}\r\n\r\n#dashScreen pre {\r\n  background-color: inherit;\r\n  font-family: inherit;\r\n  border: 0;\r\n  color: inherit;\r\n}\r\n\r\n#dashScreen .dl-horizontal dt {\r\n  width: 80px;\r\n}\r\n\r\n#dashScreen .dl-horizontal dd {\r\n  margin-left: 90px;\r\n}\r\n\r\n.typeahead.dropdown-menu {\r\n  text-align: left;\r\n}\r\n\r\n#dashModal textarea.form-control {\r\n  height: inherit;\r\n}\r\n\r\n#dashModal panel {\r\n  background-color: white;\r\n}\r\n\r\ntable.table {\r\n  background-color: white;\r\n}\r\n\r\n/* Override dyn/admin style */\r\n.table th {\r\n  background-color: inherit;\r\n  border-style: inherit;\r\n}\r\n\r\n#dashModal .alert .btn-group {\r\n  float: right;\r\n  opacity: 0.8;\r\n}\r\n\r\n#dashModal .alert button.btn {\r\n  cursor: pointer;\r\n  opacity: 0.8;\r\n}\r\n\r\n#dashModal .alert button.btn:hover,\r\n#dashModal .alert button.btn:focus {\r\n  opacity: 1;\r\n}\r\n\r\n.printItem {\r\n  margin-top: 15px;\r\n}\r\n\r\n#dashModal .modal-footer  .panel {\r\n  margin-bottom: 0;\r\n}\r\n\r\n#dashSaveForm {\r\n  margin-bottom: 0;\r\n}\r\n\r\n.no-padding {\r\n  padding: 0 !important;\r\n}\r\n\r\n#bdaDashMenuElem .menuArrow {\r\n  padding-top: 2px;\r\n}\r\n\r\nkbd {\r\n  padding: 2px 4px;\r\n  font-size: 90%;\r\n  color: #fff;\r\n  background-color: #333;\r\n  border-radius: 3px;\r\n  -webkit-box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .25);\r\n  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .25);\r\n}\r\n\r\n#dashModal .modal-footer {\r\n  margin-top: 0;\r\n  border-top: 0;\r\n  padding: 5px 20px 5px;\r\n}\r\n\r\n#dashModal .modal-body {\r\n  padding-bottom: 0;\r\n}\r\n\r\n/* recopy bootstrap without wrapper*/\r\n.modal-backdrop.fade {\r\n  opacity: 0;\r\n  filter: alpha(opacity=0);\r\n}\r\n\r\n.fade.in {\r\n  opacity: 1;\r\n}\r\n\r\n.modal-backdrop.in {\r\n  opacity: .5;\r\n  filter: alpha(opacity=50);\r\n}\r\n\r\n.modal-backdrop {\r\n  position: fixed;\r\n  top: 0;\r\n  right: 0;\r\n  bottom: 0;\r\n  left: 0;\r\n  z-index: 1030;\r\n  background-color: #000;\r\n}\r\n\r\n.fade {\r\n  opacity: 0;\r\n  -webkit-transition: opacity .15s linear;\r\n  transition: opacity .15s linear;\r\n}\r\n\r\n#dashTips {\r\n  margin-top: 10px;\r\n  margin-bottom: 5px;\r\n}\r\n\r\n.footer-right {\r\n  cursor: pointer;\r\n}\r\n\r\n.footer-right a {\r\n  border: 1px solid transparent;\r\n}\r\n\r\n/** CACHE STATS **/\r\ntable.cache {\r\n  border-spacing: 0;\r\n  border-collapse: collapse;\r\n}\r\n\r\n.cache tr.cache-subheader {\r\n  cursor: pointer;\r\n}\r\n\r\n.cache td,\r\n.cache th {\r\n  padding: 6px;\r\n}\r\n\r\n.cache td,\r\n.cache th {\r\n  border: 1px solid #ddd;\r\n}\r\n\r\nbutton.cache {\r\n  cursor: pointer;\r\n}\r\n\r\n.fixed_headers {\r\n  table-layout: fixed;\r\n  width: 100%;\r\n}\r\n\r\n.fixed_headers thead {\r\n  width: 100%;\r\n}\r\n\r\n.fixed_headers thead th {\r\n  font-size: 12px;\r\n  font-weight: 500;\r\n  padding: 2px;\r\n  overflow: hidden;\r\n}\r\n\r\n.fixed_headers th,\r\n.fixed_headers td {\r\n  width: 4%;\r\n}\r\n\r\n.fixed_headers.oldDynamo th,\r\n.fixed_headers.oldDynamo td {\r\n  width: 5.3%;\r\n}\r\n\r\n/*.fixed_headers .sticky-top thead {\r\n  display: block;\r\n}\r\n.fixed_headers .sticky-top tbody {\r\n  display: block;\r\n\r\n}*/\r\n.sticky-top {\r\n  position: fixed;\r\n  top: 0;\r\n}\r\n\r\n.scroller {\r\n  scroll-snap-type: proximity;\r\n}\r\n\r\n.snap {\r\n  scroll-snap-align: start none;\r\n  scroll-snap-padding: 25px 0 0 0;\r\n}\r\n\r\n/*.old_ie_wrapper {\r\n  overflow-x: hidden;\r\n  overflow-y: auto;\r\n  tbody { height: auto; }\r\n}*/\r\n\r\n/* SCHEDULER */\r\n\r\n#timeline-wrapper {\r\n  margin-bottom: 20px;\r\n}\r\n\r\n.twbs caption {\r\n  padding-top: 8px;\r\n  padding-bottom: 8px;\r\n  color: #777;\r\n  text-align: left;\r\n}\r\n\r\n/* XML DEF */\r\n#xmlDefAsTable {\r\n  margin-top: 15px;\r\n  /* for whatever reason on some pages\r\n  the whole section is inside an <a> tag\r\n  on native dyn/admin : need to reset color*/\r\n  color: black;\r\n}\r\n\r\n.item-descriptor-heading,\r\n.table-def {\r\n  text-transform: capitalize;\r\n  cursor: pointer;\r\n}\r\n\r\n#xmlDefAsTable .item-panel .panel-heading {\r\n  background-color: #dff0d8;\r\n}\r\n\r\n.subtableHeader {\r\n  background-color: #f5f5f5;\r\n  text-transform: capitalize;\r\n  font-weight: 600;\r\n}\r\n\r\n.item-panel .panel-heading {\r\n  padding: 10px;\r\n}\r\n\r\n/* Remove pading top/bot */\r\n.item-panel .panel-body {\r\n  padding: 0 15px;\r\n}\r\n\r\n.item-panel .row > [class^="col-"] {\r\n  padding: 10px;\r\n  border-right: 1px solid #ddd;\r\n}\r\n\r\n.table-def [class^="col-"] {\r\n  text-transform: none;\r\n  background-color: #d9edf7;\r\n}\r\n\r\n.item-panel .highlight {\r\n  background-color: yellow;\r\n}\r\n\r\n.item-panel .property:hover {\r\n  background-color: #f5f5f5;\r\n}\r\n\r\n#quickNavLinks {\r\n  margin-top: 10px;\r\n  max-height: 400px;\r\n  overflow-y: auto;\r\n  overflow-x: hidden;\r\n}\r\n\r\n#xmlDefQuickNav .btn.sorted{\r\n  background-color: #dff0d8;\r\n}\r\n\r\n#xmlDefQuickNav h3.panel-title {\r\n  padding-top: 4px;\r\n}\r\n\r\n#definitionsContainer {\r\n  max-width: inherit;\r\n}\r\n\r\n#quickNavLinks .nav > li > a {\r\n  padding: 5px 15px\r\n}\r\n\r\n#xmlDefSearchBox {\r\n  font-size: 0.9em;\r\n}\r\n\r\nol.itemDescAttributes {\r\n  text-transform: none;\r\n  margin: 0;\r\n  padding: 0;\r\n  font-weight: 500;\r\n}\r\n\r\n.itemDescAttributes > li {\r\n  display: inline-block;\r\n  padding-right: 5px;\r\n}\r\n\r\n.itemDescAttributes > li + li:before {\r\n  content: "/\\00a0";\r\n  padding: 0 5px;\r\n  color: #cccccc;\r\n}\r\n\r\n.attr-value {\r\n  font-weight: 600;\r\n}\r\n\r\n.table-name {\r\n  font-weight: 600;\r\n  text-transform: none;\r\n}\r\n\r\n.property-type,\r\n.enum,\r\n.derivation {\r\n  text-decoration: underline;\r\n}\r\n\r\n.bda-attr {\r\n  display: inline-block;\r\n  padding: 2px 8px;\r\n  margin: 2px 3px;\r\n  border-radius: 10px;\r\n  font-size: 11px;\r\n  font-weight: 500;\r\n  background: #e9ecef;\r\n  color: #6c757d;\r\n}\r\n.bda-attr-true {\r\n  background: #d1e7dd;\r\n  color: #0f5132;\r\n}\r\n\r\n.data-type,\r\n.component-data-type {\r\n  text-transform: capitalize;\r\n}\r\n\r\n.row.subtableHeader .col-lg-05{\r\n  padding-left: 0;\r\n  padding-right: 0;\r\n  font-size: 8px;\r\n  text-align: center;\r\n}\r\n\r\n#xmlDefAsTable .tooltip-inner {\r\n  max-width: inherit;\r\n}\r\n\r\n#xmlDefAsTable  .popover ul {\r\n  padding-left: 10px;\r\n}\r\n\r\n#xmlDefAsTable .popover{\r\n  max-width: inherit;\r\n  width: 600px;\r\n  width: intrinsic;           /* Safari/WebKit uses a non-standard name */\r\n  width: -moz-max-content;    /* Firefox/Gecko */\r\n  width: -webkit-max-content; /* Chrome */\r\n}\r\n\r\n/*\r\n.item-panel [class^="col-"] {\r\n    background-color: rgba(86,61,124,.15);\r\n    border: 1px solid rgba(86,61,124,.2);\r\n}\r\n*/\r\n\r\n/** AUTOCOMPLETE **/\r\n\r\n#searchField {\r\n  width: 300px;\r\n}\r\n\r\n/** extend grid system**/\r\n\r\n/** 0.5 **/\r\n.twbs .col-xs-05,\r\n.twbs .col-sm-05,\r\n.twbs .col-md-05,\r\n.twbs .col-lg-05 {\r\n  width: 4.166666665%;\r\n  position: relative;\r\n  min-height: 1px;\r\n  padding-left: 15px;\r\n  padding-right: 15px;\r\n  float: left;\r\n}\r\n.notifyjs-bootstrap-base {\r\n  font-size: 12px;\r\n}\r\n\r\n.legend {\r\n  display : inline-block;\r\n  color : white;\r\n  border-radius : 5px;\r\n  font-size : 11px;\r\n  padding : 3px;\r\n  margin : 5px;\r\n}\r\n\r\n#treePopup {\r\n  height: 90%;\r\n  width: 95%;\r\n  overflow: hidden;\r\n}\r\n\r\n.flexContainer {\r\n  display:flex;\r\n  height: 100%;\r\n}\r\n\r\n#treeInfo {\r\n  display:none;\r\n  float:left;\r\n}\r\n\r\n#treeContainer  {\r\n  height: 100%;\r\n  flex : 1;\r\n}\r\n';
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
      $("<button></button>", { class: "bda-button bda-button-clipboard", html: "<i class='fa fa-files-o'></i>" }).on("click", () => {
        const path = document.location.pathname.replace("/dyn/admin/nucleus", "");
        GM_setClipboard(path);
      })
    );
    const $classLink = $breadcrumb.next();
    $("<button></button>", { class: "bda-button bda-button-clipboard", html: "<i class='fa fa-files-o'></i>" }).on("click", () => {
      GM_setClipboard($classLink.attr("title") ?? $classLink.text());
    }).insertAfter($classLink);
  }
  function bindEscapeKey() {
    $(document).on("keyup", (e) => {
      if (e.key === "Escape" || e.keyCode === 27) {
        $(".popup_block").fadeOut();
        ["#bdaBackupPanel", "#bdaBugPanel"].forEach((id) => {
          if ($(id).css("display") !== "none") {
            $(id).slideToggle();
          }
        });
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
      $("#search").css("display", "inline");
    }
    bindEscapeKey();
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