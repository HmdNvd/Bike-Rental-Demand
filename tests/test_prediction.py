"""Numerical deployment contract, checked against independently encoded data."""
from pathlib import Path
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from backend.main import app
from backend.prediction import Predictor, PredictionInput

ROOT = Path(__file__).resolve().parents[1]


def independent_features(df):
    frame = pd.get_dummies(
        df.drop(columns=['instant', 'dteday', 'casual', 'registered', 'atemp']),
        columns=['season', 'weathersit', 'weekday', 'hr', 'mnth'],
        drop_first=True, dtype=int,
    )
    frame['rush_hour_commute'] = (
        (df['workingday'] == 1) & df['hr'].isin([7, 8, 9, 17, 18, 19])
    ).astype(int)
    return frame.drop(columns='cnt')


def row_input(row):
    return PredictionInput(
        date=row.dteday, hour=int(row.hr), season=int(row.season),
        weather=int(row.weathersit), temperature_c=float(row.temp * 47 - 8),
        humidity=float(row.hum * 100), wind_kmh=float(row.windspeed * 67),
        holiday=bool(row.holiday), baseline_year=2011 + int(row.yr),
    )


def test_inference_matches_notebook_features_and_predictions():
    df = pd.read_csv(ROOT / 'data/hour.csv')
    expected = independent_features(df)
    predictor = Predictor()
    # Include every reference category, all rare heavy-weather rows, and held-out examples.
    indices = [0, 5000, 13903, 15000, 17378] + df.index[df.weathersit == 4].tolist()
    for index in indices:
        payload = row_input(df.iloc[index])
        actual = predictor.features(payload)
        np.testing.assert_allclose(actual.iloc[0], expected.iloc[index], atol=1e-12)
        demand = float(max(0, predictor.model.predict(expected.iloc[[index]])[0]))
        result = predictor.predict(payload)
        assert abs(result['prediction'] - demand) < 1e-8
        assert len(result['profile']) == 24
        assert abs(result['profile'][payload.hour]['prediction'] - demand) < 1e-8
        assert all(point['prediction'] >= 0 for point in result['profile'])


def test_reproduced_metrics_match_notebook():
    predictor = Predictor()
    assert abs(predictor.metadata['metrics']['mae'] - 88.92) < .01
    assert abs(predictor.metadata['metrics']['rmse'] - 117.95) < .01
    assert abs(predictor.metadata['metrics']['r2'] - .7138) < .0001


def test_api_prediction_and_held_out_scenarios():
    with TestClient(app) as client:
        assert client.get('/api/health').json()['status'] == 'ok'
        scenarios = client.get('/api/scenarios').json()
        assert len(scenarios) >= 3
        for scenario in scenarios:
            result = client.post('/api/predict', json=scenario['inputs'])
            assert result.status_code == 200
            assert result.json()['rentals'] >= 0
            assert abs(result.json()['prediction'] - scenario['prediction']) < 1e-8
            assert scenario['actual'] >= 0


def test_invalid_inputs_are_rejected():
    with TestClient(app) as client:
        payload = client.get('/api/scenarios').json()[0]['inputs']
        for field, value in [('hour', 24), ('hour', 8.5), ('humidity', 101),
                             ('temperature_c', -9), ('wind_kmh', -1),
                             ('weather', 5), ('baseline_year', 2026),
                             ('date', '2012-02-30'), ('season', 0)]:
            assert client.post('/api/predict', json={**payload, field: value}).status_code == 422
        assert client.post('/api/predict', json={**payload, 'casual': 100}).status_code == 422


def test_new_dates_use_explicit_training_baseline_and_warn():
    with TestClient(app) as client:
        payload = client.get('/api/scenarios').json()[0]['inputs']
        result = client.post('/api/predict', json={**payload, 'date': '2026-10-13'}).json()
        assert any('2011' in note and '2012' in note for note in result['warnings'])


def test_missing_route_does_not_mask_api_error():
    with TestClient(app) as client:
        assert client.get('/api/unknown').status_code == 404
