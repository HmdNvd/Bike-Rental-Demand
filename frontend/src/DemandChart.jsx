import React, { useState } from 'react';

export function DemandChart({ profile, selectedHour }) {
  const [hoverHour, setHoverHour] = useState(null);
  const width = 700, height = 220, left = 40, right = 14, top = 20, bottom = 32;
  const ceiling = Math.max(100, Math.ceil(Math.max(...profile.map(point => point.prediction)) / 100) * 100);
  const x = hour => left + hour / 23 * (width - left - right);
  const y = value => top + (1 - value / ceiling) * (height - top - bottom);
  const points = profile.map(point => `${x(point.hour).toFixed(2)},${y(point.prediction).toFixed(2)}`).join(' ');
  const active = profile[hoverHour ?? selectedHour];
  const tickStep = ceiling / 4;
  return <div className="chart-wrap">
    <svg className="demand-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Hourly what-if demand profile. Selected hour ${selectedHour}:00: ${profile[selectedHour].rentals} rentals. Weather remains constant.`} onMouseLeave={() => setHoverHour(null)}>
      <title>Hourly what-if bike rental demand</title>
      {[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1={left} x2={width - right} y1={y(tick * tickStep)} y2={y(tick * tickStep)} className="chart-grid" /><text x={left - 10} y={y(tick * tickStep) + 4} textAnchor="end">{Math.round(tick * tickStep)}</text></g>)}
      {[0, 6, 12, 18, 23].map(hour => <g key={hour}><line x1={x(hour)} x2={x(hour)} y1={top} y2={height - bottom} className="chart-grid" /><text x={x(hour)} y={height - 9} textAnchor="middle">{String(hour).padStart(2, '0')}</text></g>)}
      <polygon points={`${left},${height - bottom} ${points} ${width - right},${height - bottom}`} fill="var(--lime)" opacity=".42" />
      <polyline points={points} fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinejoin="round" />
      {profile.map(point => <g key={point.hour} onMouseEnter={() => setHoverHour(point.hour)}><circle cx={x(point.hour)} cy={y(point.prediction)} r="3.3" fill="var(--ink)" /><rect x={x(point.hour) - 13} y={top} width="26" height={height - top - bottom} fill="transparent" /></g>)}
      <circle cx={x(active.hour)} cy={y(active.prediction)} r="8.5" fill="var(--lime)" stroke="var(--ink)" strokeWidth="1.5" pointerEvents="none" /><circle cx={x(active.hour)} cy={y(active.prediction)} r="3.8" fill="var(--ink)" pointerEvents="none" />
      {hoverHour !== null ? <g pointerEvents="none"><rect x={Math.min(Math.max(x(active.hour) - 55, left), width - 122)} y={Math.max(0, y(active.prediction) - 38)} width="110" height="25" rx="4" fill="var(--ink)" /><text className="chart-tooltip" x={Math.min(Math.max(x(active.hour), left + 55), width - 67)} y={Math.max(0, y(active.prediction) - 38) + 17} textAnchor="middle">{String(active.hour).padStart(2, '0')}:00 · {active.rentals} rentals</text></g> : null}
    </svg>
    <details className="chart-data"><summary>View hourly values</summary><div className="hourly-table"><table><caption>Weather held constant; estimated rentals per hour</caption><thead><tr><th>Hour</th><th>Rentals</th></tr></thead><tbody>{profile.map(point => <tr key={point.hour} className={point.hour === selectedHour ? 'selected-hour' : ''}><td>{String(point.hour).padStart(2, '0')}:00</td><td>{point.rentals}</td></tr>)}</tbody></table></div></details>
  </div>;
}
