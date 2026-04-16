/**
 * main.js — Scroll observer and section transitions
 * Uses Intersection Observer API for scroll-triggered animations
 * (L1 - Web Dev: DOM manipulation; L12 - Storytelling: linear narrative flow)
 */

// Global tooltip element
const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0)
    .style('display', 'none');

// === Intersection Observer for section reveal ===
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            updateActiveNav(entry.target.id);
            triggerSectionViz(entry.target.id);
        }
    });
}, {
    threshold: 0.05,
    rootMargin: '0px 0px'
});

// Observe all sections
document.querySelectorAll('.section').forEach(section => {
    sectionObserver.observe(section);
});

// Make hero visible immediately
document.getElementById('hero').classList.add('visible');

// === Navigation active state ===
function updateActiveNav(sectionId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });
}

// === Trigger visualization rendering on first view ===
const vizRendered = new Set();

function triggerSectionViz(sectionId) {
    if (vizRendered.has(sectionId)) return;
    vizRendered.add(sectionId);

    switch (sectionId) {
        case 'hero':
            if (typeof renderHeroViz === 'function') renderHeroViz();
            break;
        case 'rise':
            if (typeof renderTimeline === 'function') renderTimeline();
            break;
        case 'spread':
            if (typeof renderSankey === 'function') renderSankey();
            break;
        case 'lifecycle':
            if (typeof renderBubbles === 'function') renderBubbles();
            break;
    }
}

// === Hero floating words animation ===
function renderHeroViz() {
    d3.json('data/top_terms_summary.json').then(data => {
        const container = document.getElementById('hero-viz');
        const width = container.clientWidth;
        const height = container.clientHeight;

        const svg = d3.select('#hero-viz')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const maxUsage = d3.max(data, d => d.total_usage);
        const fontScale = d3.scaleLinear()
            .domain([d3.min(data, d => d.total_usage), maxUsage])
            .range([14, 48]);

        const nodes = data.map(d => ({
            ...d,
            x: Math.random() * width,
            y: Math.random() * height,
            fontSize: fontScale(d.total_usage)
        }));

        const simulation = d3.forceSimulation(nodes)
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('charge', d3.forceManyBody().strength(-30))
            .force('collision', d3.forceCollide().radius(d => d.fontSize * 1.5))
            .force('x', d3.forceX(width / 2).strength(0.02))
            .force('y', d3.forceY(height / 2).strength(0.02))
            .alphaDecay(0.05);

        const texts = svg.selectAll('text')
            .data(nodes)
            .enter()
            .append('text')
            .text(d => d.slang_term)
            .attr('font-family', 'Space Grotesk, sans-serif')
            .attr('font-size', d => d.fontSize + 'px')
            .attr('font-weight', 600)
            .attr('fill', (d, i) => d3.interpolateViridis(i / nodes.length))
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .style('opacity', 0.6)
            .style('cursor', 'default');

        simulation.on('tick', () => {
            texts
                .attr('x', d => Math.max(50, Math.min(width - 50, d.x)))
                .attr('y', d => Math.max(30, Math.min(height - 30, d.y)));
        });

        // Stop simulation after initial layout settles
        simulation.on('end', () => {
            // Simulation complete, words are positioned
        });
    });
}

// Trigger hero immediately
renderHeroViz();

// === Scroll progress bar ===
const progressBar = document.getElementById('scroll-progress');
function updateProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const pct = height > 0 ? (scrollTop / height) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// === Animated number counters in hero ===
function animateCounter(el) {
    const target = parseInt(el.dataset.countTo, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1800; // ms
    const startTime = performance.now();
    const formatter = new Intl.NumberFormat('en-US');

    function tick(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3);
        const value = Math.floor(target * eased);
        el.textContent = formatter.format(value) + suffix;
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = formatter.format(target) + suffix;
    }
    requestAnimationFrame(tick);
}

// Kick off counters shortly after the hero stats fade in (1.15s delay)
setTimeout(() => {
    document.querySelectorAll('.hero-stat-num[data-count-to]').forEach(animateCounter);
}, 1250);
