import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDataset, fitPolynomial, mean, median, classificationMetrics } from '../src/models.js';

const mse = (points, predict) => mean(points.map(p => (p.y - predict(p.x)) ** 2));

test('seeded datasets are repeatable and separate training from test observations', () => {
  const a = generateDataset(7, .2);
  assert.deepEqual(a, generateDataset(7, .2));
  assert.notDeepEqual(a, generateDataset(8, .2));
  assert.equal(a.train.length, 20);
  assert.equal(a.test.length, 45);
  assert.notDeepEqual(a.train, a.test);
});

test('polynomial fitting recovers a known quadratic', () => {
  const points = Array.from({ length: 21 }, (_, i) => {
    const x = (i - 10) / 10;
    return { x, y: 1 + 2 * x - 3 * x * x };
  });
  const predict = fitPolynomial(points, 2, 0);
  assert.ok(mse(points, predict) < 1e-12);
});

test('default example demonstrates overfitting as complexity increases', () => {
  const { train, test: heldout } = generateDataset(7, .2);
  const simple = fitPolynomial(train, 5, 0);
  const complex = fitPolynomial(train, 12, 0);
  assert.ok(mse(train, complex) < mse(train, simple));
  assert.ok(mse(heldout, complex) > mse(heldout, simple));
});

test('regularization reduces variation in a high degree curve', () => {
  const { train } = generateDataset(7, .2);
  const flexible = fitPolynomial(train, 12, 0);
  const regularized = fitPolynomial(train, 12, .5);
  const curvature = f => {
    let total = 0;
    for (let x = -.9; x < .9; x += .01) total += (f(x + .01) - 2 * f(x) + f(x - .01)) ** 2;
    return total;
  };
  assert.ok(curvature(regularized) < curvature(flexible));
});

test('extreme values change the mean but preserve the middle observation', () => {
  const fixed = [3, 4, 4.5, 5, 5.5, 6, 6.5, 7];
  assert.equal(median([...fixed, 8]), median([...fixed, 50]));
  assert.ok(mean([...fixed, 50]) > mean([...fixed, 8]));
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test('classification metrics use inclusive thresholds and handle no positive predictions', () => {
  const points = [{ p: .8, positive: true }, { p: .5, positive: false }, { p: .3, positive: true }];
  assert.deepEqual(classificationMetrics(points, .5), { tp: 1, fp: 1, fn: 1, precision: .5, recall: .5 });
  assert.equal(classificationMetrics(points, .9).precision, null);
  assert.equal(classificationMetrics(points, .9).recall, 0);
});
