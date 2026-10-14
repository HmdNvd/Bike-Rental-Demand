# Phase 8 implementation plan

Goal: publish complete, reproducible ML documentation and a working public prediction app, then capture screenshot evidence from that deployed app.

- [x] Reproduce descriptive EDA findings and export legible figures and evaluation data with scripts/analyze_project.py. Keep the original notebook intact.
- [x] Write docs/PROJECT_REPORT.md covering the problem, dataset, quality checks, preprocessing, EDA, both model approaches, chronological training, evaluation, predictions, limitations, reproduction and deployment.
- [x] Improve the GitHub README with app preview, report links and portfolio summary; retain technical setup instructions.
- [x] Add Render deployment configuration and a GitHub Actions Linux container verification workflow. Test API feature parity and production container startup.
- [x] Commit and push the documentation/configuration. Inspect the actual GitHub Actions result and repair any build or runtime failures.
- [x] Deploy the private repository through Streamlit Community Cloud, selected by the owner after Render requested card verification. The owner completed account creation and GitHub authorization. No paid service was created.
- [x] Verify the public URL, capture live inputs/output and scenario screenshots, record the actual URL in verification.json, and complete submission/PHASE_8.md.

Execution: proceed step by step in this chat under the user's authorization. Publishing this app is explicitly requested; changing GitHub repository visibility is not required. Never label local screenshots as live deployment evidence.

Verified: commit `29217814c624c63077906666944a93de01cccca6` passed [Linux Docker build, six model/API tests, container startup, health, frontend and known numerical prediction](https://github.com/HmdNvd/Bike-Rental-Demand/actions/runs/38612696294). Both analysis pipelines reproduce the notebook metrics; all six figures were visually inspected. Independent read-only review found no actionable defects. Runtime pins still match after installing optional plotting dependencies.

Hosting change: Render prompted for card verification despite the selected $0 Free plan. The owner explicitly selected hosting without card verification. Streamlit Community Cloud is now the primary target. A thin bidirectional component preserves the React UI and original Predictor; two new contract tests were observed failing before implementation and now pass, bringing the model/adapter suite to eight. The local hosted version returned 524 for the default and 204 for the rainy example, with observed comparison and model notes verified through the built-in browser. No payment details were entered and no paid service was created.

Final deployment: https://spoke-bike-demand.streamlit.app/. Tested application commit 80a0045 passed Linux CI run 38615816984 (eight tests). Live default 524 and scenario results 499/204/282 match the estimator. CSV download-event automation timed out; see submission evidence for verification scope.
