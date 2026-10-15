import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'test/browser',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173' },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://localhost:4173/test/fixtures/',
    reuseExistingServer: !process.env.CI,
  },
})
