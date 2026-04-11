/**
 * timeline.js — Interactive Timeline Heatmap (D3.js)
 *
 * Lecture references:
 * - L5.2 Interactive D3: d3.scaleLinear/d3.scaleSequential for mapping data to visual range,
 *   d3.axisLeft/Bottom for labeled axes, margin convention for proper label placement.
 * - L6.1 Perception & Color: Sequential colormaps for proportional change in lightness
 *   with hue shift; avoiding perceptually non-uniform scales.
 * - L6.2 Marks & Channels: Position (strongest channel) for time axis,
 *   luminance/saturation for intensity encoding; expressiveness principle.
 */

function renderTimeline() {
    const container = document.getElementById('timeline-viz');
    container.innerHTML = '';

    const margin = { top: 30, right: 40, bottom: 80, left: 120 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = Math.max(400, container.clientHeight - margin.top - margin.bottom);

    const svg = d3.select('#timeline-viz')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    d3.json('data/slang_timeline.json').then(data => {
        // Get top 15 terms by total count
        const termTotals = d3.rollup(data, v => d3.sum(v, d => d.count), d => d.slang_term);
        const topTerms = Array.from(termTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(d => d[0]);

        const filtered = data.filter(d => topTerms.includes(d.slang_term));

        // Get all unique months, sorted
        const allMonths = [...new Set(data.map(d => d.year_month))].sort();

        // Build lookup map
        const lookup = new Map();
        filtered.forEach(d => {
            lookup.set(`${d.slang_term}-${d.year_month}`, d);
        });

        // Scales (L5.2: mapping input domain to output range)
        const xScale = d3.scaleBand()
            .domain(allMonths)
            .range([0, width])
            .padding(0.02);

        const yScale = d3.scaleBand()
            .domain(topTerms)
            .range([0, height])
            .padding(0.08);

        const maxCount = d3.max(filtered, d => d.count);

        // Sequential colormap (L6.1: proportional change in lightness with hue shift)
        const colorScale = d3.scaleSequential()
            .domain([0, maxCount])
            .interpolator(d3.interpolateYlOrRd);

        // Draw cells
        const cells = [];
        topTerms.forEach(term => {
            allMonths.forEach(month => {
                const key = `${term}-${month}`;
                const record = lookup.get(key);
                cells.push({
                    term,
                    month,
                    count: record ? record.count : 0,
                    avg_sentiment: record ? record.avg_sentiment : 0,
                    avg_intensity: record ? record.avg_intensity : 0
                });
            });
        });

        svg.selectAll('.cell')
            .data(cells)
            .enter()
            .append('rect')
            .attr('class', 'cell')
            .attr('x', d => xScale(d.month))
            .attr('y', d => yScale(d.term))
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('rx', 1)
            .attr('fill', d => d.count === 0 ? 'rgba(255,255,255,0.02)' : colorScale(d.count))
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                if (d.count === 0) return;
                d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1.5);
                tooltip
                    .style('display', 'block')
                    .style('opacity', 1)
                    .html(`
                        <strong>${d.term}</strong><br>
                        ${d.month}<br>
                        Usage: ${d.count.toLocaleString()}<br>
                        Avg sentiment: ${d.avg_sentiment.toFixed(2)}<br>
                        Avg intensity: ${d.avg_intensity.toFixed(2)}
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
                d3.select(this).attr('stroke', 'none');
                tooltip.style('opacity', 0).style('display', 'none');
            });

        // X-axis: show every 6th month (L5.2: axis generation)
        const xAxisMonths = allMonths.filter((_, i) => i % 6 === 0);
        const xAxis = d3.axisBottom(xScale)
            .tickValues(xAxisMonths)
            .tickSize(0);

        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis)
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end')
            .attr('dx', '-0.5em')
            .attr('dy', '0.5em');

        // Y-axis
        const yAxis = d3.axisLeft(yScale).tickSize(0);
        svg.append('g')
            .attr('class', 'axis')
            .call(yAxis)
            .selectAll('text')
            .style('font-size', '11px');

        // Color legend
        const legendWidth = 200;
        const legendHeight = 10;
        const legendX = width - legendWidth - 10;

        const legendScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .ticks(4)
            .tickFormat(d3.format(','));

        const defs = svg.append('defs');
        const linearGradient = defs.append('linearGradient')
            .attr('id', 'heatmap-gradient');

        linearGradient.selectAll('stop')
            .data(d3.range(0, 1.01, 0.1))
            .enter()
            .append('stop')
            .attr('offset', d => d * 100 + '%')
            .attr('stop-color', d => colorScale(d * maxCount));

        svg.append('rect')
            .attr('x', legendX)
            .attr('y', -25)
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .attr('rx', 3)
            .style('fill', 'url(#heatmap-gradient)');

        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(${legendX},-15)`)
            .call(legendAxis)
            .selectAll('text')
            .style('font-size', '9px');

        svg.append('text')
            .attr('x', legendX - 5)
            .attr('y', -16)
            .attr('text-anchor', 'end')
            .style('font-size', '10px')
            .style('fill', 'var(--text-secondary)')
            .text('Monthly usage');
    });
}
