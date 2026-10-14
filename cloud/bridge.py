"""Serve the existing inference contract through Streamlit's component transport."""
from pydantic import ValidationError

from backend.prediction import PredictionInput


def dispatch_request(predictor, request):
    request_id = request.get('id')
    try:
        inputs = PredictionInput.model_validate(request.get('inputs'))
    except ValidationError as failure:
        message = '; '.join(f"{'.'.join(map(str, item['loc']))}: {item['msg']}" for item in failure.errors())
        return {'id': request_id, 'error': message}
    return {'id': request_id, 'result': predictor.predict(inputs)}
