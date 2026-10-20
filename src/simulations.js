import { generateDataset, fitPolynomial, truth, mse, summarize, confusionSummary } from './models.js';

const $ = selector => document.querySelector(selector);
const defaults = { degree: 5, noise: .2, lambda: 0, seed: 7, count: 20, truth: false, outlier: 8, include: true, threshold: .5, fpCost: 1, fnCost: 1 };
const fixed = [3, 4, 4.5, 5, 5.5, 6, 6.5, 7];
const scores = Array.from({ length: 30 }, (_, i) => ({ p: (i + 1) / 31, positive: ((i * 17) % 31) / 31 < (i + 1) / 31 }));
let state = { ...defaults }, train = [], test = [], current, host, onChange;
let selectedPoint = 0;
const percent = value => value === null ? 'Undefined' : `${(100 * value).toFixed(0)}%`;
const number = value => value.toFixed(3);

function regenerate() { ({ train, test } = generateDataset(state.seed, state.noise, state.count)); }
function range(key, label, min, max, step = 1) {
  return `<div class="control"><label class="control-label" for="${key}">${label}<output id="${key}Val">${state[key]}</output></label><input type="range" id="${key}" min="${min}" max="${max}" step="${step}" value="${state[key]}"><div class="range-labels"><span>${min}</span><span>${max}</span></div></div>`;
}
function check(key, label) { return `<label class="check-control"><input type="checkbox" id="${key}" ${state[key] ? 'checked' : ''}>${label}</label>`; }
function button(preset, label) { return `<button class="preset" data-preset="${preset}">${label}</button>`; }
function settings() {
  if (current === 'overfit') return range('degree', 'Polynomial degree', 1, 12) + range('noise', 'Data noise', 0, .5, .05) + range('lambda', 'Regularization λ', 0, 1, .01) + range('count', 'Training observations', 10, 80, 5) + check('truth', 'Reveal the true pattern') + '<button class="secondary" id="newData">↻ New random sample</button>';
  if (current === 'outliers') return range('outlier', 'Moving observation', 0, 50, .5) + check('include', 'Include the moving observation') + '<p class="control-help">Toggle inclusion to compare the same dataset with and without this value. Exclusion is a teaching tool, not a recommendation to delete outliers.</p>';
  return range('threshold', 'Decision threshold', 0, 1, .01) + range('fpCost', 'Cost per false positive', 0, 10) + range('fnCost', 'Cost per missed positive', 0, 10) + '<p class="control-help">Costs are illustrative units. A lower threshold catches more positives but can create more false alarms.</p>';
}
function presets() {
  return current === 'overfit' ? button('simple', '① Underfit') + button('flexible', '② Fit the noise') + button('regularized', '③ Add a constraint') : current === 'outliers' ? button('cluster', '① In the crowd') + button('extreme', '② Go extreme') + button('exclude', '③ Compare without it') : button('screen', '① Catch more') + button('strict', '② Be selective') + button('balanced', '③ Start balanced');
}
export function mountSimulation(element, id, restored = {}, changed = () => {}) {
  current = id; host = element; onChange = changed;
  state = sanitize(restored); selectedPoint = 0; regenerate();
  if (Array.isArray(restored.points) && restored.points.length === train.length && restored.points.every(y => typeof y === 'number' && Number.isFinite(y) && Math.abs(y) <= 1.45)) train.forEach((p, i) => p.y = restored.points[i]);
  host.innerHTML = `<div class="steps"><b>01 · Pick a scenario</b><span>02 · Change one thing</span><span>03 · Follow the evidence</span></div><div class="preset-row">${presets()}</div><div class="lab-grid"><div class="experiment"><div class="experiment-head"><span id="plotTitle"></span><div class="legend"><span><i></i>${id === 'threshold' ? 'Actual +' : id === 'outliers' ? 'Fixed values' : 'Training'}</span><span><i class="orange"></i>${id === 'threshold' ? 'Actual −' : id === 'outliers' ? 'Moving value' : 'Held out'}</span></div></div><canvas id="plot" role="img" aria-label="${id === 'overfit' ? 'Polynomial model fitted to synthetic observations' : id === 'outliers' ? 'Observations, mean, and median on a number line' : 'Scored observations and decision boundary'}" aria-describedby="plotSummary"></canvas><p id="plotSummary" class="plot-summary"></p><div id="metrics" class="metrics"></div></div><div class="controls"><h3>Make it your experiment ✳</h3>${settings()}<button class="secondary" id="reset">Reset this experiment</button></div></div><div class="insight" aria-live="polite"><strong>THE AHA MOMENT</strong><span id="insightText"></span></div><section class="deep-dive" id="deepDive"></section><details class="data-disclosure"><summary>Inspect the numbers · accessible data table</summary><div id="dataTable" class="table-scroll"></div></details>`;
  bindControls(); bindPresets(); bindDragging(); redraw();
}
function sanitize(input) {
  const result = { ...defaults };
  const limits = { degree: [1, 12], noise: [0, .5], lambda: [0, 1], seed: [1, 100000], count: [10, 80], outlier: [0, 50], threshold: [0, 1], fpCost: [0, 10], fnCost: [0, 10] };
  for (const [key, [min, max]] of Object.entries(limits)) {
    const n = Number(input[key]);
    if (input[key] !== undefined && Number.isFinite(n)) result[key] = Math.max(min, Math.min(max, n));
  }
  for (const key of ['degree', 'seed', 'count']) result[key] = Math.round(result[key]);
  for (const key of ['truth', 'include']) if (typeof input[key] === 'boolean') result[key] = input[key];
  return result;
}
export function simulationState() { return { ...state, ...(current === 'overfit' ? { points: train.map(p => +p.y.toFixed(8)) } : {}) }; }
function syncControls() {
  for (const key of Object.keys(defaults)) {
    const element = $('#' + key);
    if (!element) continue;
    if (element.type === 'checkbox') element.checked = state[key];
    else { element.value = state[key]; const output = $('#' + key + 'Val'); if (output) output.textContent = state[key]; }
  }
}
function update() { syncControls(); redraw(); onChange(simulationState()); }
function bindControls() {
  host.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
    state[input.id] = input.type === 'checkbox' ? input.checked : +input.value;
    if (['count', 'noise'].includes(input.id)) { regenerate(); selectedPoint = 0; }
    update();
  }));
  $('#reset').onclick = () => { state = { ...defaults }; selectedPoint = 0; regenerate(); update(); };
  if ($('#newData')) $('#newData').onclick = () => { state.seed = state.seed % 100000 + 1; regenerate(); update(); };
}
function bindPresets() {
  const cases = {
    simple: { degree: 1, lambda: 0 }, flexible: { degree: 12, lambda: 0 }, regularized: { degree: 12, lambda: .03 },
    cluster: { outlier: 8, include: true }, extreme: { outlier: 50, include: true }, exclude: { outlier: 50, include: false },
    screen: { threshold: .2 }, strict: { threshold: .8 }, balanced: { threshold: .5 },
  };
  host.querySelectorAll('[data-preset]').forEach(button => button.onclick = () => { Object.assign(state, cases[button.dataset.preset]); update(); });
}
function canvas(id) {
  const element = $('#' + id), bounds = element.getBoundingClientRect(), ratio = devicePixelRatio || 1;
  element.width = bounds.width * ratio; element.height = bounds.height * ratio;
  const g = element.getContext('2d'); g.scale(ratio, ratio);
  return { g, w: bounds.width, h: bounds.height };
}
function label(g, text, x, y, color = '#625d6e') { g.fillStyle = color; g.font = '11px sans-serif'; g.fillText(text, x, y); }
function dot(g, x, y, color, radius = 4, hollow = false) {
  g.beginPath(); g.arc(x, y, radius, 0, Math.PI * 2); g.strokeStyle = color; g.fillStyle = color;
  hollow ? g.stroke() : g.fill();
}
function line(g, points, color, dashed = false) {
  g.beginPath(); g.strokeStyle = color; g.lineWidth = 2; g.setLineDash(dashed ? [5, 5] : []);
  points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.setLineDash([]);
}
function chartCoordinates(w, h) { return { X: x => 44 + (x + 1) * (w - 64) / 2, Y: y => 25 + (1.6 - y) * (h - 70) / 3.2 }; }
function metric(label, value, help = '') { return `<div class="metric"><small>${label}</small><strong>${value}</strong>${help ? `<span>${help}</span>` : ''}</div>`; }
function table(headers, rows, caption) { return `<table><caption>${caption}</caption><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`; }
export function redraw() {
  if (!host || !$('#plot') || host.closest('[hidden]')) return;
  if (current === 'overfit') drawOverfit();
  if (current === 'outliers') drawOutliers();
  if (current === 'threshold') drawThreshold();
}
function drawOverfit() {
  const { g, w, h } = canvas('plot'), { X, Y } = chartCoordinates(w, h);
  const predict = fitPolynomial(train, state.degree, state.lambda);
  const a = mse(train, predict), b = mse(test, predict);
  for (const y of [-1, 0, 1]) { line(g, [[44, Y(y)], [w - 20, Y(y)]], '#e9e5da'); label(g, y, 15, Y(y) + 4); }
  for (const x of [-1, 0, 1]) label(g, x, X(x) - 4, h - 22);
  label(g, 'input x', w / 2 - 20, h - 3); label(g, 'target y', 8, 13);
  g.save(); g.beginPath(); g.rect(44, 23, w - 64, h - 68); g.clip();
  const xs = Array.from({ length: 240 }, (_, i) => -1 + 2 * i / 239);
  if (state.truth) line(g, xs.map(x => [X(x), Y(truth(x))]), '#249988', true);
  line(g, xs.map(x => [X(x), Y(predict(x))]), '#7153d7');
  test.forEach(p => dot(g, X(p.x), Y(p.y), '#dc7648', 3, true));
  train.forEach((p, i) => dot(g, X(p.x), Y(p.y), '#7153d7', i === selectedPoint ? 6 : 4));
  g.restore();
  $('#plotTitle').textContent = `${train.length} training · 45 held-out observations`;
  $('#plotSummary').textContent = `Solid violet: fitted model and training points. Hollow coral: held-out points.${state.truth ? ' Dashed teal: true generating pattern.' : ''} Drag a training point, or edit one below.`;
  $('#metrics').innerHTML = metric('Training MSE', number(a), 'Fit to observed examples') + metric('Held-out MSE', number(b), 'Error on unseen examples') + metric('Generalization gap', (b - a).toFixed(3), 'Held-out minus training error');
  $('#insightText').textContent = state.lambda > .1 ? 'A strong constraint flattens the curve. That can reduce noise-fitting, but too much constraint can also hide the underlying signal. Compare both errors.' : state.degree < 3 ? 'This curve has little flexibility. It can miss the underlying shape even before noise becomes a problem. Compare it with degree 5.' : b > a * 1.8 ? 'The model fits seen examples better than unseen ones. Try more training data, a lower degree, or a small regularization penalty. A gap alone does not prove overfitting.' : 'The two errors are fairly close for this sample. Try the high-degree preset or a different random sample to see why one split is not enough to select a model.';
  $('#deepDive').innerHTML = '<h3>Follow the error, not just the curve.</h3><p>Every point below is a real fit to this same dataset. Regularization stays fixed. Use the degree slider to move the marker.</p><canvas id="sweep" role="img" aria-label="Training and held-out mean squared error by polynomial degree"></canvas><p class="control-help">Violet = training · Coral = held out · Logarithmic error axis. This is an exploration set: use a separate final test set after choosing a model.</p><details><summary>Edit a training point without dragging</summary><div class="point-editor"><label>Observation <select id="pointIndex">' + train.map((_, i) => `<option value="${i}" ${i === selectedPoint ? 'selected' : ''}>${i + 1}</option>`).join('') + '</select></label><label>Target y <input id="pointY" type="number" min="-1.45" max="1.45" step="0.05" value="' + train[selectedPoint].y.toFixed(3) + '"></label><button class="secondary" id="applyPoint">Apply value</button></div></details>';
  const fits = Array.from({ length: 12 }, (_, i) => { const f = fitPolynomial(train, i + 1, state.lambda); return { d: i + 1, train: mse(train, f), test: mse(test, f) }; });
  drawSweep(fits);
  $('#pointIndex').onchange = e => { selectedPoint = +e.target.value; $('#pointY').value = train[selectedPoint].y.toFixed(3); };
  $('#applyPoint').onclick = () => { const input = $('#pointY'); if (!input.reportValidity() || input.value === '') return; train[selectedPoint].y = +input.value; update(); };
  $('#dataTable').innerHTML = table(['Degree', 'Training MSE', 'Held-out MSE'], fits.map(p => [p.d, number(p.train), number(p.test)]), 'Error sweep — same observations and regularization for each fit');
}
function drawSweep(fits) {
  const { g, w, h } = canvas('sweep');
  const values = fits.flatMap(p => [p.train, p.test]).map(v => Math.log10(Math.max(v, 1e-8)));
  const lo = Math.min(...values) - .15, hi = Math.max(...values) + .15;
  const X = d => 55 + (d - 1) / 11 * (w - 80), Y = v => h - 35 - (Math.log10(Math.max(v, 1e-8)) - lo) / (hi - lo) * (h - 60);
  for (let i = 0; i < 3; i++) { const log = lo + (hi - lo) * i / 2; line(g, [[55, Y(10 ** log)], [w - 25, Y(10 ** log)]], '#ede8dc'); label(g, (10 ** log).toExponential(0), 3, Y(10 ** log) + 4); }
  line(g, fits.map(p => [X(p.d), Y(p.train)]), '#7153d7'); line(g, fits.map(p => [X(p.d), Y(p.test)]), '#dc7648');
  line(g, [[X(state.degree), 15], [X(state.degree), h - 35]], '#484044', true);
  [1, 3, 5, 7, 9, 12].forEach(d => label(g, d, X(d) - 4, h - 16)); label(g, 'polynomial degree', w / 2 - 45, h - 1);
}
function drawOutliers() {
  const values = state.include ? [...fixed, state.outlier] : [...fixed];
  const summary = summarize(values), baseline = summarize(fixed), { g, w, h } = canvas('plot');
  const X = value => 38 + value / 50 * (w - 65), y = h * .55;
  line(g, [[38, y + 20], [w - 27, y + 20]], '#d8d2c5');
  for (let i = 0; i <= 50; i += 10) label(g, i, X(i) - 5, y + 43);
  label(g, 'observation value', w / 2 - 45, h - 12);
  fixed.forEach((value, i) => dot(g, X(value), y - i % 3 * 15, '#7153d7', 5));
  dot(g, X(state.outlier), y, state.include ? '#dc7648' : '#bbb5aa', 8, !state.include);
  [[summary.mean, '#dc7648', 'Mean'], [summary.median, '#7153d7', 'Median']].forEach(([value, color, text], i) => {
    line(g, [[X(value), y - 80], [X(value), y + 22]], color, true);
    label(g, `${text} ${value.toFixed(2)}`, Math.max(20, Math.min(w - 110, X(value) - 25)), y - 94 - i * 22, color);
  });
  $('#plotTitle').textContent = `${values.length} included observations`;
  $('#plotSummary').textContent = `Mean ${summary.mean.toFixed(2)}, median ${summary.median.toFixed(2)}. The moving value is ${state.include ? 'included' : 'excluded; hollow gray point'}.`;
  $('#metrics').innerHTML = metric('Mean', summary.mean.toFixed(2), `Baseline ${baseline.mean.toFixed(2)}`) + metric('Median', summary.median.toFixed(2), `Baseline ${baseline.median.toFixed(2)}`) + metric('Population SD', summary.std.toFixed(2), 'Spread around the mean');
  $('#insightText').textContent = !state.include ? 'You are looking at the eight fixed observations. Compare with the extreme-value preset: one point can shift the mean and spread without changing the middle of the fixed group very much.' : state.outlier > 15 ? 'The mean moves toward the extreme value. Squaring deviations makes that observation especially influential in MSE. The median depends on sorted position instead of distance.' : 'The observations are relatively close together. Send the moving value toward 50 to make the difference between magnitude and sorted position visible.';
  $('#deepDive').innerHTML = `<h3>Same values. Different ways to summarize them.</h3><p>Errors below are measured around the current mean. MSE has squared units; MAE has the original units, so their magnitudes are not directly comparable.</p><div class="metrics">${metric('Mean absolute deviation', summary.mae.toFixed(2))}${metric('Mean squared deviation', summary.mse.toFixed(2))}${metric('Mean shift from baseline', (summary.mean - baseline.mean).toFixed(2))}</div><div class="sorted-values"><span>Smallest → largest</span>${values.slice().sort((a, b) => a - b).map(value => `<b class="${state.include && value === state.outlier ? 'moving' : ''}">${value.toFixed(1)}</b>`).join('')}</div><p class="control-help">For nine values, the median is the fifth. For eight, it is the average of the fourth and fifth. Population SD uses n, not n − 1.</p>`;
  $('#dataTable').innerHTML = table(['Value', 'Deviation from mean', 'Squared deviation'], values.slice().sort((a, b) => a - b).map(value => [value.toFixed(2), (value - summary.mean).toFixed(2), ((value - summary.mean) ** 2).toFixed(2)]), 'Included observations and their contributions to squared error');
}
function drawThreshold() {
  const m = confusionSummary(scores, state.threshold, state.fpCost, state.fnCost), { g, w, h } = canvas('plot');
  const X = p => 35 + p * (w - 60), cut = X(state.threshold);
  g.fillStyle = '#fff2ad'; g.fillRect(cut, 35, Math.max(0, w - 25 - cut), h - 85);
  line(g, [[cut, 35], [cut, h - 50]], '#39313d', true);
  label(g, 'Predicted −', 35, 20); label(g, 'Predicted +', w - 110, 20);
  scores.forEach((score, i) => { dot(g, X(score.p), 75 + (i % 5) * (h - 160) / 5, score.positive ? '#7153d7' : '#dc7648', 5); });
  for (let i = 0; i <= 10; i += 2) label(g, (i / 10).toFixed(1), X(i / 10) - 7, h - 27);
  label(g, 'predicted probability', w / 2 - 50, h - 5);
  $('#plotTitle').textContent = '30 scored observations · boundary includes equality';
  $('#plotSummary').textContent = `${m.tp + m.fp} predicted positive: ${m.tp} correct and ${m.fp} false alarms. ${m.fn} missed positives. Point color represents actual class, shading represents prediction.`;
  $('#metrics').innerHTML = metric('Precision', percent(m.precision), 'Correct among flagged cases') + metric('Recall', percent(m.recall), 'Caught among actual positives') + metric('Accuracy', percent(m.accuracy), 'All correct predictions') + metric('F1', m.f1 === null ? 'Undefined' : m.f1.toFixed(2), 'Harmonic mean of precision & recall');
  $('#insightText').textContent = `At threshold ${state.threshold.toFixed(2)}: ${m.tp} true positives, ${m.fp} false alarms, ${m.fn} missed positives, and ${m.tn} true negatives. ${m.precision === null ? 'Precision is undefined because no cases are flagged.' : 'The best operating point depends on the cost of each mistake.'}`;
  const candidates = Array.from({ length: 101 }, (_, i) => ({ threshold: i / 100, ...confusionSummary(scores, i / 100, state.fpCost, state.fnCost) }));
  const best = candidates.reduce((a, b) => b.cost < a.cost ? b : a);
  $('#deepDive').innerHTML = `<h3>Every decision lands in one of four boxes.</h3><div class="confusion"><div class="matrix-label">Actual ↓ / Predicted →</div><div class="matrix-label">Positive</div><div class="matrix-label">Negative</div><div class="matrix-label">Positive</div><div class="cell correct"><span>True positive</span><b>${m.tp}</b></div><div class="cell mistake"><span>False negative · missed</span><b>${m.fn}</b></div><div class="matrix-label">Negative</div><div class="cell mistake"><span>False positive · false alarm</span><b>${m.fp}</b></div><div class="cell correct"><span>True negative</span><b>${m.tn}</b></div></div><div class="cost-callout"><div><strong>Total mistake cost: ${m.cost} units</strong><p>${m.fp} × ${state.fpCost} + ${m.fn} × ${state.fnCost}. Lowest cost on this sample: ${best.cost} units at threshold ${best.threshold.toFixed(2)} (first tied value).</p></div><button class="secondary" id="bestThreshold">Try this threshold ↗</button></div><p class="control-help">This threshold is selected on these 30 examples, not a population optimum. Validate the decision on separate representative data. Undefined metrics are never silently shown as zero.</p>`;
  $('#bestThreshold').onclick = () => { state.threshold = best.threshold; update(); };
  $('#dataTable').innerHTML = table(['Observation', 'Probability', 'Actual', 'Predicted', 'Outcome'], scores.map((s, i) => { const pred = s.p >= state.threshold; return [i + 1, s.p.toFixed(3), s.positive ? '+' : '−', pred ? '+' : '−', pred ? (s.positive ? 'TP' : 'FP') : (s.positive ? 'FN' : 'TN')]; }), 'Every scored observation and its classification at the current threshold');
}
function bindDragging() {
  let active = -1;
  const element = $('#plot');
  element.onpointerdown = event => {
    const rect = element.getBoundingClientRect();
    if (current === 'outliers' && state.include) active = 0;
    if (current === 'threshold') active = 0;
    if (current === 'overfit') {
      const { X, Y } = chartCoordinates(rect.width, rect.height);
      const distances = train.map(p => Math.hypot(X(p.x) - (event.clientX - rect.left), Y(p.y) - (event.clientY - rect.top)));
      active = distances.indexOf(Math.min(...distances));
      if (distances[active] > 22) active = -1;
      else selectedPoint = active;
    }
    if (active >= 0) element.setPointerCapture(event.pointerId);
  };
  element.onpointermove = event => {
    if (active < 0) return;
    const rect = element.getBoundingClientRect();
    if (current === 'overfit') train[active].y = Math.max(-1.45, Math.min(1.45, 1.6 - (event.clientY - rect.top - 25) * 3.2 / (rect.height - 70)));
    if (current === 'outliers') state.outlier = Math.round(Math.max(0, Math.min(50, (event.clientX - rect.left - 38) / (rect.width - 65) * 50)) * 2) / 2;
    if (current === 'threshold') state.threshold = Math.round(Math.max(0, Math.min(1, (event.clientX - rect.left - 35) / (rect.width - 60))) * 100) / 100;
    syncControls(); redraw();
  };
  element.onpointerup = element.onpointercancel = () => { if (active >= 0) onChange(simulationState()); active = -1; };
}
export function drawTeaser() {
  const element = $('#teaser');
  if (!element || !element.getBoundingClientRect().width) return;
  const { g, w, h } = canvas('teaser'), sample = generateDataset(7, .2);
  const degree = +$('#teaserRange').value, predict = fitPolynomial(sample.train, degree, 0);
  const X = x => 15 + (x + 1) / 2 * (w - 30), Y = y => h / 2 - y * (h - 30) / 3;
  sample.train.forEach(p => dot(g, X(p.x), Y(p.y), '#7153d7', 3));
  line(g, Array.from({ length: 200 }, (_, i) => { const x = -1 + i / 100; return [X(x), Y(predict(x))]; }), '#7153d7');
}
