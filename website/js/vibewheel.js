/**
 * vibewheel.js — "The Vibe Wheel" — Animated radial sunburst
 * Inner ring = 17 usage contexts (sectors)
 * Outer = top 3 slang terms per context as labeled bubbles
 * One-time entrance spin, then static. Hover highlights a sector.
 * Bubble color = dominant age group with clear legend.
 */

function renderVibeWheel() {
    const container = document.getElementById('vibe-viz');
    if (!container) return;

    d3.json('data/vibe_wheel_data.json').then(data => {
        container.innerHTML = '';

        // --- Constants ---
        const SIZE = Math.min(container.clientWidth, 720);
        const cx = SIZE / 2, cy = SIZE / 2;
        const INNER_R = SIZE * 0.13;
        const MID_R = SIZE * 0.26;
        const OUTER_R = SIZE * 0.46;
        const TERMS_PER_CTX = 3; // Only top 3 per context

        const AGE_COLORS = {
            '13-17': '#a855f7', '18-24': '#6366f1', '25-30': '#22d3ee',
            '31-40': '#34d399', '41+': '#fb923c'
        };
        const AGE_LABELS = {
            '13-17': '13–17', '18-24': '18–24', '25-30': '25–30',
            '31-40': '31–40', '41+': '41+'
        };
        const SENT_COLORS = { positive: '#2ecc71', neutral: '#f1c40f', negative: '#e74c3c' };

        const CTX_META = {
            casual_conversation: { label: 'Casual', icon: '💬' },
            criticism: { label: 'Criticism', icon: '👎' },
            meme_reference: { label: 'Memes', icon: '🐸' },
            commenting: { label: 'Comments', icon: '💭' },
            food_related: { label: 'Food', icon: '🍕' },
            gaming: { label: 'Gaming', icon: '🎮' },
            celebrity_gossip: { label: 'Celeb', icon: '⭐' },
            news_reaction: { label: 'News', icon: '📰' },
            self_description: { label: 'Self', icon: '🪞' },
            reaction: { label: 'Reactions', icon: '😱' },
            fashion_beauty: { label: 'Fashion', icon: '👗' },
            storytelling: { label: 'Stories', icon: '📖' },
            compliment: { label: 'Compliments', icon: '💖' },
            dating_context: { label: 'Dating', icon: '💘' },
            music_discussion: { label: 'Music', icon: '🎵' },
            work_school: { label: 'Work', icon: '💼' },
            humor: { label: 'Humor', icon: '😂' }
        };

        // Neon sector palette
        const sectorColors = d3.scaleOrdinal()
            .domain(data.map(d => d.context))
            .range([
                '#a855f7', '#ec4899', '#6366f1', '#3b82f6', '#22d3ee',
                '#14b8a6', '#34d399', '#a3e635', '#facc15', '#fb923c',
                '#f87171', '#e879f9', '#818cf8', '#38bdf8', '#2dd4bf',
                '#84cc16', '#fbbf24'
            ]);

        // --- SVG setup ---
        const svg = d3.select('#vibe-viz')
            .append('svg')
            .attr('width', SIZE)
            .attr('height', SIZE)
            .attr('viewBox', `0 0 ${SIZE} ${SIZE}`);

        // Glow filters
        const defs = svg.append('defs');
        ['positive', 'neutral', 'negative'].forEach(s => {
            const filter = defs.append('filter').attr('id', `glow-${s}`)
                .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
            filter.append('feGaussianBlur').attr('stdDeviation', 5).attr('result', 'blur');
            filter.append('feFlood').attr('flood-color', SENT_COLORS[s]).attr('flood-opacity', 0.35);
            filter.append('feComposite').attr('in2', 'blur').attr('operator', 'in');
            const merge = filter.append('feMerge');
            merge.append('feMergeNode');
            merge.append('feMergeNode').attr('in', 'SourceGraphic');
        });

        // Master wheel group
        const wheelGroup = svg.append('g')
            .attr('class', 'wheel-group');

        // --- Center label ---
        const centerGroup = svg.append('g')
            .attr('transform', `translate(${cx}, ${cy})`)
            .style('pointer-events', 'none');

        centerGroup.append('circle')
            .attr('r', INNER_R - 4)
            .attr('fill', 'rgba(10,10,15,0.92)')
            .attr('stroke', 'rgba(255,255,255,0.08)')
            .attr('stroke-width', 1);

        centerGroup.append('text')
            .attr('text-anchor', 'middle').attr('y', -6)
            .attr('font-family', 'Outfit, sans-serif').attr('font-size', '14px')
            .attr('font-weight', 700).attr('fill', 'rgba(255,255,255,0.9)')
            .text('VIBE');
        centerGroup.append('text')
            .attr('text-anchor', 'middle').attr('y', 12)
            .attr('font-family', 'Outfit, sans-serif').attr('font-size', '14px')
            .attr('font-weight', 700).attr('fill', 'rgba(255,255,255,0.9)')
            .text('WHEEL');
        centerGroup.append('text')
            .attr('text-anchor', 'middle').attr('y', 28)
            .attr('font-family', 'DM Sans, sans-serif').attr('font-size', '8px')
            .attr('fill', 'rgba(255,255,255,0.3)')
            .text('hover a sector');

        // --- Arcs ---
        const arc = d3.arc()
            .innerRadius(INNER_R).outerRadius(MID_R)
            .padAngle(0.02).cornerRadius(3);

        const pie = d3.pie()
            .value(d => d.total_usage).sort(null)
            .startAngle(-Math.PI / 2).endAngle(3 * Math.PI / 2);

        const arcs = pie(data);

        // Sentiment aura arcs
        const auraArc = d3.arc()
            .innerRadius(MID_R).outerRadius(MID_R + 10)
            .padAngle(0.02).cornerRadius(3);

        // Draw auras
        wheelGroup.selectAll('.aura')
            .data(arcs).enter().append('path')
            .attr('class', 'aura')
            .attr('d', auraArc)
            .attr('fill', d => {
                const s = d.data.sentiment;
                const top = Object.entries(s).sort((a, b) => b[1] - a[1])[0][0];
                return SENT_COLORS[top];
            })
            .attr('opacity', 0.2)
            .style('filter', d => {
                const s = d.data.sentiment;
                const top = Object.entries(s).sort((a, b) => b[1] - a[1])[0][0];
                return `url(#glow-${top})`;
            });

        // Draw sectors
        const sectors = wheelGroup.selectAll('.sector')
            .data(arcs).enter().append('g').attr('class', 'sector');

        sectors.append('path')
            .attr('class', 'sector-arc')
            .attr('d', arc)
            .attr('fill', d => sectorColors(d.data.context))
            .attr('opacity', 0.75)
            .attr('stroke', 'rgba(255,255,255,0.12)')
            .attr('stroke-width', 0.5)
            .style('cursor', 'pointer')
            .style('transition', 'opacity 0.3s ease');

        // Sector labels (on the arc, following curve direction)
        sectors.append('text')
            .attr('transform', d => {
                const [lx, ly] = arc.centroid(d);
                let deg = ((d.startAngle + d.endAngle) / 2) * 180 / Math.PI;
                const flip = deg > 90 && deg < 270;
                return `translate(${lx},${ly}) rotate(${flip ? deg + 180 : deg})`;
            })
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
            .attr('font-family', 'Outfit, sans-serif').attr('font-size', '9px')
            .attr('font-weight', 600).attr('fill', 'rgba(255,255,255,0.92)')
            .attr('pointer-events', 'none')
            .text(d => {
                const meta = CTX_META[d.data.context];
                return meta ? `${meta.icon} ${meta.label}` : d.data.context;
            });

        // --- Term labels radiating outward (top 3 per context) ---
        const bubbleGroup = wheelGroup.append('g').attr('class', 'term-labels');
        const bubbleScale = d3.scaleSqrt()
            .domain([0, d3.max(data.flatMap(d => d.terms.slice(0, TERMS_PER_CTX).map(t => t.count)))])
            .range([7, 20]);

        arcs.forEach(arcData => {
            const ctx = arcData.data;
            const terms = ctx.terms.slice(0, TERMS_PER_CTX); // Only top 3
            const midAngle = (arcData.startAngle + arcData.endAngle) / 2;
            const sectorSpan = arcData.endAngle - arcData.startAngle;

            terms.forEach((t, ti) => {
                // Spread the 3 terms across the sector angle
                const angleOffset = (ti / (TERMS_PER_CTX - 1 || 1) - 0.5) * sectorSpan * 0.55;
                const termAngle = midAngle + angleOffset;
                // Stagger radially: 1st closest, 3rd farthest
                const termR = MID_R + 20 + ti * ((OUTER_R - MID_R - 16) / TERMS_PER_CTX);
                const bx = Math.cos(termAngle - Math.PI / 2) * termR;
                const by = Math.sin(termAngle - Math.PI / 2) * termR;
                const r = bubbleScale(t.count);

                const displayName = t.term.replace(/\b\w/g, c => c.toUpperCase());

                const bubbleG = bubbleGroup.append('g')
                    .attr('class', 'term-bubble')
                    .attr('transform', `translate(${bx},${by})`)
                    .style('cursor', 'pointer')
                    .datum({ ...t, context: ctx.context });

                // Glow
                bubbleG.append('circle')
                    .attr('r', r + 3)
                    .attr('fill', AGE_COLORS[t.dominant_age] || '#666')
                    .attr('opacity', 0.12);

                // Main circle
                bubbleG.append('circle')
                    .attr('class', 'bubble-main')
                    .attr('r', r)
                    .attr('fill', AGE_COLORS[t.dominant_age] || '#666')
                    .attr('opacity', 0.85)
                    .attr('stroke', 'rgba(255,255,255,0.25)')
                    .attr('stroke-width', 0.8);

                // Term label — rotated 90° (radial, pointing outward)
                const labelAngleDeg = (termAngle * 180 / Math.PI) - 90;
                // Flip text on bottom half so it's always readable
                const flipLabel = labelAngleDeg > 90 && labelAngleDeg < 270;
                const finalRotation = flipLabel ? labelAngleDeg + 180 : labelAngleDeg;

                bubbleG.append('text')
                    .attr('text-anchor', flipLabel ? 'end' : 'start')
                    .attr('dominant-baseline', 'central')
                    .attr('x', flipLabel ? -(r + 5) : (r + 5))
                    .attr('font-family', 'Outfit, sans-serif')
                    .attr('font-size', '10px')
                    .attr('font-weight', 600)
                    .attr('fill', '#fff')
                    .attr('opacity', 0.9)
                    .attr('pointer-events', 'none')
                    .attr('transform', `rotate(${finalRotation})`)
                    .text(displayName);

                // Hover tooltip
                bubbleG.on('mousemove', function(event) {
                    const meta = CTX_META[ctx.context];
                    const ctxLabel = meta ? `${meta.icon} ${meta.label}` : ctx.context;
                    tooltip
                        .style('display', 'block').style('opacity', 1)
                        .html(`
                            <strong style="font-size:14px">${displayName}</strong><br>
                            <span style="opacity:0.6">in ${ctxLabel}</span><br>
                            <span style="color:${AGE_COLORS[t.dominant_age]}">● Age ${AGE_LABELS[t.dominant_age]}</span><br>
                            <span>${t.count.toLocaleString()} uses</span><br>
                            <span style="opacity:0.6">Intensity: ${(t.avg_intensity * 100).toFixed(0)}%</span><br>
                            <span style="opacity:0.6">Ironic: ${t.ironic_pct}%</span>
                        `)
                        .style('left', (event.pageX + 14) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                })
                .on('mouseleave', () => {
                    tooltip.style('display', 'none').style('opacity', 0);
                });
            });
        });

        // --- Age group legend (below the wheel) ---
        const legendY = SIZE - 20;
        const legendGroup = svg.append('g')
            .attr('class', 'age-legend')
            .attr('transform', `translate(${cx}, ${legendY})`);

        legendGroup.append('text')
            .attr('text-anchor', 'middle').attr('y', -16)
            .attr('font-family', 'DM Sans, sans-serif').attr('font-size', '10px')
            .attr('fill', 'rgba(255,255,255,0.4)')
            .text('Bubble color = dominant age group');

        const ageKeys = Object.keys(AGE_COLORS);
        const legendW = ageKeys.length * 72;
        ageKeys.forEach((ag, i) => {
            const lx = (i - (ageKeys.length - 1) / 2) * 72;
            legendGroup.append('circle')
                .attr('cx', lx - 12).attr('cy', 0).attr('r', 5)
                .attr('fill', AGE_COLORS[ag]);
            legendGroup.append('text')
                .attr('x', lx - 4).attr('y', 1)
                .attr('dominant-baseline', 'central')
                .attr('font-family', 'DM Sans, sans-serif').attr('font-size', '10px')
                .attr('font-weight', 500).attr('fill', 'rgba(255,255,255,0.7)')
                .text(AGE_LABELS[ag]);
        });

        // --- Sector hover: highlight + detail panel ---
        let hoveredCtx = null;
        const detailPanel = d3.select('#vibe-detail');

        sectors.selectAll('.sector-arc')
            .on('mouseenter', function(event, d) {
                hoveredCtx = d.data.context;

                wheelGroup.selectAll('.sector-arc')
                    .attr('opacity', dd => dd.data.context === hoveredCtx ? 1 : 0.2);
                wheelGroup.selectAll('.aura')
                    .attr('opacity', dd => dd.data.context === hoveredCtx ? 0.5 : 0.05);
                wheelGroup.selectAll('.term-bubble')
                    .style('opacity', function() {
                        return d3.select(this).datum().context === hoveredCtx ? 1 : 0.1;
                    });

                const meta = CTX_META[d.data.context] || { label: d.data.context, icon: '' };
                const sent = d.data.sentiment;
                const topTerms = d.data.terms.slice(0, 5)
                    .map(t => t.term.replace(/\b\w/g, c => c.toUpperCase()))
                    .join(' · ');

                if (detailPanel.node()) {
                    detailPanel.style('opacity', 1).html(`
                        <div class="vibe-detail-title">${meta.icon} ${meta.label}</div>
                        <div class="vibe-detail-stat">${d.data.total_usage.toLocaleString()} observations</div>
                        <div class="vibe-detail-bar">
                            <span class="vibe-sent-pos" style="width:${sent.positive}%"></span>
                            <span class="vibe-sent-neu" style="width:${sent.neutral}%"></span>
                            <span class="vibe-sent-neg" style="width:${sent.negative}%"></span>
                        </div>
                        <div class="vibe-detail-legend">
                            <span style="color:#2ecc71">● ${sent.positive?.toFixed(0)}% positive</span>
                            <span style="color:#f1c40f">● ${sent.neutral?.toFixed(0)}% neutral</span>
                            <span style="color:#e74c3c">● ${sent.negative?.toFixed(0)}% negative</span>
                        </div>
                        <div class="vibe-detail-terms">${topTerms}</div>
                    `);
                }
            })
            .on('mouseleave', function() {
                hoveredCtx = null;
                wheelGroup.selectAll('.sector-arc').attr('opacity', 0.75);
                wheelGroup.selectAll('.aura').attr('opacity', 0.2);
                wheelGroup.selectAll('.term-bubble').style('opacity', 1);
                if (detailPanel.node()) detailPanel.style('opacity', 0);
            });

        // --- Entrance animation: one-time spin then static ---
        wheelGroup.attr('opacity', 0);

        const SPIN_DURATION = 2000;
        const SPIN_STEPS = 60;
        const STEP_MS = SPIN_DURATION / SPIN_STEPS;
        let step = 0;

        function entranceStep() {
            step++;
            const t = Math.min(step / SPIN_STEPS, 1);
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            const angle = -360 * (1 - eased);
            const opacity = Math.min(eased * 2, 1);

            wheelGroup
                .attr('transform', `translate(${cx}, ${cy}) rotate(${angle})`)
                .attr('opacity', opacity);

            if (t < 1) setTimeout(entranceStep, STEP_MS);
        }
        setTimeout(entranceStep, 50);

    }).catch(err => {
        console.error('Vibe wheel data load error:', err);
        container.innerHTML = '<p style="color:#ff6b6b;padding:20px">Failed to load vibe wheel data.</p>';
    });
}
