/**
 * race.js — Bar Chart Race: Which Slang Term Leads?
 *
 * Lecture references:
 * - L5.2 Interactive D3: Transitions, easing, keyed data-joins for stable animation
 * - L12 Storytelling: Animation puts changing values in context over time
 * - L6.2 Marks & Channels: Length for quantitative (cumulative usage),
 *   hue as identity channel (each term gets a unique color)
 * - L7.2 Do's and Don'ts: zero baseline, horizontal labels, consistent color
 */

// Capitalize first letter of each word
function capitalize(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
}

function renderRace() {
    const container = document.getElementById('race-viz');
    container.innerHTML = '';

    const margin = { top: 20, right: 140, bottom: 50, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = Math.max(420, container.clientHeight - margin.top - margin.bottom);
    const numBars = 10;
    const rowHeight = height / numBars;
    const lineThickness = 5;
    const pillHeight = 30;
    const pillPadX = 14;  // horizontal padding inside the pill

    const svg = d3.select('#race-viz')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Date label — bottom-right, clearly visible
    const dateLabel = g.append('text')
        .attr('class', 'race-date-label')
        .attr('x', width - 10)
        .attr('y', height - 10)
        .attr('text-anchor', 'end')
        .style('font-family', 'Outfit, sans-serif')
        .style('font-size', '28px')
        .style('font-weight', '700')
        .style('fill', 'rgba(255,255,255,0.25)')
        .text('');

    // Bright term colors
    const termColors = [
        '#a78bfa', '#60a5fa', '#f97316', '#34d399', '#f472b6',
        '#facc15', '#2dd4bf', '#ef4444', '#818cf8', '#fb923c',
        '#4ade80', '#e879f9', '#38bdf8', '#fbbf24', '#a3e635',
        '#f87171', '#c084fc', '#22d3ee', '#fb7185', '#86efac'
    ];

    d3.json('data/slang_lifecycle.json').then(rawData => {
        const trajectory = rawData.trajectory;
        const summary = rawData.summary;

        // Build lookup for term info (for tooltip)
        const termInfo = {};
        summary.forEach(s => { termInfo[s.slang_term] = s; });

        const allMonths = [...new Set(trajectory.map(d => d.year_month))].sort();
        const allTerms = [...new Set(trajectory.map(d => d.slang_term))];

        // Assign stable color per term
        const colorMap = {};
        allTerms.sort().forEach((t, i) => {
            colorMap[t] = termColors[i % termColors.length];
        });

        // Build cumulative data
        const termMonthlyCount = {};
        allTerms.forEach(t => { termMonthlyCount[t] = {}; });
        trajectory.forEach(d => {
            termMonthlyCount[d.slang_term][d.year_month] = d.count;
        });

        const cumulativeData = {};
        allMonths.forEach((month, mi) => {
            cumulativeData[month] = {};
            allTerms.forEach(term => {
                let cumSum = 0;
                for (let j = 0; j <= mi; j++) {
                    cumSum += (termMonthlyCount[term][allMonths[j]] || 0);
                }
                cumulativeData[month][term] = cumSum;
            });
        });

        function getFrameData(month) {
            const entries = allTerms.map(t => ({
                term: t,
                value: cumulativeData[month][t],
                color: colorMap[t]
            }));
            entries.sort((a, b) => b.value - a.value);
            return entries.slice(0, numBars);
        }

        const xScale = d3.scaleLinear().range([0, width]);

        let currentIndex = 0;
        let playing = false;
        let hasPlayedOnce = false;
        let timer = null;

        const controls = d3.select('#race-controls');
        const playBtn = controls.select('.play-btn');
        const slider = controls.select('.time-slider');
        const monthLabel = controls.select('.current-month');

        slider.attr('min', 0).attr('max', allMonths.length - 1).attr('value', 0);

        function formatMonth(ym) {
            const [y, m] = ym.split('-');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return months[parseInt(m) - 1] + ' ' + y;
        }

        // Temporary text element to measure text width
        const measurer = svg.append('text')
            .style('font-family', 'Outfit, sans-serif')
            .style('font-size', '13px')
            .style('font-weight', '600')
            .style('visibility', 'hidden');

        function measureText(str) {
            measurer.text(str);
            return measurer.node().getComputedTextLength();
        }

        function updateChart(monthIdx, animate = true) {
            const month = allMonths[monthIdx];
            const data = getFrameData(month);
            const maxVal = d3.max(data, d => d.value) || 1;

            xScale.domain([0, maxVal * 1.1]);
            dateLabel.text(formatMonth(month));
            monthLabel.text(formatMonth(month));
            slider.property('value', monthIdx);

            const dur = animate ? 260 : 0;

            // DATA JOIN
            const rows = g.selectAll('.race-row')
                .data(data, d => d.term);

            // EXIT
            rows.exit()
                .transition().duration(dur)
                .style('opacity', 0)
                .remove();

            // ENTER — each row has: thin line, oval pill, label text, value text
            const enter = rows.enter()
                .append('g')
                .attr('class', 'race-row')
                .style('cursor', 'pointer')
                .style('opacity', 0);

            // Thin line
            enter.append('rect')
                .attr('class', 'race-line')
                .attr('y', rowHeight / 2 - lineThickness / 2)
                .attr('height', lineThickness)
                .attr('rx', lineThickness / 2)
                .attr('ry', lineThickness / 2)
                .attr('x', 0);

            // Oval pill background
            enter.append('rect')
                .attr('class', 'race-pill')
                .attr('y', rowHeight / 2 - pillHeight / 2)
                .attr('height', pillHeight)
                .attr('rx', pillHeight / 2)
                .attr('ry', pillHeight / 2);

            // Term label (inside pill)
            enter.append('text')
                .attr('class', 'race-pill-label')
                .attr('dy', '0.35em')
                .attr('y', rowHeight / 2)
                .attr('text-anchor', 'middle')
                .style('font-family', 'Outfit, sans-serif')
                .style('font-size', '13px')
                .style('font-weight', '600')
                .style('fill', '#fff');

            // Value after pill
            enter.append('text')
                .attr('class', 'race-value')
                .attr('dy', '0.35em')
                .attr('y', rowHeight / 2)
                .attr('text-anchor', 'start')
                .style('font-family', 'DM Sans, sans-serif')
                .style('font-size', '13px')
                .style('font-weight', '500')
                .style('fill', 'rgba(255,255,255,0.55)');

            // MERGE
            const merged = enter.merge(rows);

            // Position rows vertically
            merged.transition().duration(dur)
                .ease(d3.easeLinear)
                .style('opacity', 1)
                .attr('transform', (d, i) => `translate(0, ${i * rowHeight})`);

            // Update thin line
            merged.select('.race-line')
                .transition().duration(dur)
                .ease(d3.easeLinear)
                .attr('width', d => Math.max(0, xScale(d.value)))
                .attr('fill', d => d.color);

            // Update pill and label
            merged.each(function(d) {
                const group = d3.select(this);
                const label = capitalize(d.term);
                const textW = measureText(label);
                const pillW = textW + pillPadX * 2;
                const barEnd = xScale(d.value);

                // Pill sits at end of line
                group.select('.race-pill')
                    .transition().duration(dur)
                    .attr('x', Math.max(0, barEnd - pillW))
                    .attr('width', pillW)
                    .attr('fill', d.color);

                group.select('.race-pill-label')
                    .text(label)
                    .transition().duration(dur)
                    .attr('x', Math.max(pillW / 2, barEnd - pillW / 2));

                group.select('.race-value')
                    .text(d.value > 0 ? d.value.toLocaleString() : '')
                    .transition().duration(dur)
                    .attr('x', barEnd + 8);
            });

            // Rank labels on left
            const ranks = g.selectAll('.race-rank')
                .data(data, d => d.term);

            ranks.exit().remove();

            const rankEnter = ranks.enter()
                .append('text')
                .attr('class', 'race-rank');

            rankEnter.merge(ranks)
                .transition().duration(dur)
                .attr('x', -10)
                .attr('y', (d, i) => i * rowHeight + rowHeight / 2)
                .attr('dy', '0.35em')
                .attr('text-anchor', 'end')
                .text((d, i) => '#' + (i + 1))
                .style('fill', 'rgba(255,255,255,0.3)')
                .style('font-family', 'Outfit, sans-serif')
                .style('font-size', '12px')
                .style('font-weight', '600');

            // Hover for tooltips
            merged.on('mouseover', function(event, d) {
                const info = termInfo[d.term] || {};
                tooltip
                    .style('display', 'block')
                    .style('opacity', 1)
                    .html(`
                        <strong>${capitalize(d.term)}</strong><br>
                        <em>"${info.term_meaning || ''}"</em><br>
                        Cumulative usage: ${d.value.toLocaleString()}<br>
                        Sentiment: ${info.avg_sentiment != null ? (info.avg_sentiment > 0 ? '+' : '') + info.avg_sentiment.toFixed(2) : 'N/A'}<br>
                        Peak: ${info.peak_month || 'N/A'}<br>
                        Origin: ${info.top_origin || 'N/A'}
                    `)
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 15) + 'px');

                d3.select(this).select('.race-pill')
                    .transition().duration(150)
                    .attr('filter', 'brightness(1.3)')
                    .style('filter', 'brightness(1.3)');
            })
            .on('mousemove', function(event) {
                tooltip
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 15) + 'px');
            })
            .on('mouseout', function() {
                tooltip.style('opacity', 0).style('display', 'none');
                d3.select(this).select('.race-pill')
                    .transition().duration(150)
                    .attr('filter', null)
                    .style('filter', null);
            });
        }

        // Play/pause logic
        function play() {
            if (playing) return;
            playing = true;
            playBtn.text('⏸');

            function step() {
                if (!playing) return;
                if (currentIndex >= allMonths.length - 1) {
                    stop();
                    hasPlayedOnce = true;
                    return;
                }
                currentIndex++;
                updateChart(currentIndex, true);
                timer = setTimeout(step, 280);
            }
            step();
        }

        function stop() {
            playing = false;
            playBtn.text('▶');
            if (timer) clearTimeout(timer);
        }

        playBtn.on('click', function() {
            if (playing) {
                stop();
            } else {
                if (currentIndex >= allMonths.length - 1) {
                    currentIndex = 0;
                }
                play();
            }
        });

        slider.on('input', function() {
            stop();
            currentIndex = +this.value;
            updateChart(currentIndex, false);
        });

        // Initial render
        updateChart(0, false);

        // Auto-play on first view
        setTimeout(() => {
            if (!hasPlayedOnce) {
                play();
            }
        }, 600);
    }).catch(err => {
        console.error('Race chart error:', err);
        container.innerHTML = '<p style="color:#ff6b6b;padding:1rem">Failed to load race data.</p>';
    });
}
