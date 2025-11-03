#!/usr/bin/env python3
"""
Data Analysis Script for Museum Photography Dataset
Analyzes gender, nationality, object appearances, and other statistics
"""

import os
import pandas as pd
import numpy as np
from collections import Counter
import json

def load_data(filepath='final_dataset.csv'):
    """Load the dataset"""
    return pd.read_csv(filepath)

def analyze_gender(df):
    """Analyze gender distribution"""
    total = len(df)
    counts = df['gender'].value_counts(dropna=False)
    out = (
        counts.rename_axis('gender')
        .reset_index(name='count')
        .assign(percentage=lambda x: (x['count'] / total * 100).round(2))
    )
    return out

def analyze_nationality(df):
    """Analyze nationality/origin distribution"""
    # Handle multiple nationalities (separated by |)
    all_origins = []
    for origin in df['origin'].dropna():
        if '|' in str(origin):
            all_origins.extend([o.strip() for o in str(origin).split('|')])
        else:
            all_origins.append(str(origin).strip())
    origin_counts = Counter(all_origins)
    out = (
        pd.DataFrame.from_records(
            [{'origin': k, 'count': v} for k, v in origin_counts.items()]
        )
        .sort_values('count', ascending=False)
        .reset_index(drop=True)
    )
    return out

def analyze_objects(df):
    """Analyze object appearances in photographs"""
    # Get all object columns (has_* columns)
    object_columns = [col for col in df.columns if col.startswith('has_')]
    
    object_counts = {}
    for col in object_columns:
        object_name = col.replace('has_', '')
        count = df[col].notna().sum()
        if count > 0:
            object_counts[object_name] = count
    out = (
        pd.DataFrame.from_records(
            [{'object': k, 'count': v} for k, v in object_counts.items()]
        )
        .assign(percentage=lambda x: (x['count'] / len(df) * 100).round(2))
        .sort_values('count', ascending=False)
        .reset_index(drop=True)
    )
    return out

def analyze_artists(df):
    """Analyze artist statistics"""
    # Handle multiple artists (separated by |)
    all_artists = []
    for artist in df['artist_name'].dropna():
        if '|' in str(artist):
            all_artists.extend([a.strip() for a in str(artist).split('|')])
        else:
            all_artists.append(str(artist).strip())
    artist_counts = Counter(all_artists)
    out = (
        pd.DataFrame.from_records(
            [{'artist_name': k, 'count': v} for k, v in artist_counts.items()]
        )
        .sort_values('count', ascending=False)
        .reset_index(drop=True)
    )
    return out

def analyze_temporal(df):
    """Analyze temporal distribution"""
    years = df['creation_year'].dropna()
    # Decade distribution
    decades = (years // 10 * 10).astype(int)
    decade_counts = decades.value_counts().sort_index()
    out = (
        decade_counts.rename_axis('decade')
        .reset_index(name='count')
        .assign(decade=lambda x: x['decade'].astype(int))
    )
    return out

def analyze_work_types(df):
    """Analyze work type distribution"""
    counts = df['work_type'].value_counts(dropna=False)
    out = (
        counts.rename_axis('work_type')
        .reset_index(name='count')
        .assign(percentage=lambda x: (x['count'] / len(df) * 100).round(2))
    )
    return out

def analyze_museum_collection(df):
    """Analyze museum collection statistics"""
    grouped = df.groupby('artist_name').agg(
        works_in_museum=('works_in_museum', 'first'),
        in_dataset_count=('object_id', 'count')
    )
    out = grouped.sort_values('works_in_museum', ascending=False).reset_index()
    return out

def analyze_object_percentages(df):
    """Analyze average coverage percentages for objects"""
    # Get all percentage columns
    percent_columns = [col for col in df.columns if col.endswith('_percent')]
    
    coverage_stats = {}
    for col in percent_columns:
        object_name = col.replace('_percent', '').replace('has_', '')
        values = df[col].dropna()
        if len(values) > 0:
            coverage_stats[object_name] = {
                'mean': values.mean(),
                'median': values.median(),
                'max': values.max(),
                'count': len(values)
            }
    out = (
        pd.DataFrame.from_records([
            {'object': obj,
             'mean_percent': vals['mean'],
             'median_percent': vals['median'],
             'max_percent': vals['max'],
             'count': vals['count']}
            for obj, vals in coverage_stats.items()
        ])
        .sort_values('mean_percent', ascending=False)
        .reset_index(drop=True)
    )
    return out

def generate_summary_stats(df):
    """Generate overall summary statistics"""
    summary = pd.DataFrame([
        {
            'total_records': len(df),
            'total_columns': len(df.columns),
            'unique_artists': df['artist_name'].nunique(),
            'unique_object_ids': df['object_id'].nunique(),
            'year_min': int(df['creation_year'].min()),
            'year_max': int(df['creation_year'].max()),
        }
    ])
    missing_percent = (df.isnull().sum() / len(df) * 100).round(2)
    missing_df = (
        missing_percent.rename('percent_missing')
        .rename_axis('column')
        .reset_index()
        .sort_values('percent_missing', ascending=False)
        .reset_index(drop=True)
    )
    return summary, missing_df

def ensure_output_dir(path: str) -> str:
    os.makedirs(path, exist_ok=True)
    return path

def write_df(df: pd.DataFrame, out_dir: str, filename: str) -> str:
    filepath = os.path.join(out_dir, filename)
    df.to_csv(filepath, index=False)
    return filepath

def main():
    """Main analysis function"""
    # Load data
    df = load_data()
    out_dir = ensure_output_dir('analysis_outputs')

    # Run analyses and write CSVs
    summary_df, missing_df = generate_summary_stats(df)
    write_df(summary_df, out_dir, 'summary.csv')
    write_df(missing_df, out_dir, 'missing_data_percentages.csv')

    write_df(analyze_gender(df), out_dir, 'gender_distribution.csv')
    write_df(analyze_nationality(df), out_dir, 'nationality_counts.csv')
    write_df(analyze_artists(df), out_dir, 'artist_counts.csv')
    write_df(analyze_temporal(df), out_dir, 'decade_counts.csv')
    write_df(analyze_work_types(df), out_dir, 'work_type_distribution.csv')
    write_df(analyze_museum_collection(df), out_dir, 'museum_collection_by_artist.csv')
    write_df(analyze_objects(df), out_dir, 'object_appearances.csv')
    write_df(analyze_object_percentages(df), out_dir, 'object_coverage_stats.csv')

    print(f"CSV outputs written to '{out_dir}/' directory.")

if __name__ == "__main__":
    main()

