"""Run the same React studio and Python model on Streamlit Community Cloud.

Local: python -m streamlit run cloud/streamlit_app.py
Frontend rebuild: cd frontend; npm run build:cloud
"""
from pathlib import Path
import sys

import streamlit as st
import streamlit.components.v1 as components

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.prediction import Predictor
from cloud.bridge import dispatch_request

st.set_page_config(page_title='Spoke — Bike demand studio', page_icon='🚲', layout='wide', initial_sidebar_state='collapsed')


@st.cache_resource
def load_predictor():
    return Predictor()


predictor = load_predictor()
st.markdown('''<style>
  .stApp {background:#f7f7f0;}
  .block-container {max-width:none;padding:0!important;}
  [data-testid="stHeader"] {background:transparent;}
  [data-testid="stAppViewContainer"] > .main {padding:0;}
  [data-testid="stMainBlockContainer"] {padding:0!important;}
  .stElementContainer:has(iframe) {margin:0;}
</style>''', unsafe_allow_html=True)

studio = components.declare_component('spoke_studio', path=str(Path(__file__).parent / 'frontend'))
request = studio(model=predictor.metadata, scenarios=predictor.scenarios,
                 response=st.session_state.get('spoke_response'), key='spoke_studio', default=None)
if isinstance(request, dict) and request.get('id') and request['id'] != st.session_state.get('spoke_processed_id'):
    st.session_state.spoke_response = dispatch_request(predictor, request)
    st.session_state.spoke_processed_id = request['id']
    st.rerun()
