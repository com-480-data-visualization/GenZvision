/**
 * bubbles.js — Animated Bubble Chart: Term Lifecycle & Popularity
 *
 * Lecture references:
 * - L5.2 Interactive D3: D3 transitions, easing, keyed data joins for
 *   stable animated updates when monthly data changes.
 * - L10 Graphs: Force-directed layouts ("adapted from Physics") for
 *   positioning bubbles without overlap.
 * - L6.2 Marks & Channels: Area encodes monthly usage (quantitative),
 *   hue encodes lifecycle phase (categorical identity channel).
 * - L12 Storytelling: Animation helps "put numbers and facts in context"
 *   by showing how terms grow, peak, and fade over time.
 * - L6.1 Perception & Color: Limited categorical palette with clearly
 *   distinguishable hues for the five lifecycle phases.
 */

function renderBubbles() {
    const container = document.getElementById('bubble-viz');
    container.innerHTML = '';

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = Math.max(420, container.clientHeight - margin.top - margin.bottom);

    const svg = d3.select('#bubble-viz')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Date label — bottom-right, clearly visible
    const dateLabel = g.append('text')
        .attr('x', width - 8)
        .attr('y', height - 8)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'auto')
        .style('font-family', 'Outfit, sans-serif')
        .style('font-size', '28px')
        .style('font-weight', '700')
        .style('fill', 'rgba(255,255,255,0.25)')
        .style('pointer-events', 'none')
        .text('');

    // Phase colors
    const phaseColors = {
        'growing':   '#2ecc71',
        'peak':      '#e74c3c',
        'declining': '#f39c12',
        'dormant':   '#636e72',
        'niche':     '#3498db',
        'legacy':    '#95a5a6'
    };

    d3.json('data/slang_lifecycle.json').then(rawData => {
        const trajectory = rawData.trajectory;
        const summary = rawData.summary;

        // Term info lookup
        const termInfo = {};
        summary.forEach(s => { termInfo[s.slang_term] = s; });

        // All months & all terms
        const allMonths = [...new Set(trajectory.map(d => d.year_month))].sort();
        const allTerms = [...new Set(trajectory.map(d => d.slang_term))];

        // Build monthly snapshots: { month -> [ {term, count, phase} ] }
        const monthData = {};
        allMonths.forEach(m => { monthData[m] = []; });
        trajectory.forEach(d => {
            monthData[d.year_month].push({
                term: d.slang_term,
                count: d.count,
                phase: d.phase || 'dormant'
            });
        });

        // Radius scale
        const maxCount = d3.max(trajectory, d => d.count);
        const radiusScale = d3.scaleSqrt()
            .domain([0, maxCount])
            .range([0, 52]);

        // Persistent node positions
        const nodePositions = {};
        allTerms.forEach(t => {
            nodePositions[t] = {
                x: width / 2 + (Math.random() - 0.5) * width * 0.6,
                y: height / 2 + (Math.random() - 0.5) * height * 0.6
            };
        });

        // State
        let currentIndex = 0;
        let playing = false;
        let hasPlayedOnce = false;
        let timer = null;
        let simulation = null;

        // Controls
        const controls = d3.select('#bubble-controls');
        const playBtn = controls.select('.play-btn');
        const slider = controls.select('.time-slider');
        const monthLabelEl = controls.select('.current-month');

        slider.attr('min', 0).attr('max', allMonths.length - 1).attr('value', 0);

        function formatMonth(ym) {
            const [y, m] = ym.split('-');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return months[parseInt(m) - 1] + ' ' + y;
        }

        function updateChart(monthIdx, animate = true) {
            const month = allMonths[monthIdx];
            const data = monthData[month].filter(d => d.count > 0);

            dateLabel.text(formatMonth(month));
            monthLabelEl.text(formatMonth(month));
            slider.property('value', monthIdx);

            const dur = animate ? 350 : 0;

            // Prepare nodes with previous positions
            const nodes = data.map(d => {
                const r = radiusScale(d.count);
                const pos = nodePositions[d.term];
                return {
                    term: d.term,
                    count: d.count,
                    phase: d.phase,
                    radius: r,
                    x: pos.x,
                    y: pos.y,
                    fx: null,
                    fy: null
                };
            });

            // Run quick force simulation for layout
            if (simulation) simulation.stop();

            simulation = d3.forceSimulation(nodes)
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('charge', d3.forceManyBody().strength(3))
                .force('collision', d3.forceCollide().radius(d => d.radius + 3).strength(0.85))
                .force('x', d3.forceX(width / 2).strength(0.04))
                .force('y', d3.forceY(height / 2).strength(0.04))
                .stop();

            for (let i = 0; i < 120; i++) simulation.tick();

            // Clamp positions
            nodes.forEach(n => {
                n.x = Math.max(n.radius + 5, Math.min(width - n.radius - 5, n.x));
                n.y = Math.max(n.radius + 5, Math.min(height - n.radius - 5, n.y));
                nodePositions[n.term] = { x: n.x, y: n.y };
            });

            // DATA JOIN
            const groups = g.selectAll('.bubble-group')
                .data(nodes, d => d.term);

            // EXIT
            groups.exit()
                .transition().duration(dur)
                .style('opacity', 0)
                .select('circle')
                .attr('r', 0);
            groups.exit().transition().duration(dur).remove();

            // ENTER
            const enter = groups.enter()
                .append('g')
                .attr('class', 'bubble-group')
                .attr('transform', d => `translate(${d.x},${d.y})`)
                .style('opacity', 0)
                .style('cursor', 'pointer');

            enter.append('circle')
                .attr('r', 0)
                .attr('stroke', 'rgba(255,255,255,0.2)')
                .attr('stroke-width', 1.5);

            enter.append('text')
                .attr('class', 'bubble-label')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .style('pointer-events', 'none')
                .style('font-weight', '600');

            // MERGE
            const merged = enter.merge(groups);

            merged.transition().duration(dur)
                .ease(d3.easeCubicOut)
                .style('opacity', 1)
                .attr('transform', d => `translate(${d.x},${d.y})`);

            merged.select('circle')
                .transition().duration(dur)
                .ease(d3.easeCubicOut)
                .attr('r', d => d.radius)
                .attr('fill', d => phaseColors[d.phase] || '#666')
                .attr('opacity', 0.75);

            merged.select('.bubble-label')
                .text(d => d.radius > 8 ? d.term.replace(/\b\w/g, c => c.toUpperCase()) : '')
                .style('font-size', d => {
                    // Shrink font so text always fits inside the bubble
                    const label = d.term.replace(/\b\w/g, c => c.toUpperCase());
                    const defaultSize = Math.max(8, d.radius / 3.2);
                    // Approximate: each char ~0.6em wide; text must fit in ~1.6 * radius
                    const maxWidth = d.radius * 1.6;
                    const textWidth = label.length * defaultSize * 0.6;
                    if (textWidth > maxWidth && maxWidth > 0) {
                        return Math.max(6, defaultSize * (maxWidth / textWidth)) + 'px';
                    }
                    return defaultSize + 'px';
                })
                .style('fill', '#fff');

            // Hover tooltip
            merged
                .on('mouseover', function(event, d) {
                    d3.select(this).select('circle')
                        .transition().duration(150)
                        .attr('opacity', 1)
                        .attr('stroke', '#fff')
                        .attr('stroke-width', 2.5);

                    const info = termInfo[d.term] || {};
                    const cap = d.term.replace(/\b\w/g, c => c.toUpperCase());
                    tooltip
                        .style('display', 'block')
                        .style('opacity', 1)
                        .html(`
                            <strong>${cap}</strong><br>
                            <em>"${info.term_meaning || ''}"</em><br>
                            Monthly usage: ${d.count.toLocaleString()}<br>
                            Phase: <span style="color:${phaseColors[d.phase]}">${d.phase}</span><br>
                            Total usage: ${(info.total_usage || 0).toLocaleString()}<br>
                            Sentiment: ${info.avg_sentiment != null ? (info.avg_sentiment > 0 ? '+' : '') + info.avg_sentiment.toFixed(2) : 'N/A'}<br>
                            Peak: ${info.peak_month || 'N/A'}<br>
                            Origin: ${info.top_origin || 'N/A'}
                        `)
                        .style('left', (event.pageX + 15) + 'px')
                        .style('top', (event.pageY - 15) + 'px');
                })
                .on('mousemove', function(event) {
                    tooltip
                        .style('left', (event.pageX + 15) + 'px')
                        .style('top', (event.pageY - 15) + 'px');
                })
                .on('mouseout', function() {
                    d3.select(this).select('circle')
                        .transition().duration(150)
                        .attr('opacity', 0.75)
                        .attr('stroke', 'rgba(255,255,255,0.2)')
                        .attr('stroke-width', 1.5);
                    tooltip.style('opacity', 0).style('display', 'none');
                });
        }

        // Legend
        const legend = g.append('g')
            .attr('transform', `translate(${width - 130}, 10)`);

        legend.append('text')
            .attr('y', -8)
            .text('Lifecycle Phase')
            .style('font-size', '10px')
            .style('fill', '#a0a0b0')
            .style('font-weight', '600');

        const phases = ['growing', 'peak', 'declining', 'niche', 'dormant'];
        phases.forEach((phase, i) => {
            const row = legend.append('g')
                .attr('transform', `translate(0, ${i * 22 + 10})`);
            row.append('circle')
                .attr('r', 6)
                .attr('fill', phaseColors[phase])
                .attr('opacity', 0.8);
            row.append('text')
                .attr('x', 14)
                .attr('dy', '0.35em')
                .text(phase.charAt(0).toUpperCase() + phase.slice(1))
                .style('font-size', '11px')
                .style('fill', '#a0a0b0');
        });

        // Play / pause
        function play() {
            if (playing) return;
            playing = true;
            playBtn.text('⏸');

            function step() {
                if (!playing) return;
                if (currentIndex >= allMonths.length - 1) {
                    stopAnim();
                    hasPlayedOnce = true;
                    return;
                }
                currentIndex++;
                updateChart(currentIndex, true);
                timer = setTimeout(step, 380);
            }
            step();
        }

        function stopAnim() {
            playing = false;
            playBtn.text('▶');
            if (timer) clearTimeout(timer);
        }

        playBtn.on('click', function() {
            if (playing) {
                stopAnim();
            } else {
                if (currentIndex >= allMonths.length - 1) {
                    currentIndex = 0;
                }
                play();
            }
        });

        slider.on('input', function() {
            stopAnim();
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
        console.error('Bubble chart error:', err);
        container.innerHTML = '<p style="color:#ff6b6b;padding:1rem">Failed to load lifecycle data.</p>';
    });
}
