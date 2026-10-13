"""Reproduce notebook cell 9, export the estimator, and verify its reported metrics.

Run from the repository root: python scripts/prepare_model.py
The original notebook is deliberately left untouched.
"""
import hashlib
import io
import json
from pathlib import Path
import urllib.request
import zipfile

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://archive.ics.uci.edu/static/public/275/bike+sharing+dataset.zip'


def main():
    data = ROOT / 'data'
    artifacts = ROOT / 'artifacts'
    data.mkdir(exist_ok=True)
    artifacts.mkdir(exist_ok=True)
    if not (data / 'hour.csv').exists():
        request = urllib.request.Request(URL, headers={'User-Agent': 'Spoke/1.0'})
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = response.read()
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            for name in ['hour.csv', 'Readme.txt']:
                (data / name).write_bytes(archive.read(name))
    df = pd.read_csv(data / 'hour.csv')
    if len(df) != 17379 or df.isnull().any().any():
        raise ValueError('Dataset does not match the notebook source.')
    # Exact final notebook encoding: no scaling, no logarithmic target.
    frame = pd.get_dummies(
        df.drop(columns=['instant', 'dteday', 'casual', 'registered', 'atemp']),
        columns=['season', 'weathersit', 'weekday', 'hr', 'mnth'],
        drop_first=True, dtype=int,
    )
    frame['rush_hour_commute'] = (
        (df.workingday == 1) & df.hr.isin([7, 8, 9, 17, 18, 19])
    ).astype(int)
    X, y = frame.drop(columns='cnt'), frame.cnt
    split = int(len(df) * .8)
    model = Ridge(alpha=10.0).fit(X.iloc[:split], y.iloc[:split])
    predictions = np.clip(model.predict(X.iloc[split:]), 0, None)
    metrics = {
        'mae': float(mean_absolute_error(y.iloc[split:], predictions)),
        'mse': float(mean_squared_error(y.iloc[split:], predictions)),
        'rmse': float(np.sqrt(mean_squared_error(y.iloc[split:], predictions))),
        'r2': float(r2_score(y.iloc[split:], predictions)),
    }
    for name, expected, tolerance in [('mae', 88.92, .01), ('rmse', 117.95, .01), ('r2', .7138, .0001)]:
        if abs(metrics[name] - expected) > tolerance:
            raise ValueError(f'{name} differs from the notebook: {metrics[name]}')
    metadata = {
        'name': 'Ridge regression', 'alpha': 10.0, 'metrics': metrics,
        'features': list(X.columns), 'training_rows': split,
        'test_rows': len(df) - split, 'total_rows': len(df),
        'training_start': df.dteday.iloc[0], 'training_end': df.dteday.iloc[split - 1],
        'test_start': df.dteday.iloc[split], 'test_end': df.dteday.iloc[-1],
        'split': 'Chronological 80/20', 'sklearn_version': sklearn.__version__,
        'dataset_url': 'https://archive.ics.uci.edu/dataset/275/bike+sharing+dataset',
        'dataset_sha256': hashlib.sha256((data / 'hour.csv').read_bytes()).hexdigest(),
        'temperature_normalization': '(Celsius + 8) / 47 (UCI hourly metadata)',
        'humidity_normalization': 'percentage / 100',
        'wind_normalization': 'km/h / 67',
        'weather_counts': {str(k): int(v) for k, v in df.iloc[:split].weathersit.value_counts().items()},
        'source_notebook': 'Bike_Rental_Demand_Project.ipynb, final Ridge cell (9)',
        'source_notebook_sha256': hashlib.sha256((ROOT / 'Bike_Rental_Demand_Project.ipynb').read_bytes()).hexdigest(),
    }
    joblib.dump({'model': model, 'features': list(X.columns)}, artifacts / 'ridge_model.joblib')
    (artifacts / 'metadata.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    heldout = df.iloc[split:]
    choices = [
        ('morning', 'Morning commute', 'Clear skies, a weekday start.', (heldout.workingday == 1) & (heldout.hr == 8) & (heldout.weathersit == 1)),
        ('rain', 'Rainy afternoon', 'Light rain on a working day.', (heldout.workingday == 1) & (heldout.hr == 15) & (heldout.weathersit == 3)),
        ('weekend', 'Weekend evening', 'An easy end to a clear weekend.', (heldout.workingday == 0) & (heldout.holiday == 0) & (heldout.hr == 19) & (heldout.weathersit == 1)),
    ]
    scenarios = []
    for key, title, description, condition in choices:
        row = heldout[condition].iloc[0]
        index = int(row.name)
        scenarios.append({
            'id': key, 'title': title, 'description': description,
            'inputs': {
                'date': row.dteday, 'hour': int(row.hr), 'season': int(row.season),
                'weather': int(row.weathersit), 'temperature_c': float(row.temp * 47 - 8),
                'humidity': float(row.hum * 100), 'wind_kmh': float(row.windspeed * 67),
                'holiday': bool(row.holiday), 'baseline_year': 2011 + int(row.yr),
            },
            'actual': int(row.cnt), 'prediction': float(predictions[index - split]),
            'source_row': index, 'source_instant': int(row.instant), 'split': 'held-out test set',
        })
    (artifacts / 'scenarios.json').write_text(json.dumps(scenarios, indent=2), encoding='utf-8')
    print(json.dumps({'metrics': metrics, 'features': len(X.columns), 'scenarios': scenarios}, indent=2))


if __name__ == '__main__':
    main()
