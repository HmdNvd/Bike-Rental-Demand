# Implementation plan

1. Inspect notebook final estimator and source dataset documentation; establish feature and unit contract.
2. Generate and inspect the full primary-screen visual reference.
3. Add model integration tests, reproduce training and metrics, export trusted local model, scenario observations, and provenance.
4. Implement validated FastAPI endpoints and inference with exact ordered encoding.
5. Implement the React conditions form, result/chart, held-out scenarios, notes, export, and responsive design.
6. Run numerical parity/API tests and production build. Verify browser behavior and screenshots against the visual reference, including mobile and failures.
7. Package single-service deployment, launch instructions, screenshot evidence, and submission notes. Open the working app.

## Execution record

- Completed steps 1–7 locally. The user delegated decisions and execution, so no design approval round was introduced.
- Reproduced all final notebook metrics at full precision. Exported 53 ordered features with the original estimator and split. Original notebook SHA-256 matches the recorded source.
- Before model preparation, all six contract tests failed because dataset/model artifacts were absent. After preparation, all six pass. The suite includes independently reconstructed features and deployed prediction comparison.
- Frontend production build passes. Playwright exercises real UI requests at 1440×1000 and 390×844, three unseen scenarios, CSV download, changed-input labeling, holiday logic, heavy weather and historical baseline warnings, modal keyboard close, service failure/recovery, keyboard slider, and the 24-hour table. Seven proof screenshots and actual responses are saved in submission/.
- Ruling: use current UCI hourly metadata for user-facing temperature and season names; the archive README and notebook plot labels differ. Numeric training features remain unchanged. Full source precision is preserved in scenario inputs.
- Ruling: use headless Playwright because the built-in browser and normal shell runtime cannot start (`windows sandbox failed: helper_unknown_error: setup refresh had errors`). Necessary local commands ran with approved escalation.
- Docker configuration supplied; Docker is unavailable locally, so container execution and public hosting are unverified. The single-service production build itself is verified locally.
- Independent final review found one launcher compatibility issue. Corrected startup to compare every installed distribution against the pinned requirements, install on mismatch, and verify again before loading the model.
