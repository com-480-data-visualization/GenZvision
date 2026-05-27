/**
 * regional.js — Interactive Regional Slang Adoption Map (D3.js + TopoJSON)
 *
 * Lecture references:
 * - L5.2 Interactive D3: d3.geoAlbersUsa projection + d3.geoPath for geographic rendering,
 *   d3.scaleQuantize for binning continuous data into discrete color buckets.
 * - L6.1 Perception & Color: Sequential colormap (yellow→brown) for proportional encoding of
 *   usage magnitude; perceptually uniform lightness progression from low to high.
 * - L6.2 Marks & Channels: Area mark (choropleth region) with luminance as the primary
 *   channel; position encodes geography; tooltip reveals secondary attributes on demand.
 * - L8 Maps: Choropleth shading proportional to an attribute; AlbersUsa projection
 *   preserves area for continental US + insets for AK/HI; raw totals used here
 *   (normalize by population density for a more analytically rigorous view).
 */

function renderRegionalMap() {
    const container = document.getElementById('regional-map-viz');
    container.innerHTML = '';

    // Remove old detail panel if present from a previous render (no longer used — info is in the hover tooltip)
    const oldPanel = document.getElementById('regions-detail-panel');
    if (oldPanel) oldPanel.remove();

    const margin = { top: 20, right: 40, bottom: 40, left: 80 };
    const totalWidth  = container.getBoundingClientRect().width || 800;
    const totalHeight = 520;
    const width  = totalWidth  - margin.left - margin.right;
    const height = totalHeight - margin.top  - margin.bottom;

    const svg = d3.select('#regional-map-viz')
        .append('svg')
        .attr('width',  totalWidth)
        .attr('height', totalHeight)
        .style('width',  '100%')
        .style('height', totalHeight + 'px')
        .attr('role', 'img')
        .attr('aria-label', 'Choropleth map of US slang adoption by state')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    let colorScale, lookup, maxUsage;

    // ── Projection ──────────────────────────────────────────────────────────
    const projection = d3.geoAlbersUsa()
        .scale(width * 1.2)
        .translate([width / 2, height / 2]);

    const pathGen = d3.geoPath(projection);

    // ── Tooltip ─────────────────────────────────────────────────────────────
    const tooltip = d3.select('body')
        .selectAll('.regional-map-tooltip')
        .data([null])
        .join('div')
        .attr('class', 'regional-map-tooltip')
        .style('position', 'fixed')
        .style('display', 'none')
        .style('pointer-events', 'none')
        .style('background', 'rgba(26,26,36,0.95)')
        .style('border', '1px solid rgba(124,58,237,0.3)')
        .style('border-radius', '8px')
        .style('padding', '8px 12px')
        .style('font-size', '13px')
        .style('color', '#f0f0f5')
        .style('backdrop-filter', 'blur(8px)')
        .style('box-shadow', '0 4px 20px rgba(0,0,0,0.4)')
        .style('z-index', '999');

    // ── Load data then topology ───────────────────────────────────────────────
    d3.json('data/regional_data.json').then(regionalData => {
        const usStates = regionalData.filter(d => d.top_platform !== undefined &&
            !['Australia','Brazil','Canada','Germany','India','Mexico',
              'Nigeria','Philippines','South Africa','UK'].includes(d.region));

        lookup   = new Map(usStates.map(d => [d.region, d]));
        maxUsage = d3.max(usStates, d => d.total_usage);

        colorScale = d3.scaleSequential()
            .domain([0, maxUsage])
            .interpolator(d3.interpolateYlOrBr);

        return d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
    }).then(us => {
        const features = topojson.feature(us, us.objects.states).features;
        let selectedState = null;

        // ── State fills ───────────────────────────────────────────────────────
        svg.selectAll('.state')
            .data(features)
            .enter()
            .append('path')
            .attr('class', 'state')
            .attr('d', pathGen)
            .attr('stroke', 'rgba(255,255,255,0.15)')
            .attr('stroke-width', 0.7)
            .attr('fill', d => {
                const record = lookup.get(d.properties.name);
                return record ? colorScale(record.total_usage) : 'rgba(200,200,200,0.08)';
            })
            .style('cursor', d => lookup.has(d.properties.name) ? 'pointer' : 'default')
            .on('mouseover', function (event, d) {
                const record = lookup.get(d.properties.name);
                if (!record) return;
                d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1.8);

                // Build a rich tooltip with sentiment breakdown + top terms
                const s = record.sentiment || {};
                const pctPos = s.pct_positive != null ? s.pct_positive.toFixed(0) : '—';
                const pctNeu = s.pct_neutral  != null ? s.pct_neutral.toFixed(0)  : '—';
                const pctNeg = s.pct_negative != null ? s.pct_negative.toFixed(0) : '—';
                const top5 = (record.top_terms || []).slice(0, 5).map(t => {
                    const sentColor = t.avg_sentiment > 0.15 ? '#2ecc71'
                                    : t.avg_sentiment < -0.15 ? '#e74c3c'
                                    : '#f1c40f';
                    return `<div style="display:flex;justify-content:space-between;gap:10px;font-size:11px;line-height:1.6;">
                        <span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${sentColor};margin-right:5px;vertical-align:middle"></span>${t.slang_term}</span>
                        <span style="color:rgba(255,255,255,0.5);font-variant-numeric:tabular-nums">${t.count.toLocaleString()}</span>
                    </div>`;
                }).join('');

                tooltip
                    .style('display', 'block').style('opacity', 1)
                    .style('max-width', '260px')
                    .html(`
                        <div style="margin-bottom:6px">
                            <strong style="color:#a78bfa;font-size:14px">${d.properties.name}</strong>
                            <span style="color:rgba(255,255,255,0.45);font-size:10px;margin-left:6px">${record.total_usage.toLocaleString()} uses · ${record.unique_terms} terms</span>
                        </div>
                        <div style="font-size:10.5px;color:rgba(255,255,255,0.55);margin-bottom:6px">
                            Top platform: <strong style="color:#fff">${record.top_platform}</strong> &nbsp;·&nbsp; Avg sentiment: <strong style="color:#fff">${record.avg_sentiment.toFixed(2)}</strong>
                        </div>
                        <div style="font-size:9.5px;color:rgba(255,255,255,0.4);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:3px">Sentiment breakdown</div>
                        <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:rgba(255,255,255,0.06);margin-bottom:3px">
                            <div style="background:#2ecc71;width:${pctPos}%" title="Positive ${pctPos}%"></div>
                            <div style="background:#f1c40f;width:${pctNeu}%" title="Neutral ${pctNeu}%"></div>
                            <div style="background:#e74c3c;width:${pctNeg}%" title="Negative ${pctNeg}%"></div>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:8px">
                            <span style="color:#2ecc71">+ ${pctPos}%</span>
                            <span style="color:#f1c40f">~ ${pctNeu}%</span>
                            <span style="color:#e74c3c">− ${pctNeg}%</span>
                        </div>
                        <div style="font-size:9.5px;color:rgba(255,255,255,0.4);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:3px">Top terms</div>
                        ${top5}
                    `)
                    .style('left', (event.clientX + 14) + 'px')
                    .style('top',  (event.clientY  - 10) + 'px');
            })
            .on('mousemove', function (event) {
                // Keep tooltip near cursor but inside viewport
                const tipNode = tooltip.node();
                const tipW = tipNode ? tipNode.offsetWidth : 280;
                const tipH = tipNode ? tipNode.offsetHeight : 200;
                let x = event.clientX + 14;
                let y = event.clientY - 10;
                if (x + tipW > window.innerWidth)  x = event.clientX - tipW - 14;
                if (y + tipH > window.innerHeight) y = window.innerHeight - tipH - 8;
                if (y < 8) y = 8;
                tooltip.style('left', x + 'px').style('top', y + 'px');
            })
            .on('mouseout', function (event, d) {
                d3.select(this).attr('stroke', 'rgba(255,255,255,0.15)').attr('stroke-width', 0.7);
                tooltip.style('opacity', 0).style('display', 'none');
            });

        // ── State abbreviation labels ─────────────────────────────────────────
        const stateAbbr = {
            "Arizona":"AZ","California":"CA","Colorado":"CO","Florida":"FL","Georgia":"GA",
            "Illinois":"IL","Michigan":"MI","New York":"NY","Ohio":"OH",
            "Pennsylvania":"PA","Texas":"TX","Washington":"WA"
        };

        svg.selectAll('.state-label')
            .data(features.filter(d => lookup.has(d.properties.name)))
            .enter()
            .append('text')
            .attr('class', 'state-label')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', 9)
            .attr('font-family', 'DM Sans, sans-serif')
            .attr('pointer-events', 'none')
            .attr('fill', d => {
                const record = lookup.get(d.properties.name);
                return record.total_usage > maxUsage * 0.45 ? '#fff' : '#2c1a00';
            })
            .attr('transform', d => {
                const c = pathGen.centroid(d);
                return (c && !isNaN(c[0])) ? `translate(${c[0]},${c[1]})` : 'translate(-999,-999)';
            })
            .text(d => stateAbbr[d.properties.name] || '');

        // ── Vertical color legend ─────────────────────────────────────────────
        const legendHeight = 200;
        const legendWidth  = 12;
        const legendX      = -margin.left + 50;
        const legendY      = height / 2 - legendHeight / 2;
        const bandPct      = 0.10;   // ±10% of maxUsage defines the highlight band

        const legendScale = d3.scaleLinear()
            .domain([0, maxUsage])
            .range([legendHeight, 0]);   // top = high, bottom = low

        const defs = svg.append('defs');
        const linearGradient = defs.append('linearGradient')
            .attr('id', 'regional-map-gradient')
            .attr('x1', '0%').attr('x2', '0%')
            .attr('y1', '100%').attr('y2', '0%');

        linearGradient.selectAll('stop')
            .data(d3.range(0, 1.01, 0.1))
            .enter()
            .append('stop')
            .attr('offset', d => (d * 100) + '%')
            .attr('stop-color', d => colorScale(d * maxUsage));

        svg.append('rect')
            .attr('x', legendX)
            .attr('y', legendY)
            .attr('width',  legendWidth)
            .attr('height', legendHeight)
            .attr('rx', 3)
            .style('fill', 'url(#regional-map-gradient)');

        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(${legendX},${legendY})`)
            .call(d3.axisLeft(legendScale).ticks(5).tickFormat(d3.format(',')))
            .selectAll('text')
            .style('font-size', '9px')
            .style('fill', 'var(--text-secondary, #a0a0b0)');

        svg.append('text')
            .attr('x', legendX + legendWidth / 2)
            .attr('y', legendY - 10)
            .attr('text-anchor', 'middle')
            .style('font-size', '9px')
            .style('fill', 'var(--text-secondary, #a0a0b0)')
            .text('Usage');

        // ── Band rect: shows the active range on the legend ───────────────────
        const hoverBand = svg.append('rect')
            .attr('x', legendX - 1)
            .attr('width', legendWidth + 2)
            .attr('rx', 2)
            .attr('fill', 'rgba(255,255,255,0.25)')
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.8)
            .attr('pointer-events', 'none')
            .style('display', 'none');

        // Crosshair line on legend
        const hoverLine = svg.append('line')
            .attr('x1', legendX - 4).attr('x2', legendX + legendWidth + 4)
            .attr('stroke', '#fff').attr('stroke-width', 1.5)
            .attr('pointer-events', 'none')
            .style('display', 'none');

        // Value label next to legend
        const hoverLabel = svg.append('text')
            .attr('x', legendX + legendWidth + 6)
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle')
            .style('font-size', '10px')
            .style('fill', '#fff')
            .style('display', 'none');

        // ── Highlight helpers ─────────────────────────────────────────────────
        function highlightRange(lo, hi) {
            svg.selectAll('.state').each(function(d) {
                const record = lookup.get(d.properties.name);
                if (!record) {
                    d3.select(this).attr('opacity', 0.12);
                    return;
                }
                const inRange = record.total_usage >= lo && record.total_usage <= hi;
                d3.select(this)
                    .attr('opacity',      inRange ? 1    : 0.2)
                    .attr('stroke',       inRange ? '#fff' : 'rgba(255,255,255,0.08)')
                    .attr('stroke-width', inRange ? 2    : 0.5);
            });
        }

        function resetHighlight() {
            svg.selectAll('.state')
                .attr('opacity', 1)
                .attr('stroke', d => d.properties.name === selectedState ? '#a78bfa' : 'rgba(255,255,255,0.15)')
                .attr('stroke-width', d => d.properties.name === selectedState ? 2.2 : 0.7);
        }

        // ── Invisible overlay rect: captures mouse events on legend ───────────
        svg.append('rect')
            .attr('x', legendX)
            .attr('y', legendY)
            .attr('width',  legendWidth)
            .attr('height', legendHeight)
            .attr('fill', 'transparent')
            .style('cursor', 'crosshair')
            .on('mousemove', function (event) {
                const [, my] = d3.pointer(event, svg.node());
                const relY   = my - legendY;
                if (relY < 0 || relY > legendHeight) return;

                const value = legendScale.invert(relY);
                const band  = maxUsage * bandPct;
                const lo    = Math.max(0, value - band);
                const hi    = Math.min(maxUsage, value + band);

                // Update crosshair
                hoverLine.style('display', null).attr('y1', my).attr('y2', my);

                // Update band rect
                const bandTop    = legendY + legendScale(hi);
                const bandBottom = legendY + legendScale(lo);
                hoverBand
                    .style('display', null)
                    .attr('y',      bandTop)
                    .attr('height', Math.max(2, bandBottom - bandTop));

                // Update label
                hoverLabel.style('display', null).attr('y', my)
                    .text(d3.format(',')(Math.round(value)));

                // Highlight matching states
                highlightRange(lo, hi);
            })
            .on('mouseleave', function () {
                hoverLine.style('display', 'none');
                hoverBand.style('display', 'none');
                hoverLabel.style('display', 'none');
                resetHighlight();
            });

    }).catch(err => {
        console.error('Regional map error:', err);
        const c = document.getElementById('regional-viz');
        if (c) c.innerHTML = '<p style="color:#ff6b6b;padding:1rem">Failed to load regional map data.</p>';
    });
}

