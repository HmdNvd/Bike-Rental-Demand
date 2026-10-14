# Deploy Spoke

## Live deployment: Streamlit Community Cloud

**Public URL: [spoke-bike-demand.streamlit.app](https://spoke-bike-demand.streamlit.app/)**. The deployed interface returned 524 for the documented default and 499/204/282 for the three evaluation scenarios. [Final screenshots and verification](../submission/PHASE_8.md).

Render requested a payment-card verification for this account despite the selected free plan. The owner chose a host without card verification. The primary deployment now uses [Streamlit Community Cloud](https://docs.streamlit.io/deploy/streamlit-community-cloud), which hosts Python apps for free.

The existing React interface is built as a bidirectional Streamlit component. Inputs travel to the same Python `Predictor` through `cloud/bridge.py`; the saved estimator, validation, feature order and outputs are unchanged. FastAPI/Docker remains a supported standalone deployment option. The Community Cloud version uses Streamlit component messages rather than exposing the standalone `/api/*` routes.

Create an app from the GitHub repository using:

| Setting | Value |
|---|---|
| Repository | `HmdNvd/Bike-Rental-Demand` |
| Branch | `main` |
| Main file | `cloud/streamlit_app.py` |
| Python version | 3.13 |
| Dependencies | `cloud/requirements.txt` (includes the pinned base requirements) |
| App visibility | Public for a shareable demo; GitHub source can remain private |

Streamlit must be authorized to read the private repository. The owner reviews GitHub's permission prompts. This project is deployed at the verified URL above; its public sharing option is enabled while GitHub source remains private.

The prebuilt component is committed under `cloud/frontend/` because Community Cloud installs Python dependencies rather than running the project's Node build. After UI edits, rebuild it with `npm.cmd run build:cloud` inside `frontend`, and commit source plus generated component files together.

For local verification:

```powershell
.venv\Scripts\python.exe -m pip install -r cloud/requirements.txt
.venv\Scripts\python.exe -m streamlit run cloud/streamlit_app.py
```

The original browser script below checks the standalone FastAPI transport. For the Streamlit deployment, interact with the `streamlit_app.spoke_studio` iframe and check the same numerical values, edited-input handling, model notes, CSV export and mobile layout. Do not expect `/api/health` on a Streamlit deployment; its platform health route is `/_stcore/health`.

## Alternative: Render Docker deployment

## Architecture and cost choice

Deploy one Docker web service using the repository's Dockerfile. Its build stage compiles React; the runtime serves that build and the FastAPI model API. Select the **Free** compute plan. No database, GPU, persistent disk, API key, paid plan or custom domain is needed.

The GitHub repository can remain private. Render requires explicit access to this repository to build it; a public app does not require public source code.

## Account setup

1. Sign in at [Render Dashboard](https://dashboard.render.com/), or create an account and complete its verification.
2. Connect the GitHub account **HmdNvd**, granting Render access to **Bike-Rental-Demand**. Choose only this repository where GitHub offers that option.
3. Account registration, authentication and GitHub authorization are performed by the account owner. Never put credentials in the repository.

## Service configuration

Create **New → Web Service**, choose the connected repository, and use:

| Setting | Value |
|---|---|
| Name | `spoke-bike-demand` (or the available unique name chosen at creation) |
| Repository | `HmdNvd/Bike-Rental-Demand` |
| Branch | `main` |
| Runtime / language | Docker |
| Root directory | Repository root; leave blank |
| Dockerfile path | `./Dockerfile` |
| Instance type | Free |
| Health check path | `/api/health` |
| Environment | `PYTHONUNBUFFERED=1` |

Leave custom build/start overrides empty: Dockerfile supplies both stages and the startup command. Uvicorn binds `0.0.0.0` and uses Render's `PORT` environment variable. As an alternative to manual service configuration, import the root `render.yaml` as a Render Blueprint and review its free plan before creating resources. Create only one service.

## Verify the build

The GitHub workflow `.github/workflows/verify.yml` builds and runs the same production Docker image in Linux. Its checks cover model parity/API validation, startup, health, React static serving and a known numerical request. Check the actual workflow result for the deployed commit. The local Windows API tests alone do not verify a Linux container.

On Render, inspect the deploy logs for a successful image build and application startup. Open the exact `onrender.com` URL displayed by the service dashboard. Do not infer success or guess a live URL solely from the configured service name.

## Live acceptance checks

- `/api/health` returns `{"status":"ok","model":"Ridge regression"}`.
- The root URL displays Spoke, loads its assets and makes API requests successfully.
- The default September 14, 2012, 08:00 scenario returns **524** rounded rentals.
- Morning commute returns **499**, rainy afternoon **204**, weekend evening **282**. Actual counts remain visible for unmodified examples.
- Changing inputs marks the previous result stale; submitting updates it.
- The daily profile contains 24 estimates and CSV export works.
- Model notes open, desktop/mobile layouts remain usable, and failures are clearly reported.

The known default request is documented in the main README. Use exactly those values when checking 524; changing normalization, season, humidity or hour changes the result.

## Screenshot evidence and submission

Capture the deployed site after a successful prediction and record the verified public URL alongside it. Browser address-bar chrome is useful when available; do not fabricate it. Include the input controls and numerical prediction in the same view. Keep additional scenario and mobile screenshots if useful. Store final proof under `submission/live/screenshots/`, then record the verified URL, commit and evidence paths in `submission/PHASE_8.md` and link the demo from the README.

The Phase 7 screenshots are local evidence and must not be relabeled as public-deployment proof.

The existing browser check supports a separate public URL and proof directory. From PowerShell, after replacing the URL with the exact dashboard URL:

```powershell
$env:SPOKE_BASE_URL = 'https://YOUR-VERIFIED-SERVICE.onrender.com'
$env:SPOKE_PROOF_DIR = (Join-Path (Get-Location) 'submission/live/screenshots')
node tests/browser-check.mjs
Remove-Item Env:SPOKE_BASE_URL, Env:SPOKE_PROOF_DIR
```

This writes live screenshots, scenario responses recording the actual page URL, and a sample CSV to `submission/live/`, preserving the local Phase 7 proof. The URL above is an instruction placeholder, not a deployed address. Allow the free service to wake up before running the checks.

## Free hosting behavior

Render's free web services sleep after 15 minutes with no inbound traffic. A later visit wakes the service, which can take about a minute. Open the demo before presenting it and allow startup to finish. Monthly usage/build limits apply. The saved model is included in the image, so restarting does not require retraining or persistent local storage. No keep-alive monitor is needed for this submission.

## Troubleshooting

| Symptom | Check |
|---|---|
| Repository absent in Render | GitHub account and selected-repository permissions |
| Pip or npm build failure | Exact deploy log, pinned versions, lockfile and Docker stage |
| Model cannot load | Artifact is committed; Python/scikit-learn versions match the pins |
| No listening port detected | Docker runtime selected, no incompatible start override, `PORT` used |
| UI loads but prediction fails | `/api/health`, `/api/predict`, startup logs, same-origin API path |
| First visit is slow | Free-service wake-up; wait for the application to become healthy |

## References

[Docker on Render](https://render.com/docs/docker) · [Blueprint reference](https://render.com/docs/blueprint-spec) · [Git provider connection](https://render.com/docs/git-provider) · [Free plan behavior](https://render.com/docs/free)
