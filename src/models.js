/** Deterministic random numbers keep experiments reproducible. */
export function rng(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export const truth = x => .56 * Math.sin(2.6 * x) + .17 * x;

export function generateDataset(seed = 7, noise = .2, count = 20) {
  const random = rng(seed);
  const train = Array.from({ length: count }, (_, i) => {
    const x = -.98 + i * 1.96 / (count - 1);
    return { x, y: truth(x) + (random() - .5) * noise * 3 };
  });
  // Keep the same held-out observations when only training sample size changes.
  const testRandom = rng(seed);
  for (let i = 0; i < 20; i++) testRandom();
  const test = Array.from({ length: 45 }, () => {
    const x = testRandom() * 2 - 1;
    return { x, y: truth(x) + (testRandom() - .5) * noise * 3 };
  });
  return { train, test };
}

/** Ridge polynomial fit with an unpenalized intercept and numerical stabilizer. */
export function fitPolynomial(train, degree, regularization) {
  const n = degree + 1;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));
  const target = Array(n).fill(0);
  for (const point of train) {
    const powers = Array.from({ length: n }, (_, j) => point.x ** j);
    for (let i = 0; i < n; i++) {
      target[i] += powers[i] * point.y / train.length;
      for (let j = 0; j < n; j++) matrix[i][j] += powers[i] * powers[j] / train.length;
    }
  }
  for (let i = 0; i < n; i++) matrix[i][i] += (i ? regularization : 0) + 1e-9;
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++) if (Math.abs(matrix[j][i]) > Math.abs(matrix[pivot][i])) pivot = j;
    [matrix[i], matrix[pivot]] = [matrix[pivot], matrix[i]];
    [target[i], target[pivot]] = [target[pivot], target[i]];
    const divisor = matrix[i][i];
    for (let j = i; j < n; j++) matrix[i][j] /= divisor;
    target[i] /= divisor;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = matrix[k][i];
      for (let j = i; j < n; j++) matrix[k][j] -= factor * matrix[i][j];
      target[k] -= factor * target[i];
    }
  }
  return x => target.reduce((value, weight, j) => value + weight * x ** j, 0);
}

export const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
}
export const mse = (points, predict) => mean(points.map(p => (p.y - predict(p.x)) ** 2));
export function summarize(values) {
  const center = mean(values);
  return {
    mean: center, median: median(values),
    mae: mean(values.map(x => Math.abs(x - center))),
    mse: mean(values.map(x => (x - center) ** 2)),
    std: Math.sqrt(mean(values.map(x => (x - center) ** 2))),
  };
}
export function classificationMetrics(scores, threshold) {
  let tp = 0, fp = 0, fn = 0;
  for (const score of scores) {
    const predictedPositive = score.p >= threshold;
    if (predictedPositive && score.positive) tp++;
    if (predictedPositive && !score.positive) fp++;
    if (!predictedPositive && score.positive) fn++;
  }
  return { tp, fp, fn, precision: tp + fp ? tp / (tp + fp) : null, recall: tp + fn ? tp / (tp + fn) : null };
}
export function confusionSummary(scores, threshold, fpCost = 1, fnCost = 1) {
  const m = classificationMetrics(scores, threshold);
  const tn = scores.length - m.tp - m.fp - m.fn;
  return {
    ...m, tn,
    accuracy: scores.length ? (m.tp + tn) / scores.length : null,
    f1: 2 * m.tp + m.fp + m.fn ? 2 * m.tp / (2 * m.tp + m.fp + m.fn) : null,
    cost: m.fp * fpCost + m.fn * fnCost,
  };
}
