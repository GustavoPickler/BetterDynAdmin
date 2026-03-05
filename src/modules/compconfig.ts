/**
 * BDA Component Configuration module
 * Replaces bda.compconfig.js
 */

import { logTrace } from '../core/common';

export class BdaCompConfig {
  isServiceConfigurationPage(): boolean {
    return location.search.indexOf('propertyName=serviceConfiguration') !== -1;
  }

  isPropertyPage(): boolean {
    return $('form[method=POST] input[name=propertyName]').length > 0;
  }

  isApplicable(): boolean {
    return this.isServiceConfigurationPage() || this.isPropertyPage();
  }

  init(): void {
    if (!this.isApplicable()) return;
    logTrace('BdaCompConfig init');

    if (this.isServiceConfigurationPage()) {
      this.setupServiceConfigurationPage();
    }
    if (this.isPropertyPage()) {
      this.setupPropertyPage();
    }
  }

  private setupPropertyPage(): void {
    logTrace('setupPropertyPage');
    const $form = $('form[method=POST]');
    const $textarea = $form.find('textarea').first();
    if ($textarea.length === 0) return;

    $form.on('submit', (e) => {
      e.preventDefault();
      const propertyName = $form.find('input[name=propertyName]').val() as string;
      const propertyValue = $textarea.val() as string;

      jQuery.ajax({
        url: $form.attr('action') ?? location.href,
        type: 'POST',
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
        data: { propertyName, propertyValue },
        success: () => {
          logTrace('Property saved successfully');
          location.reload();
        },
        error: (xhr) => {
          logTrace('Property save error:', xhr.status);
        },
      });
    });
  }

  private setupServiceConfigurationPage(): void {
    logTrace('setupServiceConfigurationPage');
    if (!window.hljs) return;

    // Register .properties highlight language
    window.hljs.registerLanguage('properties', () => {
      return {
        case_insensitive: true,
        contains: [
          {
            className: 'comment',
            begin: /#/,
            end: /$/,
          },
          {
            className: 'attr',
            begin: /^[^\s=]+/,
            end: /=/,
            excludeEnd: true,
          },
          {
            className: 'string',
            begin: /=/,
            end: /$/,
            excludeBegin: true,
          },
        ],
      };
    });

    $('pre').each(function () {
      $(this).addClass('properties');
      if (window.hljs) {
        window.hljs.highlightElement(this);
      }
    });
  }
}
