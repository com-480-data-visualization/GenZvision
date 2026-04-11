/**
 * bubbles.js — Term Lifecycle Bubble Chart (D3.js)
 *
 * Lecture references:
 * - L5.2 Interactive D3: Transitions ("D3 abstracts complexity for smooth transitions
 *   when data changes"), .transition().duration().ease() pattern, D3 easing functions,
 *   adding keys to data-join for stable animations.
 * - L10 Graphs: Force-directed layouts ("adapted from Physics, with vertices as
 *   repulsive magnets and edges as springs") for positioning bubbles.
 * - L12 Storytelling: Linear narrative structure from Freytag's pyramid;
 *   "put numbers and facts in context"; "don't let the reader wondering, take a side".
 * - L6.2 Marks & Channels: Area for quantitative encoding (total usage),
 *   hue as identity channel for lifecycle phase (categorical).
 */

function renderBubbles() {
    const container = document.getElementById('bubble-viz');
    container.innerHTML = '';

    const margin = { top: 30, right: 30, bottom: 30, left: 30 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = Math.max(400, container.clientHeight - margin.top - margin.bottom);

    const svg = d3.select('#bubble-viz')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Phase colors (L6.2: hue as identity channel for categorical data)
    const phaseColors = {
        'growing': '#2ecc71',
        'peak': '#e74c3c',
        'declining': '#f39c12',
        'dormant': '#95a5a6',
        'niche': '#3498db'
    };

    d3.json('data/slang_lifecycle.json').then(rawData => {
        const data = rawData.summary;

        // Size scale (L6.2: area for quantitative encoding)
        const maxUsage = d3.max(data, d => d.total_usage);
        const radiusScale = d3.scaleSqrt()
            .domain([0, maxUsage])
            .range([8, 55]);

        // Position each bubble using force simulation (L10: force-directed layout)
        const nodes = data.map(d => ({
            ...d,
            radius: radiusScale(d.total_usage),
            x: width / 2 + (Math.random() - 0.5) * 200,
            y: height / 2 + (Math.random() - 0.5) * 200
        }));

        const simulation = d3.forceSimulation(nodes)
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('charge', d3.forceManyBody().strength(5))
            .force('collision', d3.forceCollide().radius(d => d.radius + 3).strength(0.8))
            .force('x', d3.forceX(width / 2).strength(0.03))
            .force('y', d3.forceY(height / 2).strength(0.03))
            .stop();

        // Run simulation (L10: computationally solving layout as optimization)
        for (let i = 0; i < 200; i++) simulation.tick();

        // Draw bubbles with transition (L5.2: D3 transitions)
        const bubbleGroups = svg.selectAll('.bubble')
            .data(nodes, d => d.slang_term)
            .enter()
            .append('g')
            .attr('class', 'bubble')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        bubbleGroups.append('circle')
            .attr('r', 0)
            .attr('fill', d => phaseColors[d.dominant_phase] || '#666')
            .attr('opacity', 0.75)
            .attr('stroke', 'rgba(255,255,255,0.15)')
            .attr('stroke-width', 1)
            .transition()
            .duration(800)
            .delay((d, i) => i * 30)
            .ease(d3.easeCubicOut)
            .attr('r', d => d.radius);

        // Labels for larger bubbles
        bubbleGroups.filter(d => d.radius > 18)
            .append('text')
            .attr('class', 'bubble-label')
            .text(d => d.slang_term)
            .style('font-size', d => Math.max(9, d.radius / 3) + 'px')
            .style('opacity', 0)
            .transition()
            .duration(600)
            .delay((d, i) => 400 + i * 30)
            .style('opacity', 1);

        // Tooltip on hover (L5.1: details on demand from Shneiderman's mantra)
        bubbleGroups
            .on('mouseover', function (event, d) {
                d3.select(this).select('circle')
                    .transition().duration(200)
                    .attr('opacity', 1)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 2);

                tooltip
                    .style('display', 'block')
                    .style('opacity', 1)
                    .html(`
                        <strong>${d.slang_term}</strong><br>
                        <em>"${d.term_meaning}"</em><br>
                        Category: ${d.term_category}<br>
                        Phase: <span style="color:${phaseColors[d.dominant_phase]}">${d.dominant_phase}</span><br>
                        Total usage: ${d.total_usage.toLocaleString()}<br>
                        Peak: ${d.peak_month}<br>
                        Sentiment: ${d.avg_sentiment > 0 ? '+' : ''}${d.avg_sentiment.toFixed(2)}<br>
                        Origin: ${d.top_origin} &rarr; ${d.top_usage_platform}
                    `)
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 15) + 'px');
            })
            .on('mousemove', function (event) {
                tooltip
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 15) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this).select('circle')
                    .transition().duration(200)
                    .attr('opacity', 0.75)
                    .attr('stroke', 'rgba(255,255,255,0.15)')
                    .attr('stroke-width', 1);
                tooltip.style('opacity', 0).style('display', 'none');
            });

        // Legend (L7.2: consistent colors, proper labeling)
        const legend = svg.append('g')
            .attr('transform', `translate(${width - 140}, 10)`);

        const phases = Object.entries(phaseColors);
        phases.forEach(([phase, color], i) => {
            const g = legend.append('g')
                .attr('transform', `translate(0, ${i * 22})`);
            g.append('circle')
                .attr('r', 6)
                .attr('fill', color)
                .attr('opacity', 0.8);
            g.append('text')
                .attr('x', 14)
                .attr('dy', '0.35em')
                .text(phase.charAt(0).toUpperCase() + phase.slice(1))
                .style('font-size', '11px')
                .style('fill', '#a0a0b0');
        });

        legend.append('text')
            .attr('y', -12)
            .text('Lifecycle Phase')
            .style('font-size', '10px')
            .style('fill', '#a0a0b0')
            .style('font-weight', '600');
    });
}
