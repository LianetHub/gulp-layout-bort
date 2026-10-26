import test from 'node:test';
import assert from 'node:assert/strict';
import { validator, validatePages } from '../scripts/html-validation.js';

test('HTML validation catches structural errors, duplicate ids and missing form actions', async () => {
    const report = await validator.validateString(
        '<!doctype html><html lang="ru"><head><title>Test</title></head><body><form><div id="same"></div><div id="same"></div><button><a href="#">Invalid</a></button></form></body></html>',
    );
    const rules = report.results.flatMap((result) =>
        result.messages.map((message) => message.ruleId),
    );
    assert.ok(rules.includes('element-required-attributes'));
    assert.ok(rules.includes('no-dup-id'));
    assert.ok(rules.includes('element-permitted-content'));
});

test('all expanded production pages pass HTML validation', async () => {
    const results = await validatePages();
    assert.equal(results.length, 24);
    const failures = results.filter(({ report }) => !report.valid || report.warningCount);
    assert.deepEqual(
        failures.map(({ page, report }) => ({ page, errors: report.errorCount })),
        [],
    );
});
