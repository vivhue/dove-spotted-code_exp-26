const assert = require('assert');
const { evaluate } = require('../predictEngine');

function approxEqual(a, b, tol = 1) {
  return Math.abs(a - b) <= tol;
}

// Test 1: no observations -> low risk
(() => {
  const res = evaluate([], 4);
  console.log('Test 1 result:', res);
  assert.strictEqual(res.severity, 'Low', 'Empty observations should be Low severity');
  assert.ok(res.riskScore >= 0 && res.riskScore <= 100, 'riskScore range');
})();

// Test 2: single high-severity observation
(() => {
  const obs = [{ source: 'test', type: 'rainfall', value: 95, weight: 1 }];
  const res = evaluate(obs, 2);
  console.log('Test 2 result:', res);
  assert.ok(res.riskScore >= 80, 'High observation should yield high score');
  assert.ok(['High','Critical'].includes(res.severity), 'Severity should be High or Critical');
})();

// Test 3: multiple mixed observations
(() => {
  const obs = [
    { source: 'rain', type: 'rainfall', value: 80, weight: 0.4 },
    { source: 'psi', type: 'psi', value: 60, weight: 0.3 },
    { source: 'social', type: 'reports', value: 40, weight: 0.2 }
  ];
  const res = evaluate(obs, 6);
  console.log('Test 3 result:', res);
  assert.ok(res.riskScore >= 40 && res.riskScore <= 90, 'Mixed observations produce mid-range score');
})();

console.log('All predictEngine tests passed.');
