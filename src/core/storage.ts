/**
 * BDA Storage module
 * Replaces bda.storage.js - typed class-based storage management
 */

import {
  unique,
  getComponentNameFromPath,
  logTrace,
} from './common';
import type {
  StoredComponent,
  RQLQuery,
  DashScript,
  BdaConfiguration,
  BdaStorageData,
  ToggleState,
} from '../types/global';

const STORED_CONFIG = 'BdaConfiguration';
const STORED_COMPONENTS = 'BdaComponents';
const STORED_QUERIES = 'BdaRQLQueries';
const STORED_SCRIPTS = 'BdaDashScripts';
const STORED_TOGGLE = 'BdaToggleState';
const STORED_HISTORY = 'BdaComponentHistory';
const GM_VALUE_BACKUP = 'BDA_GM_Backup';

export class BdaStorage {
  // -------------------------------------------------------------------------
  // Configuration
  // -------------------------------------------------------------------------

  getConfigurationValue(name: string): unknown {
    const config = this.getStoredConfiguration();
    return config?.[name] ?? null;
  }

  getStoredConfiguration(): BdaConfiguration | null {
    const raw = localStorage.getItem(STORED_CONFIG);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BdaConfiguration;
    } catch {
      return null;
    }
  }

  storeConfiguration(name: string, value: unknown): void {
    const config = this.getStoredConfiguration() ?? {};
    config[name] = value;
    this.storeItem(STORED_CONFIG, config);
  }

  // -------------------------------------------------------------------------
  // Generic storage with mono-instance support
  // -------------------------------------------------------------------------

  storeItem(itemName: string, itemValue: unknown): void {
    const json = JSON.stringify(itemValue);
    localStorage.setItem(itemName, json);
    const monoInstance = this.getConfigurationValue('mono_instance');
    if (monoInstance === true) {
      GM_setValue(GM_VALUE_BACKUP + '_' + itemName, json);
    }
  }

  private getItem<T>(itemName: string): T | null {
    let raw = localStorage.getItem(itemName);
    if (!raw) {
      const monoInstance = this.getConfigurationValue('mono_instance');
      if (monoInstance === true) {
        const backup = GM_getValue(GM_VALUE_BACKUP + '_' + itemName) as string | null;
        if (backup) {
          localStorage.setItem(itemName, backup);
          raw = backup;
        }
      }
    }
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Array helpers
  // -------------------------------------------------------------------------

  getStoredArray(name: string): string[] {
    return this.getItem<string[]>(name) ?? [];
  }

  storeUniqueArray(name: string, array: string[], doConcat: boolean): void {
    let existing = this.getStoredArray(name);
    if (doConcat) existing = existing.concat(array);
    else existing = array;
    this.storeItem(name, unique(existing));
  }

  // -------------------------------------------------------------------------
  // Components (favorites)
  // -------------------------------------------------------------------------

  getStoredComponents(): StoredComponent[] {
    return this.getItem<StoredComponent[]>(STORED_COMPONENTS) ?? [];
  }

  storeComponent(component: StoredComponent): void {
    const components = this.getStoredComponents();
    const idx = components.findIndex((c) => c.path === component.path);
    if (idx >= 0) components[idx] = component;
    else components.push(component);
    this.storeItem(STORED_COMPONENTS, components);
  }

  deleteComponent(path: string): void {
    const components = this.getStoredComponents().filter((c) => c.path !== path);
    this.storeItem(STORED_COMPONENTS, components);
  }

  // -------------------------------------------------------------------------
  // Component history
  // -------------------------------------------------------------------------

  getComponentHistory(): string[] {
    return this.getItem<string[]>(STORED_HISTORY) ?? [];
  }

  addToHistory(path: string): void {
    const history = this.getComponentHistory().filter((p) => p !== path);
    history.unshift(path);
    this.storeItem(STORED_HISTORY, history.slice(0, 50));
  }

  // -------------------------------------------------------------------------
  // Tags
  // -------------------------------------------------------------------------

  getTags(): string[] {
    const config = this.getStoredConfiguration();
    return (config?.['tags'] as string[] | undefined) ?? [];
  }

  saveTags(tags: string[]): void {
    this.storeConfiguration('tags', tags);
  }

  // -------------------------------------------------------------------------
  // RQL Queries
  // -------------------------------------------------------------------------

  getStoredRQLQueries(): RQLQuery[] {
    return this.getItem<RQLQuery[]>(STORED_QUERIES) ?? [];
  }

  getQueryByName(name: string): RQLQuery | undefined {
    return this.getStoredRQLQueries().find((q) => q.name === name);
  }

  storeQuery(query: RQLQuery): void {
    const queries = this.getStoredRQLQueries();
    const idx = queries.findIndex((q) => q.name === query.name);
    if (idx >= 0) queries[idx] = query;
    else queries.push(query);
    this.storeItem(STORED_QUERIES, queries);
  }

  deleteQuery(name: string): void {
    const queries = this.getStoredRQLQueries().filter((q) => q.name !== name);
    this.storeItem(STORED_QUERIES, queries);
  }

  // -------------------------------------------------------------------------
  // DASH Scripts
  // -------------------------------------------------------------------------

  getScripts(): DashScript[] {
    return this.getItem<DashScript[]>(STORED_SCRIPTS) ?? [];
  }

  storeScript(script: DashScript): void {
    const scripts = this.getScripts();
    const idx = scripts.findIndex((s) => s.name === script.name);
    if (idx >= 0) scripts[idx] = script;
    else scripts.push(script);
    this.storeItem(STORED_SCRIPTS, scripts);
  }

  deleteScript(name: string): void {
    const scripts = this.getScripts().filter((s) => s.name !== name);
    this.storeItem(STORED_SCRIPTS, scripts);
  }

  // -------------------------------------------------------------------------
  // Toggle state
  // -------------------------------------------------------------------------

  getToggleObj(): ToggleState {
    return this.getItem<ToggleState>(STORED_TOGGLE) ?? {};
  }

  storeToggleState(key: string, value: boolean): void {
    const toggleObj = this.getToggleObj();
    toggleObj[key] = value;
    this.storeItem(STORED_TOGGLE, toggleObj);
  }

  // -------------------------------------------------------------------------
  // Backup / Restore
  // -------------------------------------------------------------------------

  getData(): BdaStorageData {
    return {
      components: this.getStoredComponents(),
      queries: this.getStoredRQLQueries(),
      config: this.getStoredConfiguration() ?? {},
      scripts: this.getScripts(),
    };
  }

  restoreData(data: BdaStorageData, reloadUI: boolean): void {
    logTrace('Restoring BDA data');
    if (data.components) this.storeItem(STORED_COMPONENTS, data.components);
    if (data.queries) this.storeItem(STORED_QUERIES, data.queries);
    if (data.config) this.storeItem(STORED_CONFIG, data.config);
    if (data.scripts) this.storeItem(STORED_SCRIPTS, data.scripts);
    if (reloadUI) location.reload();
  }

  // -------------------------------------------------------------------------
  // Utility: component name from stored path
  // -------------------------------------------------------------------------

  getComponentLabel(path: string): string {
    return getComponentNameFromPath(path);
  }
}

// Singleton instance
export const bdaStorage = new BdaStorage();
