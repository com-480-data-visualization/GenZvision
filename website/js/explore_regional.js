/**
 * explore_regional.js — Regional Deep-Dive: Click-to-Explore Choropleth (D3.js + TopoJSON)
 *
 * Lecture references:
 * - L5.1 Brushing & Linking: click on a state triggers coordinated update of
 *   the bar chart and sentiment panel (linked views, same data, different encodings).
 * - L5.2 Interactive D3: d3.scaleBand for bar chart, d3.geoAlbersUsa + d3.geoPath
 *   for geographic rendering, d3.scaleSequential for choropleth color mapping.
 * - L6.1 Perception & Color: YlOrBr sequential ramp for usage magnitude;
 *   categorical colors (green/yellow/red) for sentiment encoding.
 * - L6.2 Marks & Channels: area (map) + length (bar) as primary channels;
 *   position and color as secondary channels.
 * - L8 Maps: choropleth shading proportional to total_usage; AlbersUsa projection.
 */

function renderRegionalExplore() {
    const container = document.getElementById('region-viz');
    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '0';
    container.style.minHeight = '520px';
    container.style.padding = '0';
    container.style.background = 'transparent';
    container.style.border = 'none';

    // ── Layout: map left, detail panel right ──────────────────────────────────
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex; gap:0; width:100%; height:100%; flex:1;';
    container.appendChild(wrapper);

    const mapDiv = document.createElement('div');
    mapDiv.style.cssText = 'flex:1.4; min-width:0; position:relative;';
    wrapper.appendChild(mapDiv);

    const panelDiv = document.createElement('div');
    panelDiv.style.cssText = `
        flex:1; min-width:220px; max-width:280px;
        background:var(--bg-card,#1a1a24);
        border-left:1px solid rgba(255,255,255,0.06);
        border-radius:0 12px 12px 0;
        padding:1.25rem 1rem;
        display:flex; flex-direction:column; gap:1rem;
        font-family:var(--font-body,'DM Sans',sans-serif);
    `;
    wrapper.appendChild(panelDiv);

    panelDiv.innerHTML = `
        <p style="color:var(--text-secondary,#a0a0b0); font-size:0.85rem; margin:auto; text-align:center; line-height:1.6;">
            Click any highlighted state on the map to see its top terms and sentiment breakdown.
        </p>
    `;

    // ── State abbreviations (matches main regional map) ───────────────────────
    const stateAbbr = {
        "Arizona":"AZ","California":"CA","Colorado":"CO","Florida":"FL","Georgia":"GA",
        "Illinois":"IL","Michigan":"MI","New York":"NY","Ohio":"OH",
        "Pennsylvania":"PA","Texas":"TX","Washington":"WA"
    };

    // ── Load data ─────────────────────────────────────────────────────────────
    d3.json('data/regional_data.json').then(regionalData => {
        const usStates = regionalData.filter(d =>
            !['Australia','Brazil','Canada','Germany','India','Mexico',
              'Nigeria','Philippines','South Africa','UK'].includes(d.region));

        const lookup   = new Map(usStates.map(d => [d.region, d]));
        const maxUsage = d3.max(usStates, d => d.total_usage);

        const colorScale = d3.scaleSequential()
            .domain([0, maxUsage])
            .interpolator(d3.interpolateYlOrBr);

        // ── Map SVG ───────────────────────────────────────────────────────────
        const totalWidth  = mapDiv.getBoundingClientRect().width || 500;
        const totalHeight = 340;
        const margin = { top: 10, right: 10, bottom: 18, left: 10 };
        const w = totalWidth  - margin.left - margin.right;
        const h = totalHeight - margin.top  - margin.bottom;

        const svg = d3.select(mapDiv).append('svg')
            .attr('width', totalWidth)
            .attr('height', totalHeight)
            .style('width', '100%')
            .style('display', 'block');

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const projection = d3.geoAlbersUsa()
            .scale(w * 1.15)
            .translate([w / 2, h / 2]);

        const pathGen = d3.geoPath(projection);

        // Hint label
        svg.append('text')
            .attr('x', totalWidth / 2)
            .attr('y', totalHeight - 4)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', 'var(--text-secondary,#a0a0b0)')
            .style('font-family', 'var(--font-body,sans-serif)')
            .text('Click a state to explore');

        // ── Tooltip ───────────────────────────────────────────────────────────
        const tooltip = d3.select('body')
            .selectAll('.explore-map-tooltip')
            .data([null])
            .join('div')
            .attr('class', 'explore-map-tooltip')
            .style('position', 'fixed')
            .style('display', 'none')
            .style('pointer-events', 'none')
            .style('background', 'rgba(26,26,36,0.95)')
            .style('border', '1px solid rgba(124,58,237,0.3)')
            .style('border-radius', '8px')
            .style('padding', '6px 10px')
            .style('font-size', '12px')
            .style('color', '#f0f0f5')
            .style('z-index', '999');

        let selectedState = null;

        return d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json').then(us => {
            const features = topojson.feature(us, us.objects.states).features;

            // ── State fills ───────────────────────────────────────────────────
            g.selectAll('.state')
                .data(features)
                .enter()
                .append('path')
                .attr('class', 'state')
                .attr('d', pathGen)
                .attr('stroke', 'rgba(255,255,255,0.12)')
                .attr('stroke-width', 0.6)
                .attr('fill', d => {
                    const rec = lookup.get(d.properties.name);
                    return rec ? colorScale(rec.total_usage) : 'rgba(180,180,180,0.08)';
                })
                .style('cursor', d => lookup.has(d.properties.name) ? 'pointer' : 'default')
                .on('mouseover', function(event, d) {
                    const rec = lookup.get(d.properties.name);
                    if (!rec) return;
                    if (d.properties.name !== selectedState) {
                        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1.5);
                    }
                    tooltip.style('display', 'block')
                        .html(`<strong style="color:#a78bfa">${d.properties.name}</strong><br>
                               Usage: ${rec.total_usage.toLocaleString()}<br>
                               Top term: <em>${rec.top_term}</em>`)
                        .style('left', (event.clientX + 12) + 'px')
                        .style('top',  (event.clientY  - 10) + 'px');
                })
                .on('mousemove', function(event) {
                    tooltip.style('left', (event.clientX + 12) + 'px')
                           .style('top',  (event.clientY  - 10) + 'px');
                })
                .on('mouseout', function(event, d) {
                    if (d.properties.name !== selectedState) {
                        d3.select(this)
                            .attr('stroke', 'rgba(255,255,255,0.12)')
                            .attr('stroke-width', 0.6);
                    }
                    tooltip.style('display', 'none');
                })
                .on('click', function(event, d) {
                    const rec = lookup.get(d.properties.name);
                    if (!rec) return;
                    g.selectAll('.state')
                        .attr('stroke', 'rgba(255,255,255,0.12)')
                        .attr('stroke-width', 0.6);
                    selectedState = d.properties.name;
                    d3.select(this)
                        .attr('stroke', '#a78bfa')
                        .attr('stroke-width', 2);
                    renderPanel(rec, panelDiv);
                });

            // ── State abbreviation labels (matches main regional map) ──────────
            g.selectAll('.state-label')
                .data(features.filter(d => lookup.has(d.properties.name)))
                .enter()
                .append('text')
                .attr('class', 'state-label')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', 8)
                .attr('font-family', 'DM Sans, sans-serif')
                .attr('pointer-events', 'none')
                .attr('fill', d => {
                    const rec = lookup.get(d.properties.name);
                    return rec.total_usage > maxUsage * 0.45 ? '#fff' : '#2c1a00';
                })
                .attr('transform', d => {
                    const c = pathGen.centroid(d);
                    return (c && !isNaN(c[0])) ? `translate(${c[0]},${c[1]})` : 'translate(-999,-999)';
                })
                .text(d => stateAbbr[d.properties.name] || '');
        });
    }).catch(err => {
        console.error('Explore regional map error:', err);
        if (mapDiv) mapDiv.innerHTML = '<p style="color:#ff6b6b;padding:1rem">Failed to load regional explorer.</p>';
    });
}

