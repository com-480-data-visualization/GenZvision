import json
import math

LIFECYCLE_PATH = "website/data/slang_lifecycle.json"
OUTPUT_PATH = "website/data/slang_cosmos.json"

with open(LIFECYCLE_PATH, "r", encoding="utf-8") as f:
    lifecycle = json.load(f)

summary = lifecycle["summary"]

# ── Constellation config: category → label, color, description ──────────────
CONSTELLATION_CONFIG = {
    "approval":    ("#FFD700", "Approval",     "Terms celebrating excellence & validation"),
    "insult":      ("#FF6B6B", "Insult",        "Terms for calling people out or shaming"),
    "identity":    ("#A78BFA", "Identity",      "Terms defining personality archetypes"),
    "humor":       ("#67E8F9", "Humor",          "Absurdist, ironic & meme-based language"),
    "reaction":    ("#FB923C", "Reaction",       "Expressions of surprise or attraction"),
    "appearance":  ("#F9A8D4", "Appearance",     "Terms about looks & physical aesthetics"),
    "emotion":     ("#6EE7B7", "Emotion",        "Describing feelings & mental states"),
    "dating":      ("#FCA5A5", "Dating",         "Relationship flags and dating culture"),
    "emphasis":    ("#93C5FD", "Emphasis",       "Intensifiers & truth-asserting phrases"),
    "description": ("#D8B4FE", "Description",    "Vibe-naming & situational descriptors"),
    "exposure":    ("#FDE68A", "Exposure",       "Getting caught or called out publicly"),
    "manipulation":("#EF4444", "Manipulation",   "Dark patterns & psychological games"),
    "meme":        ("#4ADE80", "Meme",           "Viral internet absurdism & references"),
    "food":        ("#FDBA74", "Food",           "Food-related slang & eating culture"),
    "attraction":  ("#F472B6", "Attraction",     "Charisma, rizz & romantic energy"),
    "social":      ("#818CF8", "Social",         "Group vibe-checking & energy reads"),
    "behavior":    ("#86EFAC", "Behavior",       "Describing someone's actions or energy"),
}

# ── Build term list ──────────────────────────────────────────────────────────
terms = []
for t in summary:
    terms.append({
        "term":           t["slang_term"],
        "category":       t["term_category"],
        "meaning":        t["term_meaning"],
        "sentiment":      round(t["avg_sentiment"], 3),
        "intensity":      round(t["avg_intensity"], 3),
        "total_usage":    t["total_usage"],
        "peak_month":     t["peak_month"],
        "dominant_phase": t["dominant_phase"],
        "top_platform":   t["top_origin"],
        "viral_posts":    t["viral_posts"],
    })

# Sort by category then usage so constellation edges follow natural ordering
terms.sort(key=lambda t: (t["category"], -t["total_usage"]))

# ── Build constellations with centroids and edges ────────────────────────────
from collections import defaultdict

by_category = defaultdict(list)
for t in terms:
    by_category[t["category"]].append(t["term"])

constellations = []
for cat_id, (color, label, description) in CONSTELLATION_CONFIG.items():
    cat_terms = by_category.get(cat_id, [])
    if not cat_terms:
        continue

    # Centroid = average position of member terms
    cat_data = [t for t in terms if t["category"] == cat_id]
    cx = round(sum(t["sentiment"] for t in cat_data) / len(cat_data), 3)
    cy = round(sum(t["intensity"] for t in cat_data) / len(cat_data), 3)

    # Sequential edges through terms ordered by usage (biggest star first)
    edges = [[cat_terms[i], cat_terms[i + 1]] for i in range(len(cat_terms) - 1)]

    constellations.append({
        "id":          cat_id,
        "label":       label,
        "color":       color,
        "description": description,
        "centroid":    {"x": cx, "y": cy},
        "terms":       cat_terms,
        "edges":       edges,
    })

# ── Compute real correlation ─────────────────────────────────────────────────
sentiments  = [t["sentiment"] for t in terms]
intensities = [t["intensity"] for t in terms]
n = len(sentiments)
mean_s = sum(sentiments) / n
mean_i = sum(intensities) / n
cov   = sum((s - mean_s) * (i - mean_i) for s, i in zip(sentiments, intensities)) / n
std_s = math.sqrt(sum((s - mean_s) ** 2 for s in sentiments) / n)
std_i = math.sqrt(sum((i - mean_i) ** 2 for i in intensities) / n)
correlation = round(cov / (std_s * std_i), 3)

# ── Assemble final JSON ──────────────────────────────────────────────────────
cosmos = {
    "meta": {
        "total_terms":       len(terms),
        "total_constellations": len(constellations),
        "x_field":           "sentiment",
        "y_field":           "intensity",
        "size_field":        "total_usage",
        "x_label":           "Sentiment  (negative ← 0 → positive)",
        "y_label":           "Intensity  (low → high usage energy)",
        "sentiment_range":   [round(min(sentiments), 3), round(max(sentiments), 3)],
        "intensity_range":   [round(min(intensities), 3), round(max(intensities), 3)],
        "total_usage_range": [min(t["total_usage"] for t in terms),
                              max(t["total_usage"] for t in terms)],
        "correlation":       correlation,
        "insight": (
            f"Sentiment and intensity are nearly uncorrelated (r = {correlation}) — "
            "a term can be deeply negative yet used with extreme intensity, "
            "or cheerful but rarely deployed."
        ),
    },
    "constellations": constellations,
    "terms":          terms,
}

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(cosmos, f, indent=2, ensure_ascii=False)

print(f"Written {OUTPUT_PATH}")
print(f"  Terms: {len(terms)}")
print(f"  Constellations: {len(constellations)}")
print(f"  Pearson r (sentiment vs intensity): {correlation}")
print()
for c in constellations:
    print(f"  [{c['id']:15s}] {len(c['terms']):2d} terms  color={c['color']}  centroid=({c['centroid']['x']}, {c['centroid']['y']})")
