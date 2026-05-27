/**
 * explore_world.js — Interactive World Choropleth with Click-to-Explore Panel (D3.js + TopoJSON)
 *
 * Lecture references:
 * - L5.1 Brushing & Linking: click on a country triggers coordinated update of
 *   the bar chart and sentiment panel (linked views, same data, different encodings).
 * - L5.2 Interactive D3: d3.geoNaturalEarth1 projection + d3.geoPath for geographic rendering,
 *   d3.scaleSequential for continuous color mapping of usage magnitude.
 * - L6.1 Perception & Color: Sequential purple colormap (#1a0a2e → #a78bfa) for proportional
 *   encoding; perceptually uniform lightness progression from low to high usage.
 * - L6.2 Marks & Channels: Area mark (choropleth country) with luminance as the primary
 *   channel; position encodes geography; tooltip reveals secondary attributes on demand.
 * - L8 Maps: Choropleth shading proportional to total slang usage; NaturalEarth1 projection
 *   minimizes distortion for thematic world maps; raw totals used here.
 */

function renderWorldMap() {
    const container = document.getElementById('world-map-viz');
    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '0';
    container.style.minHeight = '420px';
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
            Click any highlighted country on the map to see its top terms and sentiment breakdown.
        </p>
    `;

    // ── International countries in the dataset ──────────────────────────────
    const internationalRegions = [
        'Australia', 'Brazil', 'Canada', 'Germany', 'India',
        'Mexico', 'Nigeria', 'Philippines', 'South Africa', 'UK'
    ];

    const usStates = [
        'Arizona', 'California', 'Colorado', 'Florida', 'Georgia',
        'Illinois', 'Michigan', 'New York', 'Ohio', 'Pennsylvania',
        'Texas', 'Washington'
    ];

    // ── Load data then topology ─────────────────────────────────────────────
    d3.json('data/regional_data.json').then(regionalData => {
        // Build lookup for international countries
        const countryLookup = new Map();

        regionalData.forEach(d => {
            if (internationalRegions.includes(d.region)) {
                // Map "UK" to "United Kingdom" for TopoJSON matching
                const name = d.region === 'UK' ? 'United Kingdom' : d.region;
                countryLookup.set(name, d);
            }
        });

        // Aggregate US states into "United States"
        const usData = regionalData.filter(d => usStates.includes(d.region));
        if (usData.length > 0) {
            const totalUsage = d3.sum(usData, d => d.total_usage);
            const uniqueTerms = d3.max(usData, d => d.unique_terms);
            const avgSentiment = d3.mean(usData, d => d.avg_sentiment);

            // Aggregate sentiment counts
            const sentPositive = d3.sum(usData, d => d.sentiment.positive);
            const sentNeutral  = d3.sum(usData, d => d.sentiment.neutral);
            const sentNegative = d3.sum(usData, d => d.sentiment.negative);
            const sentTotal    = sentPositive + sentNeutral + sentNegative;

            // Find top term across all states by aggregating counts
            const termCounts = new Map();
            usData.forEach(d => {
                d.top_terms.forEach(t => {
                    const prev = termCounts.get(t.slang_term) || 0;
                    termCounts.set(t.slang_term, prev + t.count);
                });
            });
            const sortedTerms = [...termCounts.entries()].sort((a, b) => b[1] - a[1]);
            const topTerm = sortedTerms.length > 0 ? sortedTerms[0][0] : 'N/A';

            // Find most common platform
            const platformCounts = new Map();
            usData.forEach(d => {
                const prev = platformCounts.get(d.top_platform) || 0;
                platformCounts.set(d.top_platform, prev + 1);
            });
            const topPlatform = [...platformCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

            // Build aggregated top_terms (top 5 by combined count)
            const termDetails = new Map();
            usData.forEach(d => {
                d.top_terms.forEach(t => {
                    if (!termDetails.has(t.slang_term)) {
                        termDetails.set(t.slang_term, { slang_term: t.slang_term, count: 0, sentSum: 0, intensSum: 0, n: 0 });
                    }
                    const entry = termDetails.get(t.slang_term);
                    entry.count += t.count;
                    entry.sentSum += t.avg_sentiment * t.count;
                    entry.intensSum += t.avg_intensity * t.count;
                    entry.n += t.count;
                });
            });
            const aggTopTerms = [...termDetails.values()]
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map(t => ({
                    slang_term: t.slang_term,
                    count: t.count,
                    avg_sentiment: t.sentSum / t.n,
                    avg_intensity: t.intensSum / t.n
                }));

            countryLookup.set('United States of America', {
                region: 'United States',
                total_usage: totalUsage,
                unique_terms: uniqueTerms,
                avg_sentiment: avgSentiment,
                top_term: topTerm,
                top_platform: topPlatform,
                top_terms: aggTopTerms,
                sentiment: {
                    positive: sentPositive,
                    neutral:  sentNeutral,
                    negative: sentNegative,
                    pct_positive: +(sentPositive / sentTotal * 100).toFixed(1),
                    pct_neutral:  +(sentNeutral  / sentTotal * 100).toFixed(1),
                    pct_negative: +(sentNegative / sentTotal * 100).toFixed(1)
                }
            });
        }

        // ── Color scale ─────────────────────────────────────────────────────
        const usageValues = [...countryLookup.values()].map(d => d.total_usage);
        const maxUsage = d3.max(usageValues);

        // Light lavender → bright violet: monochromatic purple ramp, all visible on dark bg
        const colorScale = d3.scaleSequential()
            .domain([0, maxUsage])
            .interpolator(t => d3.interpolateRgb('#b8a9d4', '#7c3aed')(Math.pow(t, 0.65)));

        // ── Load world TopoJSON ─────────────────────────────────────────────
        return d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
            .then(world => ({ world, countryLookup, colorScale, maxUsage }));
    }).then(({ world, countryLookup, colorScale, maxUsage }) => {
        const countries = topojson.feature(world, world.objects.countries).features;

        // ── Map SVG ─────────────────────────────────────────────────────────
        const totalWidth  = mapDiv.getBoundingClientRect().width || 600;
        const totalHeight = Math.min(totalWidth * 0.55, 420);

        const svg = d3.select(mapDiv).append('svg')
            .attr('width', totalWidth)
            .attr('height', totalHeight)
            .style('width', '100%')
            .style('display', 'block');

        const g = svg.append('g');

        // ── Projection ──────────────────────────────────────────────────────
        const projection = d3.geoNaturalEarth1()
            .scale(totalWidth / 5.6)
            .translate([totalWidth / 2, totalHeight / 2]);

        const pathGen = d3.geoPath(projection);

        // ── Tooltip ─────────────────────────────────────────────────────────
        const tooltip = d3.select('body')
            .selectAll('.world-map-tooltip')
            .data([null])
            .join('div')
            .attr('class', 'world-map-tooltip')
            .style('position', 'fixed')
            .style('display', 'none')
            .style('pointer-events', 'none')
            .style('background', 'rgba(26,26,36,0.95)')
            .style('border', '1px solid rgba(124,58,237,0.3)')
            .style('border-radius', '8px')
            .style('padding', '8px 12px')
            .style('font-size', '12px')
            .style('color', '#f0f0f5')
            .style('z-index', '999');

        // Hint label
        svg.append('text')
            .attr('x', totalWidth / 2)
            .attr('y', totalHeight - 4)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', 'var(--text-secondary,#a0a0b0)')
            .style('font-family', 'var(--font-body,sans-serif)')
            .text('Click a country to explore');

        let selectedCountry = null;

        // ── Draw countries ──────────────────────────────────────────────────
        g.selectAll('.world-country')
            .data(countries)
            .enter()
            .append('path')
            .attr('class', 'world-country')
            .attr('d', pathGen)
            .attr('fill', d => {
                const record = countryLookup.get(d.properties.name);
                return record ? colorScale(record.total_usage) : 'rgba(255,255,255,0.07)';
            })
            .attr('stroke', 'rgba(255,255,255,0.1)')
            .attr('stroke-width', 0.5)
            .style('cursor', d => countryLookup.has(d.properties.name) ? 'pointer' : 'default')
            .style('transition', 'fill 0.2s ease')
            .on('mouseover', function (event, d) {
                const record = countryLookup.get(d.properties.name);
                if (!record) return;

                if (d.properties.name !== selectedCountry) {
                    d3.select(this)
                        .attr('stroke', '#fff')
                        .attr('stroke-width', 1.5);
                }

                tooltip.style('display', 'block')
                    .html(`<strong style="color:#a78bfa">${record.region}</strong><br>
                           Usage: ${record.total_usage.toLocaleString()}<br>
                           Top term: <em>${record.top_term}</em>`)
                    .style('left', (event.clientX + 12) + 'px')
                    .style('top',  (event.clientY  - 10) + 'px');
            })
            .on('mousemove', function (event) {
                tooltip
                    .style('left', (event.clientX + 12) + 'px')
                    .style('top',  (event.clientY - 10) + 'px');
            })
            .on('mouseout', function (event, d) {
                if (d.properties.name !== selectedCountry) {
                    d3.select(this)
                        .attr('stroke', 'rgba(255,255,255,0.1)')
                        .attr('stroke-width', 0.5);
                }
                tooltip.style('display', 'none');
            })
            .on('click', function (event, d) {
                const record = countryLookup.get(d.properties.name);
                if (!record) return;

                // Reset all strokes
                g.selectAll('.world-country')
                    .attr('stroke', 'rgba(255,255,255,0.1)')
                    .attr('stroke-width', 0.5);

                selectedCountry = d.properties.name;
                d3.select(this)
                    .attr('stroke', '#a78bfa')
                    .attr('stroke-width', 2.5);

                renderWorldPanel(record, panelDiv);
            });

        // ── Color legend ────────────────────────────────────────────────────
        const legendWidth  = 160;
        const legendHeight = 8;
        const legendX = totalWidth - legendWidth - 16;
        const legendY = totalHeight - 28;

        const defs = svg.append('defs');
        const linearGradient = defs.append('linearGradient')
            .attr('id', 'world-map-gradient')
            .attr('x1', '0%').attr('x2', '100%')
            .attr('y1', '0%').attr('y2', '0%');

        linearGradient.selectAll('stop')
            .data(d3.range(0, 1.01, 0.1))
            .enter()
            .append('stop')
            .attr('offset', d => (d * 100) + '%')
            .attr('stop-color', d => colorScale(d * maxUsage));

        svg.append('rect')
            .attr('x', legendX)
            .attr('y', legendY)
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .attr('rx', 3)
            .style('fill', 'url(#world-map-gradient)');

        const legendScale = d3.scaleLinear()
            .domain([0, maxUsage])
            .range([0, legendWidth]);

        svg.append('g')
            .attr('transform', `translate(${legendX},${legendY + legendHeight})`)
            .call(d3.axisBottom(legendScale).ticks(3).tickFormat(d => d >= 1000 ? d3.format('.0s')(d) : d))
            .call(g => g.select('.domain').remove())
            .selectAll('text')
            .style('font-size', '8px')
            .style('font-family', "'DM Sans', sans-serif")
            .style('fill', 'var(--text-secondary, #a0a0b0)');

        svg.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.15)');
        svg.selectAll('.domain').remove();

        svg.append('text')
            .attr('x', legendX)
            .attr('y', legendY - 4)
            .style('font-size', '9px')
            .style('font-family', "'DM Sans', sans-serif")
            .style('fill', 'var(--text-secondary, #a0a0b0)')
            .text('Total usage');
    }).catch(err => {
        console.error('Explore world map error:', err);
        if (mapDiv) mapDiv.innerHTML = '<p style="color:#ff6b6b;padding:1rem">Failed to load world map.</p>';
    });
}

// ── World map detail panel renderer ──────────────────────────────────────────
function renderWorldPanel(rec, panelDiv) {
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

    // Divider
    const divider = document.createElement('div');
    divider.style.cssText = 'height:1px; background:rgba(255,255,255,0.06); margin:0 -1rem;';
    panelDiv.appendChild(divider);

    // ── Top Terms bar chart ──────────────────────────────────────────────────
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
        .call(d3.axisBottom(xScale).ticks(3).tickFormat(d3.format(',d')))
        .call(g => g.select('.domain').remove())
        .selectAll('text')
        .style('font-size', '8px')
        .style('fill', 'var(--text-secondary,#a0a0b0)');

    // Sentiment legend
    const barLegend = document.createElement('div');
    barLegend.style.cssText = 'display:flex; gap:8px; font-size:9px; color:var(--text-secondary,#a0a0b0); margin-top:-4px;';
    barLegend.innerHTML = `
        <span style="display:flex;align-items:center;gap:3px;"><span style="width:8px;height:8px;border-radius:2px;background:#2ecc71;display:inline-block;"></span>Positive</span>
        <span style="display:flex;align-items:center;gap:3px;"><span style="width:8px;height:8px;border-radius:2px;background:#f1c40f;display:inline-block;"></span>Neutral</span>
        <span style="display:flex;align-items:center;gap:3px;"><span style="width:8px;height:8px;border-radius:2px;background:#e74c3c;display:inline-block;"></span>Negative</span>
    `;
    panelDiv.appendChild(barLegend);

    // ── Sentiment breakdown bar ──────────────────────────────────────────────
    if (rec.sentiment) {
        const sentLabel = document.createElement('div');
        sentLabel.style.cssText = 'font-size:0.7rem; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:var(--text-secondary,#a0a0b0); margin-top:4px;';
        sentLabel.textContent = 'Sentiment';
        panelDiv.appendChild(sentLabel);

        const sentBar = document.createElement('div');
        sentBar.style.cssText = 'display:flex; height:8px; border-radius:4px; overflow:hidden; background:rgba(255,255,255,0.05);';
        sentBar.innerHTML = `
            <div style="width:${rec.sentiment.pct_positive}%; background:#4ade80;"></div>
            <div style="width:${rec.sentiment.pct_neutral}%; background:#facc15;"></div>
            <div style="width:${rec.sentiment.pct_negative}%; background:#f87171;"></div>
        `;
        panelDiv.appendChild(sentBar);

        const sentLabels = document.createElement('div');
        sentLabels.style.cssText = 'display:flex; justify-content:space-between; font-size:9px; color:var(--text-secondary,#a0a0b0); margin-top:2px;';
        sentLabels.innerHTML = `
            <span>${rec.sentiment.pct_positive}% pos</span>
            <span>${rec.sentiment.pct_neutral}% neu</span>
            <span>${rec.sentiment.pct_negative}% neg</span>
        `;
        panelDiv.appendChild(sentLabels);
    }

    // ── Extra info ───────────────────────────────────────────────────────────
    const extra = document.createElement('div');
    extra.style.cssText = 'font-size:0.75rem; color:var(--text-secondary,#a0a0b0); margin-top:auto; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06);';
    extra.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span>Top platform</span>
            <span style="color:var(--text-primary,#f0f0f5); font-weight:500;">${rec.top_platform}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
            <span>Avg sentiment</span>
            <span style="color:var(--text-primary,#f0f0f5); font-weight:500;">${rec.avg_sentiment.toFixed(3)}</span>
        </div>
    `;
    panelDiv.appendChild(extra);
}