// ── Detail panel renderer ─────────────────────────────────────────────────────
function renderPanel(rec, panelDiv) {
    panelDiv.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.innerHTML = `
        <div style="font-family:var(--font-heading,'Outfit',sans-serif); font-size:1.1rem; font-weight:600; color:var(--text-primary,#f0f0f5); margin-bottom:2px;">
            ${rec.region}
        </div>
        <div style="font-size:0.75rem; color:var(--text-secondary,#a0a0b0);">
            ${rec.total_usage.toLocaleString()} total uses &middot; ${rec.unique_terms} terms
        </div>
    `;
    panelDiv.appendChild(header);

    const divider = document.createElement('div');
    divider.style.cssText = 'height:1px; background:rgba(255,255,255,0.06); margin:0 -1rem;';
    panelDiv.appendChild(divider);

    // ── Top Terms bar chart ───────────────────────────────────────────────────
    const barLabel = document.createElement('div');
    barLabel.style.cssText = 'font-size:0.7rem; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:var(--text-secondary,#a0a0b0);';
    barLabel.textContent = 'Top 5 Terms';
    panelDiv.appendChild(barLabel);

    const barContainer = document.createElement('div');
    barContainer.style.cssText = 'width:100%;';
    panelDiv.appendChild(barContainer);

    const barWidth  = panelDiv.getBoundingClientRect().width - 32 || 200;
    const barHeight = 130;
    const bm = { top: 4, right: 40, bottom: 28, left: 64 };
    const bw = barWidth - bm.left - bm.right;
    const bh = barHeight - bm.top  - bm.bottom;

    const bSvg = d3.select(barContainer).append('svg')
        .attr('width', barWidth)
        .attr('height', barHeight)
        .style('width', '100%')
        .style('overflow', 'visible')
        .append('g')
        .attr('transform', `translate(${bm.left},${bm.top})`);

    const terms = rec.top_terms;
    const maxCount = d3.max(terms, d => d.count);

    const barColor = d => {
        const s = d.avg_sentiment;
        if (s > 0.3)  return '#2ecc71';
        if (s < -0.1) return '#e74c3c';
        return '#f1c40f';
    };

    const xScale = d3.scaleLinear().domain([0, maxCount]).range([0, bw]);
    const yScale = d3.scaleBand()
        .domain(terms.map(d => d.slang_term))
        .range([0, bh])
        .padding(0.25);

    bSvg.selectAll('.bar')
        .data(terms)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', 0)
        .attr('y', d => yScale(d.slang_term))
        .attr('width', d => xScale(d.count))
        .attr('height', yScale.bandwidth())
        .attr('rx', 2)
        .attr('fill', barColor);

    bSvg.selectAll('.bar-label')
        .data(terms)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', d => xScale(d.count) + 3)
        .attr('y', d => yScale(d.slang_term) + yScale.bandwidth() / 2)
        .attr('dominant-baseline', 'middle')
        .style('font-size', '9px')
        .style('fill', 'var(--text-secondary,#a0a0b0)')
        .text(d => d.count.toLocaleString());

    bSvg.append('g')
        .call(d3.axisLeft(yScale).tickSize(0))
        .call(g => g.select('.domain').remove())
        .selectAll('text')
        .style('font-size', '10px')
        .style('fill', 'var(--text-primary,#f0f0f5)')
        .style('font-family', 'var(--font-body,sans-serif)');

    bSvg.append('g')
        .attr('transform', `translate(0,${bh})`)
        .call(d3.axisBottom(xScale).ticks(3).tickFormat(d3.format(',d')))  // ',s' → ',d'
        .call(g => g.select('.domain').remove())
        .selectAll('text')
        .style('font-size', '8px')
        .style('fill', 'var(--text-secondary,#a0a0b0)');

    const barLegend = document.createElement('div');
    barLegend.style.cssText = 'display:flex; gap:8px; font-size:9px; color:var(--text-secondary,#a0a0b0); margin-top:-4px;';
    barLegend.innerHTML = `
        <span style="display:flex;align-items:center;gap:3px;"><span style="width:8px;height:8px;border-radius:2px;background:#2ecc71;display:inline-block;"></span>Positive</span>
        <span style="display:flex;align-items:center;gap:3px;"><span style="width:8px;height:8px;border-radius:2px;background:#f1c40f;display:inline-block;"></span>Neutral</span>
        <span style="display:flex;align-items:center;gap:3px;"><span style="width:8px;height:8px;border-radius:2px;background:#e74c3c;display:inline-block;"></span>Negative</span>
    `;
    panelDiv.appendChild(barLegend);
}