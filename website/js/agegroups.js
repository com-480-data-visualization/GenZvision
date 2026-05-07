/**
 * agegroups.js — "Who Says It?" Age Group Breakdown
 * Horizontal stacked bar chart: top 20 slang terms × age groups
 * Sorted by "youth score" (% under 25), animated entrance on scroll
 */

function renderAgeGroups() {
    const container = document.getElementById('age-viz');
    if (!container) return;

    d3.json('data/age_group_data.json').then(data => {
        container.innerHTML = '';

        const AGE_GROUPS = ['13-17', '18-24', '25-30', '31-40', '41+'];
        const COLORS = {
            '13-17': '#a855f7',
            '18-24': '#6366f1',
            '25-30': '#22d3ee',
            '31-40': '#34d399',
            '41+':   '#fb923c'
        };
        const AGE_LABELS = {
            '13-17': 'Gen Alpha (13–17)',
            '18-24': 'Gen Z (18–24)',
            '25-30': 'Young Millennial (25–30)',
            '31-40': 'Millennial (31–40)',
            '41+':   'Gen X+ (41+)'
        };

        // Compute youth score = % of 13-17 + 18-24
        data.forEach(d => {
            d.youthScore = d.percentages['13-17'] + d.percentages['18-24'];
            d.displayName = d.slang_term.replace(/\b\w/g, c => c.toUpperCase());
        });

        // Sort: highest youth score on top
        data.sort((a, b) => b.youthScore - a.youthScore);

        const margin = { top: 20, right: 130, bottom: 48, left: 130 };
        const totalWidth = container.clientWidth || 800;
        const rowHeight = 36;
        const totalHeight = margin.top + data.length * rowHeight + margin.bottom;
        const width = totalWidth - margin.left - margin.right;
        const height = data.length * rowHeight;

        const svg = d3.select('#age-viz')
            .append('svg')
            .attr('width', totalWidth)
            .attr('height', totalHeight);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales
        const y = d3.scaleBand()
            .domain(data.map(d => d.slang_term))
            .range([0, height])
            .padding(0.35);

        const x = d3.scaleLinear().domain([0, 100]).range([0, width]);

        // Build stacked data structure
        const stack = d3.stack()
            .keys(AGE_GROUPS)
            .value((d, key) => d.percentages[key]);

        const series = stack(data);

        // Gridlines (subtle)
        g.append('g').attr('class', 'grid')
            .selectAll('line')
            .data([25, 50, 75, 100])
            .enter().append('line')
            .attr('x1', d => x(d)).attr('x2', d => x(d))
            .attr('y1', 0).attr('y2', height)
            .attr('stroke', 'rgba(255,255,255,0.07)')
            .attr('stroke-dasharray', '3,4');

        // Stacked bars — render at full correct widths
        const barGroups = {};
        series.forEach(layer => {
            const ageKey = layer.key;
            layer.forEach((d, rowIdx) => {
                if (!barGroups[rowIdx]) barGroups[rowIdx] = [];
                const rect = g.append('rect')
                    .attr('class', `age-bar age-bar-${ageKey.replace(/[^a-z]/gi, '')}`)
                    .attr('y', y(d.data.slang_term))
                    .attr('x', x(d[0]))
                    .attr('width', Math.max(0, x(d[1]) - x(d[0])))
                    .attr('height', y.bandwidth())
                    .attr('rx', 0)
                    .attr('fill', COLORS[ageKey])
                    .attr('opacity', 0)
                    .on('mousemove', function(event) {
                        const pct = d.data.percentages[ageKey];
                        const count = d.data.counts[ageKey].toLocaleString();
                        showAgeTooltip(event,
                            `<strong>${d.data.displayName}</strong><br>
                            <span style="color:${COLORS[ageKey]}">${AGE_LABELS[ageKey]}</span><br>
                            <span>${pct.toFixed(1)}% of users</span><br>
                            <span style="opacity:0.7">${count} observations</span>`
                        );
                    })
                    .on('mouseleave', hideAgeTooltip);
                barGroups[rowIdx].push(rect);
            });
        });

        // Stagger row reveal using setTimeout (reliable, no D3 transition conflicts)
        data.forEach((d, rowIdx) => {
            setTimeout(() => {
                (barGroups[rowIdx] || []).forEach(rect => rect.attr('opacity', 0.88));
            }, rowIdx * 35 + 80);
        });

        // Y-axis: term labels
        const yAxis = g.append('g').attr('class', 'y-axis');
        yAxis.selectAll('.term-label')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'term-label')
            .attr('x', -8)
            .attr('y', d => y(d.slang_term) + y.bandwidth() / 2)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'central')
            .attr('font-family', 'Outfit, sans-serif')
            .attr('font-size', '13px')
            .attr('font-weight', 600)
            .attr('fill', 'rgba(255,255,255,0.9)')
            .text(d => d.displayName);

        // Youth score indicator (right side)
        g.selectAll('.youth-score')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'youth-score')
            .attr('x', width + 10)
            .attr('y', d => y(d.slang_term) + y.bandwidth() / 2)
            .attr('dominant-baseline', 'central')
            .attr('font-family', 'DM Sans, sans-serif')
            .attr('font-size', '11.5px')
            .attr('font-weight', 500)
            .attr('fill', d => {
                if (d.youthScore > 62) return '#a855f7';
                if (d.youthScore > 58) return '#6366f1';
                return 'rgba(255,255,255,0.4)';
            })
            .text(d => `${d.youthScore.toFixed(0)}% <25`);

        // X-axis ticks at bottom
        const xAxisG = g.append('g').attr('transform', `translate(0,${height})`);
        xAxisG.selectAll('.x-tick')
            .data([0, 25, 50, 75, 100])
            .enter()
            .append('text')
            .attr('x', d => x(d))
            .attr('y', 18)
            .attr('text-anchor', 'middle')
            .attr('font-family', 'DM Sans, sans-serif')
            .attr('font-size', '11px')
            .attr('fill', 'rgba(255,255,255,0.35)')
            .text(d => d + '%');

        // Legend
        const legend = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${totalHeight - 14})`);

        AGE_GROUPS.forEach((ag, i) => {
            const lx = i * (width / AGE_GROUPS.length);
            legend.append('rect')
                .attr('x', lx).attr('y', -8)
                .attr('width', 10).attr('height', 10)
                .attr('rx', 2)
                .attr('fill', COLORS[ag]);
            legend.append('text')
                .attr('x', lx + 14).attr('y', 1)
                .attr('font-family', 'DM Sans, sans-serif')
                .attr('font-size', '11px')
                .attr('fill', 'rgba(255,255,255,0.6)')
                .text(ag);
        });

    }).catch(err => {
        console.error('Age group data load failed:', err);
        container.innerHTML = '<p style="color:#ff6b6b;padding:20px">Failed to load age group data.</p>';
    });
}

// --- Tooltip helpers ---
let ageTooltip = null;

function showAgeTooltip(event, html) {
    if (!ageTooltip) {
        ageTooltip = d3.select('body').append('div')
            .attr('class', 'tooltip age-tooltip')
            .style('pointer-events', 'none');
    }
    ageTooltip
        .style('display', 'block')
        .style('opacity', 0)
        .html(html)
        .transition().duration(120)
        .style('opacity', 1);

    ageTooltip
        .style('left', (event.pageX + 14) + 'px')
        .style('top',  (event.pageY - 28) + 'px');
}

function hideAgeTooltip() {
    if (ageTooltip) {
        ageTooltip.transition().duration(120).style('opacity', 0)
            .on('end', () => ageTooltip.style('display', 'none'));
    }
}
