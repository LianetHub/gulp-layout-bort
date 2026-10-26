import { validatePages } from './html-validation.js';

const results = await validatePages();
let errors = 0;
let warnings = 0;
for (const { report } of results) {
    errors += report.errorCount;
    warnings += report.warningCount;
    for (const result of report.results) {
        for (const message of result.messages) {
            console.error(
                `${result.filePath}:${message.line}:${message.column} ${message.severity === 2 ? 'error' : 'warning'} ${message.message} (${message.ruleId})`,
            );
        }
    }
}
console.log(`HTML: ${results.length} pages, ${errors} errors, ${warnings} warnings`);
process.exitCode = errors || warnings ? 1 : 0;
