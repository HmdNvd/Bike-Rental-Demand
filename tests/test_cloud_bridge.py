"""The free-hosting transport must preserve the original inference contract."""
import importlib.util

from backend.prediction import Predictor


def adapter():
    assert importlib.util.find_spec('cloud') is not None, 'Free-hosting adapter is not implemented'
    from cloud.bridge import dispatch_request
    return dispatch_request


def test_hosting_transport_reproduces_all_real_scenarios():
    dispatch = adapter()
    predictor = Predictor()
    for scenario in predictor.scenarios:
        reply = dispatch(predictor, {'id': scenario['id'], 'inputs': scenario['inputs']})
        assert reply['id'] == scenario['id']
        assert 'error' not in reply
        assert abs(reply['result']['prediction'] - scenario['prediction']) < 1e-8
        assert len(reply['result']['profile']) == 24


def test_hosting_transport_reports_validation_errors_without_crashing_session():
    dispatch = adapter()
    predictor = Predictor()
    inputs = predictor.scenarios[0]['inputs']
    reply = dispatch(predictor, {'id': 'invalid', 'inputs': {**inputs, 'hour': 24}})
    assert reply['id'] == 'invalid'
    assert 'error' in reply and 'hour' in reply['error']
    assert 'result' not in reply
