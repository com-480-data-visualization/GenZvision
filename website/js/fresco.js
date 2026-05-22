/**
 * fresco.js — "The Chronicle"
 * Full-width timeline. One dot per unique date, size = number of terms.
 * Diagonal labels above each dot. Color = origin platform.
 * Click a dot → card with all terms for that date.
 */

function renderFresco() {
    const container = document.getElementById('fresco-viz');
    if (!container) return;

    d3.json('data/fresco_data.json').then(raw => {
        container.innerHTML = '';

        /* ─── Platform colors ─── */
        const PLAT_COLOR = {
            TikTok:    '#fe2c55',
            Twitter:   '#1da1f2',
            Reddit:    '#ff4500',
            Instagram: '#e1306c',
            YouTube:   '#ff0000',
            Discord:   '#5865f2'
        };
        const platColor = p => PLAT_COLOR[p] || '#a78bfa';

        /* ─── Group by date ─── */
        const parse = d3.timeParse('%Y-%m-%d');
        raw.forEach(d => { d._date = parse(d.date); });

        const byDate = d3.group(raw, d => d.date);
        const dates = Array.from(byDate, ([date, terms]) => ({
            date,
            _date: parse(date),
            terms: terms.sort((a, b) => b.usage - a.usage),
            count: terms.length,
            // Dominant platform (most terms from)
            mainPlatform: d3.mode(terms, t => t.origin)
        })).sort((a, b) => a._date - b._date);

        /* ─── Dimensions ─── */
        const W = container.clientWidth || 900;
        const H = 300;
        const lineY = Math.round(H * 0.50);
        const pad = { left: 50, right: 50 };

        /* ─── Scales ─── */
        const x = d3.scaleTime()
            .domain([new Date(2019, 10, 1), new Date(2025, 2, 1)])
            .range([pad.left, W - pad.right]);

        const rScale = d3.scaleSqrt()
            .domain([1, d3.max(dates, d => d.count)])
            .range([6, 14]);

        /* ─── SVG ─── */
        const svg = d3.select(container).append('svg')
            .attr('width', '100%').attr('height', H)
            .attr('viewBox', `0 0 ${W} ${H}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        /* ─── Timeline line ─── */
        svg.append('line')
            .attr('x1', pad.left - 15).attr('y1', lineY)
            .attr('x2', W - pad.right + 15).attr('y2', lineY)
            .attr('stroke', 'rgba(255,255,255,0.1)')
            .attr('stroke-width', 2);

        svg.append('path')
            .attr('d', `M${W - pad.right + 25},${lineY} l-10,-5 l0,10 Z`)
            .attr('fill', 'rgba(255,255,255,0.1)');

        /* ─── Year markers ─── */
        for (let yr = 2020; yr <= 2025; yr++) {
            const xp = x(new Date(yr, 0, 1));
            svg.append('line')
                .attr('x1', xp).attr('y1', lineY - 6)
                .attr('x2', xp).attr('y2', lineY + 6)
                .attr('stroke', 'rgba(255,255,255,0.15)')
                .attr('stroke-width', 1);
            svg.append('text')
                .attr('x', xp).attr('y', lineY + 22)
                .attr('text-anchor', 'middle')
                .attr('font-family', 'Outfit').attr('font-size', '11px')
                .attr('font-weight', 600).attr('fill', 'rgba(255,255,255,0.18)')
                .text(yr);
        }

        /* ─── Dot groups ─── */
        const dots = svg.selectAll('.date-dot').data(dates).enter().append('g')
            .attr('class', 'date-dot')
            .attr('transform', d => `translate(${x(d._date)},${lineY})`)
            .style('cursor', 'pointer')
            .attr('opacity', 0);

        // Glow
        dots.append('circle').attr('class', 'glow')
            .attr('r', d => rScale(d.count) + 6)
            .attr('fill', d => platColor(d.mainPlatform))
            .attr('opacity', 0);

        // Main dot — colored by platform
        dots.append('circle').attr('class', 'main')
            .attr('r', d => rScale(d.count))
            .attr('fill', d => platColor(d.mainPlatform))
            .attr('stroke', '#0a0a0f').attr('stroke-width', 2)
            .attr('opacity', 0.85);

        // Count inside big dots
        dots.filter(d => d.count > 1).append('text')
            .attr('text-anchor', 'middle').attr('dy', '0.35em')
            .attr('font-family', 'Outfit').attr('font-size', '10px')
            .attr('font-weight', 700).attr('fill', '#fff')
            .attr('pointer-events', 'none')
            .text(d => d.count);

        /* ─── Diagonal labels — all terms stacked, alternating above/below ─── */
        const dotPositions = dates.map(d => x(d._date));
        const CLOSE_PX = 38;

        // Alternate: above vs below when neighbor is close.
        const above = new Array(dates.length).fill(true);
        for (let i = 1; i < dates.length; i++) {
            if (dotPositions[i] - dotPositions[i - 1] < CLOSE_PX) {
                above[i] = !above[i - 1];
            }
        }

        dots.each(function(d, di) {
            const g = d3.select(this);
            const names = d.terms.map(t => t.term.replace(/\b\w/g, c => c.toUpperCase()));
            const r = rScale(d.count);
            const step = 14;
            const gap = 8;             // distance from circle edge to first label
            const isAbove = above[di];

            names.forEach((name, i) => {
                // Above: stack upward from dot, rotate -50 (text fans up-right)
                // Below: stack downward from dot, rotate +50 (text fans down-right, symmetric mirror)
                const yOff = isAbove
                    ? -(r + gap + i * step)
                    :  (r + gap + 4 + i * step);

                g.append('text')
                    .attr('class', 'diag-label')
                    .attr('x', 0).attr('y', 0)
                    .attr('transform', `translate(0, ${yOff}) rotate(${isAbove ? -50 : 50})`)
                    .attr('text-anchor', 'start')
                    .attr('font-family', 'DM Sans').attr('font-size', '9px')
                    .attr('font-weight', 500)
                    .attr('fill', 'rgba(255,255,255,0.5)')
                    .attr('pointer-events', 'none')
                    .text(name);
            });
        });

        /* ─── Card (HTML overlay — can overflow SVG) ─── */
        let htmlCard = container.querySelector('.fresco-card');
        if (!htmlCard) {
            htmlCard = document.createElement('div');
            htmlCard.className = 'fresco-card';
            container.appendChild(htmlCard);
        }
        htmlCard.style.display = 'none';

        let activeDate = null;

        dots.on('click', function(event, d) {
            event.stopPropagation();

            if (activeDate === d.date) {
                htmlCard.style.display = 'none';
                activeDate = null;
                resetDots();
                return;
            }
            activeDate = d.date;
            resetDots();
            d3.select(this).select('.glow').attr('opacity', 0.25);

            const mon = d._date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            const useGrid = d.terms.length > 3;

            let html = `<div class="fresco-card-header" style="border-left:3px solid ${platColor(d.mainPlatform)}">${mon}${d.count > 1 ? ` · ${d.count} terms` : ''}</div>`;
            html += `<div class="fresco-card-grid${useGrid ? ' fresco-card-grid-multi' : ''}">`;

            d.terms.forEach((t, i) => {
                const name = t.term.replace(/\b\w/g, c => c.toUpperCase());
                const meaning = t.meaning.length > 35 ? t.meaning.slice(0, 33) + '…' : t.meaning;
                const likes = t.likes >= 1000000
                    ? (t.likes / 1000000).toFixed(1) + 'M ❤'
                    : t.likes >= 1000
                        ? Math.round(t.likes / 1000) + 'k ❤'
                        : t.likes + ' ❤';

                html += `<div class="fresco-card-term">
                    <span class="fresco-card-dot" style="background:${platColor(t.origin)}"></span>
                    <div class="fresco-card-info">
                        <span class="fresco-card-name">${name}</span>
                        <span class="fresco-card-meaning">"${meaning}"</span>
                        <span class="fresco-card-stats">${t.origin} · ${(t.usage / 1000).toFixed(1)}k uses · ${likes}</span>
                    </div>
                </div>`;
            });
            html += `</div>`;

            htmlCard.innerHTML = html;
            // Adjust card width for grid
            htmlCard.style.width = useGrid ? '820px' : '280px';

            // Position relative to SVG
            const svgRect = svg.node().getBoundingClientRect();
            const contRect = container.getBoundingClientRect();
            const dotX = x(d._date);
            const dotRatio = dotX / W;
            const pixelX = svgRect.left - contRect.left + svgRect.width * dotRatio;
            const cardWidth = useGrid ? 820 : 280;

            let left = pixelX - cardWidth / 2;
            left = Math.max(5, Math.min(left, contRect.width - cardWidth - 5));

            htmlCard.style.left = left + 'px';
            htmlCard.style.display = 'block';
        });

        /* ─── Hover ─── */
        dots.on('mouseenter', function(event, d) {
            if (activeDate === d.date) return;
            d3.select(this).select('.glow').attr('opacity', 0.15);
        })
        .on('mouseleave', function(event, d) {
            if (activeDate === d.date) return;
            d3.select(this).select('.glow').attr('opacity', 0);
        });

        /* ─── Click outside → close ─── */
        svg.on('click', () => {
            htmlCard.style.display = 'none';
            activeDate = null;
            resetDots();
        });

        function resetDots() {
            dots.selectAll('.glow').attr('opacity', 0);
        }

        /* ─── Entrance: left to right ─── */
        dates.forEach((_, i) => {
            setTimeout(() => {
                d3.select(dots.nodes()[i]).attr('opacity', 1);
            }, 120 + i * 55);
        });

        /* ─── Platform legend (HTML, below SVG) ─── */
        const platforms = ['TikTok', 'Twitter', 'Reddit', 'Instagram', 'YouTube', 'Discord'];
        const legDiv = document.createElement('div');
        legDiv.className = 'fresco-legend';
        platforms.forEach(p => {
            const item = document.createElement('span');
            item.className = 'fresco-legend-item';
            const dot = document.createElement('span');
            dot.className = 'fresco-legend-dot';
            dot.style.background = platColor(p);
            item.appendChild(dot);
            item.appendChild(document.createTextNode(p));
            legDiv.appendChild(item);
        });
        container.appendChild(legDiv);

    }).catch(err => {
        console.error('Chronicle error:', err);
        container.innerHTML = '<p style="color:#ff6b6b;padding:2rem">Failed to load data.</p>';
    });
}
