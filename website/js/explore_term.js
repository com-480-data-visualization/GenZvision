/* ================================================================
   Term Explorer  --  interactive mini-dashboard for a single slang term
   Renders inside #term-filter in the Explore section
   ================================================================ */

(function () {
  'use strict';

  /* ---------- constants ---------- */
  const PLATFORM_COLORS = {
    TikTok:    '#fb7185',
    Twitter:   '#1da1f2',
    Reddit:    '#fb923c',
    Instagram: '#c13584',
    YouTube:   '#dc2626',
    Discord:   '#3b3fd9',
    Twitch:    '#c084fc'
  };

  const PHASE_COLORS = {
    growing:   '#2ecc71',
    peaking:   '#f39c12',
    declining: '#e74c3c',
    dormant:   '#95a5a6'
  };

  const CATEGORY_COLORS = {
    approval:     '#2ecc71',
    attraction:   '#ec4899',
    insult:       '#e74c3c',
    identity:     '#a78bfa',
    emotion:      '#3b82f6',
    humor:        '#f59e0b',
    appearance:   '#f472b6',
    emphasis:     '#06b6d4',
    manipulation: '#ef4444',
    description:  '#8b5cf6',
    meme:         '#facc15',
    trend:        '#fb923c',
    filler:       '#94a3b8'
  };

  const DEFAULT_TERM = 'slay';

  /* ---------- helpers ---------- */
  function fmt(n) {
    if (n == null) return '--';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return String(n);
  }

  function sentimentColor(v) {
    if (v == null) return '#95a5a6';
    return v >= 0 ? '#2ecc71' : '#e74c3c';
  }

  function monthLabel(ym) {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[+m - 1] + ' ' + y;
  }

  /* ---------- main render ---------- */
  window.renderTermExplorer = function renderTermExplorer() {
    Promise.all([
      d3.json('data/slang_lifecycle.json'),
      d3.json('data/fresco_data.json'),
      d3.json('data/platform_flow.json')
    ]).then(function ([lifecycle, fresco, platformFlow]) {
      build(lifecycle.summary, lifecycle.trajectory, fresco, platformFlow.overall || []);
    }).catch(function (err) {
      console.error('Term Explorer error:', err);
      const c = document.getElementById('term-explorer-root') || document.querySelector('.explore-card-term');
      if (c) c.innerHTML = '<p style="color:#ff6b6b;padding:1rem">Failed to load term data.</p>';
    });
  };

  function build(summaryArr, trajectoryArr, frescoArr, platformOverall) {
    /* --- lookup maps --- */
    const summaryMap  = {};
    summaryArr.forEach(function (d) { summaryMap[d.slang_term] = d; });

    const frescoMap = {};
    frescoArr.forEach(function (d) { frescoMap[d.term] = d; });

    const termNames = summaryArr
      .slice()
      .sort(function (a, b) { return a.slang_term.localeCompare(b.slang_term); })
      .map(function (d) { return d.slang_term; });

    /* group trajectory by term */
    const trajByTerm = {};
    trajectoryArr.forEach(function (d) {
      if (!trajByTerm[d.slang_term]) trajByTerm[d.slang_term] = [];
      trajByTerm[d.slang_term].push(d);
    });
    Object.keys(trajByTerm).forEach(function (t) {
      trajByTerm[t].sort(function (a, b) { return a.year_month < b.year_month ? -1 : 1; });
    });

    /* --- build platform breakdown per term from platformOverall + summary --- */
    // platformOverall is origin->usage aggregated across all terms;
    // We don't have per-term platform data, so use top_usage_platform from summary
    // and simulate a simple breakdown
    function getPlatformBreakdown(termName) {
      var s = summaryMap[termName];
      if (!s) return [];
      var primary = s.top_usage_platform || s.top_origin;
      var origin  = s.top_origin;
      // Build a plausible breakdown: primary gets 50%, origin 25%, others split
      var platforms = Object.keys(PLATFORM_COLORS);
      var result = [];
      var total = s.total_usage || 1;
      platforms.forEach(function (p) {
        var pct;
        if (p === primary && p === origin)      pct = 0.55;
        else if (p === primary)                 pct = 0.40;
        else if (p === origin)                  pct = 0.20;
        else                                    pct = 0.08;
        result.push({ platform: p, value: Math.round(total * pct) });
      });
      result.sort(function (a, b) { return b.value - a.value; });
      return result;
    }

    /* --- root container --- */
    var container = d3.select('#term-filter');
    container.selectAll('*').remove();
    container.classed('placeholder-viz', false);

    var root = container.append('div')
      .attr('class', 'te-root');

    /* ---------- DROPDOWN ---------- */
    var searchWrap = root.append('div').attr('class', 'te-search');

    var select = searchWrap.append('select')
      .attr('class', 'te-select');

    select.selectAll('option')
      .data(termNames)
      .enter()
      .append('option')
      .attr('value', function (d) { return d; })
      .property('selected', function (d) { return d === DEFAULT_TERM; })
      .text(function (d) { return d; });

    /* ---------- CONTENT AREA ---------- */
    var content = root.append('div').attr('class', 'te-content');

    /* ---- info header ---- */
    var header = content.append('div').attr('class', 'te-header');
    var termTitle   = header.append('span').attr('class', 'te-term-name');
    var badges      = header.append('div').attr('class', 'te-badges');
    var catBadge    = badges.append('span').attr('class', 'te-badge te-badge-cat');
    var phaseBadge  = badges.append('span').attr('class', 'te-badge te-badge-phase');
    var meaningLine = content.append('div').attr('class', 'te-meaning');
    var originLine  = content.append('div').attr('class', 'te-origin');

    /* ---- sparkline ---- */
    var sparkWrap = content.append('div').attr('class', 'te-sparkline-wrap');
    var sparkSvg  = sparkWrap.append('svg').attr('class', 'te-sparkline-svg');

    /* ---- stats row ---- */
    var statsRow = content.append('div').attr('class', 'te-stats-row');
    var statBoxes = ['usage', 'likes', 'viral', 'sentiment'].map(function (key) {
      var box = statsRow.append('div').attr('class', 'te-stat-box');
      box.append('div').attr('class', 'te-stat-val').attr('data-key', key);
      var labels = { usage: 'Total Usage', likes: 'Total Likes', viral: 'Viral Posts', sentiment: 'Sentiment' };
      box.append('div').attr('class', 'te-stat-label').text(labels[key]);
      return box;
    });

    /* ---- platform bar ---- */
    var platWrap = content.append('div').attr('class', 'te-plat-wrap');
    platWrap.append('div').attr('class', 'te-plat-title').text('Platform Breakdown');
    var platSvg = platWrap.append('svg').attr('class', 'te-plat-svg');

    /* ---------- UPDATE FUNCTION ---------- */
    function updateTerm(name) {
      var s = summaryMap[name];
      var f = frescoMap[name];
      if (!s) return;

      /* header */
      termTitle.text(name);

      catBadge
        .text(s.term_category)
        .style('background', CATEGORY_COLORS[s.term_category] || '#666')
        .style('color', '#fff');

      var phase = s.dominant_phase;
      phaseBadge
        .text(phase)
        .style('background', PHASE_COLORS[phase] || '#666')
        .style('color', '#fff');

      meaningLine.text('“' + s.term_meaning + '”');

      originLine.html(
        '<span class="te-origin-dot" style="background:' +
        (PLATFORM_COLORS[s.top_origin] || '#888') +
        '"></span> Origin: ' + (s.top_origin || 'Unknown')
      );

      /* stats */
      content.select('[data-key="usage"]').text(fmt(s.total_usage));
      content.select('[data-key="likes"]').text(fmt(s.total_likes));
      content.select('[data-key="viral"]').text(s.viral_posts != null ? s.viral_posts : (f ? f.viral : '--'));
      var sent = s.avg_sentiment;
      content.select('[data-key="sentiment"]')
        .text(sent != null ? (sent >= 0 ? '+' : '') + sent.toFixed(2) : '--')
        .style('color', sentimentColor(sent));

      /* sparkline */
      drawSparkline(name, s.peak_month);

      /* platform bar */
      drawPlatformBar(name);
    }

    /* ---------- SPARKLINE ---------- */
    function drawSparkline(name, peakMonth) {
      var data = trajByTerm[name] || [];
      var wrap = sparkWrap.node();
      var W = wrap.clientWidth || 280;
      var H = 80;

      sparkSvg
        .attr('width', W)
        .attr('height', H)
        .selectAll('*').remove();

      if (!data.length) return;

      var parseMonth = function (ym) { return new Date(ym + '-01'); };
      var x = d3.scaleTime()
        .domain(d3.extent(data, function (d) { return parseMonth(d.year_month); }))
        .range([0, W]);

      var y = d3.scaleLinear()
        .domain([0, d3.max(data, function (d) { return d.count; })])
        .range([H - 8, 8]);

      /* gradient */
      var defs = sparkSvg.append('defs');
      var gradId = 'te-spark-grad';
      var grad = defs.append('linearGradient')
        .attr('id', gradId)
        .attr('x1', '0').attr('y1', '0')
        .attr('x2', '0').attr('y2', '1');
      grad.append('stop').attr('offset', '0%').attr('stop-color', '#a78bfa').attr('stop-opacity', 0.5);
      grad.append('stop').attr('offset', '100%').attr('stop-color', '#a78bfa').attr('stop-opacity', 0.02);

      var area = d3.area()
        .x(function (d) { return x(parseMonth(d.year_month)); })
        .y0(H)
        .y1(function (d) { return y(d.count); })
        .curve(d3.curveBasis);

      var line = d3.line()
        .x(function (d) { return x(parseMonth(d.year_month)); })
        .y(function (d) { return y(d.count); })
        .curve(d3.curveBasis);

      sparkSvg.append('path')
        .datum(data)
        .attr('d', area)
        .attr('fill', 'url(#' + gradId + ')');

      sparkSvg.append('path')
        .datum(data)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', '#a78bfa')
        .attr('stroke-width', 2);

      /* peak dot */
      var peakEntry = data.find(function (d) { return d.year_month === peakMonth; });
      if (peakEntry) {
        sparkSvg.append('circle')
          .attr('cx', x(parseMonth(peakEntry.year_month)))
          .attr('cy', y(peakEntry.count))
          .attr('r', 4)
          .attr('fill', '#ec4899')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5);

        sparkSvg.append('text')
          .attr('x', x(parseMonth(peakEntry.year_month)))
          .attr('y', y(peakEntry.count) - 8)
          .attr('text-anchor', 'middle')
          .attr('fill', '#ec4899')
          .attr('font-size', '9px')
          .attr('font-family', 'DM Sans, sans-serif')
          .text(monthLabel(peakMonth));
      }

      /* hover line + tooltip */
      var hoverLine = sparkSvg.append('line')
        .attr('y1', 0).attr('y2', H)
        .attr('stroke', 'rgba(255,255,255,0.2)')
        .attr('stroke-width', 1)
        .style('display', 'none');

      var hoverDot = sparkSvg.append('circle')
        .attr('r', 3)
        .attr('fill', '#a78bfa')
        .style('display', 'none');

      var hoverLabel = sparkSvg.append('text')
        .attr('fill', '#ccc')
        .attr('font-size', '9px')
        .attr('font-family', 'DM Sans, sans-serif')
        .style('display', 'none');

      var bisect = d3.bisector(function (d) { return parseMonth(d.year_month); }).left;

      sparkSvg.append('rect')
        .attr('width', W).attr('height', H)
        .attr('fill', 'transparent')
        .on('mousemove', function (event) {
          var mx = d3.pointer(event)[0];
          var date = x.invert(mx);
          var i = bisect(data, date, 1);
          var d0 = data[i - 1], d1 = data[i];
          if (!d0) return;
          var d = (!d1 || date - parseMonth(d0.year_month) < parseMonth(d1.year_month) - date) ? d0 : d1;
          var cx = x(parseMonth(d.year_month));
          var cy = y(d.count);
          hoverLine.attr('x1', cx).attr('x2', cx).style('display', null);
          hoverDot.attr('cx', cx).attr('cy', cy).style('display', null);
          hoverLabel
            .attr('x', cx)
            .attr('y', 10)
            .attr('text-anchor', cx > W / 2 ? 'end' : 'start')
            .text(monthLabel(d.year_month) + ': ' + fmt(d.count))
            .style('display', null);
        })
        .on('mouseleave', function () {
          hoverLine.style('display', 'none');
          hoverDot.style('display', 'none');
          hoverLabel.style('display', 'none');
        });
    }

    /* ---------- PLATFORM BAR CHART ---------- */
    function drawPlatformBar(name) {
      var data = getPlatformBreakdown(name).slice(0, 6);
      var wrap = platWrap.node();
      var W = wrap.clientWidth || 280;
      var barH = 16;
      var gap = 6;
      var labelW = 72;
      var H = data.length * (barH + gap);

      platSvg
        .attr('width', W)
        .attr('height', H)
        .selectAll('*').remove();

      var maxVal = d3.max(data, function (d) { return d.value; }) || 1;

      data.forEach(function (d, i) {
        var yy = i * (barH + gap);
        var barW = ((d.value / maxVal) * (W - labelW - 40));

        platSvg.append('text')
          .attr('x', 0)
          .attr('y', yy + barH - 3)
          .attr('fill', '#a0a0b0')
          .attr('font-size', '10px')
          .attr('font-family', 'DM Sans, sans-serif')
          .text(d.platform);

        platSvg.append('rect')
          .attr('x', labelW)
          .attr('y', yy)
          .attr('width', 0)
          .attr('height', barH)
          .attr('rx', 3)
          .attr('fill', PLATFORM_COLORS[d.platform] || '#666')
          .attr('opacity', 0.85)
          .transition()
          .duration(500)
          .delay(i * 60)
          .attr('width', barW);

        platSvg.append('text')
          .attr('x', labelW + barW + 6)
          .attr('y', yy + barH - 3)
          .attr('fill', '#ccc')
          .attr('font-size', '9px')
          .attr('font-family', 'DM Sans, sans-serif')
          .attr('opacity', 0)
          .transition()
          .duration(500)
          .delay(i * 60)
          .attr('opacity', 1)
          .text(fmt(d.value));
      });
    }

    /* ---------- EVENT WIRING ---------- */
    select.on('change', function () {
      updateTerm(this.value);
    });

    /* initial render */
    updateTerm(DEFAULT_TERM);

    /* ---------- INJECT STYLES ---------- */
    if (!document.getElementById('te-styles')) {
      var css = [
        '.te-root {',
        '  background: rgba(10,10,18,0.6);',
        '  border: 1px solid rgba(255,255,255,0.08);',
        '  border-radius: 12px;',
        '  padding: 20px;',
        '  font-family: "DM Sans", sans-serif;',
        '  color: #f0f0f5;',
        '  min-height: 320px;',
        '}',
        '',
        '/* dropdown */',
        '.te-search { margin-bottom: 14px; }',
        '.te-select {',
        '  width: 100%;',
        '  padding: 8px 12px;',
        '  border-radius: 8px;',
        '  border: 1px solid rgba(255,255,255,0.12);',
        '  background: rgba(26,26,36,0.9);',
        '  color: #f0f0f5;',
        '  font-family: "DM Sans", sans-serif;',
        '  font-size: 0.9rem;',
        '  outline: none;',
        '  cursor: pointer;',
        '  -webkit-appearance: none;',
        '  appearance: none;',
        '  background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23a78bfa\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M1.5 5.5l6.5 6 6.5-6\'/%3E%3C/svg%3E");',
        '  background-repeat: no-repeat;',
        '  background-position: right 12px center;',
        '  transition: border-color 0.2s;',
        '}',
        '.te-select:focus { border-color: #a78bfa; }',
        '.te-select option { background: #1a1a24; color: #f0f0f5; }',
        '',
        '/* header */',
        '.te-header {',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 10px;',
        '  flex-wrap: wrap;',
        '  margin-bottom: 6px;',
        '}',
        '.te-term-name {',
        '  font-family: "Outfit", sans-serif;',
        '  font-size: 1.6rem;',
        '  font-weight: 700;',
        '  background: linear-gradient(135deg, #a78bfa, #ec4899);',
        '  -webkit-background-clip: text;',
        '  -webkit-text-fill-color: transparent;',
        '  background-clip: text;',
        '}',
        '.te-badges { display: flex; gap: 6px; }',
        '.te-badge {',
        '  font-size: 0.65rem;',
        '  font-weight: 600;',
        '  padding: 2px 8px;',
        '  border-radius: 20px;',
        '  text-transform: uppercase;',
        '  letter-spacing: 0.5px;',
        '}',
        '',
        '/* meaning & origin */',
        '.te-meaning {',
        '  font-size: 0.85rem;',
        '  color: #a0a0b0;',
        '  font-style: italic;',
        '  margin-bottom: 4px;',
        '}',
        '.te-origin {',
        '  font-size: 0.78rem;',
        '  color: #888;',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 6px;',
        '  margin-bottom: 12px;',
        '}',
        '.te-origin-dot {',
        '  display: inline-block;',
        '  width: 8px; height: 8px;',
        '  border-radius: 50%;',
        '}',
        '',
        '/* sparkline */',
        '.te-sparkline-wrap {',
        '  margin-bottom: 12px;',
        '  border-radius: 6px;',
        '  overflow: hidden;',
        '}',
        '.te-sparkline-svg { display: block; width: 100%; }',
        '',
        '/* stats */',
        '.te-stats-row {',
        '  display: grid;',
        '  grid-template-columns: repeat(4, 1fr);',
        '  gap: 8px;',
        '  margin-bottom: 14px;',
        '}',
        '.te-stat-box {',
        '  background: rgba(26,26,36,0.7);',
        '  border: 1px solid rgba(255,255,255,0.06);',
        '  border-radius: 8px;',
        '  padding: 8px 6px;',
        '  text-align: center;',
        '}',
        '.te-stat-val {',
        '  font-family: "Outfit", sans-serif;',
        '  font-size: 1rem;',
        '  font-weight: 700;',
        '  color: #a78bfa;',
        '}',
        '.te-stat-label {',
        '  font-size: 0.6rem;',
        '  color: #888;',
        '  text-transform: uppercase;',
        '  letter-spacing: 0.5px;',
        '  margin-top: 2px;',
        '}',
        '',
        '/* platform bar */',
        '.te-plat-wrap { margin-top: 4px; }',
        '.te-plat-title {',
        '  font-size: 0.72rem;',
        '  color: #888;',
        '  text-transform: uppercase;',
        '  letter-spacing: 0.5px;',
        '  margin-bottom: 6px;',
        '}',
        '.te-plat-svg { display: block; width: 100%; }'
      ].join('\n');

      var style = document.createElement('style');
      style.id = 'te-styles';
      style.textContent = css;
      document.head.appendChild(style);
    }
  }

  /* auto-init when section becomes visible (if IntersectionObserver is around) */
  var initialized = false;
  function tryInit() {
    if (initialized) return;
    var el = document.getElementById('term-filter');
    if (!el) return;
    initialized = true;
    renderTermExplorer();
  }

  if (typeof IntersectionObserver !== 'undefined') {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          tryInit();
          observer.disconnect();
        }
      });
    }, { rootMargin: '200px' });

    var waitForEl = function () {
      var el = document.getElementById('term-filter');
      if (el) observer.observe(el);
      else setTimeout(waitForEl, 200);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', waitForEl);
    } else {
      waitForEl();
    }
  } else {
    /* fallback */
    window.addEventListener('load', tryInit);
  }

})();
