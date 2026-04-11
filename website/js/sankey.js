/**
 * sankey.js — Platform Flow Sankey Diagram (D3.js + d3-sankey)
 *
 * Lecture references:
 * - L8 Maps: Sankey diagram as "multivariate representation of movement";
 *   properties: spatial position, line width, color hue.
 * - L5.1 Interactions: Brushing ("selecting a subset of data items with an input device")
 *   and Linking ("showing how subset of data items behaves in other views").
 * - L7.1 Designing Viz: Nested model level 3 — choosing visual encoding/interaction idiom;
 *   task abstraction for "Compare: multiple targets" when comparing platform flows.
 */

function renderSankey() {
    const container = document.getElementById('sankey-viz');
    container.innerHTML = '';

    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = Math.max(380, container.clientHeight - margin.top - margin.bottom);

    const svg = d3.select('#sankey-viz')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Platform colors
    const platformColors = {
        'TikTok': '#ee1d52',
        'Twitter': '#1da1f2',
        'Reddit': '#ff4500',
        'YouTube': '#ff0000',
        'Instagram': '#c13584',
        'Twitch': '#9146ff',
        'Discord': '#5865f2'
    };

    d3.json('data/platform_flow.json').then(rawData => {
        const flows = rawData.overall;

        // Build nodes and links for d3-sankey
        const originPlatforms = [...new Set(flows.map(d => d.origin_platform))].sort();
        const usagePlatforms = [...new Set(flows.map(d => d.usage_platform))].sort();

        // Prefix to avoid name collisions between origin and usage
        const nodes = [
            ...originPlatforms.map(p => ({ name: 'origin_' + p, displayName: p, side: 'origin' })),
            ...usagePlatforms.map(p => ({ name: 'usage_' + p, displayName: p, side: 'usage' }))
        ];

        const nodeIndex = new Map(nodes.map((n, i) => [n.name, i]));

        const links = flows.map(d => ({
            source: nodeIndex.get('origin_' + d.origin_platform),
            target: nodeIndex.get('usage_' + d.usage_platform),
            value: d.count,
            originPlatform: d.origin_platform,
            usagePlatform: d.usage_platform
        }));

        // Create Sankey layout (L8: spatial position, line width as properties)
        const sankey = d3.sankey()
            .nodeId(d => d.index)
            .nodeWidth(20)
            .nodePadding(15)
            .nodeAlign(d3.sankeyJustify)
            .extent([[0, 0], [width, height]]);

        const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
            nodes: nodes.map(d => ({ ...d })),
            links: links.map(d => ({ ...d }))
        });

        // Draw links (L8: line width represents flow magnitude)
        svg.append('g')
            .selectAll('.sankey-link')
            .data(sankeyLinks)
            .enter()
            .append('path')
            .attr('class', 'sankey-link')
            .attr('d', d3.sankeyLinkHorizontal())
            .attr('stroke', d => platformColors[d.originPlatform] || '#666')
            .attr('stroke-width', d => Math.max(1, d.width))
            .on('mouseover', function (event, d) {
                d3.select(this).style('stroke-opacity', 0.6);
                tooltip
                    .style('display', 'block')
                    .style('opacity', 1)
                    .html(`
                        <strong>${d.originPlatform}</strong> &rarr; <strong>${d.usagePlatform}</strong><br>
                        ${d.value.toLocaleString()} records
                    `)
                    .style('left', (event.pageX + 12) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mousemove', function (event) {
                tooltip
                    .style('left', (event.pageX + 12) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this).style('stroke-opacity', 0.3);
                tooltip.style('opacity', 0).style('display', 'none');
            });

        // Draw nodes (L6.2: hue as identity channel for categorical platform data)
        const node = svg.append('g')
            .selectAll('.sankey-node')
            .data(sankeyNodes)
            .enter()
            .append('g')
            .attr('class', 'sankey-node');

        node.append('rect')
            .attr('x', d => d.x0)
            .attr('y', d => d.y0)
            .attr('height', d => Math.max(1, d.y1 - d.y0))
            .attr('width', d => d.x1 - d.x0)
            .attr('fill', d => platformColors[d.displayName] || '#666')
            .attr('rx', 3)
            .attr('opacity', 0.9);

        // Node labels
        node.append('text')
            .attr('x', d => d.side === 'origin' ? d.x0 - 8 : d.x1 + 8)
            .attr('y', d => (d.y0 + d.y1) / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', d => d.side === 'origin' ? 'end' : 'start')
            .text(d => d.displayName)
            .style('font-size', '13px')
            .style('font-weight', '500')
            .style('fill', '#f0f0f5');

        // Side labels
        svg.append('text')
            .attr('x', 0)
            .attr('y', -8)
            .style('font-size', '11px')
            .style('fill', 'var(--text-secondary)')
            .style('font-weight', '600')
            .text('Origin Platform');

        svg.append('text')
            .attr('x', width)
            .attr('y', -8)
            .attr('text-anchor', 'end')
            .style('font-size', '11px')
            .style('fill', 'var(--text-secondary)')
            .style('font-weight', '600')
            .text('Usage Platform');
    });
}
