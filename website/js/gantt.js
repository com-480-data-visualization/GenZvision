/**
 * gantt.js — Slang Seasons: When Did Each Term Live?
 *
 * Lecture references:
 * - L6.2 Marks & Channels: Length encodes lifespan (temporal),
 *   thickness encodes total_likes (quantitative), hue encodes category (categorical).
 * - L5.2 Interactive D3: Keyed data joins, transitions, D3 time scales.
 * - L12 Storytelling: Linear time narrative — "when did each era of slang happen?"
 * - L7.2 Do's and Don'ts: Consistent color per category, clear axis, no chartjunk.
 */

function renderGantt() {
    const container = document.getElementById('gantt-viz');
    container.innerHTML = '';

    // Country of origin mapping (cultural/linguistic research)
    // Using flag image URLs (Flagcdn CDN) for crisp rendering — no emoji SVG lag
    const countryOrigins = {
        'delulu':       { code: 'kr', country: 'South Korea',  badge: 'KR', color: '#ef4444' },
        'skibidi':      { code: 'bg', country: 'Bulgaria',     badge: 'BG', color: '#3b82f6' },
        'brat':         { code: 'gb', country: 'UK',           badge: 'UK', color: '#a78bfa' },
        'ick':          { code: 'gb', country: 'UK',           badge: 'UK', color: '#a78bfa' },
        'roman empire': { code: 'it', country: 'Italy',        badge: 'IT', color: '#34d399' },
        'cooked':       { code: 'au', country: 'Australia',    badge: 'AU', color: '#f97316' },
    };
    const defaultOrigin = { code: 'us', country: 'USA', badge: 'US', color: '#60a5fa' };

    // Category colors (L6.1: limited distinguishable palette)
    const categoryColors = {
        'approval':    '#34d399',
        'insult':      '#ef4444',
        'humor':       '#facc15',
        'emotion':     '#60a5fa',
        'identity':    '#a78bfa',
        'emphasis':    '#f97316',
        'meme':        '#e879f9',
        'dating':      '#fb7185',
        'appearance':  '#2dd4bf',
        'description': '#818cf8',
        'reaction':    '#fb923c',
        'food':        '#84cc16',
        'manipulation':'#dc2626',
        'social':      '#38bdf8',
        'exposure':    '#f59e0b',
        'behavior':    '#c084fc',
        'attraction':  '#ec4899',
    };

    d3.json('data/slang_lifecycle.json').then(rawData => {
        const summary = rawData.summary;

        // Sort by first_seen ascending
        summary.sort((a, b) => new Date(a.first_seen) - new Date(b.first_seen));

        const margin = { top: 30, right: 70, bottom: 50, left: 175 };
        const rowH = 22;          // height per row
        const barMaxH = 14;       // max bar thickness
        const barMinH = 4;        // min bar thickness
        const flagSize = 22;      // flag emoji size
        const height = summary.length * rowH;
        const width = container.clientWidth - margin.left - margin.right;

        const svg = d3.select('#gantt-viz')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Time scale
        const xScale = d3.scaleTime()
            .domain([new Date('2020-01-01'), new Date('2026-01-01')])
            .range([0, width]);

        // Thickness scale based on total_likes
        const likeExtent = d3.extent(summary, d => d.total_likes);
        const thickScale = d3.scaleLinear()
            .domain(likeExtent)
            .range([barMinH, barMaxH]);

        // --- Grid lines ---
        const years = d3.timeYears(new Date('2020-01-01'), new Date('2027-01-01'));
        g.selectAll('.grid-line')
            .data(years)
            .enter().append('line')
            .attr('class', 'grid-line')
            .attr('x1', d => xScale(d))
            .attr('x2', d => xScale(d))
            .attr('y1', -10)
            .attr('y2', height + 10)
            .attr('stroke', 'rgba(255,255,255,0.06)')
            .attr('stroke-width', 1);

        // --- Zebra stripes ---
        g.selectAll('.row-stripe')
            .data(summary)
            .enter().append('rect')
            .attr('class', 'row-stripe')
            .attr('x', -margin.left)
            .attr('y', (d, i) => i * rowH)
            .attr('width', width + margin.left + margin.right)
            .attr('height', rowH)
            .attr('fill', (d, i) => i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent');

        // --- Term name labels (left) ---
        g.selectAll('.gantt-term-label')
            .data(summary)
            .enter().append('text')
            .attr('class', 'gantt-term-label')
            .attr('x', -10)
            .attr('y', (d, i) => i * rowH + rowH / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .text(d => d.slang_term.replace(/\b\w/g, c => c.toUpperCase()))
            .style('font-family', 'Outfit, sans-serif')
            .style('font-size', '11.5px')
            .style('font-weight', '500')
            .style('fill', d => categoryColors[d.term_category] || '#a0a0b0')
            .style('cursor', 'default');

        // --- Bars ---
        const bars = g.selectAll('.gantt-bar')
            .data(summary)
            .enter().append('rect')
            .attr('class', 'gantt-bar')
            .attr('x', d => xScale(new Date(d.first_seen)))
            .attr('y', (d, i) => i * rowH + rowH / 2 - thickScale(d.total_likes) / 2)
            .attr('height', d => thickScale(d.total_likes))
            .attr('rx', d => thickScale(d.total_likes) / 2)
            .attr('ry', d => thickScale(d.total_likes) / 2)
            .attr('fill', d => categoryColors[d.term_category] || '#666')
            .attr('opacity', 0.85)
            .attr('width', 0)   // start at 0 for animation
            .style('cursor', 'pointer');

        // Animate bars growing from first_seen to last_seen
        bars.transition()
            .duration(800)
            .delay((d, i) => i * 18)
            .ease(d3.easeCubicOut)
            .attr('width', d => Math.max(2,
                xScale(new Date(d.last_seen)) - xScale(new Date(d.first_seen))
            ));

        // --- Country badges at end of bar (pure SVG, no external requests) ---
        const badgeR = 9;
        summary.forEach((d, i) => { d._rowIdx = i; });
        const getOrigin = d => countryOrigins[d.slang_term] || defaultOrigin;

        const flagGroups = g.selectAll('.gantt-flag-group')
            .data(summary)
            .enter().append('g')
            .attr('class', 'gantt-flag-group')
            .style('opacity', 0)
            .attr('transform', d => {
                const endX = xScale(new Date(d.last_seen));
                return `translate(${endX + badgeR + 6}, ${d._rowIdx * rowH + rowH / 2})`;
            });

        // Filled circle
        flagGroups.append('circle')
            .attr('r', badgeR)
            .attr('fill', d => getOrigin(d).color)
            .attr('opacity', 0.85);

        // 2-letter country code
        flagGroups.append('text')
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .style('font-family', 'Outfit, sans-serif')
            .style('font-size', '7px')
            .style('font-weight', '700')
            .style('fill', '#fff')
            .style('pointer-events', 'none')
            .text(d => getOrigin(d).badge);

        // Animate in after bars
        flagGroups.transition()
            .duration(400)
            .delay((d, i) => i * 18 + 900)
            .ease(d3.easeCubicOut)
            .style('opacity', 1);

        // --- Hover interactions ---
        // Create invisible hover targets over full row
        g.selectAll('.gantt-hover-row')
            .data(summary)
            .enter().append('rect')
            .attr('class', 'gantt-hover-row')
            .attr('x', -margin.left)
            .attr('y', (d, i) => i * rowH)
            .attr('width', width + margin.left + margin.right)
            .attr('height', rowH)
            .attr('fill', 'transparent')
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                // Highlight bar
                g.selectAll('.gantt-bar')
                    .filter(b => b.slang_term === d.slang_term)
                    .transition().duration(150)
                    .attr('opacity', 1)
                    .attr('filter', 'brightness(1.4)');

                const origin = countryOrigins[d.slang_term] || defaultOrigin;
                const start = new Date(d.first_seen);
                const end = new Date(d.last_seen);
                const months = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30));
                const fmt = d3.timeFormat('%b %Y');

                tooltip
                    .style('display', 'block')
                    .style('opacity', 1)
                    .html(`
                        <strong>${d.slang_term.replace(/\b\w/g, c => c.toUpperCase())}</strong>
                        <span style="display:inline-block;background:${origin.color};color:#fff;font-size:8px;font-weight:700;padding:1px 4px;border-radius:3px;margin-left:4px">${origin.badge}</span>
                        ${origin.country}<br>
                        <em>"${d.term_meaning}"</em><br>
                        <span style="color:${categoryColors[d.term_category]}">${d.term_category}</span><br>
                        ${fmt(start)} → ${fmt(end)} <span style="opacity:0.6">(${months} months)</span><br>
                        Likes: ${d.total_likes.toLocaleString()}<br>
                        Shares: ${d.total_shares.toLocaleString()}<br>
                        Viral posts: ${d.viral_posts}<br>
                        Sentiment: ${d.avg_sentiment > 0 ? '+' : ''}${d.avg_sentiment.toFixed(2)}
                    `)
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 15) + 'px');
            })
            .on('mousemove', function(event) {
                tooltip
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 15) + 'px');
            })
            .on('mouseout', function(event, d) {
                g.selectAll('.gantt-bar')
                    .filter(b => b.slang_term === d.slang_term)
                    .transition().duration(150)
                    .attr('opacity', 0.85)
                    .attr('filter', null);

                tooltip.style('opacity', 0).style('display', 'none');
            });

        // --- X Axis ---
        const xAxis = d3.axisBottom(xScale)
            .ticks(d3.timeYear.every(1))
            .tickFormat(d3.timeFormat('%Y'))
            .tickSize(-height);

        const axisG = g.append('g')
            .attr('class', 'axis gantt-x-axis')
            .attr('transform', `translate(0, ${height})`)
            .call(xAxis);

        axisG.select('.domain').remove();
        axisG.selectAll('.tick line')
            .attr('stroke', 'rgba(255,255,255,0.08)')
            .attr('stroke-dasharray', '4,4');
        axisG.selectAll('.tick text')
            .style('font-family', 'Outfit, sans-serif')
            .style('font-size', '12px')
            .style('fill', 'rgba(255,255,255,0.4)');

        // --- Legend: categories ---
        const usedCategories = [...new Set(summary.map(d => d.term_category))].sort();
        const legendCols = 4;
        const legendItemW = 130;
        const legendG = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${height + margin.top + 30})`);

        usedCategories.forEach((cat, i) => {
            const col = i % legendCols;
            const row = Math.floor(i / legendCols);
            const lg = legendG.append('g')
                .attr('transform', `translate(${col * legendItemW}, ${row * 18})`);
            lg.append('rect')
                .attr('width', 10)
                .attr('height', 10)
                .attr('rx', 2)
                .attr('y', -2)
                .attr('fill', categoryColors[cat] || '#666');
            lg.append('text')
                .attr('x', 14)
                .attr('dy', '0.6em')
                .text(cat.charAt(0).toUpperCase() + cat.slice(1))
                .style('font-family', 'DM Sans, sans-serif')
                .style('font-size', '10px')
                .style('fill', 'rgba(255,255,255,0.5)');
        });

        // --- Thickness legend ---
        const thickLegendG = svg.append('g')
            .attr('transform', `translate(${margin.left + width - 160}, ${height + margin.top + 30})`);

        thickLegendG.append('text')
            .text('Bar thickness = total likes')
            .style('font-family', 'DM Sans, sans-serif')
            .style('font-size', '10px')
            .style('fill', 'rgba(255,255,255,0.35)');

        [likeExtent[0], likeExtent[1]].forEach((v, i) => {
            const h = thickScale(v);
            const lx = i * 90;
            thickLegendG.append('rect')
                .attr('x', lx)
                .attr('y', 14 - h / 2)
                .attr('width', 40)
                .attr('height', h)
                .attr('rx', h / 2)
                .attr('fill', 'rgba(255,255,255,0.3)');
            thickLegendG.append('text')
                .attr('x', lx + 45)
                .attr('y', 18)
                .text(i === 0 ? 'fewer' : 'more')
                .style('font-family', 'DM Sans, sans-serif')
                .style('font-size', '9px')
                .style('fill', 'rgba(255,255,255,0.35)');
        });
    });
}
