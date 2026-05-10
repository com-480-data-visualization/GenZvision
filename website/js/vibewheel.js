/**
 * vibewheel.js — "The Slang Life Wheel"
 * Multi-ring radial chart inspired by "Life 1984-2011" visualization.
 *
 * Ring 1 (inner):  17 usage-context arcs — vivid color identity
 * Ring 2:          Top-3 slang terms per sector — sub-arcs, width ∝ usage
 * Ring 3:          Thin sentiment stripe (pos / neu / neg)
 * Ring 4 (outer):  5 individual age-group bars per sector (varied heights!)
 * Center:          Dark hub with title
 * Entrance:        Rings fade + scale in one by one
 */

function renderVibeWheel() {
    const container = document.getElementById('vibe-viz');
    if (!container) return;

    d3.json('data/vibe_wheel_data.json').then(data => {
        container.innerHTML = '';

        /* ──────────────────────── DIMENSIONS ──────────────────────── */
        const SIZE = Math.min(container.clientWidth, container.clientHeight, 760);
        const cx = SIZE / 2, cy = SIZE / 2;

        // Ring radii (proportional)
        const HUB    = SIZE * 0.07;
        const R1i    = SIZE * 0.08;
        const R1o    = SIZE * 0.165;
        const R2i    = SIZE * 0.175;
        const R2o    = SIZE * 0.28;
        const R3i    = SIZE * 0.285;
        const R3o    = SIZE * 0.305;
        const R4base = SIZE * 0.315;
        const R4max  = SIZE * 0.47;

        /* ──────────────────────── CONSTANTS ──────────────────────── */
        const AGE_GROUPS = ['13-17','18-24','25-30','31-40','41+'];
        const AGE_COLORS = { '13-17':'#c084fc','18-24':'#818cf8','25-30':'#22d3ee','31-40':'#34d399','41+':'#fb923c' };
        const AGE_LABELS = { '13-17':'13–17','18-24':'18–24','25-30':'25–30','31-40':'31–40','41+':'41+' };
        const SENT_COLORS = { positive:'#34d399', neutral:'#fbbf24', negative:'#f87171' };

        const CTX_SHORT = {
            casual_conversation:'Casual', criticism:'Criticism', meme_reference:'Memes',
            commenting:'Comments', food_related:'Food', gaming:'Gaming',
            celebrity_gossip:'Celeb', news_reaction:'News', self_description:'Self',
            reaction:'Reactions', fashion_beauty:'Fashion', storytelling:'Stories',
            compliment:'Compliments', dating_context:'Dating', music_discussion:'Music',
            work_school:'Work', humor:'Humor'
        };

        // Rich sector palette
        const PALETTE = [
            '#ef4444','#ec4899','#a855f7','#7c3aed','#6366f1',
            '#3b82f6','#0ea5e9','#14b8a6','#10b981','#84cc16',
            '#eab308','#f97316','#f43f5e','#d946ef','#8b5cf6',
            '#06b6d4','#22c55e'
        ];
        const sectorColor = d3.scaleOrdinal().domain(data.map(d => d.context)).range(PALETTE);

        /* ──────────────────────── SVG ──────────────────────── */
        const svg = d3.select('#vibe-viz')
            .append('svg')
            .attr('width', SIZE)
            .attr('height', SIZE)
            .attr('viewBox', `0 0 ${SIZE} ${SIZE}`);

        // Filters & gradients
        const defs = svg.append('defs');
        const glow = defs.append('filter').attr('id', 'wheel-glow')
            .attr('x', '-30%').attr('y', '-30%').attr('width', '160%').attr('height', '160%');
        glow.append('feGaussianBlur').attr('stdDeviation', 4).attr('result', 'blur');
        glow.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

        const hubGrad = defs.append('radialGradient').attr('id', 'hub-grad');
        hubGrad.append('stop').attr('offset', '0%').attr('stop-color', '#1e1b4b');
        hubGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0a0a0f');

        const mainG = svg.append('g').attr('transform', `translate(${cx},${cy})`);

        /* ──────────────────────── PIE LAYOUT ──────────────────────── */
        const pie = d3.pie().value(() => 1).sort(null).padAngle(0.018);
        const arcs = pie(data);

        /* ═══════════════ CENTER HUB ═══════════════ */
        const hubG = mainG.append('g').attr('class', 'hub');
        hubG.append('circle').attr('r', HUB)
            .attr('fill', 'url(#hub-grad)')
            .attr('stroke', 'rgba(255,255,255,0.1)').attr('stroke-width', 1.5);
        hubG.append('text').attr('text-anchor', 'middle').attr('y', -7)
            .attr('font-family', 'Outfit').attr('font-size', '12px')
            .attr('font-weight', 700).attr('fill', '#fff').attr('letter-spacing', '2px')
            .text('VIBE');
        hubG.append('text').attr('text-anchor', 'middle').attr('y', 8)
            .attr('font-family', 'Outfit').attr('font-size', '12px')
            .attr('font-weight', 700).attr('fill', '#fff').attr('letter-spacing', '2px')
            .text('WHEEL');
        hubG.append('text').attr('text-anchor', 'middle').attr('y', 22)
            .attr('font-family', 'DM Sans').attr('font-size', '6.5px')
            .attr('fill', 'rgba(255,255,255,0.3)').text('hover a sector');

        /* ═══════════════ RING 1 — Context Arcs ═══════════════ */
        const ring1G = mainG.append('g').attr('class', 'ring1').attr('opacity', 0);
        const arcR1 = d3.arc().innerRadius(R1i).outerRadius(R1o).cornerRadius(3);

        ring1G.selectAll('.ctx-arc').data(arcs).enter().append('path')
            .attr('class', 'ctx-arc')
            .attr('d', arcR1)
            .attr('fill', d => sectorColor(d.data.context))
            .attr('opacity', 0.88)
            .attr('stroke', 'rgba(0,0,0,0.5)').attr('stroke-width', 1)
            .style('cursor', 'pointer');

        // Context labels — radial, 90° rotated, bottom-half flipped
        ring1G.selectAll('.ctx-label').data(arcs).enter().append('text')
            .attr('class', 'ctx-label')
            .attr('transform', d => {
                const mid = (d.startAngle + d.endAngle) / 2;
                const r = (R1i + R1o) / 2;
                const x = Math.cos(mid - Math.PI/2) * r;
                const y = Math.sin(mid - Math.PI/2) * r;
                const deg = mid * 180 / Math.PI;
                const flip = deg > 180;
                return `translate(${x},${y}) rotate(${flip ? deg-270 : deg-90})`;
            })
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
            .attr('font-family', 'Outfit').attr('font-size', '8px')
            .attr('font-weight', 700).attr('fill', '#fff')
            .attr('pointer-events', 'none')
            .text(d => CTX_SHORT[d.data.context] || d.data.context);

        /* ═══════════════ RING 2 — Top 3 Terms ═══════════════ */
        const ring2G = mainG.append('g').attr('class', 'ring2').attr('opacity', 0);
        const TERM_OPS = [1.0, 0.7, 0.42];

        arcs.forEach(arcD => {
            const ctx = arcD.data;
            const terms = ctx.terms;
            if (!terms.length) return;

            const total = terms.reduce((s,t) => s + t.count, 0);
            const span  = arcD.endAngle - arcD.startAngle;
            const gap   = 0.005;
            let cur = arcD.startAngle + gap;

            terms.forEach((t, ti) => {
                const proportion = t.count / total;
                const tSpan = proportion * (span - gap * (terms.length + 1));
                const tStart = cur;
                const tEnd   = cur + tSpan;
                cur = tEnd + gap;

                const tArc = d3.arc()
                    .innerRadius(R2i).outerRadius(R2o)
                    .startAngle(tStart).endAngle(tEnd).cornerRadius(2);

                ring2G.append('path').attr('class', 'term-arc')
                    .attr('d', tArc())
                    .attr('fill', sectorColor(ctx.context))
                    .attr('opacity', TERM_OPS[ti])
                    .attr('stroke', 'rgba(0,0,0,0.3)').attr('stroke-width', 0.5)
                    .style('cursor', 'pointer')
                    .datum({ term: t, context: ctx.context })
                    .on('mousemove', function(event) {
                        const name = t.term.replace(/\b\w/g, c => c.toUpperCase());
                        tooltip.style('display','block').style('opacity',1)
                            .html(`<strong style="font-size:14px">${name}</strong><br>
                                   <span style="opacity:.6">in ${CTX_SHORT[ctx.context]}</span><br>
                                   ${t.count.toLocaleString()} uses<br>
                                   <span style="color:${AGE_COLORS[t.dominant_age]}">● Age ${AGE_LABELS[t.dominant_age]}</span>`)
                            .style('left', (event.pageX+14)+'px')
                            .style('top', (event.pageY-28)+'px');
                    })
                    .on('mouseleave', () => tooltip.style('display','none').style('opacity',0));

                // Term label
                const tMid = (tStart + tEnd) / 2;
                const lR = (R2i + R2o) / 2;
                const lx = Math.cos(tMid - Math.PI/2) * lR;
                const ly = Math.sin(tMid - Math.PI/2) * lR;
                const deg = tMid * 180 / Math.PI;
                const flip = deg > 180;

                ring2G.append('text').attr('class', 'term-label')
                    .attr('transform', `translate(${lx},${ly}) rotate(${flip ? deg-270 : deg-90})`)
                    .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
                    .attr('font-family', 'DM Sans').attr('font-size', '7px')
                    .attr('font-weight', 600).attr('fill', '#fff')
                    .attr('pointer-events', 'none')
                    .text(t.term.replace(/\b\w/g, c => c.toUpperCase()));
            });
        });

        /* ═══════════════ RING 3 — Sentiment Stripe ═══════════════ */
        const ring3G = mainG.append('g').attr('class', 'ring3').attr('opacity', 0);

        arcs.forEach(arcD => {
            const sent = arcD.data.sentiment;
            const span = arcD.endAngle - arcD.startAngle;
            let cur = arcD.startAngle;

            ['positive','neutral','negative'].forEach(s => {
                const pct = (sent[s] || 0) / 100;
                const segSpan = pct * span;
                ring3G.append('path')
                    .attr('d', d3.arc()
                        .innerRadius(R3i).outerRadius(R3o)
                        .startAngle(cur).endAngle(cur + segSpan)())
                    .attr('fill', SENT_COLORS[s]).attr('opacity', 0.9);
                cur += segSpan;
            });
        });

        /* ═══════════════ RING 4 — Individual Age Bars ═══════════════
         *  5 thin bars per sector, one per age group, height ∝ count.
         *  Bars use the SECTOR COLOR at 5 opacity levels (lightest = youngest)
         *  so the palette stays cohesive instead of adding 5 more hues.    */
        const ring4G = mainG.append('g').attr('class', 'ring4').attr('opacity', 0);

        // Opacity levels per age group (youngest → oldest = bright → dim)
        const AGE_OPACITIES = [0.95, 0.85, 0.65, 0.45, 0.30];

        // Scale: max single-age-group count across ALL contexts
        const maxAgeCount = d3.max(data, d =>
            d3.max(AGE_GROUPS, ag => d.age_counts[ag] || 0)
        );
        const barH = d3.scaleLinear().domain([0, maxAgeCount]).range([0, R4max - R4base]);

        arcs.forEach(arcD => {
            const ctx = arcD.data;
            const baseColor = sectorColor(ctx.context);
            const span = arcD.endAngle - arcD.startAngle;
            const usable = span * 0.78;
            const barGap = span * 0.02;
            const barAng = (usable - barGap * 4) / 5;
            const start = arcD.startAngle + (span - usable) / 2;

            AGE_GROUPS.forEach((ag, ai) => {
                const count = ctx.age_counts[ag] || 0;
                const bStart = start + ai * (barAng + barGap);
                const bEnd   = bStart + barAng;
                const outerR = R4base + barH(count);

                const bArc = d3.arc()
                    .innerRadius(R4base).outerRadius(Math.max(R4base + 2, outerR))
                    .startAngle(bStart).endAngle(bEnd)
                    .cornerRadius(1.5);

                ring4G.append('path').attr('class', 'age-bar')
                    .attr('d', bArc())
                    .attr('fill', baseColor)
                    .attr('opacity', AGE_OPACITIES[ai])
                    .attr('stroke', 'rgba(0,0,0,0.15)').attr('stroke-width', 0.3)
                    .datum({ context: ctx.context, ageGroup: ag, count })
                    .on('mousemove', function(event) {
                        const pct = ctx.age_pcts[ag] || 0;
                        tooltip.style('display','block').style('opacity',1)
                            .html(`<strong>${CTX_SHORT[ctx.context]}</strong><br>
                                   <strong>Age ${AGE_LABELS[ag]}</strong><br>
                                   ${count.toLocaleString()} uses (${pct.toFixed(1)}%)`)
                            .style('left', (event.pageX+14)+'px')
                            .style('top', (event.pageY-28)+'px');
                    })
                    .on('mouseleave', () => tooltip.style('display','none').style('opacity',0));
            });
        });

        /* ═══════════════ DECORATIVE — subtle guide rings ═══════════════ */
        [R1i, R2i, R3i, R4base].forEach(r => {
            mainG.append('circle').attr('r', r)
                .attr('fill', 'none')
                .attr('stroke', 'rgba(255,255,255,0.04)').attr('stroke-width', 0.5);
        });

        /* ═══════════════ SECTOR DIVIDERS — thin radial lines ═══════════════ */
        arcs.forEach(arcD => {
            const angle = arcD.startAngle;
            const x1 = Math.cos(angle - Math.PI/2) * R1i;
            const y1 = Math.sin(angle - Math.PI/2) * R1i;
            const x2 = Math.cos(angle - Math.PI/2) * (R4base - 2);
            const y2 = Math.sin(angle - Math.PI/2) * (R4base - 2);
            mainG.append('line')
                .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('stroke', 'rgba(255,255,255,0.06)').attr('stroke-width', 0.5);
        });

        /* ═══════════════ SECTOR HOVER ═══════════════ */
        const detailPanel = d3.select('#vibe-detail');

        ring1G.selectAll('.ctx-arc')
            .on('mouseenter', function(event, d) {
                const ctx = d.data.context;
                ring1G.selectAll('.ctx-arc').attr('opacity', dd => dd.data.context === ctx ? 1 : 0.12);
                ring2G.selectAll('.term-arc').attr('opacity', function() {
                    return d3.select(this).datum().context === ctx ? 0.95 : 0.06;
                });
                ring2G.selectAll('.term-label').attr('opacity', 0.3);
                ring4G.selectAll('.age-bar').each(function() {
                    const dd = d3.select(this).datum();
                    d3.select(this).attr('opacity', dd.context === ctx ? 0.95 : 0.05);
                });
                ring3G.attr('opacity', 0.25);
                d3.select(this).attr('filter', 'url(#wheel-glow)');

                const sent = d.data.sentiment;
                const topTerms = d.data.terms
                    .map(t => `<span style="color:${AGE_COLORS[t.dominant_age]}">●</span> ${t.term.replace(/\b\w/g, c => c.toUpperCase())}`)
                    .join(' &nbsp;·&nbsp; ');

                if (detailPanel.node()) {
                    detailPanel.style('opacity', 1).html(`
                        <div class="vibe-detail-title" style="color:${sectorColor(ctx)}">${CTX_SHORT[ctx]}</div>
                        <div class="vibe-detail-stat">${d.data.total_usage.toLocaleString()} observations</div>
                        <div class="vibe-detail-bar">
                            <span class="vibe-sent-pos" style="width:${sent.positive}%"></span>
                            <span class="vibe-sent-neu" style="width:${sent.neutral}%"></span>
                            <span class="vibe-sent-neg" style="width:${sent.negative}%"></span>
                        </div>
                        <div class="vibe-detail-legend">
                            <span style="color:${SENT_COLORS.positive}">▴ ${sent.positive?.toFixed(0)}%</span>
                            <span style="color:${SENT_COLORS.neutral}">■ ${sent.neutral?.toFixed(0)}%</span>
                            <span style="color:${SENT_COLORS.negative}">▾ ${sent.negative?.toFixed(0)}%</span>
                        </div>
                        <div class="vibe-detail-terms">${topTerms}</div>
                    `);
                }
            })
            .on('mouseleave', function() {
                ring1G.selectAll('.ctx-arc').attr('opacity', 0.88).attr('filter', null);
                ring2G.selectAll('.term-arc').each(function(d, i) {
                    d3.select(this).attr('opacity', TERM_OPS[i % 3]);
                });
                ring2G.selectAll('.term-label').attr('opacity', 1);
                ring4G.selectAll('.age-bar').each(function(d, i) {
                    d3.select(this).attr('opacity', AGE_OPACITIES[i % 5]);
                });
                ring3G.attr('opacity', 1);
                if (detailPanel.node()) detailPanel.style('opacity', 0);
            });

        /* ═══════════════ LEGEND ═══════════════ */
        const legG = svg.append('g').attr('transform', `translate(${cx},${SIZE - 12})`);

        legG.append('text').attr('y', -22).attr('text-anchor', 'middle')
            .attr('font-family', 'DM Sans').attr('font-size', '8px')
            .attr('fill', 'rgba(255,255,255,0.25)').attr('letter-spacing', '1px')
            .text('OUTER BARS = AGE GROUP (BRIGHT → DIM)');

        AGE_GROUPS.forEach((ag, i) => {
            const lx = (i - 2) * 82;
            legG.append('rect')
                .attr('x', lx - 15).attr('y', -6).attr('width', 12).attr('height', 12)
                .attr('rx', 3).attr('fill', '#a78bfa').attr('opacity', AGE_OPACITIES[i]);
            legG.append('text')
                .attr('x', lx + 2).attr('y', 4)
                .attr('font-family', 'DM Sans').attr('font-size', '10px')
                .attr('font-weight', 600).attr('fill', 'rgba(255,255,255,0.7)')
                .text(AGE_LABELS[ag]);
        });

        /* ═══════════════ ENTRANCE ANIMATION ═══════════════ */
        const DL = 350;
        function fadeIn(grp, delay, dur) {
            setTimeout(() => {
                let s = 0; const n = Math.round(dur / 16);
                (function tick() {
                    s++;
                    const t = Math.min(s / n, 1);
                    grp.attr('opacity', 1 - Math.pow(1-t, 3));
                    if (t < 1) setTimeout(tick, 16);
                })();
            }, delay);
        }
        fadeIn(ring1G, 80, 500);
        fadeIn(ring2G, 80 + DL, 500);
        fadeIn(ring3G, 80 + DL*2, 400);

        // Ring 4: bars shoot out with stagger
        setTimeout(() => {
            ring4G.attr('opacity', 1);
            ring4G.selectAll('.age-bar').attr('opacity', 0);
            let idx = 0;
            arcs.forEach((_, si) => {
                AGE_GROUPS.forEach((_, ai) => {
                    const i = idx;
                    setTimeout(() => {
                        const bars = ring4G.selectAll('.age-bar').nodes();
                        if (bars[i]) d3.select(bars[i]).attr('opacity', AGE_OPACITIES[ai]);
                    }, si * 30 + ai * 15);
                    idx++;
                });
            });
        }, 80 + DL*3);

    }).catch(err => {
        console.error('Vibe wheel data error:', err);
        container.innerHTML = '<p style="color:#ff6b6b;padding:2rem">Failed to load vibe wheel data.</p>';
    });
}
