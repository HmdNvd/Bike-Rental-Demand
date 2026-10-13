# Spoke — Phase 7 design

Build an hourly rental prediction application for the existing AI/ML internship notebook. The user has delegated stack, visual, and implementation decisions and asked for autonomous completion.

## Architecture

React + Vite renders the interface. FastAPI validates inputs and runs the notebook's final Ridge(alpha=10) model. One production service serves both the built React app and API; no database is needed. Reproduce the original chronological 80/20 training split, persist the model and ordered feature columns, and confirm the notebook's reported metrics. Preserve the original notebook.

## Interface

The ImageGen reference establishes a warm cream canvas, charcoal text, chartreuse highlights, editorial serif headings, a white conditions panel, and an open forecast panel. A simple header leads to a large heading, two-column input/output workspace, scenario examples, and restrained model metrics. Collapse to one column on mobile. All controls and charts are code-native.

Inputs: date, hour, UCI season, weather category, Celsius temperature, humidity percentage, wind speed in km/h, holiday flag, and training baseline year (2011 or 2012). Date supplies month and Sunday-zero weekday. Working day is derived from weekday and holiday. Explain the historical baseline if the selected date is outside 2011–2012.

Outputs: nonnegative numerical rentals per hour, the exact submitted conditions, a 24-hour what-if profile holding weather constant, peak hour, and comparison with an actual observation for unmodified held-out examples. Changes require a fresh prediction; never show previous output as if it uses edited inputs. Supply CSV export and a model notes panel with actual metrics and preprocessing.

## ML contract

Use the final notebook's one-hot encoding of season, weather, weekday, hour, and month with dropped reference categories; retain yr, holiday, workingday, temp, hum, windspeed; add working-day rush-hour interaction at 7, 8, 9, 17, 18, 19. No scaler or log inverse belongs to the final Ridge model. Use UCI's hourly temperature normalization (Celsius + 8)/47, humidity/100, windspeed/67. UCI's current season labels are winter=1, spring=2, summer=3, fall=4 (the notebook plot labels differ). Keep numeric training encodings intact.

## Verification and handoff

Check feature parity against independent notebook preprocessing and held-out predictions. Test validation, nonnegative counts, 24-hour profile consistency, health, and scenario comparisons. Build frontend, verify real browser controls, edited-input behavior, error states, desktop/mobile layouts, and export. Save screenshot proof for multiple scenarios, model notes, and mobile. Include a reproducible training script, pinned requirements and npm lock, a Windows launcher, Docker deployment, and an accessible README. Public hosting is outside this local build and requires an account; supply a ready-to-deploy container.
