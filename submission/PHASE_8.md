# Phase 8 — Documentation and Deployment

## Deliverables prepared

- GitHub repository: https://github.com/HmdNvd/Bike-Rental-Demand (private; reviewer access must be granted separately if needed).
- Complete report: [Problem, dataset, preparation, EDA, models, evaluation and results](../docs/PROJECT_REPORT.md).
- Six reproducible analysis/evaluation figures: [report figures](../docs/figures/).
- Analysis data: [summary statistics and metrics](../docs/analysis-results.json), [all held-out predictions](../docs/test-predictions.csv).
- Reproduction: `scripts/prepare_model.py`, `scripts/analyze_project.py`, pinned runtime requirements, analysis requirements and npm lockfile.
- Hosting: [Render deployment guide](../docs/DEPLOYMENT.md), `render.yaml`, production `Dockerfile`.
- Linux verification workflow: `.github/workflows/verify.yml`.

## Deployment package verification

Commit `29217814c624c63077906666944a93de01cccca6` passed the [GitHub Actions Linux verification run](https://github.com/HmdNvd/Bike-Rental-Demand/actions/runs/38612696294): production Docker image build, all six model/API tests inside the image, service startup, frontend serving, health and a known inference returning 524 rounded rentals. This verifies the Linux deployment package; it does not by itself establish a public hosted service.

## Current live-deployment status

**Pending account setup and an actual successful deployment.** No public demo URL or final deployed prediction screenshot has been verified yet. This status will be updated after the account owner completes Render sign-in/authorization and the service builds and passes live acceptance checks.

The existing Phase 7 screenshots demonstrate local operation; they are not the final live-deployment proof requested for Phase 8.

## Final evidence required to complete submission

1. The verified public application URL from the hosting dashboard.
2. The exact deployed Git commit and successful build/health verification.
3. A screenshot showing the public URL, selected inputs and returned numerical prediction.
4. A check that at least one held-out example gives the same output as the locally verified estimator.

## Project results

The final Ridge model has MAE **88.9194**, RMSE **117.9478** and R² **0.713831** on the 3,476-row chronological evaluation period. It improves on the notebook's initial log-target linear model (MAE 125.7422, RMSE 186.8784, R² 0.281609). These scores are development evaluation results: model refinement reused the same period. See the report for the validation and historical-data limitations.
