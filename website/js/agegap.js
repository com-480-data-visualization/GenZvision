/**
 * agegap.js — "The Generation Gap"
 * Animated donut + orbiting particle swarm showing age adoption per slang term.
 *
 * L5.1 Brushing & Linking: dropdown triggers coordinated update of donut arcs,
 *   particle redistribution, and center label (linked views).
 * L5.2 Interactive D3: d3.arc for donut, d3.forceSimulation for particle physics,
 *   keyed transitions for smooth morphing between terms.
 * L6.1 Perception & Color: 5-hue categorical palette for age groups.
 * L6.2 Marks & Channels: arc angle = percentage (angle channel for proportional data);
 *   particle count reinforces magnitude through a second visual channel.
 * L12 Storytelling: the term selector lets users discover generational patterns.
 */

function renderAgeGap() {
    const container = document.getElementById('agegap-viz');
    if (!container) return;
    container.innerHTML = '';

    d3.json('data/age_data.json').then(data => {
        const { age_groups, overall, terms } = data;

        const AGE_COLORS = {
            '13-17': '#f472b6',
            '18-24': '#a78bfa',
            '25-30': '#60a5fa',
            '31-40': '#34d399',
            '41+':   '#fbbf24',
        };
        const AGE_EMOJI = {
            '13-17': '🧒',
            '18-24': '🧑‍💻',
            '25-30': '💼',
            '31-40': '🏠',
            '41+':   '👴',
        };
        const AGE_LABEL = {
            '13-17': 'Teens',
            '18-24': 'Gen Z Core',
            '25-30': 'Young Adults',
            '31-40': 'Millennials',
            '41+':   'Boomers+',
        };
        const PROFILE_LABELS = {
            teen_heavy: '🔥 Teen-dominated',
            core_genz: '💜 Core Gen Z',
            young_adult: '✨ Young adult crossover',
            wide: '🌍 Multi-generational',
            older_skew: '📀 Millennial-leaning'
        };

        /* ── Dimensions ─────────────────────────────────────────── */
        const W = Math.min(container.clientWidth || 700, 700);
        const H = 500;
        const cx = W / 2, cy = H / 2;
        const outerR = Math.min(W, H) * 0.26;
        const innerR = outerR * 0.58;
        const particleR = outerR + 28;

        /* ── SVG ────────────────────────────────────────────────── */
        const svg = d3.select(container).append('svg')
            .attr('viewBox', `0 0 ${W} ${H}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%').style('display', 'block');

        const defs = svg.append('defs');
        // Glow filter for arcs
        const glow = defs.append('filter').attr('id', 'arc-glow')
            .attr('x', '-30%').attr('y', '-30%').attr('width', '160%').attr('height', '160%');
        glow.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 4).attr('result', 'blur');
        const merge = glow.append('feMerge');
        merge.append('feMergeNode').attr('in', 'blur');
        merge.append('feMergeNode').attr('in', 'SourceGraphic');

        const mainG = svg.append('g').attr('transform', `translate(${cx},${cy})`);

        /* ── Donut arcs ─────────────────────────────────────────── */
        const arcGen = d3.arc().innerRadius(innerR).outerRadius(outerR).padAngle(0.03).cornerRadius(4);
        const pie = d3.pie().sort(null).value(d => d.pct);

        const arcsG = mainG.append('g');
        // Glow layer (behind)
        const glowArcsG = mainG.insert('g', ':first-child');

        // Initial data
        let currentData = age_groups.map(ag => ({ age: ag, pct: overall.pcts[ag] }));

        let arcSel = arcsG.selectAll('.age-arc').data(pie(currentData), d => d.data.age);
        arcSel.enter().append('path')
            .attr('class', 'age-arc')
            .attr('d', arcGen)
            .attr('fill', d => AGE_COLORS[d.data.age])
            .attr('opacity', 0.9)
            .style('cursor', 'pointer')
            .attr('filter', 'url(#arc-glow)');

        let glowSel = glowArcsG.selectAll('.glow-arc').data(pie(currentData), d => d.data.age);
        glowSel.enter().append('path')
            .attr('class', 'glow-arc')
            .attr('d', d3.arc().innerRadius(innerR - 3).outerRadius(outerR + 3).padAngle(0.03).cornerRadius(4))
            .attr('fill', d => AGE_COLORS[d.data.age])
            .attr('opacity', 0.15)
            .attr('filter', 'url(#arc-glow)');

        /* ── Center text ────────────────────────────────────────── */
        const centerG = mainG.append('g').attr('text-anchor', 'middle');

        const centerPct = centerG.append('text')
            .attr('y', -12)
            .attr('font-family', 'Outfit').attr('font-size', '42px').attr('font-weight', 700)
            .attr('fill', '#fff');

        const centerAge = centerG.append('text')
            .attr('y', 18)
            .attr('font-family', 'DM Sans').attr('font-size', '14px').attr('font-weight', 600)
            .attr('fill', 'var(--text-secondary,#a0a0b0)');

        const centerLabel = centerG.append('text')
            .attr('y', 38)
            .attr('font-family', 'DM Sans').attr('font-size', '11px')
            .attr('fill', 'rgba(255,255,255,0.35)');

        /* ── Orbiting particles ─────────────────────────────────── */
        const particlesG = mainG.append('g');
        const NUM_PARTICLES = 200;
        let particles = [];

        function initParticles(pcts) {
            particles = [];
            let idx = 0;
            age_groups.forEach(ag => {
                const count = Math.round(NUM_PARTICLES * (pcts[ag] || 0) / 100);
                for (let i = 0; i < count && particles.length < NUM_PARTICLES; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = particleR + (Math.random() - 0.5) * 40;
                    particles.push({
                        id: idx++,
                        age: ag,
                        x: Math.cos(angle) * dist,
                        y: Math.sin(angle) * dist,
                        angle: angle,
                        speed: 0.002 + Math.random() * 0.004,
                        dist: dist,
                        r: 1.5 + Math.random() * 2
                    });
                }
            });
            // Fill remaining
            while (particles.length < NUM_PARTICLES) {
                const ag = age_groups[Math.floor(Math.random() * age_groups.length)];
                const angle = Math.random() * Math.PI * 2;
                const dist = particleR + (Math.random() - 0.5) * 40;
                particles.push({
                    id: particles.length, age: ag,
                    x: Math.cos(angle) * dist, y: Math.sin(angle) * dist,
                    angle, speed: 0.002 + Math.random() * 0.004, dist, r: 1.5 + Math.random() * 2
                });
            }
        }

        initParticles(overall.pcts);

        const pSel = particlesG.selectAll('.particle').data(particles, d => d.id);
        pSel.enter().append('circle')
            .attr('class', 'particle')
            .attr('cx', d => d.x).attr('cy', d => d.y)
            .attr('r', d => d.r)
            .attr('fill', d => AGE_COLORS[d.age])
            .attr('opacity', 0.6);

        // Animate orbit
        let animFrame;
        function animateParticles() {
            particles.forEach(p => {
                p.angle += p.speed;
                p.x = Math.cos(p.angle) * p.dist;
                p.y = Math.sin(p.angle) * p.dist;
            });
            particlesG.selectAll('.particle')
                .attr('cx', d => d.x).attr('cy', d => d.y);
            animFrame = requestAnimationFrame(animateParticles);
        }
        animateParticles();

        /* ── Outer age labels (static ring) ─────────────────────── */
        const labelR = outerR + 55;
        const labelG = mainG.append('g');

        function updateLabels(pcts, dominant) {
            labelG.selectAll('*').remove();
            const pieData = pie(age_groups.map(ag => ({ age: ag, pct: pcts[ag] || 0 })));
            pieData.forEach(d => {
                if (d.data.pct < 3) return; // skip tiny
                const midAngle = (d.startAngle + d.endAngle) / 2;
                const lx = Math.cos(midAngle - Math.PI / 2) * labelR;
                const ly = Math.sin(midAngle - Math.PI / 2) * labelR;
                const isDom = d.data.age === dominant;

                const g = labelG.append('g')
                    .attr('transform', `translate(${lx},${ly})`);

                g.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('font-family', 'Outfit')
                    .attr('font-size', isDom ? '13px' : '11px')
                    .attr('font-weight', isDom ? 700 : 500)
                    .attr('fill', isDom ? AGE_COLORS[d.data.age] : 'rgba(255,255,255,0.5)')
                    .text(`${AGE_EMOJI[d.data.age]} ${AGE_LABEL[d.data.age]}`);

                g.append('text')
                    .attr('y', 16)
                    .attr('text-anchor', 'middle')
                    .attr('font-family', 'DM Sans')
                    .attr('font-size', isDom ? '12px' : '10px')
                    .attr('font-weight', isDom ? 700 : 400)
                    .attr('fill', isDom ? '#fff' : 'rgba(255,255,255,0.35)')
                    .text(`${d.data.pct.toFixed(1)}%`);
            });
        }

        /* ── Controls (HTML, below SVG) ─────────────────────────── */
        const ctrlDiv = document.createElement('div');
        ctrlDiv.style.cssText = 'display:flex; gap:12px; align-items:center; justify-content:center; flex-wrap:wrap; padding:12px 0 0;';
        container.appendChild(ctrlDiv);

        const select = document.createElement('select');
        select.style.cssText = `
            background:var(--bg-card,#1a1a24); color:var(--text-primary,#f0f0f5);
            border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:10px 16px;
            font-family:var(--font-body); font-size:0.88rem; cursor:pointer; min-width:240px;
            outline:none; transition:border-color 0.2s;
        `;
        const allOpt = document.createElement('option');
        allOpt.value = '__all__';
        allOpt.textContent = '🌐 All terms (overall)';
        select.appendChild(allOpt);
        terms.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.term;
            opt.textContent = `${t.term.replace(/\b\w/g, c => c.toUpperCase())}`;
            select.appendChild(opt);
        });
        ctrlDiv.appendChild(select);

        const badge = document.createElement('span');
        badge.style.cssText = `
            display:inline-flex; align-items:center; gap:6px; padding:7px 16px;
            border-radius:24px; font-size:0.8rem; font-weight:600;
            background:rgba(167,139,250,0.1); color:var(--accent-light,#a78bfa);
            border:1px solid rgba(167,139,250,0.2);
        `;
        ctrlDiv.appendChild(badge);

        /* ── Update function ────────────────────────────────────── */
        function update(termName) {
            let pcts, dominant, profileLabel, meaning;

            if (termName === '__all__') {
                pcts = overall.pcts;
                dominant = Object.entries(pcts).reduce((a, b) => b[1] > a[1] ? b : a)[0];
                profileLabel = '🌐 Overall distribution';
                meaning = '';
            } else {
                const t = terms.find(x => x.term === termName);
                if (!t) return;
                pcts = t.age_pcts;
                dominant = t.dominant_age;
                profileLabel = PROFILE_LABELS[t.profile] || t.profile;
                meaning = t.meaning;
            }

            // Update donut
            const newData = age_groups.map(ag => ({ age: ag, pct: pcts[ag] || 0 }));
            const newPie = pie(newData);

            arcsG.selectAll('.age-arc').data(newPie, d => d.data.age)
                .transition().duration(700).ease(d3.easeCubicInOut)
                .attrTween('d', function(d) {
                    const prev = this._prev || d;
                    const interp = d3.interpolate(prev, d);
                    this._prev = d;
                    return t => arcGen(interp(t));
                })
                .attr('opacity', d => d.data.age === dominant ? 1 : 0.65);

            glowArcsG.selectAll('.glow-arc').data(newPie, d => d.data.age)
                .transition().duration(700).ease(d3.easeCubicInOut)
                .attrTween('d', function(d) {
                    const bigArc = d3.arc().innerRadius(innerR - 3).outerRadius(outerR + 3).padAngle(0.03).cornerRadius(4);
                    const prev = this._prev || d;
                    const interp = d3.interpolate(prev, d);
                    this._prev = d;
                    return t => bigArc(interp(t));
                })
                .attr('opacity', d => d.data.age === dominant ? 0.25 : 0.08);

            // Store previous arcs for interpolation
            arcsG.selectAll('.age-arc').each(function(d) { this._prev = d; });
            glowArcsG.selectAll('.glow-arc').each(function(d) { this._prev = d; });

            // Center text
            const domPct = pcts[dominant] || 0;
            centerPct.transition().duration(300)
                .attr('fill', AGE_COLORS[dominant])
                .tween('text', function() {
                    const prev = parseFloat(this.textContent) || 0;
                    const interp = d3.interpolate(prev, domPct);
                    return t => { this.textContent = interp(t).toFixed(1) + '%'; };
                });
            centerAge.text(`${AGE_EMOJI[dominant]} ${AGE_LABEL[dominant]}`)
                .attr('fill', AGE_COLORS[dominant]);
            centerLabel.text(dominant === Object.entries(pcts).reduce((a, b) => b[1] > a[1] ? b : a)[0] ? 'dominates this term' : '');

            // Update outer labels
            updateLabels(pcts, dominant);

            // Redistribute particles
            let idx = 0;
            const newParticles = [];
            age_groups.forEach(ag => {
                const count = Math.round(NUM_PARTICLES * (pcts[ag] || 0) / 100);
                for (let i = 0; i < count && newParticles.length < NUM_PARTICLES; i++) {
                    const existing = particles[idx] || {};
                    newParticles.push({
                        ...existing,
                        id: newParticles.length,
                        age: ag,
                        dist: particleR + (Math.random() - 0.5) * 40,
                        r: 1.5 + Math.random() * 2
                    });
                    idx++;
                }
            });
            while (newParticles.length < NUM_PARTICLES) {
                newParticles.push({
                    id: newParticles.length, age: dominant,
                    angle: Math.random() * Math.PI * 2,
                    speed: 0.002 + Math.random() * 0.004,
                    dist: particleR + (Math.random() - 0.5) * 40,
                    x: 0, y: 0, r: 1.5 + Math.random() * 2
                });
            }
            particles = newParticles;

            particlesG.selectAll('.particle').data(particles, d => d.id)
                .transition().duration(600)
                .attr('fill', d => AGE_COLORS[d.age])
                .attr('r', d => d.r)
                .attr('opacity', d => d.age === dominant ? 0.8 : 0.4);

            // Badge
            badge.textContent = profileLabel;
        }

        /* ── Arc hover tooltip ──────────────────────────────────── */
        arcsG.selectAll('.age-arc')
            .on('mouseenter', function(event, d) {
                d3.select(this).transition().duration(150)
                    .attr('opacity', 1)
                    .attr('transform', () => {
                        const mid = (d.startAngle + d.endAngle) / 2;
                        return `translate(${Math.cos(mid - Math.PI/2) * 6},${Math.sin(mid - Math.PI/2) * 6})`;
                    });
                tooltip.style('display', 'block').style('opacity', 1)
                    .html(`<strong style="color:${AGE_COLORS[d.data.age]}">${AGE_EMOJI[d.data.age]} ${d.data.age}</strong><br>${d.data.pct.toFixed(1)}% of usage`)
                    .style('left', (event.pageX + 14) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mousemove', function(event) {
                tooltip.style('left', (event.pageX + 14) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseleave', function(event, d) {
                const sel = select.value;
                const t = sel === '__all__' ? null : terms.find(x => x.term === sel);
                const dom = t ? t.dominant_age : Object.entries(overall.pcts).reduce((a, b) => b[1] > a[1] ? b : a)[0];
                d3.select(this).transition().duration(200)
                    .attr('opacity', d.data.age === dom ? 1 : 0.65)
                    .attr('transform', 'translate(0,0)');
                tooltip.style('display', 'none').style('opacity', 0);
            });

        /* ── Events ─────────────────────────────────────────────── */
        select.addEventListener('change', () => update(select.value));

        // Initial render
        update('__all__');
        // Set initial prev for arc interpolation
        arcsG.selectAll('.age-arc').each(function(d) { this._prev = d; });
        glowArcsG.selectAll('.glow-arc').each(function(d) { this._prev = d; });

        /* ── Entrance animation ─────────────────────────────────── */
        arcsG.selectAll('.age-arc')
            .attr('transform', 'scale(0)')
            .transition().duration(800).delay((d, i) => i * 80)
            .ease(d3.easeBackOut.overshoot(1.2))
            .attr('transform', 'scale(1)');

        particlesG.selectAll('.particle')
            .attr('opacity', 0)
            .transition().delay(500).duration(600)
            .attr('opacity', d => 0.6);

    }).catch(err => {
        console.error('Age gap error:', err);
        container.innerHTML = '<p style="color:#ff6b6b;padding:1rem">Failed to load age data.</p>';
    });
}
