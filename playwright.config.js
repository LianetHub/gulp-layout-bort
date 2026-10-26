import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/browser',
    timeout: 60000,
    workers: 2,
    reporter: 'list',
    outputDir: '.tmp-refactor/browser-results',
    use: { baseURL: 'http://127.0.0.1:4176', channel: 'chrome', headless: true },
    webServer: {
        command: 'node scripts/serve-tests.js',
        url: 'http://127.0.0.1:4176/docs/',
        reuseExistingServer: true,
    },
});
