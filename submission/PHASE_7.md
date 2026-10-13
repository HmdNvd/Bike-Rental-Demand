# Phase 7 — Bike Rental Demand Prediction

## Application

**Spoke — Bike demand studio** integrates the final Ridge regression model from the project notebook into a FastAPI backend and React web interface. Users enter calendar and weather conditions to receive a numerical estimate of total hourly rental demand.

The API uses the original ordered feature schema, correct normalization, and working-day rush-hour interaction. The model is loaded once at server startup. Training does not happen on each prediction request. Inputs are validated, and numerical outputs are clipped at zero.

## Screenshot proof

1. `screenshots/01-application-ui.png` — full application with inputs and prediction.
2. `screenshots/02-morning-commute.png` — a weekday morning scenario with actual comparison.
3. `screenshots/03-rainy-afternoon.png` — rainy weather scenario with actual comparison.
4. `screenshots/04-weekend-evening.png` — weekend scenario with actual comparison.
5. `screenshots/05-new-date-heavy-weather.png` — new calendar date, holiday flag, and heavy weather.
6. `screenshots/06-model-notes.png` — model evaluation and preprocessing explanation.
7. `screenshots/07-mobile.png` — responsive mobile interface.

The screenshots show the live application connected to the trained estimator. They are not the generated visual concept.

## Unseen test scenarios

These records come from the held-out chronological test set and were not used for fitting the model:

| Scenario | Date/time | Weather | Temperature | Humidity | Wind | Prediction (rounded) | Actual rentals | Absolute error (unrounded prediction) |
|---|---|---|---:|---:|---:|---:|---:|---:|
| Morning commute | 2012-08-09 08:00 | Clear | 25.84°C | 74% | 7.0015 km/h | 499 | 698 | 198.9 |
| Rainy afternoon | 2012-09-18 15:00 | Light rain | 20.20°C | 88% | 16.9979 km/h | 204 | 36 | 168.3 |
| Weekend evening | 2012-08-12 19:00 | Clear | 26.78°C | 40% | 8.9981 km/h | 282 | 465 | 183.1 |

All three scenarios use UCI season code 3 (summer), baseline 2012, and no holiday. The first two are working days; the third is a weekend. The app keeps the full source precision even when labels round measurements for readability. These examples illustrate real model errors rather than suggesting predictions equal observations. `scenario-results.json` contains actual API outputs captured during browser testing. `sample-predictions.csv` demonstrates exported hourly estimates.

## Evaluation and interpretation

Reproduced notebook results on 3,476 held-out records: MAE **88.9194**, RMSE **117.9478**, R² **0.713831**. The first 13,903 records were used for training. MAE is an overall average error, not a bound on individual predictions.

The daily chart is a what-if comparison: it changes the hour while keeping weather and date conditions constant. The trained model reflects Washington, D.C.'s historical 2011–2012 system. Current calendar dates use the selected historical demand baseline. New-city and current-year operational forecasting would require newer relevant data and validation.

## Verification

Six numerical/API tests cover independently reconstructed feature parity, rare weather encoding, original metrics, unseen examples, validation failures, historical baseline warnings, and unknown API routes. Browser tests verify the real UI, three scenarios, CSV export, stale-input labeling, holiday handling, weather warnings, model notes, service failure and recovery, keyboard interaction, the hourly table, and mobile layout.

## ML deployment concepts demonstrated

- Persisting a fitted estimator and its feature order.
- Keeping training and inference preprocessing consistent.
- Converting human-friendly input units to model units.
- Serving predictions through a validated API.
- Separating frontend interaction from inference logic.
- Comparing unseen predictions with actual targets.
- Packaging the UI and model service for deployment.

Dataset attribution: Hadi Fanaee-T, *Bike Sharing*, UCI Machine Learning Repository, [10.24432/C5W894](https://doi.org/10.24432/C5W894), CC BY 4.0.
