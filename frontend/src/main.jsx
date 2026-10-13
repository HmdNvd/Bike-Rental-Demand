import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, ArrowUpRight, Bike, Check, Download, LoaderCircle, X } from 'lucide-react';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import { DemandChart } from './DemandChart';
import './styles.css';

const INITIAL = { date: '2012-09-14', hour: 8, season: 3, weather: 1, temperature_c: 24, humidity: 55, wind_kmh: 12, holiday: false, baseline_year: 2012 };
const WEATHER = ['Clear', 'Cloudy', 'Rain', 'Heavy'];
const SEASONS = ['Winter', 'Spring', 'Summer', 'Fall'];
const hourLabel = hour => `${String(hour).padStart(2, '0')}:00`;
const formatDate = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const number = value => Number(value.toFixed(1)).toString();
const same = (a, b) => Object.keys(INITIAL).every(key => a?.[key] === b?.[key]);

async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, options);
  if (!response.ok) {
    let body;
    try { body = await response.json(); } catch { /* Non-JSON service error. */ }
    const detail = Array.isArray(body?.detail) ? body.detail.map(e => `${e.loc.at(-1)}: ${e.msg}`).join('; ') : body?.detail;
    throw new Error(detail || 'The prediction service is unavailable. Please try again.');
  }
  return response.json();
}

function Slider({ label, field, value, min, max, step = 1, unit, onChange }) {
  return <div className="slider-row">
    <label htmlFor={field}>{label}</label>
    <input id={field} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(field, Number(e.target.value))}
      aria-valuetext={`${number(value)} ${unit}`} style={{ '--progress': `${(value - min) / (max - min) * 100}%` }} />
    <output htmlFor={field}>{number(value)}<span>{unit}</span></output>
  </div>;
}

function ModelNotes({ dialogRef, model }) {
  return <dialog ref={dialogRef} className="notes-dialog" aria-labelledby="notes-title" onClick={event => { if (event.target === event.currentTarget) dialogRef.current.close(); }}>
    <div className="dialog-heading"><div><p className="small-label">BEHIND THE FORECAST</p><h2 id="notes-title">A model, made transparent.</h2></div><button className="icon-button" aria-label="Close model notes" onClick={() => dialogRef.current.close()}><X size={22} /></button></div>
    <p>This is your notebook’s final <strong>Ridge regression model (α = 10)</strong>, reproduced and saved for inference. It estimates total rentals across Washington, D.C.’s Capital Bikeshare system in one hour.</p>
    {model ? <>
      <div className="model-metrics"><div><span>R² score</span><strong>{model.metrics.r2.toFixed(4)}</strong></div><div><span>Mean absolute error</span><strong>{model.metrics.mae.toFixed(2)}<small> rentals</small></strong></div><div><span>Root mean squared error</span><strong>{model.metrics.rmse.toFixed(2)}<small> rentals</small></strong></div></div>
      <h3>Trained in time order</h3>
      <p>{model.training_rows.toLocaleString()} training rows ({formatDate(model.training_start)} – {formatDate(model.training_end)}). The final {model.test_rows.toLocaleString()} rows are held out for testing. The scenario examples come from this unseen test set.</p>
      <h3>The same inputs, every time</h3>
      <p>{model.features.length} ordered features: weather and calendar categories, normalized weather measurements, and a working-day rush-hour interaction. Temperature uses (°C + 8) / 47, humidity uses % / 100, and wind uses km/h / 67. The final model uses the original count target, with no scaler or logarithmic transform.</p>
      <h3>What the estimate means</h3>
      <p>MAE describes the average error across the test set; it is <strong>not a confidence interval</strong>. Predictions are clipped at zero. The daily chart changes only the hour and holds the other inputs constant. Heavy weather has just {model.weather_counts['4'] || 0} training observations.</p>
      <p>Dates beyond 2011–2012 use your chosen historical baseline. These estimates do not establish current ridership or generalize automatically to a different city.</p>
      <a className="source-link" href={model.dataset_url} target="_blank" rel="noreferrer">UCI Bike Sharing dataset · Hadi Fanaee-T · CC BY 4.0 <ArrowUpRight size={15} /></a>
    </> : <p>Model information is unavailable. Close this panel and retry loading the app.</p>}
  </dialog>;
}

