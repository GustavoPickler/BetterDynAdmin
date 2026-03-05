/**
 * BDA Modal — unified modal/popup system
 * Pure TypeScript, no Bootstrap dependency.
 * Supports: Escape to close, backdrop click, show/hide/destroy.
 */

export interface BdaModalButton {
  label: string;
  id?: string;
  primary?: boolean;
  danger?: boolean;
  callback?: () => void;
}

export interface BdaModalOptions {
  title?: string;
  content: string | HTMLElement | JQuery;
  buttons?: BdaModalButton[];
  width?: string;
  closeOnBackdrop?: boolean;  // default: true
  onClose?: () => void;
}

export class BdaModal {
  private $overlay: JQuery;
  private $modal: JQuery;
  private $body: JQuery;
  private $titleEl: JQuery;
  private opts: BdaModalOptions;
  private mounted = false;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(opts: BdaModalOptions) {
    this.opts = opts;

    this.$overlay = $('<div class="bda-overlay" role="dialog" aria-modal="true"></div>');
    this.$modal  = $('<div class="bda-modal"></div>');

    // --- Header ---
    const $header = $('<div class="bda-modal__header"></div>');
    this.$titleEl = $('<h4 class="bda-modal__title"></h4>');
    if (opts.title !== undefined) this.$titleEl.text(opts.title);
    const $closeBtn = $(
      '<button class="bda-modal__close bda-btn bda-btn--icon" aria-label="Close">' +
      '<i class="fa fa-times"></i></button>',
    );
    $closeBtn.on('click', () => this.hide());
    $header.append(this.$titleEl, $closeBtn);

    // --- Body ---
    this.$body = $('<div class="bda-modal__body"></div>');
    this.setContent(opts.content);

    this.$modal.append($header, this.$body);

    // --- Footer ---
    if (opts.buttons && opts.buttons.length > 0) {
      const $footer = $('<div class="bda-modal__footer"></div>');
      opts.buttons.forEach((btn) => {
        const modifiers = btn.primary ? ' bda-btn--primary' : btn.danger ? ' bda-btn--danger' : '';
        const $btn = $(`<button class="bda-btn${modifiers}">${btn.label}</button>`);
        if (btn.id) $btn.attr('id', btn.id);
        if (btn.callback) $btn.on('click', () => btn.callback!());
        $footer.append($btn);
      });
      this.$modal.append($footer);
    }

    if (opts.width) this.$modal.css({ width: opts.width, maxWidth: opts.width });

    this.$overlay.append(this.$modal);

    // Backdrop click
    if (opts.closeOnBackdrop !== false) {
      this.$overlay.on('click', (e: JQuery.ClickEvent) => {
        if (e.target === this.$overlay[0]) this.hide();
      });
    }
  }

  /** The .bda-modal element — use to access inner content before first show */
  get $el(): JQuery { return this.$modal; }

  setContent(content: string | HTMLElement | JQuery): void {
    this.$body.empty();
    if (typeof content === 'string') {
      this.$body.html(content);
    } else {
      this.$body.append(content as JQuery);
    }
  }

  setTitle(title: string): void {
    this.$titleEl.text(title);
  }

  /**
   * Append to <body> immediately (hidden) so event bindings on inner IDs
   * work before the first `.show()` call.
   */
  mount(): this {
    if (!$.contains(document.body, this.$overlay[0])) {
      this.mounted = true;
      this.$overlay.addClass('bda-overlay--hidden');
      $('body').append(this.$overlay);
    }
    return this;
  }

  show(): this {
    if (!$.contains(document.body, this.$overlay[0])) {
      $('body').append(this.$overlay);
    }
    this.$overlay.removeClass('bda-overlay--hidden');
    // Micro-task so CSS transition triggers after display change
    requestAnimationFrame(() => {
      this.$overlay.addClass('bda-overlay--visible');
    });
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.hide();
    };
    document.addEventListener('keydown', this.keydownHandler);
    return this;
  }

  hide(): void {
    this.$overlay.removeClass('bda-overlay--visible');
    setTimeout(() => {
      if (this.mounted) {
        this.$overlay.addClass('bda-overlay--hidden');
      } else {
        this.$overlay.detach();  // preserves content and jQuery events for re-show
      }
      if (this.keydownHandler) {
        document.removeEventListener('keydown', this.keydownHandler);
        this.keydownHandler = null;
      }
      this.opts.onClose?.();
    }, 200);
  }

  destroy(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    this.$overlay.remove();
  }
}
