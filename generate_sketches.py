"""
Generate hand-drawn style reference sketches for M2 report.
These are meant as references for the student to redraw on iPad.
"""
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.patheffects as pe
import numpy as np
import os

plt.rcParams['font.family'] = 'sans-serif'

# Enable sketch/hand-drawn style
plt.xkcd()

OUTPUT_DIR = 'data/sketches'
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ============================================================
# SKETCH 1: Scrollytelling Storyboard (Overall Flow)
# ============================================================
def sketch_storyboard():
    fig, ax = plt.subplots(figsize=(8, 12))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 16)
    ax.axis('off')

    sections = [
        ("1. Hero", "Floating slang terms\n(force simulation)", "#7c3aed", 13.5),
        ("2. The Rise", "Timeline Heatmap\n(terms x months)", "#e74c3c", 10.5),
        ("3. The Spread", "Sankey Diagram\n(platform flows)", "#3498db", 7.5),
        ("4. Peak & Decline", "Bubble Chart\n(lifecycle phases)", "#2ecc71", 4.5),
        ("5. Explore", "Interactive Dashboard\n(linked views)", "#f39c12", 1.5),
    ]

    for title, desc, color, y in sections:
        rect = patches.FancyBboxPatch((1.5, y - 0.8), 7, 2.2,
                                       boxstyle="round,pad=0.15",
                                       facecolor=color, alpha=0.15,
                                       edgecolor=color, linewidth=2)
        ax.add_patch(rect)
        ax.text(5, y + 0.8, title, ha='center', va='center',
                fontsize=14, fontweight='bold', color=color)
        ax.text(5, y - 0.1, desc, ha='center', va='center',
                fontsize=10, color='#333')

    # Arrows between sections
    for i in range(4):
        y_start = sections[i][3] - 0.8
        y_end = sections[i+1][3] + 1.4
        ax.annotate('', xy=(5, y_end + 0.1), xytext=(5, y_start - 0.1),
                    arrowprops=dict(arrowstyle='->', color='#666', lw=2))

    ax.text(5, 15.5, 'Scrollytelling Flow', ha='center', fontsize=16,
            fontweight='bold', color='#222')
    ax.text(5, 15, 'User scrolls down through the narrative', ha='center',
            fontsize=10, color='#666', style='italic')

    plt.tight_layout()
    plt.savefig(f'{OUTPUT_DIR}/sketch_01_storyboard.png', dpi=150, bbox_inches='tight',
                facecolor='white')
    plt.close()
    print('Saved sketch_01_storyboard.png')


# ============================================================
# SKETCH 2: Timeline Heatmap
# ============================================================
def sketch_timeline_heatmap():
    fig, ax = plt.subplots(figsize=(12, 7))

    terms = ['slay', 'rizz', 'bussin', 'skibidi', 'delulu', 'sigma',
             'NPC', 'brain rot', 'ohio', 'aura']
    months = np.arange(0, 72)  # 6 years x 12 months

    np.random.seed(42)
    for i, term in enumerate(terms):
        # Each term has a different emergence and peak pattern
        start = np.random.randint(0, 30)
        peak = start + np.random.randint(10, 30)
        for j in months:
            if j < start:
                intensity = 0
            elif j < peak:
                intensity = (j - start) / (peak - start) * 0.8 + np.random.random() * 0.2
            else:
                intensity = max(0, 0.8 - (j - peak) * 0.02 + np.random.random() * 0.15)

            color = plt.cm.YlOrRd(intensity) if intensity > 0.05 else (0.95, 0.95, 0.95, 1)
            rect = patches.Rectangle((j, i - 0.4), 0.9, 0.8,
                                      facecolor=color, edgecolor='none')
            ax.add_patch(rect)

    ax.set_xlim(-1, 73)
    ax.set_ylim(-1, len(terms))
    ax.set_yticks(range(len(terms)))
    ax.set_yticklabels(terms, fontsize=11)

    year_ticks = [0, 12, 24, 36, 48, 60, 72]
    year_labels = ['2020', '2021', '2022', '2023', '2024', '2025', '']
    ax.set_xticks(year_ticks)
    ax.set_xticklabels(year_labels, fontsize=10)

    ax.set_title('Timeline Heatmap: When Slang Rises and Falls', fontsize=14, fontweight='bold')
    ax.set_xlabel('Time', fontsize=12)
    ax.set_ylabel('Slang Term', fontsize=12)

    # Annotation
    ax.annotate('peak moment!', xy=(25, 0), xytext=(45, 1.5),
                fontsize=10, color='red',
                arrowprops=dict(arrowstyle='->', color='red', lw=1.5))

    ax.annotate('term emerges\nhere', xy=(18, 3), xytext=(5, 5),
                fontsize=10, color='#555',
                arrowprops=dict(arrowstyle='->', color='#555', lw=1.5))

    # Color legend
    from matplotlib.cm import ScalarMappable
    from matplotlib.colors import Normalize
    sm = ScalarMappable(cmap=plt.cm.YlOrRd, norm=Normalize(0, 1))
    cbar = plt.colorbar(sm, ax=ax, shrink=0.6, pad=0.02)
    cbar.set_label('Usage Intensity', fontsize=10)

    plt.tight_layout()
    plt.savefig(f'{OUTPUT_DIR}/sketch_02_timeline_heatmap.png', dpi=150, bbox_inches='tight',
                facecolor='white')
    plt.close()
    print('Saved sketch_02_timeline_heatmap.png')