function App() {
  const [inputs, setInputs] = useState(INITIAL);
  const [result, setResult] = useState(null);
  const [model, setModel] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [scenario, setScenario] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [infoError, setInfoError] = useState('');
  const [exported, setExported] = useState(false);
  const dialogRef = useRef(null);
  const predictionRequest = useRef(null);
  const requestSequence = useRef(0);
  const dirty = Boolean(result && !same(inputs, result.inputs));
  const observation = !dirty && scenario && result && same(scenario.inputs, result.inputs) ? scenario : null;

  async function runForecast(values, example = null) {
    predictionRequest.current?.abort();
    const controller = new AbortController();
    predictionRequest.current = controller;
    const sequence = ++requestSequence.current;
    const timer = setTimeout(() => controller.abort(), 15000);
    setBusy(true); setError(''); setExported(false); setScenario(example);
    try {
      const prediction = await api('predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values), signal: controller.signal });
      if (requestSequence.current === sequence) setResult(prediction);
    } catch (failure) {
      if (requestSequence.current === sequence) setError(failure.name === 'AbortError' ? 'The request timed out. Please try again.' : failure.message.includes('fetch') ? 'Could not reach the prediction service. Check that the server is running, then retry.' : failure.message);
    } finally {
      clearTimeout(timer);
      if (requestSequence.current === sequence) setBusy(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([api('model', { signal: controller.signal }), api('scenarios', { signal: controller.signal })])
      .then(([metadata, examples]) => { setModel(metadata); setScenarios(examples); })
      .catch(failure => { if (failure.name !== 'AbortError') setInfoError('Model details and examples could not load. Reload the page to retry.'); });
    runForecast(INITIAL);
    return () => { controller.abort(); predictionRequest.current?.abort(); requestSequence.current++; };
  }, []);

  function update(field, value) {
    setInputs(current => ({ ...current, [field]: value })); setExported(false);
  }

  function loadExample(example) {
    setInputs(example.inputs);
    runForecast(example.inputs, example);
  }

  function exportCsv() {
    if (!result || dirty || busy || error) return;
    const lines = [['date', 'hour', 'season', 'weather', 'temperature_c', 'humidity_percent', 'wind_kmh', 'holiday', 'baseline_year', 'predicted_rentals', 'rounded_rentals', 'observed_rentals'],
      ...result.profile.map(point => [result.inputs.date, point.hour, SEASONS[result.inputs.season - 1], WEATHER[result.inputs.weather - 1], result.inputs.temperature_c, result.inputs.humidity, result.inputs.wind_kmh, result.inputs.holiday, result.inputs.baseline_year, point.prediction.toFixed(4), point.rentals, observation && point.hour === result.inputs.hour ? observation.actual : ''])];
    const url = URL.createObjectURL(new Blob([lines.map(row => row.join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `spoke-${result.inputs.date}-${hourLabel(result.inputs.hour).replace(':', '')}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setExported(true);
  }

  return <>
    <header className="header"><div className="header-inner">
      <a className="brand" href="/" aria-label="Spoke home"><Bike size={48} strokeWidth={1.35} /><div><span>Spoke</span><small>Bike demand studio</small></div></a>
      <nav aria-label="Main navigation"><a className="nav-active" href="#forecast">Forecast</a><button onClick={() => dialogRef.current.showModal()}>Model notes</button><span className="phase">Phase 07</span></nav>
    </div></header>
    <main>
      <section className="intro"><h1>Predict the next ride.</h1><p>Turn weather and time into hourly bike demand.</p></section>
      <section className="workspace" id="forecast" aria-label="Bike demand prediction">
        <form className="conditions" onSubmit={event => { event.preventDefault(); runForecast({ ...inputs }, scenario && same(inputs, scenario.inputs) ? scenario : null); }}>
          <div className="panel-heading"><h2>Conditions</h2><span>01 / INPUT</span></div>
          <div className="time-row"><div className="field-inline date-field"><label htmlFor="date">Date</label><input type="date" id="date" required min="1900-01-01" max="2100-12-31" value={inputs.date} onChange={event => update('date', event.target.value)} /></div><div className="field-inline hour-field"><label htmlFor="hour">Hour</label><select id="hour" value={inputs.hour} onChange={event => update('hour', Number(event.target.value))}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}</select></div></div>
          <div className="field-row"><label htmlFor="season">Season</label><select id="season" value={inputs.season} onChange={event => update('season', Number(event.target.value))}>{SEASONS.map((season, index) => <option key={season} value={index + 1}>{season}</option>)}</select></div>
          <fieldset className="weather-row"><legend>Weather</legend><div className="weather-options">{WEATHER.map((weather, index) => <button type="button" key={weather} title={['Clear or partly cloudy', 'Mist or cloudy', 'Light rain or snow', 'Heavy rain, snow or storm'][index]} aria-pressed={inputs.weather === index + 1} className={inputs.weather === index + 1 ? 'selected' : ''} onClick={() => update('weather', index + 1)}>{weather}</button>)}</div></fieldset>
          <div className="sliders"><Slider label="Temperature" field="temperature_c" value={inputs.temperature_c} min={-8} max={39} step={.1} unit="°C" onChange={update} /><Slider label="Humidity" field="humidity" value={inputs.humidity} min={0} max={100} unit="%" onChange={update} /><Slider label="Wind speed" field="wind_kmh" value={inputs.wind_kmh} min={0} max={67} step={.1} unit="km/h" onChange={update} /></div>
          <div className="holiday-row"><label htmlFor="holiday">Holiday</label><button type="button" role="switch" id="holiday" aria-checked={inputs.holiday} aria-label="Holiday" className={`toggle ${inputs.holiday ? 'on' : ''}`} onClick={() => update('holiday', !inputs.holiday)}><span /></button><span>{inputs.holiday ? 'Yes' : 'No'}</span><small>{inputs.holiday ? 'Non-working day' : inputs.date ? ['Weekend', 'Working day', 'Working day', 'Working day', 'Working day', 'Working day', 'Weekend'][new Date(`${inputs.date}T12:00:00`).getDay()] : ''}</small></div>
          <div className="field-row baseline-row"><label htmlFor="baseline_year">Baseline year</label><select id="baseline_year" value={inputs.baseline_year} onChange={event => update('baseline_year', Number(event.target.value))}><option value={2011}>2011</option><option value={2012}>2012</option></select></div>
          <button className="predict-button" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={19} className="spin" /> Predicting…</> : <>Predict demand <ArrowRight size={21} /></>}</button>
          <p className="form-note">Uses the selected year’s historical demand baseline.</p>
          {error ? <div role="alert" className="error-message">{error}</div> : null}
        </form>
        <section className={`forecast ${dirty || error ? 'is-stale' : ''}`} aria-label="Prediction results" aria-busy={busy}>
          <div className="result-status" role="status"><span className={`status-dot ${dirty || error ? 'stale' : ''}`} />{busy ? 'Calculating your forecast' : error ? 'Prediction unavailable · retry below' : dirty ? 'Inputs changed · update prediction' : result ? 'Forecast ready' : 'Ready when you are'}</div>
          <div className="forecast-heading"><h2>{dirty || error ? 'Last hourly forecast' : 'Hourly forecast'}</h2><button className="icon-button export-button" title="Download predictions as CSV" aria-label="Download predictions as CSV" onClick={exportCsv} disabled={!result || dirty || busy || Boolean(error)}>{exported ? <Check size={19} /> : <Download size={19} />}</button></div>
          {result ? <>
            <div className="result-number" data-testid="prediction">{result.rentals.toLocaleString('en-US')}</div><p className="result-unit">rentals / hour</p>
            <p className="result-summary">{formatDate(result.inputs.date)} at {hourLabel(result.inputs.hour)}<span>·</span>{WEATHER[result.inputs.weather - 1]}<span>·</span>{number(result.inputs.temperature_c)}°C<span>·</span>{number(result.inputs.humidity)}% humidity<span>·</span>{number(result.inputs.wind_kmh)} km/h wind</p>
            {observation ? <div className="observation" data-testid="observation"><span>Held-out observation <strong>{observation.actual} rentals</strong></span><span>Absolute error <strong>{Math.abs(result.prediction - observation.actual).toFixed(1)}</strong></span></div> : null}
            <div className="chart-section"><h3>A day in motion</h3><p>Same conditions, every hour.</p><DemandChart profile={result.profile} selectedHour={result.inputs.hour} /><div className="chart-footer"><span>Peak hour <strong>{hourLabel(result.peak_hour)}</strong></span><small>Hourly estimates, not a daily forecast.</small></div></div>
            {result.warnings.length ? <div className="warnings" role="note">{result.warnings.map(warning => <p key={warning}>{warning}</p>)}</div> : null}
          </> : <div className="empty-result"><span>{busy ? '—' : 'Ready.'}</span><p>{busy ? 'Finding the rhythm of your day…' : 'Choose your conditions and predict hourly demand.'}</p></div>}
        </section>
      </section>
      <section className="scenario-section" aria-labelledby="scenarios-title"><div className="scenario-heading"><h2 id="scenarios-title">Try a different day</h2><span>Real observations from the held-out test set</span></div><div className="scenario-list">{scenarios.map(example => <button className={`scenario ${scenario?.id === example.id && !dirty ? 'active' : ''}`} key={example.id} onClick={() => loadExample(example)} disabled={busy}><div><h3>{example.title}</h3><p>{formatDate(example.inputs.date)}<span>·</span>{hourLabel(example.inputs.hour)}<span>·</span>{WEATHER[example.inputs.weather - 1]}<span>·</span>{number(example.inputs.temperature_c)}°C</p></div><ArrowRight size={21} /></button>)}</div>{infoError ? <p role="alert" className="error-message">{infoError}</p> : null}</section>
    </main>
    <footer><div className="footer-inner"><div className="footer-metrics"><span>Ridge regression</span><span>R² {model ? model.metrics.r2.toFixed(3) : '—'}</span><span>MAE {model ? model.metrics.mae.toFixed(1) : '—'} rentals</span><a href="https://archive.ics.uci.edu/dataset/275/bike+sharing+dataset" target="_blank" rel="noreferrer">UCI Bike Sharing 2011–2012</a></div><span>Historical data demo. Not for operational use.</span></div></footer>
    <ModelNotes dialogRef={dialogRef} model={model} />
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
