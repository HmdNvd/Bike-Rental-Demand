"""One service for the prediction API and production React application."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.prediction import Predictor, PredictionInput

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'frontend/dist'


@asynccontextmanager
async def lifespan(app):
    app.state.predictor = Predictor()
    yield


app = FastAPI(title='Spoke — Bike Demand API', version='1.0.0', lifespan=lifespan)


@app.get('/api/health')
def health(request: Request):
    return {'status': 'ok', 'model': request.app.state.predictor.metadata['name']}


@app.get('/api/model')
def model_info(request: Request):
    return request.app.state.predictor.metadata


@app.get('/api/scenarios')
def scenarios(request: Request):
    return request.app.state.predictor.scenarios


@app.post('/api/predict')
def predict(inputs: PredictionInput, request: Request):
    return request.app.state.predictor.predict(inputs)


# StaticFiles keeps unknown API routes as real 404s, rather than returning index.html.
if DIST.exists():
    @app.get('/')
    def index():
        return FileResponse(DIST / 'index.html')

    app.mount('/', StaticFiles(directory=DIST), name='frontend')
