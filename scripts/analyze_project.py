"""Reproduce EDA, model comparison and report figures from the original dataset.

Run after installing requirements-analysis.txt. Does not modify the saved model
or original notebook. Metrics and figures are generated from actual data.
"""
import json
from pathlib import Path

import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
FIGURES = ROOT / 'docs/figures'
COLORS = ['#293b29', '#91a94d', '#5c8391', '#b77b57']
SEASONS = {1: 'Winter', 2: 'Spring', 3: 'Summer', 4: 'Fall'}
WEATHER = {1: 'Clear', 2: 'Mist / cloudy', 3: 'Light rain / snow', 4: 'Heavy weather'}


def metric(actual, predicted):
    return {'mae': float(mean_absolute_error(actual, predicted)),
            'mse': float(mean_squared_error(actual, predicted)),
            'rmse': float(np.sqrt(mean_squared_error(actual, predicted))),
            'r2': float(r2_score(actual, predicted))}


def save(fig, name):
    fig.tight_layout()
    fig.savefig(FIGURES / name, dpi=180, facecolor='white', bbox_inches='tight')
    plt.close(fig)


def main():
    FIGURES.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10,
                         'axes.spines.top': False, 'axes.spines.right': False,
                         'axes.labelcolor': '#293b29', 'text.color': '#293b29'})
    df = pd.read_csv(ROOT / 'data/hour.csv')
    split = int(len(df) * .8)
    base = df.drop(columns=['instant', 'dteday', 'casual', 'registered', 'atemp']).copy()
    base['hr_sin'] = np.sin(2 * np.pi * base.hr / 24)
    base['hr_cos'] = np.cos(2 * np.pi * base.hr / 24)
    base['mnth_sin'] = np.sin(2 * np.pi * base.mnth / 12)
    base['mnth_cos'] = np.cos(2 * np.pi * base.mnth / 12)
    base = pd.get_dummies(base.drop(columns=['hr', 'mnth']), columns=['season', 'weekday', 'weathersit'], drop_first=True, dtype=int)
    X_base = base.drop(columns='cnt')
    scaler = StandardScaler().fit(X_base.iloc[:split])
    linear = LinearRegression().fit(scaler.transform(X_base.iloc[:split]), np.log1p(df.cnt.iloc[:split]))
    linear_pred = np.expm1(linear.predict(scaler.transform(X_base.iloc[split:])))

    final = pd.get_dummies(df.drop(columns=['instant', 'dteday', 'casual', 'registered', 'atemp']),
                          columns=['season', 'weathersit', 'weekday', 'hr', 'mnth'], drop_first=True, dtype=int)
    final['rush_hour_commute'] = ((df.workingday == 1) & df.hr.isin([7, 8, 9, 17, 18, 19])).astype(int)
    X = final.drop(columns='cnt')
    bundle = joblib.load(ROOT / 'artifacts/ridge_model.joblib')
    assert list(X.columns) == bundle['features']
    actual = df.cnt.iloc[split:]
    predicted = np.maximum(bundle['model'].predict(X.iloc[split:]), 0)
    metadata = json.loads((ROOT / 'artifacts/metadata.json').read_text())
    ridge_metrics = metric(actual, predicted)
    for key, value in ridge_metrics.items():
        assert abs(value - metadata['metrics'][key]) < 1e-7
    hourly = df.groupby(['workingday', 'hr']).cnt.mean().unstack(0)
    weather = df.groupby('weathersit').cnt.agg(['mean', 'count'])
    season = df.groupby('season').cnt.agg(['mean', 'count'])
    stats = {
        'rows': len(df), 'columns': len(df.columns), 'missing_values': int(df.isna().sum().sum()),
        'duplicate_rows': int(df.duplicated().sum()), 'date_start': df.dteday.min(), 'date_end': df.dteday.max(),
        'target': {'mean': float(df.cnt.mean()), 'median': float(df.cnt.median()), 'min': int(df.cnt.min()), 'max': int(df.cnt.max())},
        'weather': {WEATHER[int(k)]: {'mean': float(row['mean']), 'count': int(row['count'])} for k, row in weather.iterrows()},
        'season': {SEASONS[int(k)]: {'mean': float(row['mean']), 'count': int(row['count'])} for k, row in season.iterrows()},
        'hourly_mean': {str(int(k)): {'workingday': float(row[1]), 'nonworkingday': float(row[0])} for k, row in hourly.iterrows()},
        'temperature_target_correlation': float(df.temp.corr(df.cnt)),
        'linear_reproduced': metric(actual, linear_pred), 'ridge': ridge_metrics,
        'linear_notebook_reported': {'mae': 125.74, 'mse': 34923.55, 'rmse': 186.88, 'r2': .2816},
        'test_first_datetime': f'{df.dteday.iloc[split]} {int(df.hr.iloc[split]):02d}:00',
        'training_last_datetime': f'{df.dteday.iloc[split-1]} {int(df.hr.iloc[split-1]):02d}:00',
    }
    (ROOT / 'docs/analysis-results.json').write_text(json.dumps(stats, indent=2), encoding='utf-8')
    pd.DataFrame({'date': df.dteday.iloc[split:].values, 'hour': df.hr.iloc[split:].values,
                  'actual': actual.values, 'predicted': predicted, 'residual': actual.values-predicted}).to_csv(ROOT / 'docs/test-predictions.csv', index=False)

    fig, ax = plt.subplots(figsize=(9, 4))
    ax.hist(df.cnt, bins=50, color=COLORS[0], edgecolor='white', linewidth=.5)
    ax.axvline(df.cnt.median(), color=COLORS[1], linewidth=2, label=f'Median: {df.cnt.median():.0f}')
    ax.set(title='Hourly demand is concentrated at lower counts', xlabel='Total rentals in one hour', ylabel='Number of observations')
    ax.legend(frameon=False); save(fig, '01-demand-distribution.png')
    fig, ax = plt.subplots(figsize=(9, 4))
    for key, label, color in [(1, 'Working day', COLORS[0]), (0, 'Weekend / holiday', COLORS[1])]:
        ax.plot(hourly.index, hourly[key], marker='o', markersize=3, color=color, label=label)
    ax.set(title='Commuter peaks differ from the non-working-day pattern', xlabel='Hour of day', ylabel='Mean hourly rentals', xticks=range(0, 24, 2))
    ax.legend(frameon=False); ax.grid(axis='y', alpha=.18); save(fig, '02-hourly-pattern.png')
    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    axes[0].bar([SEASONS[int(k)] for k in season.index], season['mean'], color=COLORS)
    axes[0].set(title='Seasonal demand', ylabel='Mean hourly rentals')
    axes[1].bar(range(1, 13), df.groupby('mnth').cnt.mean(), color=COLORS[0])
    axes[1].set(title='Monthly demand', xlabel='Month', xticks=range(1, 13))
    save(fig, '03-season-month.png')
    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    axes[0].scatter(df.temp * 47 - 8, df.cnt, s=4, alpha=.12, color=COLORS[0], rasterized=True)
    axes[0].set(title='Temperature and demand are associated', xlabel='Temperature (°C; UCI hourly conversion)', ylabel='Hourly rentals')
    axes[1].bar([WEATHER[int(k)] for k in weather.index], weather['mean'], color=COLORS)
    axes[1].set(title='Weather groups have very unequal sample sizes', ylabel='Mean hourly rentals')
    axes[1].tick_params(axis='x', labelrotation=20)
    for i, (_, row) in enumerate(weather.iterrows()):
        axes[1].text(i, row['mean'] + 4, f"n={int(row['count']):,}", ha='center', fontsize=8)
    save(fig, '04-weather-temperature.png')
    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    axes[0].scatter(actual, predicted, s=8, alpha=.2, color=COLORS[0], rasterized=True)
    limit = max(actual.max(), predicted.max())
    axes[0].plot([0, limit], [0, limit], color=COLORS[3], linestyle='--', label='Perfect prediction')
    axes[0].set(title='Ridge: actual vs. predicted on held-out rows', xlabel='Actual rentals', ylabel='Predicted rentals'); axes[0].legend(frameon=False)
    axes[1].plot(range(120), actual.values[:120], color=COLORS[0], label='Actual')
    axes[1].plot(range(120), predicted[:120], color=COLORS[1], label='Predicted', linestyle='--')
    axes[1].set(title='First 120 test observations', xlabel='Observation index after chronological split', ylabel='Rentals'); axes[1].legend(frameon=False)
    save(fig, '05-model-evaluation.png')
    fig, ax = plt.subplots(figsize=(9, 4))
    residual = actual.values - predicted
    ax.scatter(predicted, residual, s=8, alpha=.18, color=COLORS[0])
    ax.axhline(0, color=COLORS[3], linestyle='--')
    ax.set(title='Large peak-demand errors remain', xlabel='Predicted rentals', ylabel='Actual minus predicted rentals')
    save(fig, '06-residuals.png')
    print(json.dumps({k: v for k, v in stats.items() if k != 'hourly_mean'}, indent=2))


if __name__ == '__main__':
    main()