# ============================================================
# SKETCH 3: Sankey Diagram (Platform Flow)
# ============================================================
def sketch_sankey():
    fig, ax = plt.subplots(figsize=(12, 7))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    # Origin platforms (left)
    origins = [
        ('TikTok', 4.0, '#ee1d52'),
        ('Twitter', 1.8, '#1da1f2'),
        ('Reddit', 1.2, '#ff4500'),
        ('YouTube', 1.0, '#ff0000'),
        ('Instagram', 1.0, '#c13584'),
        ('Twitch', 0.5, '#9146ff'),
    ]

    # Usage platforms (right)
    usages = [
        ('TikTok', 3.2, '#ee1d52'),
        ('Twitter', 2.0, '#1da1f2'),
        ('Reddit', 1.5, '#ff4500'),
        ('Discord', 1.0, '#5865f2'),
        ('YouTube', 0.8, '#ff0000'),
        ('Instagram', 0.8, '#c13584'),
        ('Twitch', 0.4, '#9146ff'),
    ]

    # Draw origin bars
    y_pos = 9.2
    origin_positions = {}
    for name, size, color in origins:
        height = size * 0.7
        rect = patches.FancyBboxPatch((0.3, y_pos - height), 0.8, height,
                                       boxstyle="round,pad=0.03",
                                       facecolor=color, alpha=0.8)
        ax.add_patch(rect)
        ax.text(0.1, y_pos - height/2, name, ha='right', va='center',
                fontsize=10, fontweight='bold')
        origin_positions[name] = y_pos - height/2
        y_pos -= height + 0.15

    # Draw usage bars
    y_pos = 9.2
    usage_positions = {}
    for name, size, color in usages:
        height = size * 0.7
        rect = patches.FancyBboxPatch((8.9, y_pos - height), 0.8, height,
                                       boxstyle="round,pad=0.03",
                                       facecolor=color, alpha=0.8)
        ax.add_patch(rect)
        ax.text(9.9, y_pos - height/2, name, ha='left', va='center',
                fontsize=10, fontweight='bold')
        usage_positions[name] = y_pos - height/2
        y_pos -= height + 0.15

    # Draw some flow lines
    flows = [
        ('TikTok', 'TikTok', 3, '#ee1d52'),
        ('TikTok', 'Twitter', 1.5, '#ee1d52'),
        ('TikTok', 'Discord', 0.8, '#ee1d52'),
        ('Twitter', 'Twitter', 1.5, '#1da1f2'),
        ('Twitter', 'Reddit', 0.8, '#1da1f2'),
        ('Reddit', 'Reddit', 1.0, '#ff4500'),
        ('Reddit', 'Discord', 0.5, '#ff4500'),
    ]

    for orig, usage, width, color in flows:
        if orig in origin_positions and usage in usage_positions:
            y1 = origin_positions[orig]
            y2 = usage_positions[usage]
            xs = [1.1, 3.5, 6.5, 8.9]
            ys = [y1, y1, y2, y2]
            from scipy.interpolate import make_interp_spline
            try:
                spl = make_interp_spline(xs, ys, k=3)
                x_smooth = np.linspace(1.1, 8.9, 50)
                y_smooth = spl(x_smooth)
                ax.plot(x_smooth, y_smooth, color=color, alpha=0.25,
                        linewidth=width * 4, solid_capstyle='round')
            except:
                ax.plot(xs, ys, color=color, alpha=0.25,
                        linewidth=width * 4, solid_capstyle='round')

    ax.text(0.7, 9.8, 'ORIGIN', ha='center', fontsize=11, fontweight='bold', color='#444')
    ax.text(9.3, 9.8, 'USAGE', ha='center', fontsize=11, fontweight='bold', color='#444')
    ax.set_title('Platform Flow: Where Slang Starts vs. Where It Spreads',
                 fontsize=14, fontweight='bold')

    # Annotation for Discord
    ax.annotate('Discord: only a\ndestination, never\nan origin!',
                xy=(9.3, usage_positions.get('Discord', 5)),
                xytext=(6.5, 1.5),
                fontsize=9, color='#5865f2', fontweight='bold',
                arrowprops=dict(arrowstyle='->', color='#5865f2', lw=1.5))

    plt.tight_layout()
    plt.savefig(f'{OUTPUT_DIR}/sketch_03_sankey.png', dpi=150, bbox_inches='tight',
                facecolor='white')
    plt.close()
    print('Saved sketch_03_sankey.png')


