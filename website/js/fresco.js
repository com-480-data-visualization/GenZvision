/**
 * fresco.js — "The Chronicle"
 * Minimal horizontal timeline with dots for each slang term.
 * Click a dot → card with term details pops up.
 */

function renderFresco() {
    const container = document.getElementById('fresco-viz');
    if (!container) return;

    d3.json('data/fresco_data.json').then(data => {
        container.innerHTML = '';

        /* ─── CATEGORY STYLING ─── */
        const CAT = {
            approval:     { emoji:'🔥', color:'#f97316' },
            emotion:      { emoji:'💫', color:'#a78bfa' },
            emphasis:     { emoji:'💯', color:'#facc15' },
            insult:       { emoji:'💀', color:'#f87171' },
            social:       { emoji:'✨', color:'#38bdf8' },
            identity:     { emoji:'👑', color:'#c084fc' },
            exposure:     { emoji:'📸', color:'#fb923c' },
            reaction:     { emoji:'😱', color:'#34d399' },
            description:  { emoji:'💅', color:'#ec4899' },
            manipulation: { emoji:'🎭', color:'#ef4444' },
            appearance:   { emoji:'💎', color:'#22d3ee' },
            attraction:   { emoji:'😏', color:'#f472b6' },
            dating:       { emoji:'💔', color:'#e879f9' },
            behavior:     { emoji:'🤪', color:'#818cf8' },
            humor:        { emoji:'😂', color:'#4ade80' },
            meme:         { emoji:'🗿', color:'#a3e635' },
            food:         { emoji:'🍽️', color:'#fbbf24' }
        };
        const gc = c => CAT[c] || { emoji:'💬', color:'#94a3b8' };

        const PLATFORM_ICON = {
            TikTok:'🎵', Twitter:'🐦', Reddit:'🤖', Instagram:'📷',
            YouTube:'▶️', Discord:'💬'
        };

        const PHASE_EMOJI = {
            growing:'📈', peak:'⚡', declining:'📉', dormant:'💤'
        };

        /* ─── DIMENSIONS ─── */
        const margin = { left: 60, right: 60, top: 60, bottom: 60 };
        const W = Math.max(container.clientWidth, 800);
        const H = 420;
        const lineY = H / 2;

        /* ─── PARSE & SCALE ─── */
        const parseDate = d3.timeParse('%Y-%m-%d');
        data.forEach(d => { d._date = parseDate(d.date); });

        const xScale = d3.scaleTime()
            .domain([new Date(2020, 0, 1), new Date(2025, 0, 1)])
            .range([margin.left, W - margin.right]);

        /* ─── Stagger overlapping dots above/below the line ─── */
        // Sort by date, then alternate above/below, with extra offset for same-date terms
        data.sort((a, b) => a._date - b._date);

        const DOT_R = 7;
        const positions = [];
        let lastX = -999;
        let sameXCount = 0;

        data.forEach((d, i) => {
            const x = xScale(d._date);
            // Detect clusters (dots closer than 15px)
            if (Math.abs(x - lastX) < 15) {
                sameXCount++;
            } else {
                sameXCount = 0;
            }
            lastX = x;

            // Stagger: alternate up/down, push further for clusters
            const row = (i + sameXCount) % 2 === 0 ? -1 : 1;
            const baseOffset = 28;
            const extraOffset = Math.floor(sameXCount / 2) * 22;
            const y = lineY + row * (baseOffset + extraOffset);

            positions.push({ ...d, px: x, py: y, idx: i });
        });

        /* ─── SVG ─── */
        const svg = d3.select(container).append('svg')
            .attr('width', W).attr('height', H)
            .attr('viewBox', `0 0 ${W} ${H}`)
            .style('overflow', 'visible');

        /* ─── TIMELINE ARROW ─── */
        // Main line
        svg.append('line')
            .attr('x1', margin.left - 20).attr('y1', lineY)
            .attr('x2', W - margin.right + 20).attr('y2', lineY)
            .attr('stroke', 'rgba(255,255,255,0.15)')
            .attr('stroke-width', 2);

        // Arrowhead
        svg.append('polygon')
            .attr('points', `${W - margin.right + 20},${lineY} ${W - margin.right + 10},${lineY - 6} ${W - margin.right + 10},${lineY + 6}`)
            .attr('fill', 'rgba(255,255,255,0.15)');

        /* ─── YEAR TICKS ─── */
        [2020, 2021, 2022, 2023, 2024, 2025].forEach(yr => {
            const x = xScale(new Date(yr, 0, 1));
            svg.append('line')
                .attr('x1', x).attr('y1', lineY - 10)
                .attr('x2', x).attr('y2', lineY + 10)
                .attr('stroke', 'rgba(255,255,255,0.2)')
                .attr('stroke-width', 1.5);
            svg.append('text')
                .attr('x', x).attr('y', lineY + 28)
                .attr('text-anchor', 'middle')
                .attr('font-family', 'Outfit').attr('font-size', '13px')
                .attr('font-weight', 700).attr('fill', 'rgba(255,255,255,0.25)')
                .text(yr);
        });

        /* ─── CONNECTOR LINES (dot to timeline) ─── */
        svg.selectAll('.connector')
            .data(positions).enter().append('line')
            .attr('class', 'connector')
            .attr('x1', d => d.px).attr('y1', lineY)
            .attr('x2', d => d.px).attr('y2', d => d.py)
            .attr('stroke', d => gc(d.category).color)
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0.2)
            .attr('stroke-dasharray', '2,3');

        /* ─── DOTS ─── */
        const dots = svg.selectAll('.term-dot')
            .data(positions).enter().append('g')
            .attr('class', 'term-dot')
            .attr('transform', d => `translate(${d.px},${d.py})`)
            .style('cursor', 'pointer');

        // Dot glow (hidden, shown on hover)
        dots.append('circle')
            .attr('class', 'dot-glow')
            .attr('r', DOT_R + 5)
            .attr('fill', d => gc(d.category).color)
            .attr('opacity', 0);

        // Main dot
        dots.append('circle')
            .attr('class', 'dot-main')
            .attr('r', DOT_R)
            .attr('fill', d => gc(d.category).color)
            .attr('stroke', '#0a0a0f')
            .attr('stroke-width', 2)
            .attr('opacity', 0.85);

        // Tiny emoji inside dot area (slightly above)
        dots.append('text')
            .attr('y', -DOT_R - 6)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('opacity', 0.7)
            .text(d => gc(d.category).emoji);

        /* ─── CARD (one shared card, moves to clicked dot) ─── */
        const cardW = 240, cardH = 160;
        const cardG = svg.append('g')
            .attr('class', 'info-card')
            .attr('opacity', 0)
            .attr('pointer-events', 'none');

        // Card background
        cardG.append('rect')
            .attr('class', 'card-bg')
            .attr('width', cardW).attr('height', cardH)
            .attr('rx', 14)
            .attr('fill', 'rgba(15,15,25,0.95)')
            .attr('stroke', '#6366f1')
            .attr('stroke-width', 1.5);

        // Card content group
        const cardContent = cardG.append('g').attr('class', 'card-content');

        // Pointer triangle
        cardG.append('polygon')
            .attr('class', 'card-pointer')
            .attr('fill', 'rgba(15,15,25,0.95)');

        let activeIdx = -1;

        /* ─── CLICK HANDLER ─── */
        dots.on('click', function(event, d) {
            event.stopPropagation();

            // Toggle if same dot
            if (activeIdx === d.idx) {
                cardG.attr('opacity', 0);
                activeIdx = -1;
                resetDots();
                return;
            }
            activeIdx = d.idx;

            // Highlight clicked dot
            resetDots();
            d3.select(this).select('.dot-glow').attr('opacity', 0.3);
            d3.select(this).select('.dot-main').attr('r', DOT_R + 2).attr('opacity', 1);

            // Position card
            const above = d.py > lineY;
            const cardX = Math.max(10, Math.min(d.px - cardW / 2, W - cardW - 10));
            const cardY = above ? d.py - cardH - 22 : d.py + 22;

            cardG.attr('transform', `translate(${cardX},${cardY})`);

            // Pointer
            const pointerX = d.px - cardX;
            if (above) {
                cardG.select('.card-pointer')
                    .attr('points', `${pointerX - 6},${cardH} ${pointerX + 6},${cardH} ${pointerX},${cardH + 10}`);
            } else {
                cardG.select('.card-pointer')
                    .attr('points', `${pointerX - 6},0 ${pointerX + 6},0 ${pointerX},-10`);
            }

            // Update card border color
            const color = gc(d.category).color;
            cardG.select('.card-bg').attr('stroke', color);
            cardG.select('.card-pointer').attr('fill', 'rgba(15,15,25,0.95)');

            // Rebuild card content
            cardContent.selectAll('*').remove();

            const name = d.term.replace(/\b\w/g, c => c.toUpperCase());
            const mon = d._date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            // Emoji + term name
            cardContent.append('text')
                .attr('x', 16).attr('y', 30)
                .attr('font-size', '18px')
                .text(gc(d.category).emoji);
            cardContent.append('text')
                .attr('x', 40).attr('y', 30)
                .attr('font-family', 'Outfit').attr('font-size', '17px')
                .attr('font-weight', 700).attr('fill', color)
                .text(name);

            // Meaning
            cardContent.append('text')
                .attr('x', 16).attr('y', 52)
                .attr('font-family', 'DM Sans').attr('font-size', '11px')
                .attr('fill', 'rgba(255,255,255,0.55)')
                .text(d.meaning.length > 40 ? d.meaning.slice(0, 38) + '…' : d.meaning);

            // Origin + date
            const platIcon = PLATFORM_ICON[d.origin] || '📱';
            cardContent.append('text')
                .attr('x', 16).attr('y', 76)
                .attr('font-family', 'DM Sans').attr('font-size', '11px')
                .attr('fill', 'rgba(255,255,255,0.4)')
                .text(`${platIcon} ${d.origin}  ·  ${mon}`);

            // Usage bar
            const maxU = d3.max(data, t => t.usage);
            const barW = cardW - 32;
            cardContent.append('rect')
                .attr('x', 16).attr('y', 92)
                .attr('width', barW).attr('height', 5)
                .attr('rx', 2.5).attr('fill', 'rgba(255,255,255,0.06)');
            cardContent.append('rect')
                .attr('x', 16).attr('y', 92)
                .attr('width', (d.usage / maxU) * barW).attr('height', 5)
                .attr('rx', 2.5).attr('fill', color).attr('opacity', 0.5);

            // Stats line
            const phase = PHASE_EMOJI[d.phase] || '';
            cardContent.append('text')
                .attr('x', 16).attr('y', 115)
                .attr('font-family', 'DM Sans').attr('font-size', '10px')
                .attr('fill', 'rgba(255,255,255,0.35)')
                .text(`${d.usage.toLocaleString()} uses  ·  Peak: ${d.peak}  ${phase}`);

            // Viral badge
            if (d.viral > 10) {
                cardContent.append('text')
                    .attr('x', 16).attr('y', 135)
                    .attr('font-family', 'DM Sans').attr('font-size', '10px')
                    .attr('fill', '#f97316')
                    .text(`🚀 ${d.viral} viral posts`);
            }

            // Show card
            cardG.attr('opacity', 1);
        });

        /* ─── HOVER ─── */
        dots.on('mouseenter', function(event, d) {
            if (activeIdx === d.idx) return;
            d3.select(this).select('.dot-glow').attr('opacity', 0.2);
            d3.select(this).select('.dot-main').attr('r', DOT_R + 1);

            // Show term name as tooltip
            tooltip.style('display', 'block').style('opacity', 1)
                .html(`<strong>${d.term.replace(/\b\w/g, c => c.toUpperCase())}</strong>`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 30) + 'px');
        })
        .on('mouseleave', function(event, d) {
            if (activeIdx === d.idx) return;
            d3.select(this).select('.dot-glow').attr('opacity', 0);
            d3.select(this).select('.dot-main').attr('r', DOT_R);
            tooltip.style('display', 'none').style('opacity', 0);
        });

        /* ─── CLICK OUTSIDE → close card ─── */
        svg.on('click', function() {
            cardG.attr('opacity', 0);
            activeIdx = -1;
            resetDots();
        });

        function resetDots() {
            dots.selectAll('.dot-glow').attr('opacity', 0);
            dots.selectAll('.dot-main').attr('r', DOT_R).attr('opacity', 0.85);
        }

        /* ─── ENTRANCE ANIMATION ─── */
        // Dots pop in one by one
        dots.attr('opacity', 0);
        svg.selectAll('.connector').attr('opacity', 0);

        positions.forEach((_, i) => {
            setTimeout(() => {
                const dotNodes = dots.nodes();
                const connNodes = svg.selectAll('.connector').nodes();
                if (dotNodes[i]) d3.select(dotNodes[i]).attr('opacity', 1);
                if (connNodes[i]) d3.select(connNodes[i]).attr('opacity', 1);
            }, 80 + i * 50);
        });

    }).catch(err => {
        console.error('Fresco data error:', err);
        container.innerHTML = '<p style="color:#ff6b6b;padding:2rem">Failed to load timeline data.</p>';
    });
}
