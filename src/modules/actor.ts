/**
 * BDA Actor Chain module
 * Replaces bda.actor.js
 */

import { getCurrentComponentPath, copyToClipboard, logTrace } from '../core/common';

export class BdaActor {
  isApplicable(): boolean {
    return $("h2:contains('Actor Chain:')").length > 0;
  }

  init(): void {
    if (!this.isApplicable()) return;
    logTrace('BdaActor init');
    this.createActorCaller();
  }

  private createActorCaller(): void {
    const componentPath = getCurrentComponentPath();
    const chainId = new URLSearchParams(location.search).get('chainId') ?? '';

    const $h2 = $("h2:contains('Actor Chain:')");
    if ($h2.length === 0) return;

    // Find the inputs table
    const $inputsTable = $("h3:contains('Inputs')").next('table');
    const $outputsTable = $("h3:contains('Outputs')").next('table');

    const inputs: Array<{ name: string; type: string }> = [];
    $inputsTable.find('tr').each(function () {
      const $cells = $(this).find('td');
      if ($cells.length >= 2) {
        inputs.push({
          name: $cells.eq(0).text().trim(),
          type: $cells.eq(1).text().trim(),
        });
      }
    });

    const restEndpoint = `/rest/model${componentPath}`;
    const $callerDiv = $('<div class="bda-actor-caller bda-card"></div>');
    const $titleBar = $('<div class="bda-section-header"><h3 class="bda-section-header__title"><i class="fa fa-link"></i> Call: ' + chainId + '</h3></div>');
    const $endpointRow = $('<div class="bda-actor-endpoint"></div>');
    const $endpointLabel = $('<span>REST endpoint: </span>');
    const $endpointLink = $('<code></code>').text(restEndpoint);
    const $copyBtn = $('<button class="bda-btn bda-btn--icon"><i class="fa fa-files-o"></i></button>').on('click', () => {
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

    const $callBtn = $('<button class="bda-btn bda-btn--primary"><i class="fa fa-play"></i> Call Chain</button>').on('click', () => {
      const params: Record<string, string> = {};
      $callerDiv.find('input[data-name]').each(function () {
        params[$(this).data('name') as string] = $(this).val() as string;
      });
      logTrace('Calling actor chain', params);
      // POST to the REST endpoint
      jQuery.ajax({
        url: restEndpoint,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(params),
        success: (result) => {
          $resultPre.text(JSON.stringify(result, null, 2));
        },
        error: (xhr) => {
          $resultPre.text(`Error: ${xhr.status} ${xhr.statusText}`);
        },
      });
    });

    const $resultPre = $('<pre class="bda-actor-result"></pre>');
    $callerDiv.append($callBtn, $resultPre);

    // Insert after the outputs table or after the h2
    if ($outputsTable.length > 0) $outputsTable.after($callerDiv);
    else $h2.after($callerDiv);
  }
}