# ============================================================
# SKETCH 4: Bubble Chart (Lifecycle)
# ============================================================
def sketch_bubbles():
    fig, ax = plt.subplots(figsize=(10, 8))

    np.random.seed(123)
    terms = [
        ('slay', 55, 'declining'), ('bussin', 50, 'declining'),
        ('rizz', 48, 'peak'), ('based', 45, 'declining'),
        ('sigma', 40, 'growing'), ('skibidi', 38, 'growing'),
        ('delulu', 35, 'growing'), ('NPC', 30, 'declining'),
        ('brain rot', 42, 'growing'), ('ohio', 28, 'peak'),
        ('aura', 25, 'growing'), ('mewing', 22, 'growing'),
        ('main character', 32, 'declining'), ('gaslighting', 44, 'declining'),
        ('ick', 20, 'dormant'), ('cheugy', 15, 'dormant'),
        ('valid', 18, 'declining'), ('rent free', 16, 'dormant'),
    ]

    phase_colors = {'growing': '#2ecc71', 'peak': '#e74c3c',
                    'declining': '#f39c12', 'dormant': '#95a5a6'}
    phase_hatch = {'growing': '', 'peak': '', 'declining': '///', 'dormant': '...'}

    positions = []
    for i, (name, size, phase) in enumerate(terms):
        x = 1 + (i % 5) * 2 + np.random.random() * 0.5
        y = 1 + (i // 5) * 2 + np.random.random() * 0.5
        positions.append((x, y))

        circle = plt.Circle((x, y), size / 60, color=phase_colors[phase],
                            alpha=0.6, linewidth=1.5, edgecolor='white')
        ax.add_patch(circle)
        if size > 20:
            ax.text(x, y, name, ha='center', va='center',
                    fontsize=max(7, size // 7), fontweight='bold', color='#222')

    ax.set_xlim(-0.5, 11)
    ax.set_ylim(-0.5, 10)
    ax.set_aspect('equal')
    ax.axis('off')

    ax.set_title('Term Lifecycle Bubbles\n(size = total usage, color = lifecycle phase)',
                 fontsize=14, fontweight='bold')

    # Legend
    for i, (phase, color) in enumerate(phase_colors.items()):
        circle = plt.Circle((8.5, 9 - i * 0.6), 0.2, color=color, alpha=0.7)
        ax.add_patch(circle)
        ax.text(9, 9 - i * 0.6, phase.capitalize(), va='center', fontsize=10)

    # Annotation
    ax.annotate('biggest bubble =\nmost popular term', xy=(positions[0][0], positions[0][1]),
                xytext=(0.5, 9), fontsize=9, color='#666',
                arrowprops=dict(arrowstyle='->', color='#666', lw=1.5))

    plt.tight_layout()
    plt.savefig(f'{OUTPUT_DIR}/sketch_04_bubbles.png', dpi=150, bbox_inches='tight',
                facecolor='white')
    plt.close()
    print('Saved sketch_04_bubbles.png')


# ============================================================
# SKETCH 5: Explore Dashboard (Wireframe)
# ============================================================
def sketch_explore_dashboard():
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    fig.suptitle('Explore Dashboard — Linked Interactive Views',
                 fontsize=14, fontweight='bold')

    # Top-left: Term selector + bar chart
    ax = axes[0, 0]
    ax.set_title('Filter by Term', fontsize=12, fontweight='bold')
    terms = ['slay', 'rizz', 'bussin', 'sigma', 'delulu']
    vals = [19, 17, 18, 12, 10]
    bars = ax.barh(terms, vals, color='#7c3aed', alpha=0.6)
    ax.set_xlabel('Usage (thousands)')
    # Draw a "search box" at top
    ax.text(10, 5.3, '[ Search term... ]', fontsize=10, color='#999',
            bbox=dict(boxstyle='round', facecolor='white', edgecolor='#ccc'))

    # Top-right: Age group breakdown
    ax = axes[0, 1]
    ax.set_title('Age Group Breakdown', fontsize=12, fontweight='bold')
    ages = ['13-17', '18-24', '25-30', '31-40', '40+']
    pcts = [20, 35, 22, 15, 8]
    colors = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#95a5a6']
    ax.barh(ages, pcts, color=colors, alpha=0.6)
    ax.set_xlabel('% of usage')
    ax.annotate('dominant\nage group', xy=(35, 1), xytext=(25, 3),
                fontsize=9, arrowprops=dict(arrowstyle='->', color='#333'))

    # Bottom-left: Regional map placeholder
    ax = axes[1, 0]
    ax.set_title('Regional Patterns (US Map)', fontsize=12, fontweight='bold')
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6)
    # Draw rough US outline
    us_x = [1, 2, 3, 5, 7, 8, 9, 8.5, 7, 6, 5, 3, 1.5, 1]
    us_y = [4, 5, 5, 5.2, 4.8, 4, 3, 1.5, 1, 1.5, 1, 1.5, 2, 4]
    ax.fill(us_x, us_y, color='#3498db', alpha=0.2)
    ax.plot(us_x, us_y, color='#3498db', linewidth=2)
    # Add some "hot spots"
    hotspots = [(2.5, 3.5, 0.4, 'CA'), (7, 3.5, 0.3, 'NY'), (5, 2.5, 0.25, 'TX')]
    for x, y, r, label in hotspots:
        circle = plt.Circle((x, y), r, color='#e74c3c', alpha=0.5)
        ax.add_patch(circle)
        ax.text(x, y, label, ha='center', va='center', fontsize=8, fontweight='bold')
    ax.text(5, 0.3, 'color intensity = slang adoption rate', ha='center',
            fontsize=9, color='#666', style='italic')
    ax.set_aspect('equal')
    ax.axis('off')

    # Bottom-right: Sentiment analysis
    ax = axes[1, 1]
    ax.set_title('Sentiment Analysis', fontsize=12, fontweight='bold')
    cats = ['approval', 'insult', 'humor', 'identity', 'casual']
    pos = [65, 15, 55, 40, 50]
    neg = [10, 60, 15, 20, 15]
    neu = [25, 25, 30, 40, 35]
    y_pos = np.arange(len(cats))
    ax.barh(y_pos, pos, color='#2ecc71', alpha=0.6, label='Positive')
    ax.barh(y_pos, neg, left=pos, color='#e74c3c', alpha=0.6, label='Negative')
    ax.barh(y_pos, neu, left=[p+n for p,n in zip(pos,neg)], color='#f1c40f', alpha=0.6, label='Neutral')
    ax.set_yticks(y_pos)
    ax.set_yticklabels(cats)
    ax.set_xlabel('% of records')
    ax.legend(fontsize=8, loc='lower right')

    # Add "linked views" annotation
    fig.text(0.5, 0.01, 'All views are linked: selecting in one updates all others',
             ha='center', fontsize=11, color='#7c3aed', fontweight='bold', style='italic')

    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    plt.savefig(f'{OUTPUT_DIR}/sketch_05_explore_dashboard.png', dpi=150, bbox_inches='tight',
                facecolor='white')
    plt.close()
    print('Saved sketch_05_explore_dashboard.png')


# ============================================================
# STRETCH GOAL SKETCHES
# ============================================================

# STRETCH 1: Animated Bubble Race Chart
def sketch_bubble_race():
    fig, ax = plt.subplots(figsize=(12, 6))

    terms = ['slay', 'rizz', 'bussin', 'sigma', 'skibidi', 'delulu', 'NPC', 'brain rot']
    np.random.seed(77)

    # Show a "snapshot" at a particular month with bars racing
    values = sorted(zip(terms, np.random.randint(200, 800, len(terms))),
                    key=lambda x: x[1])
    colors = plt.cm.viridis(np.linspace(0.2, 0.9, len(values)))

    for i, ((term, val), color) in enumerate(zip(values, colors)):
        ax.barh(i, val, color=color, alpha=0.7, height=0.7)
        ax.text(val + 10, i, f'{term}', va='center', fontsize=11, fontweight='bold')

    ax.set_yticks([])
    ax.set_xlabel('Monthly Usage Count', fontsize=11)
    ax.set_title('Animated Bar Race: Which Slang Leads Each Month?\n(bars animate as time progresses: 2020 → 2025)',
                 fontsize=13, fontweight='bold')

    # Time indicator
    ax.text(0.95, 0.95, 'JAN 2023', transform=ax.transAxes, fontsize=18,
            fontweight='bold', color='#999', ha='right', va='top',
            bbox=dict(boxstyle='round', facecolor='white', edgecolor='#ddd'))

    # Play button sketch
    ax.text(0.05, 0.95, '[ Play / Pause ]', transform=ax.transAxes, fontsize=10,
            color='#7c3aed', ha='left', va='top',
            bbox=dict(boxstyle='round', facecolor='#f0e6ff', edgecolor='#7c3aed'))

    ax.annotate('bars swap positions\nas rankings change\neach month!', xy=(400, 5),
                xytext=(600, 2), fontsize=9, color='#666',
                arrowprops=dict(arrowstyle='->', color='#666'))

    plt.tight_layout()
    plt.savefig(f'{OUTPUT_DIR}/sketch_06_stretch_bar_race.png', dpi=150, bbox_inches='tight',
                facecolor='white')
    plt.close()
    print('Saved sketch_06_stretch_bar_race.png')


# STRETCH 2: Regional US Choropleth Map
def sketch_choropleth():
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 7)
    ax.axis('off')

    ax.set_title('Regional Slang Adoption Map (US Choropleth)\n'
                 'Color intensity = how many slang terms are actively used',
                 fontsize=13, fontweight='bold')

    # Draw rough state-like shapes with varying colors
    regions = [
        ([1, 2.5, 2.5, 1], [4.5, 4.5, 6, 6], 0.9, 'WA'),
        ([1, 2.5, 2.5, 1], [3, 3, 4.4, 4.4], 0.7, 'OR'),
        ([1, 2.5, 2.8, 2.8, 1], [1, 1, 2.9, 2.9, 2.9], 0.95, 'CA'),
        ([2.6, 4, 4, 2.6], [3, 3, 5, 5], 0.3, 'NV/UT'),
        ([4.1, 5.5, 5.5, 4.1], [3.5, 3.5, 5.5, 5.5], 0.4, 'CO'),
        ([5.6, 7, 7, 5.6], [3.5, 3.5, 5.5, 5.5], 0.5, 'KS/MO'),
        ([7.1, 8.5, 8.5, 7.1], [4, 4, 6, 6], 0.85, 'NY'),
        ([7.1, 8.5, 8.5, 7.1], [2, 2, 3.9, 3.9], 0.6, 'VA'),
        ([4.5, 6.5, 6.5, 4.5], [1, 1, 3.4, 3.4], 0.8, 'TX'),
        ([6.6, 8, 8, 6.6], [1, 1, 1.9, 1.9], 0.65, 'FL'),
    ]

    for xs, ys, intensity, label in regions:
        color = plt.cm.YlOrRd(intensity)
        ax.fill(xs, ys, color=color, alpha=0.7, edgecolor='white', linewidth=2)
        cx = np.mean(xs)
        cy = np.mean(ys)
        ax.text(cx, cy, label, ha='center', va='center', fontsize=9, fontweight='bold')

    # Legend
    from matplotlib.cm import ScalarMappable
    from matplotlib.colors import Normalize
    sm = ScalarMappable(cmap=plt.cm.YlOrRd, norm=Normalize(0, 1))
    cbar = plt.colorbar(sm, ax=ax, shrink=0.5, pad=0.02, orientation='horizontal',
                        anchor=(0.5, 0))
    cbar.set_label('Slang Adoption Intensity', fontsize=10)

    ax.annotate('California and New York\nlead in slang adoption!',
                xy=(1.8, 2), xytext=(3, 0.3),
                fontsize=9, color='#c0392b', fontweight='bold',
                arrowprops=dict(arrowstyle='->', color='#c0392b'))

    plt.tight_layout()
    plt.savefig(f'{OUTPUT_DIR}/sketch_07_stretch_choropleth.png', dpi=150, bbox_inches='tight',
                facecolor='white')
    plt.close()
    print('Saved sketch_07_stretch_choropleth.png')


# STRETCH 3: Word Cloud Hero Animation
def sketch_word_cloud():
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6)
    ax.axis('off')

    np.random.seed(55)
    words = [
        ('slay', 2.2), ('rizz', 1.8), ('bussin', 1.7), ('sigma', 1.5),
        ('skibidi', 1.4), ('delulu', 1.3), ('NPC', 1.1), ('brain rot', 1.6),
        ('ohio', 1.0), ('aura', 1.2), ('mewing', 0.9), ('valid', 0.8),
        ('its giving', 1.0), ('no cap', 0.9), ('main character', 1.1),
        ('rent free', 0.85), ('slaps', 0.7), ('touch grass', 0.75),
    ]

    colors = plt.cm.viridis(np.linspace(0.2, 0.95, len(words)))

    for i, (word, size) in enumerate(words):
        x = 0.5 + np.random.random() * 8.5
        y = 0.5 + np.random.random() * 4.5
        rotation = np.random.choice([0, 0, 0, 90]) if np.random.random() > 0.7 else 0
        ax.text(x, y, word, fontsize=size * 18, fontweight='bold',
                color=colors[i], alpha=0.7, rotation=rotation,
                ha='center', va='center')

    ax.set_title('Hero Word Cloud (terms float and drift with force simulation)',
                 fontsize=13, fontweight='bold')

    # Motion arrows
    for _ in range(5):
        x, y = np.random.random() * 8 + 1, np.random.random() * 4 + 1
        dx, dy = (np.random.random() - 0.5) * 0.8, (np.random.random() - 0.5) * 0.8
        ax.annotate('', xy=(x + dx, y + dy), xytext=(x, y),
                    arrowprops=dict(arrowstyle='->', color='#ccc', lw=1, alpha=0.5))

    ax.text(5, 0.1, 'words gently drift and repel each other (D3 force simulation)',
            ha='center', fontsize=9, color='#999', style='italic')

    plt.tight_layout()
    plt.savefig(f'{OUTPUT_DIR}/sketch_08_stretch_wordcloud.png', dpi=150, bbox_inches='tight',
                facecolor='white')
    plt.close()
    print('Saved sketch_08_stretch_wordcloud.png')


