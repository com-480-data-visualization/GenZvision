/**
 * cosmos.js — "The Slang Cosmos"
 * Sentiment × Intensity constellation scatter plot with galaxy background.
 *
 * X = avg_sentiment  (negative → positive)
 * Y = avg_intensity  (subdued → intense)
 * Size = total_usage · Color = term category (constellation)
 *
 * L6.1 Perception & Color: categorical palette with limited hues for constellations;
 *   luminance channel used for star glow intensity; perceptually distinct categories.
 * L6.2 Marks & Channels: position encodes two quantitative variables (sentiment, intensity),
 *   size encodes a third (usage), following the expressiveness principle.
 * L10 Graphs: node-link diagram — terms are nodes, MST edges form constellation links.
 * L12 Storytelling: galaxy metaphor transforms abstract data into an immersive visual narrative.
 *
 * Selection: click legend items to zoom into one or more constellations.
 */

function renderCosmos() {
    const container = document.getElementById('cosmos-viz');
    if (!container) return;

    d3.json('data/slang_cosmos.json').then(({ meta, constellations, terms }) => {
        container.innerHTML = '';

        // Re-inject the click-hint badge (removed by clear)
        const hint = document.createElement('div');
        hint.className = 'cosmos-click-hint';
        hint.id = 'cosmos-click-hint';
        hint.textContent = '★ Click any star to focus its galaxy';
        container.appendChild(hint);

        /* ── DIMENSIONS ────────────────────────────────────────────── */
        const W      = Math.max(container.clientWidth - 32, 480);
        const H      = Math.min(Math.round(W * 0.72), 580);
        const margin = { top: 48, right: 52, bottom: 74, left: 82 };
        const iW     = W - margin.left - margin.right;
        const iH     = H - margin.top  - margin.bottom;

        const FULL_X  = [-0.52, 0.52];
        const FULL_Y  = [0.53,  0.77];
        const T_SCALE = 650;
        const T_FADE  = 280;

        /* ── SCALES ────────────────────────────────────────────────── */
        const xScale = d3.scaleLinear().domain(FULL_X).range([0, iW]);
        const yScale = d3.scaleLinear().domain(FULL_Y).range([iH, 0]);
        const rScale = d3.scaleSqrt().domain(meta.total_usage_range).range([4.5, 17]);

        /* ── LOOKUPS ───────────────────────────────────────────────── */
        const colorMap = {};
        constellations.forEach(c => { colorMap[c.id] = c.color; });
        const termMap = {};
        terms.forEach(t => { termMap[t.term] = t; });

        // Prim's MST in pixel space
        function mstEdges(catTerms) {
            if (catTerms.length <= 1) return [];
            const edges = [];
            const inTree = new Set([catTerms[0].term]);
            while (inTree.size < catTerms.length) {
                let best = null, bestD = Infinity;
                for (const a of catTerms) {
                    if (!inTree.has(a.term)) continue;
                    for (const b of catTerms) {
                        if (inTree.has(b.term)) continue;
                        const dx = xScale(a.sentiment) - xScale(b.sentiment);
                        const dy = yScale(a.intensity) - yScale(b.intensity);
                        const d  = Math.sqrt(dx * dx + dy * dy);
                        if (d < bestD) { bestD = d; best = [a, b]; }
                    }
                }
                if (!best) break;
                edges.push(best);
                inTree.add(best[1].term);
            }
            return edges;
        }

        const edgeData = [];
        constellations.forEach(c => {
            const catTerms = terms.filter(t => t.category === c.id);
            mstEdges(catTerms).forEach(([ta, tb]) =>
                edgeData.push({ source: ta, target: tb, color: c.color, catId: c.id })
            );
        });

        const topTermByCat = {};
        constellations.forEach(c => {
            const catTerms = terms.filter(t => t.category === c.id);
            if (catTerms.length > 0)
                topTermByCat[c.id] = catTerms.reduce((best, t) =>
                    t.intensity > best.intensity ? t : best, catTerms[0]);
        });

        /* ── STATE ─────────────────────────────────────────────────── */
        let selectedCats = new Set();

        /* ── SVG ───────────────────────────────────────────────────── */
        const svg = d3.select('#cosmos-viz')
            .append('svg').attr('width', W).attr('height', H)
            .attr('viewBox', `0 0 ${W} ${H}`);

        /* ── DEFS ──────────────────────────────────────────────────── */
        const defs = svg.append('defs');

        // Star glow filters
        const mkGlow = (id, std) => {
            const f = defs.append('filter').attr('id', id)
                .attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%');
            f.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', std).attr('result', 'blur');
            const m = f.append('feMerge');
            m.append('feMergeNode').attr('in', 'blur');
            m.append('feMergeNode').attr('in', 'SourceGraphic');
        };
        mkGlow('star-glow', 2.5);
        mkGlow('star-glow-hot', 5);

        // Nebula glow filter (softer, wider)
        const nebulaFilter = defs.append('filter').attr('id', 'nebula-glow')
            .attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%');
        nebulaFilter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 40);

        // Dust cloud filter
        const dustFilter = defs.append('filter').attr('id', 'dust-glow')
            .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
        dustFilter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 18);

        defs.append('clipPath').attr('id', 'cosmos-clip')
            .append('rect').attr('width', iW).attr('height', iH).attr('rx', 6);

        // Vignette
        const vig = defs.append('radialGradient').attr('id', 'cosmos-vig')
            .attr('cx', '50%').attr('cy', '50%').attr('r', '70%');
        vig.append('stop').attr('offset', '0%').attr('stop-color', 'transparent');
        vig.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(0,0,0,0.6)');

        const mainG = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        /* ══════════════════════════════════════════════════════════════
         *  GALAXY BACKGROUND
         * ════════════════════════════════════════════════════════════ */

        const rng = d3.randomUniform;

        // Deep space base
        mainG.append('rect').attr('width', iW).attr('height', iH)
            .attr('fill', '#020210').attr('rx', 6);

        const nebulaG = mainG.append('g').attr('clip-path', 'url(#cosmos-clip)');

        // ── Galaxy generator: spiral arms + core glow + star dust ──
        function drawGalaxy(g, cx, cy, color, radius, angle, arms, nParticles) {
            const rgb = color;

            // Radial gradient for core glow
            const gradId = `gal-${Math.random().toString(36).slice(2, 8)}`;
            const grad = defs.append('radialGradient').attr('id', gradId)
                .attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
            grad.append('stop').attr('offset', '0%').attr('stop-color', rgb).attr('stop-opacity', 0.18);
            grad.append('stop').attr('offset', '40%').attr('stop-color', rgb).attr('stop-opacity', 0.08);
            grad.append('stop').attr('offset', '100%').attr('stop-color', rgb).attr('stop-opacity', 0);

            // Core glow ellipse
            g.append('ellipse')
                .attr('cx', cx).attr('cy', cy)
                .attr('rx', radius * 0.6).attr('ry', radius * 0.35)
                .attr('fill', `url(#${gradId})`)
                .attr('transform', `rotate(${angle}, ${cx}, ${cy})`)
                .attr('filter', 'url(#nebula-glow)');

            // Inner bright core
            g.append('ellipse')
                .attr('cx', cx).attr('cy', cy)
                .attr('rx', radius * 0.18).attr('ry', radius * 0.10)
                .attr('fill', rgb).attr('opacity', 0.12)
                .attr('transform', `rotate(${angle}, ${cx}, ${cy})`)
                .attr('filter', 'url(#dust-glow)');

            // Spiral arm particles
            for (let i = 0; i < nParticles; i++) {
                const armIdx = i % arms;
                const armOffset = (armIdx / arms) * Math.PI * 2;
                const t = Math.pow(Math.random(), 0.7); // bias toward center
                const r = t * radius;
                const theta = armOffset + t * 3.2 + (Math.random() - 0.5) * 0.6;
                // Flatten into ellipse shape
                const px = cx + r * Math.cos(theta + angle * Math.PI / 180);
                const py = cy + r * 0.55 * Math.sin(theta + angle * Math.PI / 180);
                // Scatter perpendicular to arm
                const scatter = (1 - t) * radius * 0.15;
                const fx = px + (Math.random() - 0.5) * scatter;
                const fy = py + (Math.random() - 0.5) * scatter;

                if (fx < 0 || fx > iW || fy < 0 || fy > iH) continue;

                const pr = t < 0.3 ? rng(0.3, 1.2)() : rng(0.15, 0.6)();
                const po = (1 - t * 0.6) * rng(0.08, 0.35)();

                g.append('circle')
                    .attr('cx', fx).attr('cy', fy).attr('r', pr)
                    .attr('fill', Math.random() < 0.7 ? rgb : '#fff')
                    .attr('opacity', po);
            }
        }

        // ── Place galaxies at each constellation centroid ──
        constellations.forEach((c, ci) => {
            const catTerms = terms.filter(t => t.category === c.id);
            if (catTerms.length < 2) return;

            const cx = xScale(c.centroid.x);
            const cy = yScale(c.centroid.y);
            // Spread of terms in this constellation determines galaxy size
            const sentVals = catTerms.map(t => xScale(t.sentiment));
            const intVals  = catTerms.map(t => yScale(t.intensity));
            const spread = Math.max(
                d3.max(sentVals) - d3.min(sentVals),
                d3.max(intVals) - d3.min(intVals)
            );
            const radius = Math.max(50, spread * 0.8);
            const angle  = (ci * 47 + 15) % 360; // pseudo-random rotation
            const arms   = ci % 2 === 0 ? 2 : 3;

            drawGalaxy(nebulaG, cx, cy, c.color, radius, angle, arms, Math.round(120 + catTerms.length * 15));
        });

        // ── Background star field — tiny dots across the void ──
        const bgStarsG = mainG.append('g').attr('clip-path', 'url(#cosmos-clip)');
        for (let i = 0; i < 350; i++) {
            const sx = Math.random() * iW;
            const sy = Math.random() * iH;
            const sr = Math.random() < 0.06 ? rng(1, 1.8)() : rng(0.2, 0.8)();
            const so = rng(0.12, 0.6)();
            // Slight color variation — some stars blueish, some warm
            const colors = ['#fff', '#cce5ff', '#ffe8cc', '#e0ccff', '#fff'];
            const col = colors[Math.floor(Math.random() * colors.length)];
            const star = bgStarsG.append('circle')
                .attr('cx', sx).attr('cy', sy).attr('r', sr)
                .attr('fill', col).attr('opacity', so);

            // Twinkling
            if (Math.random() < 0.25) {
                const dur = rng(2500, 5500)();
                const delay = rng(0, 4000)();
                (function twinkle(el) {
                    el.transition().delay(delay).duration(dur)
                        .attr('opacity', rng(0.08, 0.25)())
                        .transition().duration(dur)
                        .attr('opacity', rng(0.4, 0.75)())
                        .on('end', function() { twinkle(d3.select(this)); });
                })(star);
            }
        }

        // ── Faint interstellar dust band (milky way feel) ──
        const mwG = mainG.append('g').attr('clip-path', 'url(#cosmos-clip)');
        for (let i = 0; i < 250; i++) {
            const t = Math.random();
            const baseX = t * iW * 1.3 - iW * 0.15;
            const baseY = (1 - t) * iH * 1.3 - iH * 0.15;
            const scatter = 55;
            const mx = baseX + (Math.random() - 0.5) * scatter;
            const my = baseY + (Math.random() - 0.5) * scatter;
            if (mx < 0 || mx > iW || my < 0 || my > iH) continue;
            mwG.append('circle')
                .attr('cx', mx).attr('cy', my)
                .attr('r', rng(0.15, 0.7)())
                .attr('fill', Math.random() < 0.3 ? '#d4c4ff' : '#fff')
                .attr('opacity', rng(0.03, 0.14)());
        }

        // Vignette overlay
        mainG.append('rect').attr('width', iW).attr('height', iH)
            .attr('fill', 'url(#cosmos-vig)').attr('rx', 6).attr('pointer-events', 'none');

        /* ── GRID ──────────────────────────────────────────────────── */
        const gridG     = mainG.append('g').attr('clip-path', 'url(#cosmos-clip)');
        const yGridVals = [0.55, 0.60, 0.65, 0.70, 0.75];
        const xGridVals = [-0.4, -0.2, 0, 0.2, 0.4];

        const hGridSel = gridG.selectAll('.hgrid').data(yGridVals).enter()
            .append('line').attr('class', 'hgrid')
            .attr('x1', 0).attr('x2', iW)
            .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
            .attr('stroke', 'rgba(255,255,255,0.025)').attr('stroke-dasharray', '3,5');

        const vGridSel = gridG.selectAll('.vgrid').data(xGridVals).enter()
            .append('line').attr('class', 'vgrid').attr('y1', 0).attr('y2', iH)
            .attr('x1', d => xScale(d)).attr('x2', d => xScale(d))
            .attr('stroke', d => d === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.025)')
            .attr('stroke-width', d => d === 0 ? 1 : 0.75)
            .attr('stroke-dasharray', d => d === 0 ? null : '3,5');

        const neutralLabel = mainG.append('text')
            .attr('x', xScale(0)).attr('y', -6).attr('text-anchor', 'middle')
            .attr('font-family', 'DM Sans').attr('font-size', '9px')
            .attr('fill', 'rgba(255,255,255,0.5)').attr('letter-spacing', '0.5px')
            .text('NEUTRAL');

        /* ── QUADRANT WATERMARKS ───────────────────────────────────── */
        const qG = mainG.append('g').attr('clip-path', 'url(#cosmos-clip)');
        [
            { x: xScale(-0.25), y: yScale(0.718), lines: ['NEGATIVE', 'INTENSE']  },
            { x: xScale( 0.25), y: yScale(0.718), lines: ['POSITIVE', 'INTENSE']  },
            { x: xScale(-0.25), y: yScale(0.567), lines: ['NEGATIVE', 'SUBDUED']  },
            { x: xScale( 0.25), y: yScale(0.567), lines: ['POSITIVE', 'SUBDUED']  },
        ].forEach(q => q.lines.forEach((line, i) =>
            qG.append('text')
                .attr('x', q.x).attr('y', q.y + i * 11)
                .attr('text-anchor', 'middle').attr('font-family', 'DM Sans').attr('font-size', '11px')
                .attr('font-weight', '600')
                .attr('fill', 'rgba(255,255,255,0.32)').attr('letter-spacing', '1.8px')
                .attr('pointer-events', 'none').text(line)
        ));

        mainG.append('text').attr('x', 10).attr('y', 16)
            .attr('font-family', 'Outfit').attr('font-size', '10px')
            .attr('fill', 'rgba(255,255,255,0.55)')
            .text(`r = ${meta.correlation} — sentiment ⊥ intensity`);

        /* ── CONSTELLATION LINES ───────────────────────────────────── */
        const linesG = mainG.append('g').attr('clip-path', 'url(#cosmos-clip)').attr('opacity', 0);

        const lineSel = linesG.selectAll('.const-line').data(edgeData).enter()
            .append('line').attr('class', d => `const-line const-${d.catId}`)
            .attr('x1', d => xScale(d.source.sentiment)).attr('y1', d => yScale(d.source.intensity))
            .attr('x2', d => xScale(d.target.sentiment)).attr('y2', d => yScale(d.target.intensity))
            .attr('stroke', d => d.color)
            .attr('stroke-width', 0.8).attr('stroke-opacity', 0.35).attr('stroke-dasharray', '2,4');

        /* ── STARS (data points) ───────────────────────────────────── */
        const starsG = mainG.append('g').attr('clip-path', 'url(#cosmos-clip)');

        // Star cross spikes for larger stars
        terms.forEach(t => {
            const r = rScale(t.total_usage);
            if (r > 7) {
                const cx = xScale(t.sentiment), cy = yScale(t.intensity);
                const spikeLen = r * 2.2;
                const col = colorMap[t.category] || '#fff';
                const spikeG = starsG.append('g')
                    .attr('class', `spike spike-${t.category}`)
                    .attr('opacity', 0);

                // Horizontal spike
                const hGrad = defs.append('linearGradient')
                    .attr('id', `spike-h-${t.term.replace(/\s+/g, '-')}`)
                    .attr('x1', '0%').attr('x2', '100%');
                hGrad.append('stop').attr('offset', '0%').attr('stop-color', col).attr('stop-opacity', 0);
                hGrad.append('stop').attr('offset', '50%').attr('stop-color', col).attr('stop-opacity', 0.4);
                hGrad.append('stop').attr('offset', '100%').attr('stop-color', col).attr('stop-opacity', 0);

                spikeG.append('line')
                    .attr('x1', cx - spikeLen).attr('y1', cy)
                    .attr('x2', cx + spikeLen).attr('y2', cy)
                    .attr('stroke', `url(#spike-h-${t.term.replace(/\s+/g, '-')})`)
                    .attr('stroke-width', 0.8);

                // Vertical spike
                const vGrad = defs.append('linearGradient')
                    .attr('id', `spike-v-${t.term.replace(/\s+/g, '-')}`)
                    .attr('x1', '0%').attr('x2', '0%').attr('y1', '0%').attr('y2', '100%');
                vGrad.append('stop').attr('offset', '0%').attr('stop-color', col).attr('stop-opacity', 0);
                vGrad.append('stop').attr('offset', '50%').attr('stop-color', col).attr('stop-opacity', 0.3);
                vGrad.append('stop').attr('offset', '100%').attr('stop-color', col).attr('stop-opacity', 0);

                spikeG.append('line')
                    .attr('x1', cx).attr('y1', cy - spikeLen * 0.7)
                    .attr('x2', cx).attr('y2', cy + spikeLen * 0.7)
                    .attr('stroke', `url(#spike-v-${t.term.replace(/\s+/g, '-')})`)
                    .attr('stroke-width', 0.6);
            }
        });

        const starSel = starsG.selectAll('.star').data(terms).enter()
            .append('circle').attr('class', d => `star star-${d.category}`)
            .attr('cx', d => xScale(d.sentiment)).attr('cy', d => yScale(d.intensity))
            .attr('r', 0)
            .attr('fill', d => colorMap[d.category] || '#fff').attr('fill-opacity', 0.92)
            .attr('stroke', d => colorMap[d.category] || '#fff')
            .attr('stroke-width', 0.8).attr('stroke-opacity', 0.4)
            .attr('filter', 'url(#star-glow)').style('cursor', 'pointer');

        /* ── HOVER LABELS ──────────────────────────────────────────── */
        const hoverLabG = mainG.append('g').attr('clip-path', 'url(#cosmos-clip)')
            .attr('pointer-events', 'none');

        const hoverLabelSel = hoverLabG.selectAll('.star-label').data(terms).enter()
            .append('text').attr('class', d => `star-label sl-${d.term.replace(/\s+/g, '-')}`)
            .attr('x', d => xScale(d.sentiment))
            .attr('y', d => yScale(d.intensity) - rScale(d.total_usage) - 5)
            .attr('text-anchor', 'middle').attr('font-family', 'Outfit')
            .attr('font-size', '9.5px').attr('font-weight', 700)
            .attr('fill', d => colorMap[d.category] || '#fff').attr('fill-opacity', 0)
            .text(d => d.term.replace(/\b\w/g, c => c.toUpperCase()));

        /* ── CENTROID LABELS ───────────────────────────────────────── */
        const centG = mainG.append('g').attr('clip-path', 'url(#cosmos-clip)')
            .attr('opacity', 0).attr('pointer-events', 'none');

        const centLabelY = d => {
            const top = topTermByCat[d.id];
            return top ? yScale(top.intensity) - rScale(top.total_usage) - 8 : yScale(d.centroid.y) - 24;
        };

        const centData = constellations.filter(c => c.terms.length >= 2);
        const centSel  = centG.selectAll('.centroid-label').data(centData).enter()
            .append('text').attr('class', d => `centroid-label cl-${d.id}`)
            .attr('x', d => xScale(d.centroid.x))
            .attr('y', centLabelY)
            .attr('text-anchor', 'middle')
            .attr('font-family', 'Outfit').attr('font-size', '7.5px').attr('font-weight', 700)
            .attr('fill', d => d.color).attr('fill-opacity', 0.55).attr('letter-spacing', '1.5px')
            .text(d => d.label.toUpperCase());

        /* ── AXES ──────────────────────────────────────────────────── */
        const xAxisFn = () => d3.axisBottom(xScale).ticks(5)
            .tickFormat(d => d === 0 ? '0' : d3.format('+.1f')(d)).tickSize(4);
        const yAxisFn = () => d3.axisLeft(yScale).ticks(5)
            .tickFormat(d3.format('.2f')).tickSize(4);

        const styleAxis = g => {
            g.select('.domain').attr('stroke', 'rgba(255,255,255,0.08)');
            g.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.08)');
            g.selectAll('.tick text').attr('fill', 'rgba(255,255,255,0.7)')
                .attr('font-size', '11px').attr('font-family', 'DM Sans');
        };

        const xAxisG = mainG.append('g').attr('transform', `translate(0,${iH})`);
        const yAxisG = mainG.append('g');
        xAxisG.call(xAxisFn()); styleAxis(xAxisG);
        yAxisG.call(yAxisFn()); styleAxis(yAxisG);

        mainG.append('text').attr('x', iW / 2).attr('y', iH + 52)
            .attr('text-anchor', 'middle').attr('font-family', 'DM Sans').attr('font-size', '11.5px')
            .attr('fill', 'rgba(255,255,255,0.75)')
            .text('← Negative Sentiment  ·  Positive Sentiment →');

        mainG.append('text').attr('transform', `translate(${-58},${iH / 2}) rotate(-90)`)
            .attr('text-anchor', 'middle').attr('font-family', 'DM Sans').attr('font-size', '11.5px')
            .attr('fill', 'rgba(255,255,255,0.75)')
            .text('← Subdued  ·  Intensity  ·  Intense →');

        /* ── SIZE LEGEND ───────────────────────────────────────────── */
        const sizeLeg = svg.append('g')
            .attr('transform', `translate(${W - margin.right + 6},${margin.top + 10})`);
        sizeLeg.append('text').attr('x', 0).attr('y', 0)
            .attr('font-family', 'DM Sans').attr('font-size', '8px')
            .attr('fill', 'rgba(255,255,255,0.6)').attr('letter-spacing', '1px').text('USAGE');
        let yOff = 14;
        [meta.total_usage_range[0], 10000, meta.total_usage_range[1]].forEach(u => {
            const r = rScale(u);
            sizeLeg.append('circle').attr('cx', 18).attr('cy', yOff + r)
                .attr('r', r).attr('fill', 'none')
                .attr('stroke', 'rgba(255,255,255,0.22)').attr('stroke-width', 0.75);
            sizeLeg.append('text').attr('x', 18 + r + 4).attr('y', yOff + r)
                .attr('dominant-baseline', 'central').attr('font-family', 'DM Sans').attr('font-size', '8px')
                .attr('fill', 'rgba(255,255,255,0.6)')
                .text(u >= 10000 ? `${Math.round(u / 1000)}k` : `${(u / 1000).toFixed(1)}k`);
            yOff += r * 2 + 5;
        });

        /* ── HTML LEGEND ───────────────────────────────────────────── */
        const legendEl = document.getElementById('cosmos-legend');
        if (legendEl) {
            legendEl.innerHTML = `
                <div class="cosmos-legend-header">
                    <span>CONSTELLATIONS</span>
                    <button class="cosmos-clear-btn" id="cosmos-clear" style="display:none">× clear</button>
                </div>
                <div class="cosmos-legend-grid" id="cosmos-legend-grid"></div>
            `;
            document.getElementById('cosmos-legend-grid').innerHTML = constellations.map(c => `
                <div class="cosmos-legend-item" data-cat="${c.id}" title="${c.description}">
                    <span class="cosmos-legend-dot"
                          style="background:${c.color};box-shadow:0 0 6px ${c.color}66"></span>
                    <span class="cosmos-legend-name">${c.label}</span>
                    <span class="cosmos-legend-count">${c.terms.length}</span>
                </div>
            `).join('');

            legendEl.querySelectorAll('.cosmos-legend-item').forEach(el => {
                el.addEventListener('mouseenter', () => highlightCat(el.dataset.cat));
                el.addEventListener('mouseleave',  () => resetHighlight());
                el.addEventListener('click',       () => toggleCat(el.dataset.cat));
            });
            document.getElementById('cosmos-clear').addEventListener('click', clearSelection);
        }

        /* ══════════════════════════════════════════════════════════════
         *  INTERACTION
         * ════════════════════════════════════════════════════════════ */

        function highlightCat(cat) {
            if (selectedCats.size > 0 && !selectedCats.has(cat)) return;

            starSel
                .attr('fill-opacity', d => d.category === cat ? 1 : 0.06)
                .attr('filter',       d => d.category === cat ? 'url(#star-glow-hot)' : 'none');

            starsG.selectAll('.spike')
                .attr('opacity', function() {
                    const cls = this.classList;
                    return cls.contains(`spike-${cat}`) ? 0.8 : 0;
                });

            lineSel.attr('stroke-opacity', d => d.catId === cat ? 0.7 : 0.04);
            centSel.attr('fill-opacity', d => d.id === cat ? 1 : 0.04);
            hoverLabelSel.attr('fill-opacity', d => d.category === cat ? 0.95 : 0);
        }

        function resetHighlight() {
            const hasSel = selectedCats.size > 0;
            starSel
                .attr('fill-opacity', d => hasSel ? (selectedCats.has(d.category) ? 0.92 : 0.06) : 0.92)
                .attr('filter',       d => hasSel && !selectedCats.has(d.category) ? 'none' : 'url(#star-glow)');
            starsG.selectAll('.spike')
                .attr('opacity', function() {
                    if (!hasSel) return 0.5;
                    const cls = [...this.classList];
                    const cat = cls.find(c => c.startsWith('spike-'))?.replace('spike-', '');
                    return cat && selectedCats.has(cat) ? 0.6 : 0;
                });
            lineSel.attr('stroke-opacity', d => hasSel ? (selectedCats.has(d.catId) ? 0.6 : 0.04) : 0.35);
            centSel.attr('fill-opacity',   d => hasSel ? (selectedCats.has(d.id)  ? 0.9 : 0.04) : 0.55);
            hoverLabelSel.attr('fill-opacity', 0);
        }

        function toggleCat(catId) {
            if (selectedCats.has(catId)) selectedCats.delete(catId);
            else selectedCats.add(catId);
            applyView();
        }

        function clearSelection() {
            selectedCats.clear();
            applyView();
        }

        function applyView() {
            const hasSel = selectedCats.size > 0;

            let xDom = FULL_X, yDom = FULL_Y;
            if (hasSel) {
                const selTerms = terms.filter(t => selectedCats.has(t.category));
                if (selTerms.length > 0) {
                    const sentVals = selTerms.map(t => t.sentiment);
                    const intVals  = selTerms.map(t => t.intensity);
                    const sSpan    = d3.max(sentVals) - d3.min(sentVals);
                    const iSpan    = d3.max(intVals)  - d3.min(intVals);
                    const padX     = sSpan > 0 ? sSpan * 0.11 : 0.025;
                    const padY     = Math.max(0.015, iSpan * 0.18);
                    xDom = [
                        Math.max(-0.56, d3.min(sentVals) - padX),
                        Math.min( 0.56, d3.max(sentVals) + padX),
                    ];
                    yDom = [
                        Math.max(0.50,  d3.min(intVals) - padY),
                        Math.min(0.80,  d3.max(intVals) + padY),
                    ];
                }
            }

            xScale.domain(xDom);
            yScale.domain(yDom);

            const tr = d3.transition().duration(T_SCALE).ease(d3.easeCubicInOut);

            starSel.transition(tr)
                .attr('cx', d => xScale(d.sentiment))
                .attr('cy', d => yScale(d.intensity))
                .attr('fill-opacity', d => hasSel ? (selectedCats.has(d.category) ? 0.92 : 0.06) : 0.92)
                .attr('filter',       d => hasSel && !selectedCats.has(d.category) ? 'none' : 'url(#star-glow)');

            hoverLabelSel.transition(tr)
                .attr('x', d => xScale(d.sentiment))
                .attr('y', d => yScale(d.intensity) - rScale(d.total_usage) - 5);

            lineSel.transition(tr)
                .attr('x1', d => xScale(d.source.sentiment)).attr('y1', d => yScale(d.source.intensity))
                .attr('x2', d => xScale(d.target.sentiment)).attr('y2', d => yScale(d.target.intensity))
                .attr('stroke-opacity', d => hasSel ? (selectedCats.has(d.catId) ? 0.6 : 0.04) : 0.35);

            centSel.transition(tr)
                .attr('x', d => xScale(d.centroid.x))
                .attr('y', centLabelY)
                .attr('fill-opacity', d => hasSel ? (selectedCats.has(d.id) ? 0.9 : 0.04) : 0.55);

            hGridSel.transition(tr).attr('y1', d => yScale(d)).attr('y2', d => yScale(d));
            vGridSel.transition(tr).attr('x1', d => xScale(d)).attr('x2', d => xScale(d));
            neutralLabel.transition(tr).attr('x', xScale(0));

            xAxisG.transition(tr).call(xAxisFn()); styleAxis(xAxisG);
            yAxisG.transition(tr).call(yAxisFn()); styleAxis(yAxisG);

            // Spike visibility
            starsG.selectAll('.spike')
                .attr('opacity', function() {
                    if (!hasSel) return 0.5;
                    const cls = [...this.classList];
                    const cat = cls.find(c => c.startsWith('spike-'))?.replace('spike-', '');
                    return cat && selectedCats.has(cat) ? 0.6 : 0;
                });

            if (legendEl) {
                const clearBtn = document.getElementById('cosmos-clear');
                if (clearBtn) clearBtn.style.display = hasSel ? 'inline-block' : 'none';
                legendEl.querySelectorAll('.cosmos-legend-item').forEach(el => {
                    const isSel = selectedCats.has(el.dataset.cat);
                    el.classList.toggle('selected', isSel);
                    el.style.opacity = hasSel && !isSel ? '0.3' : '1';
                    const dot = el.querySelector('.cosmos-legend-dot');
                    if (dot) {
                        const col = colorMap[el.dataset.cat];
                        dot.style.boxShadow = isSel ? `0 0 12px ${col}` : `0 0 6px ${col}66`;
                    }
                });
            }
        }

        /* ── STAR HOVER ────────────────────────────────────────────── */
        const phaseColor = { growing: '#4ade80', declining: '#f87171', peak: '#fbbf24', dormant: '#94a3b8' };

        starSel
            .on('click', function(event, d) {
                toggleCat(d.category);
                const hint = document.getElementById('cosmos-click-hint');
                if (hint) hint.classList.add('hidden');
            })
            .on('mouseenter', function(event, d) {
                if (selectedCats.size > 0 && !selectedCats.has(d.category)) return;
                d3.select(this).raise()
                    .attr('filter', 'url(#star-glow-hot)')
                    .attr('r', rScale(d.total_usage) * 1.35)
                    .attr('fill-opacity', 1);
                hoverLabelSel.filter(ld => ld.term === d.term).attr('fill-opacity', 1);

                if (legendEl) {
                    legendEl.querySelectorAll('.cosmos-legend-item').forEach(el => {
                        const isMatch = el.dataset.cat === d.category;
                        el.style.opacity  = isMatch ? '1' : '0.2';
                        el.style.background = isMatch ? `${colorMap[d.category]}18` : '';
                        const dot = el.querySelector('.cosmos-legend-dot');
                        if (dot && isMatch) dot.style.boxShadow = `0 0 12px ${colorMap[d.category]}`;
                    });
                }

                const sv     = d.sentiment;
                const sColor = sv >= 0 ? '#4ade80' : '#f87171';
                const sBarW  = Math.abs(sv / 0.52 * 50).toFixed(1);
                const sDir   = sv >= 0 ? `left:50%;width:${sBarW}%` : `right:50%;width:${sBarW}%`;

                tooltip.style('display', 'block').style('opacity', 1).html(`
                    <div style="margin-bottom:6px">
                        <strong style="font-size:13px;color:${colorMap[d.category]}">${d.term.replace(/\b\w/g, c => c.toUpperCase())}</strong>
                        <span style="font-size:10px;color:rgba(255,255,255,0.35);margin-left:6px">${d.category}</span>
                    </div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.5);font-style:italic;margin-bottom:8px">${d.meaning}</div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:3px">Sentiment</div>
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                        <div style="flex:1;height:5px;background:rgba(255,255,255,0.08);border-radius:3px;position:relative">
                            <div style="position:absolute;left:50%;top:0;width:1px;height:100%;background:rgba(255,255,255,0.15)"></div>
                            <div style="position:absolute;top:0;height:100%;background:${sColor};border-radius:3px;${sDir}"></div>
                        </div>
                        <span style="color:${sColor};font-size:10px;min-width:40px;text-align:right">${sv > 0 ? '+' : ''}${sv.toFixed(3)}</span>
                    </div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:3px">Intensity</div>
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
                        <div style="flex:1;height:5px;background:rgba(255,255,255,0.08);border-radius:3px">
                            <div style="width:${((d.intensity - 0.53) / (0.77 - 0.53) * 100).toFixed(1)}%;height:100%;background:#a78bfa;border-radius:3px"></div>
                        </div>
                        <span style="color:#a78bfa;font-size:10px;min-width:40px;text-align:right">${d.intensity.toFixed(3)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:10px;border-top:1px solid rgba(255,255,255,0.07);padding-top:6px">
                        <span style="color:rgba(255,255,255,0.4)">${d.total_usage.toLocaleString()} uses</span>
                        <span style="color:${phaseColor[d.dominant_phase] || '#fff'}">${d.dominant_phase}</span>
                    </div>
                    <div style="margin-top:4px;font-size:9.5px;color:rgba(255,255,255,0.3)">
                        Peak ${d.peak_month} &nbsp;·&nbsp; ${d.top_platform} &nbsp;·&nbsp; ${d.viral_posts} viral posts
                    </div>
                `).style('left', (event.pageX + 16) + 'px').style('top', (event.pageY - 32) + 'px');
            })
            .on('mousemove', function(event) {
                tooltip.style('left', (event.pageX + 16) + 'px').style('top', (event.pageY - 32) + 'px');
            })
            .on('mouseleave', function(event, d) {
                const isDimmed = selectedCats.size > 0 && !selectedCats.has(d.category);
                d3.select(this)
                    .attr('filter', isDimmed ? 'none' : 'url(#star-glow)')
                    .attr('r', rScale(d.total_usage))
                    .attr('fill-opacity', isDimmed ? 0.06 : (selectedCats.has(d.category) ? 0.92 : 0.92));
                hoverLabelSel.attr('fill-opacity', 0);
                tooltip.style('display', 'none').style('opacity', 0);

                if (legendEl) {
                    const hasSel = selectedCats.size > 0;
                    legendEl.querySelectorAll('.cosmos-legend-item').forEach(el => {
                        const isSel = selectedCats.has(el.dataset.cat);
                        el.style.opacity    = hasSel && !isSel ? '0.3' : '1';
                        el.style.background = '';
                        const dot = el.querySelector('.cosmos-legend-dot');
                        if (dot) {
                            const col = colorMap[el.dataset.cat];
                            dot.style.boxShadow = isSel ? `0 0 12px ${col}` : `0 0 6px ${col}66`;
                        }
                    });
                }
            });

        /* ── ENTRANCE ANIMATION ────────────────────────────────────── */
        // Stars appear one by one (biggest first)
        const byUsage = [...terms].sort((a, b) => b.total_usage - a.total_usage);
        byUsage.forEach((t, i) => {
            setTimeout(() => {
                starsG.selectAll('.star').filter(d => d.term === t.term)
                    .transition().duration(450).ease(d3.easeBackOut.overshoot(1.2))
                    .attr('r', rScale(t.total_usage));
            }, 80 + i * 32);
        });

        // Spikes fade in after stars
        const totalDelay = 80 + byUsage.length * 32;
        setTimeout(() => {
            starsG.selectAll('.spike').transition().duration(800).ease(d3.easeCubicOut).attr('opacity', 0.5);
        }, totalDelay);

        // Lines then labels
        setTimeout(() => { linesG.transition().duration(800).ease(d3.easeCubicOut).attr('opacity', 1); }, totalDelay + 200);
        setTimeout(() => { centG.transition().duration(600).ease(d3.easeCubicOut).attr('opacity', 1); }, totalDelay + 700);

    }).catch(err => {
        console.error('Cosmos data error:', err);
        container.innerHTML = '<p style="color:#ff6b6b;padding:2rem;text-align:center">Failed to load cosmos data.</p>';
    });
}
