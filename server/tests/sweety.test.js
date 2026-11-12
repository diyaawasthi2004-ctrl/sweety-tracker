const test = require('node:test');
const assert = require('node:assert');
const { addReading } = require('../src/controllers/readingController');

// Helper to mock Express req/res
function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
}

test('Validation: rejects missing glucose value', async () => {
  const req = { body: { user_id: 1, timing: 'Morning (fasting)', date: '2026-11-10' } };
  const res = mockRes();
  await addReading(req, res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, 'Please enter a glucose value.');
});

test('Validation: rejects glucose value below 40 or above 600', async () => {
  const reqLow = { body: { user_id: 1, sugar_level: 35, timing: 'Morning (fasting)', date: '2026-11-10' } };
  const resLow = mockRes();
  await addReading(reqLow, resLow);
  assert.strictEqual(resLow.statusCode, 400);
  assert.strictEqual(resLow.body.error, 'Value must be between 40 and 600 mg/dl.');

  const reqHigh = { body: { user_id: 1, sugar_level: 650, timing: 'Morning (fasting)', date: '2026-11-10' } };
  const resHigh = mockRes();
  await addReading(reqHigh, resHigh);
  assert.strictEqual(resHigh.statusCode, 400);
  assert.strictEqual(resHigh.body.error, 'Value must be between 40 and 600 mg/dl.');
});

test('Validation: rejects decimal glucose values', async () => {
  const req = { body: { user_id: 1, sugar_level: 105.5, timing: 'Morning (fasting)', date: '2026-11-10' } };
  const res = mockRes();
  await addReading(req, res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, 'Value must be between 40 and 600 mg/dl.');
});

test('Validation: rejects invalid timing slot', async () => {
  const req = { body: { user_id: 1, sugar_level: 110, timing: 'Midnight snack', date: '2026-11-10' } };
  const res = mockRes();
  await addReading(req, res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, 'Invalid timing slot.');
});

test('Validation: rejects future dates', async () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);
  const futureStr = futureDate.toISOString().split('T')[0];

  const req = { body: { user_id: 1, sugar_level: 110, timing: 'Morning (fasting)', date: futureStr } };
  const res = mockRes();
  await addReading(req, res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, 'Date cannot be in the future.');
});