# STRETCH 4: Sentiment Overlay on Timeline
def sketch_sentiment_overlay():
    fig, ax = plt.subplots(figsize=(12, 6))

    np.random.seed(42)
    months = np.arange(72)

    # Fake data for a term
    positive = np.clip(np.cumsum(np.random.randn(72) * 0.5) + 30, 5, 60)
    negative = np.clip(np.cumsum(np.random.randn(72) * 0.3) + 10, 2, 30)
    neutral = np.clip(np.cumsum(np.random.randn(72) * 0.3) + 15, 5, 25)

    ax.fill_between(months, 0, positive, color='#2ecc71', alpha=0.4, label='Positive')
    ax.fill_between(months, positive, positive + neutral, color='#f1c40f', alpha=0.4, label='Neutral')
    ax.fill_between(months, positive + neutral, positive + neutral + negative,
                    color='#e74c3c', alpha=0.4, label='Negative')

    ax.set_xlim(0, 71)
    year_ticks = [0, 12, 24, 36, 48, 60]
    ax.set_xticks(year_ticks)
    ax.set_xticklabels(['2020', '2021', '2022', '2023', '2024', '2025'])
    ax.set_xlabel('Time', fontsize=11)
    ax.set_ylabel('Usage Count', fontsize=11)
    ax.set_title('Sentiment Overlay: How Mood Shifts Over Time\n'
                 '(stacked area chart for selected term: "slay")',
                 fontsize=13, fontweight='bold')
    ax.legend(loc='upper left', fontsize=10)

    ax.annotate('sentiment shifts\nfrom positive to ironic', xy=(50, 60),
                xytext=(35, 75), fontsize=9, color='#666',
                arrowprops=dict(arrowstyle='->', color='#666'))

    plt.tight_layout()
    plt.savefig(f'{OUTPUT_DIR}/sketch_09_stretch_sentiment.png', dpi=150, bbox_inches='tight',
                facecolor='white')
    plt.close()
    print('Saved sketch_09_stretch_sentiment.png')


