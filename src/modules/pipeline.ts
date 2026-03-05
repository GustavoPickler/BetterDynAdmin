/**
 * BDA Pipeline module
 * Replaces bda.pipeline.js
 */

import { logTrace, processRepositoryXmlDef, highlightAndIndentXml } from '../core/common';

interface VisNode {
  id: number;
  label: string;
  name: string;
  pipelineLinkPath: string;
}

export class BdaPipeline {
  private $pipelineDef: JQuery | null = null;
  private network: unknown = null;
  private graphDirection: 'LR' | 'UD' = 'LR';

  private readonly visOptions = {
    width: '100%',
    height: '550px',
    interaction: {
      zoomView: true,
      selectable: true,
      dragNodes: false,
      dragView: true,
      hover: false,
    },
    layout: {
      hierarchical: {
        direction: 'LR' as 'LR' | 'UD',
        sortMethod: 'directed',
        nodeSpacing: 300,
        levelSeparation: 250,
      },
    },
    edges: {
      smooth: { type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.4 },
    },
    nodes: { font: { size: 11 }, shape: 'box' },
    physics: false,
  };

  isApplicable(): boolean {
    return $("h2:contains('Pipeline Chains')").length === 1;
  }

  init(): void {
    if (!this.isApplicable()) return;
    console.time('bdaPipeline');
    logTrace('BdaPipeline init');
    this.setupPipelineManagerPage();
    console.timeEnd('bdaPipeline');
  }

  private setupPipelineManagerPage(): void {
    const $h2 = $("h2:contains('Pipeline Chains')");

    $h2.append(
      "<div class='popup_block' id='pipelinePopup'>" +
      "<div><a href='javascript:void(0)' class='close'><i class='fa fa-times'></i></a></div>" +
      "<div><h3></h3></div>" +
      "<button id='schemeOrientation'>Switch orientation <i class='fa fa-retweet'></i></button>" +
      "<div id='pipelineScheme'></div>" +
      '</div>',
    );

    $('#pipelinePopup .close').on('click', () => { $('#pipelinePopup').fadeOut(); });

    const $pipelineTable = $h2.next().attr('id', 'pipelineTable');
    $pipelineTable.find('tr:nth-child(odd)').addClass('odd');
    $pipelineTable.find('tr:first').append('<th>Show XML</th><th>Show graph</th>');
    $pipelineTable.find('tr:gt(0)').append(
      "<td align='center'><i class='fa fa-code link'></i></td>" +
      "<td align='center'><i class='fa fa-eye link'></i><sup style='font-size:8px'>&nbsp;BETA</sup></td>",
    );

    processRepositoryXmlDef('definitionFile', ($xmlDef) => {
      this.$pipelineDef = $xmlDef;

      $pipelineTable.find('tr').each((_, elem) => {
        const $elem = $(elem);
        const chainName = $elem.find('td:eq(0)').text().trim();
        $elem.attr('id', chainName);

        $elem.find('td:eq(7)').on('click', (e) => {
          const $td = $(e.currentTarget);
          if ($td.hasClass('open')) {
            $td.removeClass('open');
            $(`#xml_${chainName}`).remove();
          } else {
            $td.addClass('open');
            const isOdd = $elem.hasClass('odd');
            this._showPipelineXml(chainName, isOdd);
          }
        });

        $elem.find('td:eq(8)').on('click', () => {
          this.graphDirection = 'LR';
          this.showPipelineGraph(chainName);
        });
      });
    });
  }

  private _showPipelineXml(chainName: string, isOdd: boolean): void {
    if (!this.$pipelineDef) return;
    const trId = `xml_${chainName}`;
    if ($(`#${trId}`).length !== 0) return;

    const xmlEl = this.$pipelineDef.find(`pipelinechain[name=${chainName}]`).get(0);
    if (!xmlEl) return;

    const $codeBlock = $(`<tr id='${trId}'><td colspan='9'><pre></pre></td></tr>`)
      .insertAfter(`#${chainName}`)
      .find('pre')
      .text((xmlEl as Element).outerHTML);

    if (isOdd) $(`#${trId}`).addClass('odd');
    highlightAndIndentXml($codeBlock);
  }

  private showPipelineGraph(chainName: string): void {
    $('#pipelinePopup h3').text(chainName);
    $('#pipelinePopup').show();

    const container = document.getElementById('pipelineScheme');
    if (!container || !window.vis) return;

    const data = this.createNodesAndEdges(chainName);
    this.drawGraph(container, data, chainName);

    $('#schemeOrientation').off('click').on('click', () => {
      (this.network as { destroy(): void } | null)?.destroy();
      this.graphDirection = this.graphDirection === 'LR' ? 'UD' : 'LR';
      this.drawGraph(container, data, chainName);
    });
  }

  private drawGraph(container: HTMLElement, data: { nodes: unknown; edges: unknown }, chainName: string): void {
    if (!window.vis) return;

    const opts = {
      ...this.visOptions,
      layout: {
        hierarchical: {
          ...this.visOptions.layout.hierarchical,
          direction: this.graphDirection,
        },
      },
    };

    this.network = new window.vis.Network(container, data, opts);
    (this.network as { on(event: string, cb: (params: { nodes: number[] }) => void): void }).on(
      'click',
      (params) => {
        const id = params.nodes[0];
        if (id !== undefined) {
          const nodes = (data as { nodes: { get(id: number): VisNode } }).nodes;
          const node = nodes.get(id);
          window.open('/dyn/admin/nucleus/' + node.pipelineLinkPath, '_blank');
        }
      },
    );
  }

  private createNodesAndEdges(chainName: string): { nodes: unknown; edges: unknown } {
    if (!this.$pipelineDef || !window.vis) return { nodes: null, edges: null };

    const $chainDef = this.$pipelineDef.find(`pipelinechain[name=${chainName}]`);
    const nodes = new window.vis.DataSet<VisNode>();
    const edges = new window.vis.DataSet();

    $chainDef.find('pipelinelink').each((index, el) => {
      const pipelineLinkName = $(el).attr('name') ?? '';
      const $processor = $(el).find('processor');
      const pipelineLinkPath = $processor.attr('jndi') ?? $processor.attr('class') ?? '';
      (nodes as { add(item: VisNode): void }).add({
        id: index,
        label: pipelineLinkName,
        name: pipelineLinkName,
        pipelineLinkPath,
      });
    });

    $chainDef.find('pipelinelink').each((index, el) => {
      const pipelineLinkName = $(el).attr('name') ?? '';
      $(el).find('transition').each((_, transition) => {
        const transitionName = $(transition).attr('link') ?? '';
        const fromId = this.findNodeId(nodes as { forEach(cb: (item: VisNode) => void): void }, pipelineLinkName);
        const toId = this.findNodeId(nodes as { forEach(cb: (item: VisNode) => void): void }, transitionName);
        (edges as { add(item: unknown): void }).add({
          from: fromId,
          to: toId,
          arrows: 'to',
          label: $(transition).attr('returnvalue') ?? '',
        });
      });
    });

    return { nodes, edges };
  }

  private findNodeId(nodes: { forEach(cb: (item: VisNode) => void): void }, name: string): number | undefined {
    let id: number | undefined;
    nodes.forEach((node) => {
      if (node.name === name) id = node.id;
    });
    return id;
  }
}
