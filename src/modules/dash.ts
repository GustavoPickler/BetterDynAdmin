/**
 * BDA DASH - DynAdmin SHell module
 * Replaces bda.dash.js
 */

import {
  logTrace,
  isNull,
  getCurrentComponentPath,
  copyToClipboard,
  getComponentNameFromPath,
} from '../core/common';
import { BdaModal } from '../core/modal';
import { bdaStorage } from '../core/storage';
import { bdaKeyboard } from '../core/keyboard';
import { bdaComponent } from '../core/component';
import type { BDAConfig, DashScript } from '../types/global';

// PEG.js parsers (loaded as legacy JS files)
declare const DASH_LINES_SPLITTER: { parse(input: string): string[] };
declare const BDA_DASH_PARSER: {
  parse(input: string): {
    function: string;
    params: Array<{ type: string; name?: string; value?: unknown; path?: string }>;
    output?: { name: string; index?: number; format?: string };
  };
  SyntaxError: new (...args: unknown[]) => Error;
};

interface DashVariable {
  value: unknown;
  path?: string;
}

export class BdaDash {
  private bda: BDAConfig;
  private commandHistory: string[] = [];
  private variables: Record<string, DashVariable> = {};
  private lastOutput: unknown = null;
  private dashModal: BdaModal | null = null;

  private readonly HIST_PERSIST_SIZE = 20;

  constructor(bda: BDAConfig) {
    this.bda = bda;
  }

  init(): void {
    logTrace('BdaDash init');
    this.loadHistory();
    this.createModal();
  }

  // -------------------------------------------------------------------------
  // Modal setup
  // -------------------------------------------------------------------------

  private createModal(): void {
    const $content = $(
      '<div id="dashScreen" class="bda-dash-screen"></div>' +
      '<div class="bda-dash-input-row">' +
      '<span class="bda-dash-prompt">$</span>' +
      '<input type="text" id="dashInput" class="bda-dash-input" placeholder="Type a command..." autocomplete="off">' +
      '<button class="bda-btn bda-btn--primary bda-btn--sm" id="dashSubmit">Run</button>' +
      '</div>' +
      '<div id="dashScripts" class="bda-dash-scripts" style="display:none">' +
      '<div id="dashScriptList"></div>' +
      '<input type="text" id="dashScriptName" placeholder="Script name">' +
      '<button class="bda-btn bda-btn--sm" id="dashSaveScript">Save</button>' +
      '</div>',
    );
    this.dashModal = new BdaModal({
      title: 'DASH — DynAdmin SHell',
      content: $content,
      width: '800px',
      buttons: [
        { label: 'Close', callback: () => this.dashModal!.hide() },
        { id: 'dashToggleScripts', label: '<i class="fa fa-file-text-o"></i> Scripts' },
        { id: 'dashClear', label: '<i class="fa fa-trash-o"></i> Clear' },
      ],
    }).mount();
    this.bindModalEvents();
  }

  private createLaunchButton(): void {
    const $btn = $('<button class="bda-nav__btn" id="dashLaunch" title="Open DASH"><i class="fa fa-terminal"></i> DASH</button>');
    $btn.on('click', () => { this.dashModal?.show(); });
    const $navActions = $('#bdaNavActions');
    if ($navActions.length) {
      $('<div class="bda-nav__item"></div>').append($btn).appendTo($navActions);
    } else {
      $('body').append($btn);
    }
  }

  private bindModalEvents(): void {
    const $input = $('#dashInput');
    const $submit = $('#dashSubmit');

    $submit.on('click', () => this.executeCommand($input.val() as string));

    $input.on('keydown', (e) => {
      if (e.key === 'Enter' || (e.key === 'Enter' && e.ctrlKey)) {
        e.preventDefault();
        this.executeCommand($input.val() as string);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory(-1, $input);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory(1, $input);
      }
      if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        $('#dashScreen').empty();
      }
    });

    $('#dashClear').on('click', () => { $('#dashScreen').empty(); });

    $('#dashToggleScripts').on('click', () => {
      $('#dashScripts').toggle();
      if ($('#dashScripts').is(':visible')) this.renderScripts();
    });

    $('#dashSaveScript').on('click', () => {
      const name = ($('#dashScriptName').val() as string).trim();
      if (!name) return;
      const commands = $('#dashScreen .bda-dash-line-input').map(function () { return $(this).text(); }).get().join('\n');
      bdaStorage.storeScript({ name, content: commands });
      this.renderScripts();
    });