# STRETCH 5: Cross-View Search/Filter
def sketch_crossfilter():
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 7)
    ax.axis('off')

    ax.set_title('Cross-View Filtering: Select a Term, Update Everything',
                 fontsize=14, fontweight='bold')

    # Central search box
    search_box = patches.FancyBboxPatch((3, 5.5), 4, 0.8,
                                         boxstyle="round,pad=0.1",
                                         facecolor='#f0e6ff', edgecolor='#7c3aed', linewidth=2)
    ax.add_patch(search_box)
    ax.text(5, 5.9, 'Search: "rizz"', ha='center', va='center',
            fontsize=12, fontweight='bold', color='#7c3aed')

    # Four linked panels
    panels = [
        (0.5, 2.5, 'Timeline\n(highlighted)', '#e74c3c'),
        (3, 2.5, 'Sankey\n(filtered flows)', '#3498db'),
        (5.5, 2.5, 'Bubbles\n(selected term)', '#2ecc71'),
        (8, 2.5, 'Sentiment\n(for this term)', '#f39c12'),
    ]

    for x, y, label, color in panels:
        rect = patches.FancyBboxPatch((x, y), 2, 2,
                                       boxstyle="round,pad=0.1",
                                       facecolor=color, alpha=0.15,
                                       edgecolor=color, linewidth=2)
        ax.add_patch(rect)
        ax.text(x + 1, y + 1, label, ha='center', va='center',
                fontsize=10, color=color, fontweight='bold')

        # Arrow from search to panel
        ax.annotate('', xy=(x + 1, y + 2), xytext=(5, 5.5),
                    arrowprops=dict(arrowstyle='->', color='#7c3aed',
                                    lw=1.5, alpha=0.5, connectionstyle='arc3,rad=0.1'))

    ax.text(5, 1.8, 'Crossfilter.js: <30ms interaction even with 500K+ records',
            ha='center', fontsize=9, color='#666', style='italic')

    plt.tight_layout()
    plt.savefig(f'{OUTPUT_DIR}/sketch_10_stretch_crossfilter.png', dpi=150, bbox_inches='tight',
                facecolor='white')
    plt.close()
    print('Saved sketch_10_stretch_crossfilter.png')


# ============================================================
# RUN ALL
# ============================================================
if __name__ == '__main__':
    print('Generating sketches...\n')
    sketch_storyboard()
    sketch_timeline_heatmap()
    sketch_sankey()
    sketch_bubbles()
    sketch_explore_dashboard()
    sketch_bubble_race()
    sketch_choropleth()
    sketch_word_cloud()
    sketch_sentiment_overlay()
    sketch_crossfilter()
    print(f'\nAll sketches saved to {OUTPUT_DIR}/')
