const { defineConfig } = require('@playwright/test');

const baseURL = process.env.UI_SMOKE_BASE_URL || 'http://127.0.0.1:5070';
const useExistingServer = process.env.UI_SMOKE_USE_EXISTING_SERVER === '1';

module.exports = defineConfig({
	testDir: './tests',
	testMatch: /ui-smoke\.spec\.js/,
	timeout: 180000,
	expect: {
		timeout: 15000
	},
	workers: 1,
	reporter: [['list']],
	use: {
		baseURL,
		headless: true,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	webServer: useExistingServer
		? undefined
		: {
			command: 'dotnet run --project .\\AspNetCoreMvc.csproj --urls http://127.0.0.1:5070',
			url: baseURL + '/api/documents',
			reuseExistingServer: true,
			timeout: 180000
		}
});