    // Keyboard shortcut registered via central framework
    bdaKeyboard.register({
      key: 't', ctrl: true, alt: true,
      description: 'Open DASH (alternate)', module: 'DASH',
      handler: () => { this.dashModal?.show(); },
    });
  }

  // -------------------------------------------------------------------------
  // Command execution
  // -------------------------------------------------------------------------

  private historyIndex = -1;

  private navigateHistory(direction: number, $input: JQuery): void {
    this.historyIndex = Math.max(-1, Math.min(this.commandHistory.length - 1, this.historyIndex + direction));
    $input.val(this.historyIndex >= 0 ? this.commandHistory[this.historyIndex] : '');
  }

  private async executeCommand(rawInput: string): Promise<void> {
    const input = rawInput.trim();
    if (!input) return;

    $('#dashInput').val('');
    this.appendInputLine(input);
    this.addToHistory(input);
    this.historyIndex = -1;

    try {
      let lines: string[];
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

  private async executeSingleCommand(line: string): Promise<void> {
    let parsed: ReturnType<typeof BDA_DASH_PARSER.parse>;

    try {
      parsed = BDA_DASH_PARSER.parse(line);
    } catch (e) {
      // Not a structured command - treat as raw RQL
      await this.executeRawXml(line);
      return;
    }

    const cmd = parsed.function.toLowerCase();
    const params = parsed.params;

    switch (cmd) {
      case 'get':
      case 'print':
        await this.cmdGetProperty(params);
        break;
      case 'set':
        await this.cmdSetProperty(params);
        break;
      case 'call':
      case 'invoke':
        await this.cmdCallMethod(params);
        break;
      case 'help':
        this.cmdHelp();
        break;
      case 'clear':
        $('#dashScreen').empty();
        break;
      case 'history':
        this.cmdShowHistory();
        break;
      default:
        await this.executeRawXml(line);
    }
  }

  private async cmdGetProperty(params: ReturnType<typeof BDA_DASH_PARSER.parse>['params']): Promise<void> {
    const component = this.resolveComponent(params);
    const propertyParam = params.find((p) => p.type === 'value');
    if (!component || !propertyParam) {
      this.appendErrorLine('Usage: get @component propertyName');
      return;
    }
    try {
      const value = await bdaComponent.getProperty(location.origin, component, String(propertyParam.value));
      this.appendOutputLine(String(value ?? 'null'));
      this.lastOutput = value;
    } catch (e) {
      this.appendErrorLine(String(e));
    }
  }

  private async cmdSetProperty(params: ReturnType<typeof BDA_DASH_PARSER.parse>['params']): Promise<void> {
    const component = this.resolveComponent(params);
    const propParam = params.find((p) => p.name === 'p' || p.name === 'property');
    const valParam = params.find((p) => p.name === 'v' || p.name === 'value');

    if (!component || !propParam || !valParam) {
      this.appendErrorLine('Usage: set @component -p propertyName -v value');
      return;
    }
    try {
      await bdaComponent.setProperty(location.origin, component, String(propParam.value), String(valParam.value));
      this.appendOutputLine('Property set successfully.');
    } catch (e) {
      this.appendErrorLine(String(e));
    }
  }

  private async cmdCallMethod(params: ReturnType<typeof BDA_DASH_PARSER.parse>['params']): Promise<void> {
    const component = this.resolveComponent(params);
    const methodParam = params.find((p) => p.type === 'value');
    if (!component || !methodParam) {
      this.appendErrorLine('Usage: call @component methodName');
      return;
    }
    try {
      const result = await bdaComponent.call(location.origin, component, String(methodParam.value));
      this.appendOutputLine(String(result ?? 'void'));
      this.lastOutput = result;
    } catch (e) {
      this.appendErrorLine(String(e));
    }
  }

  private async executeRawXml(xml: string): Promise<void> {
    const componentPath = getCurrentComponentPath();
    const url = `${location.origin}/dyn/admin/nucleus${componentPath}/`;
    return new Promise((resolve) => {
      jQuery.ajax({
        url,
        type: 'POST',
        data: { xmltext: xml },
        success: (result: string) => {
          const $result = $(result);
          const $pre = $result.find('pre').first();
          if ($pre.length > 0) {
            this.appendOutputLine($pre.text());
          } else {
            const text = $result.find('h2').first().text();
            this.appendOutputLine(text || 'Done.');
          }
          resolve();
        },
        error: (xhr) => {
          this.appendErrorLine(`HTTP ${xhr.status}: ${xhr.statusText}`);
          resolve();
        },
      });
    });
  }

  private cmdHelp(): void {
    this.appendOutputLine(
      'Available commands:\n' +
      '  get @component property       - Get a property value\n' +
      '  set @component -p prop -v val - Set a property value\n' +
      '  call @component method        - Invoke a method\n' +
      '  clear                         - Clear screen\n' +
      '  history                       - Show command history\n' +
      '  help                          - Show this help\n' +
      '\n  @this refers to the current component\n' +
      '  @# refers to the last output value',
    );
  }

  private cmdShowHistory(): void {
    this.appendOutputLine(this.commandHistory.slice(0, 20).join('\n'));
  }

  // -------------------------------------------------------------------------
  // Component resolution
  // -------------------------------------------------------------------------

  private resolveComponent(params: ReturnType<typeof BDA_DASH_PARSER.parse>['params']): string | null {
    const compParam = params.find((p) => p.type === 'component');
    if (!compParam) return getCurrentComponentPath();

    const name = String(compParam.name ?? '');
    if (name === 'this') return getCurrentComponentPath();
    if (name === '#') return String(this.lastOutput ?? '');

    const stored = bdaStorage.getStoredComponents();
    const match = stored.find((c) => getComponentNameFromPath(c.path).toLowerCase().includes(name.toLowerCase()));
    return match?.path ?? '/' + name;
  }

  // -------------------------------------------------------------------------
  // Screen output
  // -------------------------------------------------------------------------

  private appendInputLine(text: string): void {
    $('#dashScreen').append(
      `<div class="bda-dash-line"><span class="bda-dash-prompt">$</span><span class="bda-dash-line-input">${this.escapeHtml(text)}</span><button class="bda-btn bda-btn--sm bda-dash-copy" title="Copy"><i class="fa fa-files-o"></i></button></div>`,
    );
    this.bindCopyButtons();
    this.scrollToBottom();
  }

  private appendOutputLine(text: string): void {
    this.lastOutput = text;
    $('#dashScreen').append(
      `<div class="bda-dash-line bda-dash-output"><pre>${this.escapeHtml(text)}</pre></div>`,
    );
    this.scrollToBottom();
  }

  private appendErrorLine(text: string): void {
    $('#dashScreen').append(
      `<div class="bda-dash-line bda-dash-error"><span class="text-danger">${this.escapeHtml(text)}</span></div>`,
    );
    this.scrollToBottom();
  }

  private bindCopyButtons(): void {
    $('#dashScreen .bda-dash-copy').off('click').on('click', function () {
      const text = $(this).siblings('.bda-dash-line-input').text();
      copyToClipboard(text);
    });
  }

  private scrollToBottom(): void {
    const el = document.getElementById('dashScreen');
    if (el) el.scrollTop = el.scrollHeight;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // -------------------------------------------------------------------------
  // History persistence
  // -------------------------------------------------------------------------

  private addToHistory(command: string): void {
    this.commandHistory = [command, ...this.commandHistory.filter((c) => c !== command)].slice(
      0,
      this.HIST_PERSIST_SIZE,
    );
    bdaStorage.storeItem('DashHistory', this.commandHistory);
  }

  private loadHistory(): void {
    this.commandHistory = (bdaStorage as unknown as { getItem<T>(k: string): T | null })['getItem']?.('DashHistory') ?? [];
    if (!Array.isArray(this.commandHistory)) this.commandHistory = [];
  }

  // -------------------------------------------------------------------------
  // Scripts
  // -------------------------------------------------------------------------

  private renderScripts(): void {
    const $list = $('#dashScriptList').empty();
    const scripts = bdaStorage.getScripts();
    if (scripts.length === 0) {
      $list.html('<p>No saved scripts.</p>');
      return;
    }
    scripts.forEach((s) => {
      const $row = $(`<div class="bda-dash-script-row"><strong>${s.name}</strong></div>`);
      const $runBtn = $('<button class="bda-btn bda-btn--sm bda-btn--primary">Run</button>');
      const $delBtn = $('<button class="bda-btn bda-btn--sm bda-btn--danger">Delete</button>');
      $runBtn.on('click', async () => {
        for (const line of s.content.split('\n')) {
          if (line.trim()) await this.executeCommand(line.trim());
        }
      });
      $delBtn.on('click', () => {
        bdaStorage.deleteScript(s.name);
        this.renderScripts();
      });
      $row.append(' ', $runBtn, ' ', $delBtn);
      $list.append($row);
    });
  }
}
