import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import json
import os


# Paths
RAW_DATA_PATH = r'data/archive/genz_slang_usage_2020_2025.csv'
OUTPUT_DIR = 'data'
WEBSITE_DATA_DIR = os.path.join('website', 'data')
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(WEBSITE_DATA_DIR, exist_ok=True)

plt.rcParams['figure.dpi'] = 120
plt.rcParams['figure.figsize'] = (14, 6)

df = pd.read_csv(RAW_DATA_PATH)
print(f'Loaded {len(df):,} rows x {len(df.columns)} columns')

# Parse timestamps and create time features
df['timestamp'] = pd.to_datetime(df['timestamp'])
df['year'] = df['timestamp'].dt.year
df['month'] = df['timestamp'].dt.month
df['year_month'] = df['timestamp'].dt.to_period('M').astype(str)

# Convert to categorical for efficiency
cat_cols = ['slang_term', 'term_category', 'origin_platform', 'usage_platform',
            'region', 'user_age_group', 'usage_context', 'lifecycle_phase', 'sentiment']
for col in cat_cols:
    df[col] = df[col].astype('category')

regional = df.groupby('region').agg(
    total_usage=('record_id', 'size'),
    unique_terms=('slang_term', 'nunique'),
    avg_sentiment=('sentiment_score', 'mean'),
    top_term=('slang_term', lambda x: x.value_counts().idxmax()),
    top_platform=('usage_platform', lambda x: x.value_counts().idxmax())
).reset_index()

regional['avg_sentiment'] = regional['avg_sentiment'].round(3)

# Top 5 terms per region 
regional_by_term = df.groupby(['region', 'slang_term']).agg(
    count=('record_id', 'size'),
    avg_sentiment=('sentiment_score', 'mean'),
    avg_intensity=('intensity_score', 'mean')
).reset_index()
regional_by_term['avg_sentiment'] = regional_by_term['avg_sentiment'].round(3)
regional_by_term['avg_intensity'] = regional_by_term['avg_intensity'].round(3)

regional_top_terms = (
    regional_by_term
    .sort_values('count', ascending=False)
    .groupby('region')
    .head(5)
    .reset_index(drop=True)
)

# B: Sentiment split per region
sentiment_wide = (
    df.groupby(['region', 'sentiment']).size()
    .reset_index(name='count')
    .pivot(index='region', columns='sentiment', values='count')
    .fillna(0)
    .reset_index()
)
for col in ['positive', 'neutral', 'negative']:
    if col not in sentiment_wide.columns:
        sentiment_wide[col] = 0

sentiment_wide['total'] = sentiment_wide[['positive', 'neutral', 'negative']].sum(axis=1)
sentiment_wide['pct_positive'] = (sentiment_wide['positive'] / sentiment_wide['total'] * 100).round(1)
sentiment_wide['pct_neutral']  = (sentiment_wide['neutral']  / sentiment_wide['total'] * 100).round(1)
sentiment_wide['pct_negative'] = (sentiment_wide['negative'] / sentiment_wide['total'] * 100).round(1)

# Combine into enriched records
regional_json = []
for _, row in regional.iterrows():
    region = row['region']
    terms = regional_top_terms[regional_top_terms['region'] == region]
    sent  = sentiment_wide[sentiment_wide['region'] == region]

    regional_json.append({
        **row.to_dict(),
        'top_terms': terms[['slang_term', 'count', 'avg_sentiment', 'avg_intensity']].to_dict(orient='records'),
        'sentiment': {
            'positive':     int(sent['positive'].values[0])     if len(sent) else 0,
            'neutral':      int(sent['neutral'].values[0])      if len(sent) else 0,
            'negative':     int(sent['negative'].values[0])     if len(sent) else 0,
            'pct_positive': float(sent['pct_positive'].values[0]) if len(sent) else 0,
            'pct_neutral':  float(sent['pct_neutral'].values[0])  if len(sent) else 0,
            'pct_negative': float(sent['pct_negative'].values[0]) if len(sent) else 0,
        }
    })

for path in [os.path.join(OUTPUT_DIR, 'regional_data.json'),
             os.path.join(WEBSITE_DATA_DIR, 'regional_data.json')]:
    with open(path, 'w') as f:
        json.dump(regional_json, f)

print(f'Regional: {len(regional_json)} regions')
print(f'Size: {os.path.getsize(os.path.join(OUTPUT_DIR, "regional_data.json")) / 1024:.1f} KB')
regional.sort_values('total_usage', ascending=False).head(10)