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
                tooltip
                    .style('display', 'block').style('opacity', 1)
                    .html(`
                        <strong style="color:#a78bfa">${d.properties.name}</strong><br>
                        Usage: ${record.total_usage.toLocaleString()}<br>
                        Top term: <em>${record.top_term}</em><br>
                        Avg sentiment: ${record.avg_sentiment.toFixed(3)}<br>
                        Platform: ${record.top_platform}
                    `)
                    .style('left', (event.clientX + 12) + 'px')
                    .style('top',  (event.clientY  - 10) + 'px');
            })
            .on('mousemove', function (event) {
                tooltip
                    .style('left', (event.clientX + 12) + 'px')
                    .style('top',  (event.clientY  - 10) + 'px');
            })
            .on('mouseout', function () {
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
                .attr('stroke', 'rgba(255,255,255,0.15)')
                .attr('stroke-width', 0.7);
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

    });
}       