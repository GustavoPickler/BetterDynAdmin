/**
 * BDA Keyboard Shortcuts Framework
 * Singleton registry for all keyboard shortcuts across modules.
 */

export interface Shortcut {
  key: string;           // e.g. 'k', 'd', '?'
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  module: string;
  handler: () => void;
}

class KeyboardShortcuts {
  private shortcuts: Shortcut[] = [];
  private helpVisible = false;

  register(shortcut: Shortcut): void {
    this.shortcuts.push(shortcut);
  }

  unregister(module: string): void {
    this.shortcuts = this.shortcuts.filter((s) => s.module !== module);
  }

  getAll(): Shortcut[] {
    return [...this.shortcuts];
  }

  init(): void {
    $(document).on('keydown.bdaKeyboard', (e) => {
      const target = e.target as HTMLElement;
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
                      (target as HTMLElement & { isContentEditable?: boolean }).isContentEditable === true;

      for (const s of this.shortcuts) {
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
        const ctrlMatch = (!!s.ctrl) === e.ctrlKey;
        const altMatch  = (!!s.alt)  === e.altKey;
        const shiftMatch = (!!s.shift) === e.shiftKey;

        if (!keyMatch || !ctrlMatch || !altMatch || !shiftMatch) continue;

        // Skip modifier-free shortcuts when user is typing
        if (inInput && !s.ctrl && !s.alt && !s.shift) continue;

        e.preventDefault();
        s.handler();
        return;
      }
    });
  }

  showHelp(): void {
    if (this.helpVisible) {
      this.hideHelp();
      return;
    }

    this.helpVisible = true;

    // Group shortcuts by module
    const byModule: Record<string, Shortcut[]> = {};
    for (const s of this.shortcuts) {
      if (!byModule[s.module]) byModule[s.module] = [];
      byModule[s.module].push(s);
    }

    const formatKey = (s: Shortcut): string => {
      const parts: string[] = [];
      if (s.ctrl)  parts.push('Ctrl');
      if (s.alt)   parts.push('Alt');
      if (s.shift) parts.push('Shift');
      parts.push(s.key === '?' ? '?' : s.key.toUpperCase());
      return parts.join('+');
    };

    let rows = '';
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
    $('body').append($overlay);

    $overlay.on('click', (e) => {
      if (e.target === $overlay[0]) this.hideHelp();
    });
    $('#bda-help-close').on('click', () => this.hideHelp());

    // Animate in
    requestAnimationFrame(() => { $overlay.addClass('bda-help-overlay--visible'); });
  }

  hideHelp(): void {
    this.helpVisible = false;
    const $overlay = $('#bda-help-overlay');
    $overlay.removeClass('bda-help-overlay--visible');
    setTimeout(() => $overlay.remove(), 200);
  }
}

export const bdaKeyboard = new KeyboardShortcuts();
